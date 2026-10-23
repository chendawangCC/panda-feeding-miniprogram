/**
 * 云函数 pushReminder —— 订阅消息定时推送
 *
 * 作用：小程序端「消息推送 → 去开启」只是拿到一次订阅授权并把模板登记到
 *       panda_subscriptions；真正的推送必须由服务端调用
 *       cloud.openapi.subscribeMessage.send 发出。本函数就是那个发送端。
 *
 * 触发方式：
 *   1) 定时触发器（config.json）：每天 8:00–21:00 每小时整点跑一次
 *   2) 手动/调试：wx.cloud.callFunction({ name:'pushReminder', data:{ action:'diagnose' } })
 *
 * 支持 action：
 *   cron      默认，定时批量推送
 *   diagnose  仅做体检：返回订阅记录、当天命中的提醒、模板字段配置、发送结果或原始错误
 *   send      立即按当前数据推一次（调试用，同样的去重规则）
 *
 * 模板字段配置（关键）：
 *   字段名必须和小程序后台「订阅消息 → 我的模板」里的关键词一致（如 thing1 / time2 / phrase3）。
 *   在云开发控制台建集合 panda_push_config，新建文档 _id = 'templates'，内容示例：
 *   {
 *     "_id": "templates",
 *     "vaccine":    { "tmplId": "模板ID", "page": "pages/plan/plan",
 *                     "fields": { "thing1": "name", "time2": "date", "thing3": "note" } },
 *     "supplement": { "tmplId": "模板ID", "page": "pages/plan/plan",
 *                     "fields": { "thing1": "name", "time2": "date", "thing3": "note" } },
 *     "stock":      { "tmplId": "模板ID", "page": "pages/plan/plan",
 *                     "fields": { "thing1": "name", "number2": "value", "thing3": "note" } }
 *   }
 *   fields 的右值可用变量：name / date / note / value
 *
 * 一次性订阅规则：用户每授权一次，对应模板只能推 1 条；发送成功后本函数会把该模板
 * 从 panda_subscriptions 的 templateIds 里移除，用户需再点一次「去开启」才会继续收到。
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const SUB = 'panda_subscriptions';
const FAM = 'panda_families';
const BABIES = 'panda_babies';
const METAS = 'panda_baby_meta';
const RECORDS = 'panda_records';
const LOG = 'panda_push_log';
const CONF = 'panda_push_config';

/** 与小程序端 utils/cloud-sync.js 的 REMIND_TEMPLATES 保持一致 */
const TMPL = {
  vaccine: 'gRiBoOCq_rVNKHiPHNbBSO4vfJIOAgh9Rdoj2prJeDE',
  supplement: 'j5ugla1ONKIwJmm0WJaOUO6BYT7Lvn5cv880cJmjRKc',
  stock: 'Ed2TJf1e7tw2iTQLZM0zPVvZnJvTO48TxqwTngYzxug',
  milk: '0HAU94XpzyNdezbODf77pPypaEeqyNFsiGwE4TWZmpM'
};

/** 默认字段映射（拿不准时先用这个跑 diagnose 看微信返回的真实报错） */
const DEFAULT_FIELDS = {
  vaccine: { thing1: 'name', time2: 'date', thing3: 'note' },
  supplement: { thing1: 'name', time2: 'date', thing3: 'note' },
  stock: { thing1: 'name', number2: 'value', thing3: 'note' }
};

const TYPE_CN = { vaccine: '疫苗提醒', supplement: '营养品提醒', stock: '库存/保质期提醒', milk: '母乳到期提醒' };

const FREQ_DAYS = { '每日': 1, '每2天': 2, '每3天': 3, '每周': 7, '每两周': 14 };

function pad(n) { return n < 10 ? '0' + n : '' + n; }
function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function todayStr() { return ymd(new Date()); }
function addDays(dateStr, n) {
  const p = String(dateStr || '').split('-').map(Number);
  const d = new Date(p[0], (p[1] || 1) - 1, p[2] || 1);
  d.setDate(d.getDate() + n);
  return ymd(d);
}
function diffDays(fromStr, toStr) {
  const a = new Date(String(fromStr).replace(/-/g, '/') + ' 00:00:00');
  const b = new Date(String(toStr).replace(/-/g, '/') + ' 00:00:00');
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return 0;
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}
function ok(data) { return { code: 0, ...data }; }
function fail(msg, code = -1) { return { code, msg }; }

async function safeGet(coll, where, limit = 1000) {
  try {
    const r = await db.collection(coll).where(where).limit(limit).get();
    return r.data || [];
  } catch (e) {
    return [];
  }
}

async function getConfig() {
  try {
    const r = await db.collection(CONF).doc('templates').get();
    return r.data || {};
  } catch (e) {
    return {};
  }
}

function templateOf(cfg, type) {
  const c = cfg[type] || {};
  return {
    tmplId: c.tmplId || TMPL[type] || '',
    page: c.page || 'pages/plan/plan',
    fields: c.fields || DEFAULT_FIELDS[type] || { thing1: 'name', time2: 'date' }
  };
}

/** 按微信字段类型整理取值：thing*≤20字 / phrase*≤5字 / number*数字 / time*日期时间 */
function buildData(fields, vars) {
  const out = {};
  Object.keys(fields).forEach(key => {
    const raw = vars[fields[key]];
    if (raw === undefined || raw === null) return;
    const prefix = String(key).replace(/\d+$/, '');
    if (prefix === 'number') {
      const n = Number(raw);
      out[key] = isNaN(n) ? 0 : n;
    } else if (prefix === 'time') {
      const s = String(raw);
      out[key] = /^\d{4}-\d{2}-\d{2}$/.test(s) ? s + ' 08:00' : s;
    } else if (prefix === 'phrase') {
      out[key] = String(raw).slice(0, 5);
    } else if (prefix === 'amount' || prefix === 'money') {
      out[key] = String(raw);
    } else {
      out[key] = String(raw).slice(0, 20);
    }
  });
  return out;
}

/** 收集某 openid（含其所在家庭 owner）今天命中的提醒 */
async function collectReminders(openid, familyId) {
  const today = todayStr();
  const owners = [openid];
  if (familyId && familyId !== 'self') {
    try {
      const fam = await db.collection(FAM).doc(familyId).get();
      const owner = fam && fam.data && fam.data.ownerOpenid;
      if (owner && owners.indexOf(owner) < 0) owners.push(owner);
    } catch (e) { /* 家庭已不存在则只取自己 */ }
  }

  const babies = [];
  const metas = [];
  const records = [];
  for (const owner of owners) {
    const b = await safeGet(BABIES, { ownerOpenid: owner });
    babies.push(...b);
    const m = await safeGet(METAS, { ownerOpenid: owner });
    metas.push(...m);
    const r = await safeGet(RECORDS, { ownerOpenid: owner });
    records.push(...r);
  }

  const babyNameOf = (id) => {
    const b = babies.find(x => x._id === id);
    return (b && b.data && b.data.name) || '宝宝';
  };

  const vaccine = [];
  const supplement = [];
  const stock = [];

  metas.forEach(meta => {
    const d = meta.data || {};
    const baby = babyNameOf(meta._id);
    // 1) 疫苗：待接种，且今天或未来 3 天内到期
    (d.vaccinePlan || []).forEach(v => {
      if (!v || v.status !== 'pending') return;
      const due = v.doneDate || v.dueDate;
      if (!due) return;
      const gap = diffDays(today, due);
      if (gap < 0 || gap > 3) return;
      const dose = v.dose ? v.dose + '剂' : '';
      vaccine.push({
        name: (v.group || v.short || '疫苗') + dose + ' 应种',
        date: due,
        note: gap === 0 ? '今天应接种' : ('还有 ' + gap + ' 天'),
        value: gap
      });
    });
    // 2) 库存 / 保质期 / 保修期：shelfWarnings 里今天到期的
    (d.shelfWarnings || []).forEach(w => {
      if (!w || !w.date) return;
      const gap = diffDays(today, w.date);
      if (gap !== 0) return;
      stock.push({
        name: String(w.name || '物品').slice(0, 20),
        date: w.date,
        note: (w.tip ? String(w.tip) : (baby + ' 今天到期')).slice(0, 20),
        value: 1
      });
    });
  });

  // 3) 营养品：按频率推算下次提醒日 = 今天
  records.forEach(rec => {
    const r = rec.data || {};
    if (r.type !== '营养品') return;
    let next = r.suppNextRemindDate || '';
    if (!next) {
      const days = FREQ_DAYS[r.suppRemindFreq];
      if (!days || !r.date) return;
      next = addDays(r.date, days);
    }
    if (next !== today) return;
    supplement.push({
      name: String(r.suppName || r.supplement || '营养品').slice(0, 20),
      date: today,
      note: '今天需要补充',
      value: 1
    });
  });

  return { vaccine, supplement, stock, babies: babies.length, records: records.length };
}

async function alreadySent(openid, type, dedupeKey) {
  try {
    const r = await db.collection(LOG).where({ openid, type, dedupeKey }).limit(1).get();
    return (r.data || []).length > 0;
  } catch (e) {
    return false;
  }
}

async function markSent(openid, type, dedupeKey, info) {
  try {
    await db.collection(LOG).add({
      data: Object.assign({ openid, type, dedupeKey, at: Date.now() }, info || {})
    });
  } catch (e) { /* 日志失败不影响发送 */ }
}

/**
 * 发送一条订阅消息
 * miniprogramState 决定消息点开后跳转的小程序版本：正式版 / 体验版 / 开发版。
 * 还没有正式版时会报 41030，这里自动降级重试一次。
 */
async function sendOne(openid, tmplId, page, data, state) {
  const states = state ? [state] : ['formal', 'trial', 'develop'];
  let last = { ok: false, errCode: -1, errMsg: '未执行' };
  for (const st of states) {
    try {
      const r = await cloud.openapi.subscribeMessage.send({
        touser: openid,
        templateId: tmplId,
        page,
        miniprogramState: st,
        lang: 'zh_CN',
        data
      });
      last = { ok: r && r.errCode === 0, errCode: r && r.errCode, errMsg: r && r.errMsg, state: st };
      if (last.ok) return last;
      // 只有「小程序版本/页面不存在」这一类才换版本重试，其它错误直接返回
      if (r && r.errCode !== 41030) return last;
    } catch (e) {
      last = { ok: false, errCode: e.errCode, errMsg: e.errMsg || e.message, state: st };
      if (e.errCode !== 41030) return last;
    }
  }
  return last;
}

/** 从订阅记录里移除已消耗的模板（一次性订阅） */
async function consumeTemplate(openid, familyId, tmplId) {
  try {
    const r = await db.collection(SUB).where({ openid, familyId }).limit(1).get();
    const doc = (r.data || [])[0];
    if (!doc) return;
    const left = (doc.templateIds || []).filter(t => t !== tmplId);
    await db.collection(SUB).doc(doc._id).update({ data: { templateIds: left, updatedAt: Date.now() } });
  } catch (e) { /* ignore */ }
}

/** 主流程：为一条订阅发送它今天命中的提醒 */
async function pushForSubscription(sub, cfg, opts) {
  const openid = sub.openid;
  const familyId = sub.familyId || 'self';
  const today = todayStr();
  const detail = { openid, familyId, sent: [], skipped: [], errors: [] };

  const rem = await collectReminders(openid, familyId);
  if (opts && opts.diagnose) {
    detail.hit = { vaccine: rem.vaccine.length, supplement: rem.supplement.length, stock: rem.stock.length };
    detail.sample = {
      vaccine: rem.vaccine[0], supplement: rem.supplement[0], stock: rem.stock[0]
    };
    detail.authorizedTemplates = sub.templateIds || [];
  }

  const types = ['vaccine', 'supplement', 'stock'];
  for (const type of types) {
    const list = rem[type] || [];
    if (!list.length) continue;
    const t = templateOf(cfg, type);
    if (!t.tmplId) { detail.skipped.push(type + ':未配置模板ID'); continue; }
    if ((sub.templateIds || []).indexOf(t.tmplId) < 0) { detail.skipped.push(type + ':未授权该模板'); continue; }

    // 同类提醒合并成一条，避免一次性授权被瞬间用掉
    const first = list[0];
    const dedupeKey = openid + '_' + type + '_' + today;
    if (await alreadySent(openid, type, dedupeKey)) { detail.skipped.push(type + ':今天已推过'); continue; }

    const vars = Object.assign({}, first, {
      name: first.name,
      note: list.length > 1 ? (first.note + '，共 ' + list.length + ' 项') : first.note,
      count: list.length
    });
    const data = buildData(t.fields, vars);
    const res = await sendOne(openid, t.tmplId, t.page, data, opts && opts.state);
    if (res.ok) {
      detail.sent.push({ type, templateId: t.tmplId, data });
      await markSent(openid, type, dedupeKey, { templateId: t.tmplId, ok: true });
      await consumeTemplate(openid, familyId, t.tmplId);
      if (opts && opts.stopAfterFirst) break;
    } else {
      detail.errors.push({ type, templateId: t.tmplId, errCode: res.errCode, errMsg: res.errMsg, data });
      await markSent(openid, type, dedupeKey, { templateId: t.tmplId, ok: false, errCode: res.errCode, errMsg: res.errMsg });
    }
  }
  return detail;
}

exports.main = async (event) => {
  const action = (event && event.action) || 'cron';
  const cfg = await getConfig();

  try {
    if (action === 'diagnose' || action === 'send') {
      const wxContext = cloud.getWXContext();
      const openid = wxContext.OPENID;
      if (!openid) return fail('没有拿到 openid（请在云函数上下文调用）');
      const subs = await safeGet(SUB, { openid });
      if (!subs.length) {
        return ok({
          action,
          note: '没有订阅记录：请在小程序「权限与隐私 → 消息推送 → 去开启」点一次，同意授权后再试',
          openidTail: openid.slice(-6)
        });
      }
      const details = [];
      for (const sub of subs) {
        details.push(await pushForSubscription(sub, cfg, {
          diagnose: action === 'diagnose',
          state: event.miniprogramState || 'formal',
          stopAfterFirst: action === 'diagnose'
        }));
      }
      const anySent = details.some(d => d.sent.length);
      return ok({
        action,
        note: anySent
          ? '已发送（一次性订阅已消耗，如需继续接收请再点一次「去开启」）'
          : '没有发送成功，看 errors 里的微信原始错误',
        details,
        configFound: Object.keys(cfg).length > 0
      });
    }

    // 定时批量
    const subs = await safeGet(SUB, {});
    const results = [];
    for (const sub of subs) {
      if (sub.expireAt && Date.now() > sub.expireAt) continue;
      if (!(sub.templateIds || []).length) continue;
      results.push(await pushForSubscription(sub, cfg, {}));
    }
    const sent = results.reduce((n, r) => n + r.sent.length, 0);
    const failed = results.reduce((n, r) => n + r.errors.length, 0);
    return ok({ action: 'cron', subscriptions: subs.length, sent, failed, results });
  } catch (e) {
    return fail('服务异常：' + (e && e.message), -2);
  }
};
