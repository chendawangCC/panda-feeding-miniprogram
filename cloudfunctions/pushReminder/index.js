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
 * 模板字段配置：
 *   字段名已按微信后台「订阅消息 → 我的模板 → 详情」逐条核对并内置在 DEFAULT_FIELDS，
 *   正常情况下不需要额外建集合即可发送。若后台换过模板、字段名变了，再建集合
 *   panda_push_config（_id = 'templates'）覆盖即可，格式见同目录 panda_push_config.json。
 *   fields 的右值可用变量：name / date / note / value / extra / food / count
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
const INVENTORY = 'panda_inventory';

/** 与小程序端 utils/cloud-sync.js 的 REMIND_TEMPLATES 保持一致 */
const TMPL = {
  vaccine: 'gRiBoOCq_rVNKHiPHNbBSO4vfJIOAgh9Rdoj2prJeDE',
  supplement: 'j5ugla1ONKIwJmm0WJaOUO6BYT7Lvn5cv880cJmjRKc',
  stock: 'Ed2TJf1e7tw2iTQLZM0zPVvZnJvTO48TxqwTngYzxug',
  milk: '0HAU94XpzyNdezbODf77pPypaEeqyNFsiGwE4TWZmpM'
};

/**
 * 默认字段映射：全部按微信公众平台「订阅消息 → 我的模板 → 详情」里抄到的真实字段名
 *  疫苗倒计时提醒   ：下次接种时间 {{time7}} · 还剩天数 {{number3}} · 疫苗 {{thing1}}
 *  宝宝喂养提醒     ：温馨提示 {{thing5}} · 距离上次 {{thing6}}
 *  库存不足提醒     ：库存信息 {{thing1}} · 物料名称 {{thing3}} · 当前库存数 {{number13}}
 *  保质期到期提醒   ：过期日期 {{time16}} · 食物名称 {{thing6}} · 物品名称 {{thing5}} · 剩余天数 {{number2}}
 * 如后台模板被删除重选导致字段变化，改这个对象或在 panda_push_config 里覆盖即可。
 */
const DEFAULT_FIELDS = {
  vaccine: { time7: 'date', number3: 'value', thing1: 'name' },
  supplement: { thing5: 'note', thing6: 'extra' },
  stock: { thing1: 'note', thing3: 'name', number13: 'value' },
  milk: { time16: 'date', thing6: 'food', thing5: 'name', number2: 'value' }
};

const TYPE_CN = { vaccine: '疫苗提醒', supplement: '营养品提醒', stock: '库存不足提醒', milk: '保质期到期提醒' };

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

/**
 * 各类型模板里「语义 → 字段类型」的出场顺序。
 * 后台把 thing1 改成 thing2 之类只是重编号，按类型顺序对齐即可自动适配。
 */
const KIND_POOL = {
  vaccine: { time: ['date'], date: ['date'], number: ['value'], thing: ['name'], phrase: ['name'], character_string: ['name'] },
  supplement: { thing: ['note', 'extra'], phrase: ['note'] },
  stock: { thing: ['note', 'name'], number: ['value'], phrase: ['note'] },
  milk: { time: ['date'], date: ['date'], thing: ['food', 'name'], number: ['value'], phrase: ['name'] }
};

/** 空值兜底文案：微信订阅消息任何字段都不允许空字符串，否则报 47003 */
const EMPTY_FALLBACK = {
  vaccine: { thing: '疫苗提醒', phrase: '疫苗', number: 0 },
  supplement: { thing: '营养品提醒', phrase: '补充', number: 0 },
  stock: { thing: '库存不足', phrase: '库存', number: 0 },
  milk: { thing: '保质期提醒', phrase: '到期', number: 0 }
};

/** 读取后台真实模板字段（{{thing1.DATA}} 形式），冷启动缓存一次 */
let TEMPLATE_FIELDS_CACHE = null;
async function fetchTemplateFields() {
  if (TEMPLATE_FIELDS_CACHE) return TEMPLATE_FIELDS_CACHE;
  const out = {};
  try {
    const r = await cloud.openapi.subscribeMessage.getTemplateList({});
    const list = (r && r.data) || [];
    list.forEach(t => {
      const names = [];
      const re = /\{\{([a-zA-Z0-9_]+)\.DATA\}\}/g;
      let m;
      while ((m = re.exec(String(t.content || ''))) !== null) names.push(m[1]);
      out[t.priTmplId] = { title: t.title, content: t.content, fields: names };
    });
  } catch (e) {
    out.__error = (e && (e.errMsg || e.message)) || 'getTemplateList failed';
  }
  TEMPLATE_FIELDS_CACHE = out;
  return out;
}

/** 按「字段类型顺序」把后台字段名对到语义变量上 */
function autoMapFields(type, names) {
  const pool = KIND_POOL[type] || {};
  const used = {};
  const map = {};
  (names || []).forEach(fn => {
    const kind = String(fn).replace(/\d+$/, '');
    const list = pool[kind] || pool.thing || [];
    const i = used[kind] === undefined ? 0 : used[kind] + 1;
    used[kind] = i;
    const varName = list[i] || list[list.length - 1];
    if (varName) map[fn] = varName;
  });
  return map;
}

async function templateOf(cfg, type) {
  const c = cfg[type] || {};
  const tmplId = c.tmplId || TMPL[type] || '';
  let fields = c.fields || null;
  let detected = null;
  let title = '';
  if (!fields && tmplId) {
    const all = await fetchTemplateFields();
    const t = all[tmplId];
    if (t && t.fields && t.fields.length) {
      detected = t.fields.slice();
      title = t.title || '';
      const auto = autoMapFields(type, t.fields);
      // 只有自动映射覆盖模板全部字段时才采用，避免漏字段继续报 47003
      if (Object.keys(auto).length === t.fields.length) fields = auto;
    }
  }
  if (!fields) fields = DEFAULT_FIELDS[type] || { thing1: 'name', time2: 'date' };
  return { tmplId, page: c.page || 'pages/plan/plan', fields, detected, title };
}

/**
 * 按微信字段类型整理取值：thing*≤20字 / phrase*≤5字 / number*数字 / time*日期时间
 * 微信规定订阅消息的每个字段都必须有非空值，空字符串会直接报 47003
 * （data.xxx.value is empty），所以这里对空值统一兜底。
 */
function buildData(fields, vars, type) {
  const out = {};
  const fallback = EMPTY_FALLBACK[type] || EMPTY_FALLBACK.stock;
  const today = new Date();
  const todayCn = today.getFullYear() + '年' + (today.getMonth() + 1) + '月' + today.getDate() + '日';
  const pool = KIND_POOL[type] || {};
  Object.keys(fields).forEach(key => {
    const prefix = String(key).replace(/\d+$/, '');
    let raw = vars[fields[key]];
    // 配置里写的变量不存在（例如旧映射指向 title）时，按字段类型换一个语义变量
    if (raw === undefined || raw === null || String(raw).trim() === '') {
      const alt = (pool[prefix] || pool.thing || []).map(k => vars[k]).find(v => v !== undefined && v !== null && String(v).trim() !== '');
      if (alt !== undefined) raw = alt;
    }
    if (prefix === 'number') {
      const n = Number(String(raw === undefined || raw === null ? '' : raw).replace(/[^\d.-]/g, ''));
      out[key] = isNaN(n) ? (fallback.number || 0) : n;
      return;
    }
    let v = raw === undefined || raw === null ? '' : String(raw).trim();
    if (prefix === 'time' || prefix === 'date') {
      const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(v);
      out[key] = m ? (Number(m[1]) + '年' + Number(m[2]) + '月' + Number(m[3]) + '日') : (v ? v.slice(0, 20) : todayCn);
      return;
    }
    if (prefix === 'phrase') {
      out[key] = (v || fallback.phrase || '提醒').slice(0, 5);
      return;
    }
    if (prefix === 'amount' || prefix === 'money') {
      out[key] = v || String(fallback.number || 0);
      return;
    }
    // thing / name / character_string / letter / symbol 等
    out[key] = (v || fallback.thing || '提醒').slice(0, 20);
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
  const inventory = [];
  const seenBaby = {};
  for (const owner of owners) {
    const list = await safeGet(BABIES, { ownerOpenid: owner });
    list.forEach(b => {
      if (!b || !b._id || seenBaby[b._id]) return;
      seenBaby[b._id] = 1;
      babies.push(b);
    });
  }
  // 按 babyId 取数据：同一宝宝的记录/库存由创建者和亲友共同维护，
  // 不能按 ownerOpenid 取，否则亲友录入的数据不会触发创建者提醒。
  for (const b of babies) {
    const bid = b._id;
    metas.push(...(await safeGet(METAS, { _id: bid })));
    records.push(...(await safeGet(RECORDS, { babyId: bid })));
    inventory.push(...(await safeGet(INVENTORY, { babyId: bid })));
  }

  const babyNameOf = (id) => {
    const b = babies.find(x => x._id === id);
    return (b && b.data && b.data.name) || '宝宝';
  };

  const vaccine = [];    // 疫苗倒计时提醒
  const supplement = []; // 宝宝喂养提醒（温馨提示/距离上次）
  const stock = [];      // 库存不足提醒
  const milk = [];       // 保质期到期提醒

  // 1) 疫苗：待接种，今天或未来 3 天内到期
  metas.forEach(meta => {
    const d = meta.data || {};
    (d.vaccinePlan || []).forEach(v => {
      if (!v || v.status !== 'pending') return;
      const due = v.dueDate || v.doneDate;
      if (!due) return;
      const gap = diffDays(today, due);
      if (gap < 0 || gap > 3) return;
      const dose = v.dose ? (' 第' + v.dose + '剂') : '';
      const babyName = babyNameOf(meta._id);
      vaccine.push({
        name: String((v.group || v.short || '疫苗') + dose).slice(0, 20),
        date: due,
        note: (babyName + (gap === 0 ? ' 今天应接种' : (' 还有 ' + gap + ' 天'))).slice(0, 20),
        value: gap
      });
    });
  });

  // 2) 保质期 / 保修期：今天到期，或已过期 3 天内
  metas.forEach(meta => {
    const d = meta.data || {};
    const baby = babyNameOf(meta._id);
    (d.shelfWarnings || []).forEach(w => {
      if (!w || !w.date) return;
      const gap = diffDays(today, w.date); // date - 今天
      if (gap > 0 || gap < -3) return;
      const nm = String(w.name || '物品');
      milk.push({
        name: nm.slice(0, 20),
        food: nm.slice(0, 20),
        date: w.date,
        note: gap === 0 ? (baby + ' 今天到期') : ('已过期 ' + Math.abs(gap) + ' 天'),
        value: Math.max(0, gap)
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
    const nm = String(r.suppName || r.supplement || '营养品');
    const lastDate = r.suppLastDate || r.date || '';
    const gap = lastDate ? Math.max(0, diffDays(lastDate, today)) : 0;
    const babyName = babyNameOf(rec.babyId);
    supplement.push({
      name: nm.slice(0, 20),
      date: today,
      note: (babyName + ' 该补充 ' + nm).slice(0, 20),
      extra: lastDate ? ('距上次 ' + gap + ' 天') : '今天该补充了',
      value: 1
    });
  });

  // 4) 库存不足：奶粉（配方奶）低于 2 罐；其他耗材低于等于 10 件
  const DEVICE_RE = /吸奶器|消毒器|温奶器|摇奶器|辅食机|料理机|恒温壶|烘干机|暖奶器/;
  const groups = {};
  // 同一 cid 可能同时存在旧版无 babyId 文档与新版分宝宝文档，按 cid 优先保留有 babyId 的
  const invByCid = {};
  inventory.forEach(doc => {
    if (!doc) return;
    const key = doc.cid || doc._id;
    if (!key) return;
    const prev = invByCid[key];
    if (!prev || (doc.babyId && !prev.babyId)) invByCid[key] = doc;
  });
  Object.values(invByCid).forEach(doc => {
    const it = (doc && doc.data) || {};
    if (!it.name) return;
    // 按宝宝 + 商品 + 尺码分组，两个宝宝的库存不能相加
    const bid = doc.babyId || '';
    const key = bid + '|' + it.name + '|' + (it.size || '');
    if (!groups[key]) groups[key] = { babyId: bid, name: it.name, size: it.size || '', unit: it.unit || '件', count: 0 };
    groups[key].count += Number(it.count) || 0;
  });
  Object.keys(groups).forEach(k => {
    const g = groups[k];
    const isFormula = /奶粉|配方奶|配方牛奶/.test(g.name) && !DEVICE_RE.test(g.name);
    const th = isFormula ? 2 : 10;
    if (g.count >= th) return;
    const label = g.name + (g.size ? '（' + g.size + '）' : '');
    const babyPrefix = g.babyId ? (babyNameOf(g.babyId) + ' · ') : '';
    const stockDetail = isFormula
      ? ('仅剩 ' + g.count + ' 罐 · 低于 ' + th + ' 罐')
      : ('仅剩 ' + g.count + g.unit + ' · 低于 ' + th + g.unit);
    stock.push({
      name: (babyPrefix + label).slice(0, 20),
      note: ((g.babyId ? (babyNameOf(g.babyId) + ' ') : '') + stockDetail).slice(0, 20),
      value: g.count
    });
  });

  return {
    vaccine, supplement, stock, milk,
    stat: { babies: babies.length, records: records.length, inventory: inventory.length }
  };
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
    detail.hit = {
      vaccine: rem.vaccine.length, supplement: rem.supplement.length,
      stock: rem.stock.length, milk: rem.milk.length
    };
    detail.sample = {
      vaccine: rem.vaccine[0] || null, supplement: rem.supplement[0] || null,
      stock: rem.stock[0] || null, milk: rem.milk[0] || null
    };
    detail.stat = rem.stat;
    detail.authorizedTemplates = sub.templateIds || [];
  }

  const types = ['vaccine', 'supplement', 'stock', 'milk'];
  const fieldMap = {};
  for (const type of types) {
    const list = rem[type] || [];
    if (!list.length) continue;
    const t = await templateOf(cfg, type);
    if (!t.tmplId) { detail.skipped.push(type + ':未配置模板ID'); continue; }
    if ((sub.templateIds || []).indexOf(t.tmplId) < 0) { detail.skipped.push(type + ':未授权该模板'); continue; }

    // 同类提醒合并成一条，避免一次性授权被瞬间用掉
    const first = list[0];
    const dedupeKey = openid + '_' + type + '_' + today;
    if (await alreadySent(openid, type, dedupeKey)) { detail.skipped.push(type + ':今天已推过'); continue; }

    const vars = Object.assign({}, first, {
      name: first.name,
      note: list.length > 1 ? (first.note + '，共 ' + list.length + ' 项').slice(0, 20) : first.note,
      food: first.food || first.name || '',
      extra: first.extra || '',
      count: list.length
    });
    const data = buildData(t.fields, vars, type);
    fieldMap[type] = { tmplId: t.tmplId, fields: t.fields, detected: t.detected || null, data };
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
  if (fieldMap && Object.keys(fieldMap).length) detail.fieldMap = fieldMap;
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

/* 便于本地单测（云函数运行时用不到） */
exports.__test = { buildData, autoMapFields, templateOf, fetchTemplateFields, EMPTY_FALLBACK };
