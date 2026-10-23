/**
 * utils/cloud-data.js —— 全量数据云端同步（微信云开发）
 *
 * 依赖云函数：cloudData（push / pull / wipe）、loginUser（openid）
 *
 * 同步模型：
 *   - 本地为即时数据源（离线可用），后台与云端增量同步
 *   - 每个数据项带 _cid（云端文档 _id 后缀）与 _u（updatedAt）
 *   - 合并规则：updatedAt 新者胜；云端墓碑（删除）优先于旧数据
 *   - 删除本地项时写墓碑（panda_cloud_tomb），下次 push 时告知云端删除
 */

const META_KEY = 'panda_cloud_meta';      // { openid }
const BABY_KEY = 'panda_feeding_baby_';   // 宝宝分 key 存储（与 cloud-sync 一致）
const TOMB_KEY = 'panda_cloud_tomb';      // { records: { cid: {ts, babyId} }, inventory: {...}, ... }
const PUSH_DEBOUNCE = 50;                  // ms
const DIRTY_KEY = 'panda_push_dirty';     // 1=本地有未成功上云的改动（断网/关窗后下次启动补推）

function markPushDirty() { try { wx.setStorageSync(DIRTY_KEY, 1); } catch (e) {} }
function clearPushDirty() { try { wx.setStorageSync(DIRTY_KEY, 0); } catch (e) {} }
/** 是否存在未成功推送的本地改动（供 app.onShow 补推） */
function hasPendingPush() { try { return !!wx.getStorageSync(DIRTY_KEY); } catch (e) { return false; } }

function getMeta() {
  try { return wx.getStorageSync(META_KEY) || {}; } catch (e) { return {}; }
}
function setMeta(m) {
  try { wx.setStorageSync(META_KEY, m); } catch (e) {}
}
function getTombs() {
  try { return wx.getStorageSync(TOMB_KEY) || {}; } catch (e) { return {}; }
}
function setTombs(t) {
  try { wx.setStorageSync(TOMB_KEY, t); } catch (e) {}
}

function callFn(name, data) {
  console.log('[callFn] name=', name, 'action=', data && data.action);
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name,
      data,
      success: res => { console.log('[callFn] ok', name, data && data.action); resolve(res.result || {}); },
      fail: e => { console.log('[callFn] fail', name, data && data.action, e); reject(e); }
    });
  });
}

function getOpenid() {
  const meta = getMeta();
  if (meta.openid) return Promise.resolve(meta.openid);
  return callFn('loginUser', {}).then(r => {
    if (r && r.code === 0 && r.openid) {
      setMeta(Object.assign(getMeta(), { openid: r.openid }));
      return r.openid;
    }
    throw new Error((r && r.msg) || '获取 openid 失败');
  });
}

function cloudReady() {
  return !!(wx.cloud && wx.cloud.callFunction);
}

/* ==================== 本地删除墓碑（记录所属宝宝，跨宝宝删除不错位） ==================== */
function tomb(kind, cid, babyId) {
  if (!kind || !cid) return;
  const t = getTombs();
  if (!t[kind]) t[kind] = {};
  t[kind][cid] = { ts: Date.now(), babyId: babyId || '' };
  setTombs(t);
}

/* ==================== 确保每项有稳定云端 id（幂等） ==================== */
let cidSeq = 0;
function genCid() {
  cidSeq += 1;
  return 'c' + Date.now() + '_' + cidSeq + '_' + Math.floor(Math.random() * 1000);
}
function ensureIds(arr) {
  (arr || []).forEach(item => {
    if (item && typeof item === 'object' && !item._cid) item._cid = genCid();
  });
  return arr || [];
}

/* ==================== 构建推送批次（遍历全部宝宝，按授权过滤） ==================== */
function buildPush(g) {
  const perm = require('./perm.js');
  const openid = (g.user && g.user.openid) || getMeta().openid || '';
  const ups = { babies: [], metas: [], records: [], inventory: [], measures: [], vaccines: [] };
  const now = Date.now();
  const readBaby = (bid) => {
    try { return wx.getStorageSync(BABY_KEY + bid) || {}; } catch (e) { return {}; }
  };

  // 宝宝档案 + 各宝宝数据
  (g.babies || []).forEach(b => {
    if (!b || !b.id) return;
    // 不推送未命名的宝宝（防止自动创建的空宝宝被同步到云端）
    if (!b.name || !b.name.trim()) {
      console.log('[buildPush] 跳过未命名宝宝 id=', b.id);
      return;
    }
    // 测试阶段：始终推送所有本地宝宝（不做权限检查，避免权限缓存异常导致推送失败）
    console.log('[buildPush] baby id=', b.id, 'ownerOpenid=', b.ownerOpenid);
    // 同时写顶层字段（兼容旧平铺结构）和 data 字段（新结构）
    // 注意：不要 ...b 展开，否则 b.ownerOpenid（空字符串）会覆盖 openid
    console.log('[buildPush] baby id=', b.id, 'avatar=', b.avatar);
    // 保留原始 ownerOpenid（只有 owner 才能更新宝宝档案）
    const babyOwnerOpenid = b.ownerOpenid || openid;
    // 去除 b 中的 data 字段，避免无限递归嵌套（data.data.data...）
    const babyDataForCloud = Object.assign({}, b);
    delete babyDataForCloud.data;
    ups.babies.push({
      _id: b.id,
      ownerOpenid: babyOwnerOpenid,
      babyId: b.id,
      data: babyDataForCloud,
      id: b.id,
      name: b.name,
      avatar: b.avatar,
      birthday: b.birthday,
      gender: b.gender,
      relation: b.relation,
      updatedAt: now
    });
    const d = readBaby(b.id);
    ups.metas.push({
      _id: b.id,
      ownerOpenid: openid,
      babyId: b.id,
      data: {
        supplies: d.supplies || { milk: 0, milkFeeds: 0, d3Days: 0 },
        vaccine: d.vaccine || {},
        foodAllergyMap: d.foodAllergyMap || {},
        diaperStock: d.diaperStock || 0,
        shelfWarnings: d.shelfWarnings || [],
        vaccinePlan: d.vaccinePlan || [],
        acknowledgedMilks: d.acknowledgedMilks || []
      },
      updatedAt: now
    });
    const map = (arr) => ensureIds(arr).map(item => ({
      _id: b.id + '_' + item._cid,
      ownerOpenid: openid,
      babyId: b.id,
      cid: item._cid,
      data: item,
      _u: item._u || now,
      updatedAt: now
    }));
    ups.records = ups.records.concat(map(d.records || []));
    // 库存耗材：关联家庭ID，有家庭则家庭成员共享，_id 格式为 openid_cid
    const familyId = (g.myFamily && g.myFamily._id) || '';
    const invMap = (arr) => ensureIds(arr).map(item => ({
      _id: openid + '_' + item._cid,
      ownerOpenid: openid,
      familyId: familyId,
      cid: item._cid,
      data: item,
      _u: item._u || now,
      updatedAt: now
    }));
    ups.inventory = ups.inventory.concat(invMap(d.stockItems || []));
    ups.measures = ups.measures.concat(map(d.measures || []));
    ups.vaccines = ups.vaccines.concat(map(d.vaccineDone || []));
    console.log('[buildPush] baby', b.id, 'd.measures=', (d.measures||[]).length, 'd.vaccineDone=', (d.vaccineDone||[]).length);
  });

  // 墓碑（兼容旧格式：纯时间戳 → 归属未知，按删除时所在宝宝近似）
  const tombs = getTombs();
  const ts = { records: [], inventory: [], measures: [], vaccines: [] };
  const myOpenid = (g.user && g.user.openid) || '';
  Object.keys(ts).forEach(kind => {
    const m = tombs[kind] || {};
    Object.keys(m).forEach(cid => {
      const v = m[cid];
      const info = (v && typeof v === 'object') ? v : { ts: v || Date.now(), babyId: '' };
      // 库存耗材：只跟随账号，不依赖 babyId
      if (kind === 'inventory') {
        ts[kind].push({ _id: myOpenid + '_' + cid, ownerOpenid: myOpenid, cid, updatedAt: info.ts });
        return;
      }
      const babyId = info.babyId || (g.currentBabyId || '');
      if (babyId && !perm.canAccessBaby(babyId)) return;
      ts[kind].push({ babyId, cid, updatedAt: info.ts });
    });
  });

  // babies 强制 force：旧平铺记录没有 _u，需要强制覆盖成新结构
  const force = (ups.babies || []).map(b => b._id);
  return { upserts: ups, tombstones: ts, force };
}

/* ==================== 云端合并 ==================== */
function mergeList(local, cloudDocs, preserveCid) {
  const out = (local || []).slice();
  const idxByCid = {};
  out.forEach((item, i) => { if (item && item._cid) idxByCid[item._cid] = i; });
  (cloudDocs || []).forEach(cd => {
    if (!cd || !cd.cid) return;
    const cid = cd.cid;
    const li = idxByCid[cid];
    const cu = cd._u || cd.updatedAt || 0;
    if (li === undefined) {
      // 云端有、本地无 → 新增
      const merged = Object.assign({}, cd.data || {});
      if (preserveCid) merged._cid = cid;
      else merged._cid = cid;
      merged._u = cu;
      out.push(merged);
      idxByCid[cid] = out.length - 1;
    } else {
      const lu = (out[li] && out[li]._u) || 0;
      if (cu > lu) {
        const merged = Object.assign({}, cd.data || {});
        merged._cid = cid;
        merged._u = cu;
        out[li] = merged;
      }
    }
  });
  return out;
}

/* ==================== 拉取并合并 ==================== */
function pullAll() {
  if (!cloudReady()) { console.warn('[pull] cloud not ready'); return Promise.reject(new Error('cloud not ready')); }
  console.log('[pull] 开始调用云函数');
  return callFn('cloudData', { action: 'pull' }).then(r => {
    console.log('[pull] 云函数返回 code=', r && r.code, 'keys=', r && Object.keys(r));
    if (r.code !== 0) throw new Error(r.msg);
    return r.data || r || {};
  }).catch(e => {
    console.error('[pull] 失败', e);
    throw e;
  });
}

/** 注销账号：永久删除云端全部数据 */
function deleteAccount() {
  if (!cloudReady()) return Promise.reject(new Error('cloud not ready'));
  return callFn('cloudData', { action: 'deleteAccount' }).then(r => {
    if (r.code !== 0) throw new Error(r.msg);
    return r;
  });
}

/** 合并云端数据到 app.globalData（由 app 传入 getApp() 实例），遍历全部宝宝按授权过滤 */
function mergeInto(app, data) {
  if (!app || !data) return;
  const g = app.globalData;
  const perm = require('./perm.js');

  // ---- 1) 宝宝档案：按 _id 合并（过滤未授权宝宝） ----
  const cloudBabies = {};
  (data.babies || []).forEach(b => {
    // 传入云端数据自带的 ownerOpenid，避免 canAccessBaby 从本地查找时拿到旧值
    if (b && b._id && perm.canAccessBaby(b._id, b.ownerOpenid)) cloudBabies[b._id] = b;
  });
  // 先记录云端有哪些宝宝ID（用于后续清理本地无权限的宝宝）
  const cloudBabyIds = Object.keys(cloudBabies);
  (g.babies || []).forEach(b => {
    const cb = cloudBabies[b.id];
    if (cb) {
      const cu = cb.updatedAt || 0;
      const lu = b._u || 0;
      if (cu > lu) {
        const cbData = cb.data || cb; // 兼容旧版平铺结构（无 data 字段）
        // 先展开本地 b，再用云端 cbData 覆盖；空字符串字段不覆盖本地
        const merged = Object.assign({}, b, cbData, { id: b.id, _u: cu, ownerOpenid: cb.ownerOpenid || b.ownerOpenid || '' });
        // 云端 avatar 优先（顶层优先，data 次之）
        merged.avatar = cb.avatar || cbData.avatar || b.avatar;
        // 空字段不覆盖本地
        if (!merged.name) merged.name = b.name;
        if (!merged.birthday) merged.birthday = b.birthday;
        if (!merged.gender) merged.gender = b.gender;
        if (!merged.relation) merged.relation = b.relation;
        Object.assign(b, merged);
      }
      if (cb.ownerOpenid && !b.ownerOpenid) {
        b.ownerOpenid = cb.ownerOpenid;
      }
      delete cloudBabies[b.id];
    }
  });
  // 删除本地有但云端没有的宝宝（被删除或被移除家庭后，云端不再返回该宝宝，本地也要清除）
  // 双重检查：
  // 1. cloudBabyIds — 云端是否返回该宝宝
  // 2. canAccessBaby — 权限缓存是否允许访问（防止数据库延迟导致云端误返回）
  const beforeCount = g.babies.length;
  const removedBabyIds = [];
  g.babies = (g.babies || []).filter(b => {
    // 云端返回了该宝宝，且有权限访问 → 保留
    if (cloudBabyIds.indexOf(b.id) < 0) {
      removedBabyIds.push(b.id);
      return false;
    }
    if (!perm.canAccessBaby(b.id, b.ownerOpenid)) {
      removedBabyIds.push(b.id);
      return false;
    }
    return true;
  });
  const removedCount = beforeCount - g.babies.length;
  if (removedCount > 0) {
    console.log('[merge] 清除云端已删除/无权限宝宝 count=', removedCount, 'cloudIds=', cloudBabyIds, 'removedIds=', removedBabyIds);
    // 同时清理 globalData 中这些宝宝的 records
    if (g.records && g.records.length) {
      const beforeRecords = g.records.length;
      g.records = g.records.filter(r => {
        const bid = r.babyId || (r.data && r.data.babyId);
        return removedBabyIds.indexOf(bid) < 0;
      });
      console.log('[merge] 清理宝宝对应记录 before=', beforeRecords, 'after=', g.records.length);
    }
    // 同时清理本地存储中这些宝宝的数据
    removedBabyIds.forEach(bid => {
      try { wx.removeStorageSync(BABY_KEY + bid); } catch (e) {}
    });
    // 如果当前选中的宝宝被清除了，切换到第一个宝宝
    if (g.currentBabyId && !g.babies.find(b => b.id === g.currentBabyId)) {
      if (g.babies.length) {
        g.currentBabyId = g.babies[0].id;
      } else {
        g.currentBabyId = '';
        g.baby = null;
        // 没有宝宝了，清空 records
        g.records = [];
      }
    }
  }
  Object.keys(cloudBabies).forEach(id => {
    const cb = cloudBabies[id];
    if (cb) {
      const cbData = cb.data || cb; // 兼容旧版平铺结构
      console.log('[merge baby] id=', id, 'cb.avatar=', cb.avatar, 'cbData.avatar=', cbData.avatar);
      const b = Object.assign({}, cbData, { id, _u: cb.updatedAt || 0, ownerOpenid: cb.ownerOpenid || '' });
      // 优先用顶层 avatar（data.avatar 可能是旧的）
      b.avatar = cb.avatar || cbData.avatar || '';
      b.id = id;
      // 防御性清理：删除可能残留的嵌套 data 字段，避免 data.data.data...
      delete b.data;
      g.babies.push(b);
    }
  });
  // 若当前无宝宝且云端有 → 自动切到云端第一个宝宝
  if (!g.currentBabyId && g.babies.length) {
    g.currentBabyId = g.babies[0].id;
  }

  console.log('[merge] 合并前 g.babies=', (g.babies || []).length, '云端 babies=', Object.keys(cloudBabies).length);
  // ---- 2) 按宝宝合并各数据集合（云端记录 → 对应宝宝本地存储；当前宝宝同步 globalData） ----
  const mergeForBaby = (bid) => {
    // 读该宝宝本地存储
    let local;
    try { local = wx.getStorageSync(BABY_KEY + bid) || {}; } catch (e) { local = {}; }
    // metas（supplies/vaccine/vaccinePlan/foodAllergyMap/diaperStock/shelfWarnings/acknowledgedMilks）
    const cloudMeta = (data.metas || []).find(m => m && m._id === bid);
    if (cloudMeta && cloudMeta.data) {
      const cu = cloudMeta.updatedAt || 0;
      if (cu > (local._metaU || 0)) {
        const md = cloudMeta.data;
        if (md.supplies) local.supplies = Object.assign({ milk: 0, milkFeeds: 0, d3Days: 0 }, md.supplies);
        if (md.vaccine) local.vaccine = Object.assign({}, md.vaccine);
        if (md.foodAllergyMap) local.foodAllergyMap = md.foodAllergyMap;
        if (typeof md.diaperStock === 'number') local.diaperStock = md.diaperStock;
        // 提醒按 id 并集：避免成员推送时把别人新加的开罐/母乳到期提醒整包抹掉
        if (md.shelfWarnings) {
          const map = {};
          (local.shelfWarnings || []).forEach(w => { if (w && w.id) map[w.id] = w; });
          (md.shelfWarnings || []).forEach(w => { if (w && w.id) map[w.id] = w; });
          local.shelfWarnings = Object.keys(map).map(k => map[k]);
        }
        // 疫苗计划同样按 id/名称并集
        if (md.vaccinePlan) {
          const map = {};
          (local.vaccinePlan || []).forEach(v => { if (v) map[v.id || v.name || JSON.stringify(v)] = v; });
          (md.vaccinePlan || []).forEach(v => { if (v) map[v.id || v.name || JSON.stringify(v)] = v; });
          local.vaccinePlan = Object.keys(map).map(k => map[k]);
        }
        // 合并 acknowledgedMilks（取并集，只要有人点了知道了，所有人都消失）
        if (md.acknowledgedMilks) {
          const localAck = local.acknowledgedMilks || [];
          const cloudAck = md.acknowledgedMilks || [];
          local.acknowledgedMilks = [...new Set([...localAck, ...cloudAck])];
        }
        local._metaU = cu;
      }
    }
    // 集合
    console.log("[mergeForBaby] bid=", bid, "cloudRecords=", (data.records||[]).length, "babyIds=", [...new Set((data.records||[]).map(r=>r.babyId))]);
    // 旧数据无 babyId 字段 → 归到宝宝列表中的第一个宝宝（固定，不是当前选中的宝宝）
    // 注意：不能用 g.currentBabyId，否则选中新宝宝后，旧数据会错误地归到新宝宝
    const firstBid = (g.babies && g.babies[0] && g.babies[0].id) || bid;
    // 获取当前用户 openid，用于过滤非自己的记录（未加入家庭时）
    let myOpenid = '';
    try {
      const me = wx.getStorageSync('panda_user') || {};
      myOpenid = me.openid || '';
    } catch (e) {}
    // 判断用户是否加入了家庭
    const hasFamily = !!(g.myFamily && g.myFamily._id);
    const pick = (kind) => (data[kind] || []).filter(d => {
      if (!d) return false;
      if (d.babyId) {
        // 新数据按 babyId 匹配
        if (d.babyId !== bid) return false;
      } else {
        // 旧数据无 babyId → 归到第一个宝宝
        if (bid !== firstBid) return false;
      }
      // 未加入家庭时，只保留自己记录的内容
      if (!hasFamily && myOpenid && d.data && d.data.by && d.data.by.openid && d.data.by.openid !== myOpenid) {
        return false;
      }
      return true;
    });
    const pickedRecords = pick('records');
    console.log("[mergeForBaby] bid=", bid, "pickedRecords=", pickedRecords.length, "localRecords=", (local.records||[]).length);
    local.records = mergeList(local.records, pickedRecords);
    // 未加入家庭时，过滤掉本地残留的其他成员记录（退出家庭后清理残留数据）
    if (!hasFamily && myOpenid) {
      local.records = (local.records || []).filter(r => {
        if (!r || !r.by) return true; // 没有 by 字段的旧记录保留
        if (!r.by.openid) return true; // 没有 openid 的旧记录保留
        return r.by.openid === myOpenid;
      });
    }
    // 库存耗材：有家庭则家庭成员共享，云函数已按家庭过滤，直接合并所有拉取到的库存
    local.stockItems = mergeList(local.stockItems, (data.inventory || []).filter(d => d));
    local.measures = mergeList(local.measures, pick('measures'));
    local.vaccineDone = mergeList(local.vaccineDone, pick('vaccines'));
    // 墓碑删除
    // 库存墓碑不带 babyId（库存按账号/家庭共享），必须按 kind 放行
    const cloudTombs = (data.tombs || []).filter(t => t && (t.kind === 'inventory' || t.babyId === bid));
    const tombByKind = { records: {}, inventory: {}, measures: {}, vaccines: {} };
    cloudTombs.forEach(t => {
      if (tombByKind[t.kind]) tombByKind[t.kind][t.cid] = t.updatedAt || 0;
    });
    const applyTomb = (kind, arr) => {
      if (!arr) return arr;
      const m = tombByKind[kind];
      if (!m) return arr;
      return arr.filter(item => {
        if (!item || !item._cid) return true;
        const tu = m[item._cid];
        if (!tu) return true;
        return (item._u || 0) >= tu; // 本地更新晚于删除 → 保留（稍后重新上传）
      });
    };
    local.records = applyTomb('records', local.records);
    local.stockItems = applyTomb('inventory', local.stockItems);
    local.measures = applyTomb('measures', local.measures);
    local.vaccineDone = applyTomb('vaccines', local.vaccineDone);
    // 写回存储
    try { wx.setStorageSync(BABY_KEY + bid, local); } catch (e) {}
    return local;
  };

  // 合并所有本地已知宝宝 + 云端宝宝（去重）
  const ids = [];
  (g.babies || []).forEach(b => { if (b.id && ids.indexOf(b.id) < 0) ids.push(b.id); });
  (data.babies || []).forEach(b => { if (b._id && perm.canAccessBaby(b._id) && ids.indexOf(b._id) < 0) ids.push(b._id); });
  // 强制把 currentBabyId 加入（即使不在列表里，也要合并旧记录）
  if (g.currentBabyId && ids.indexOf(g.currentBabyId) < 0) ids.push(g.currentBabyId);
  console.log('[merge] currentBabyId=', g.currentBabyId, 'ids=', ids.length, 'idsHasCurrent=', ids.indexOf(g.currentBabyId) >= 0);
  ids.forEach(bid => {
    const local = mergeForBaby(bid);
    // 当前宝宝 → 同步 globalData 缓存
    if (bid === g.currentBabyId) {
      g.records = local.records || [];
      g.stockItems = local.stockItems || [];
      g.measures = local.measures || [];
      g.vaccineDone = local.vaccineDone || [];
      g.supplies = local.supplies || { milk: 0, milkFeeds: 0, d3Days: 0 };
      g.vaccine = local.vaccine || {};
      g.foodAllergyMap = local.foodAllergyMap || {};
      g.diaperStock = local.diaperStock || 0;
      g.shelfWarnings = local.shelfWarnings || [];
      g.vaccinePlan = local.vaccinePlan || [];
    }
  });
  // 如果 currentBabyId 空或不在宝宝列表里，自动切到第一个
  if (g.babies && g.babies.length) {
    const ids = g.babies.map(b => b.id);
    if (!g.currentBabyId || ids.indexOf(g.currentBabyId) < 0) {
      // 优先选自己创建的宝宝（ownerOpenid === openid），其次第一个
      const meOpenid = (g.user && g.user.openid) || getMeta().openid || '';
      const own = g.babies.find(b => b.ownerOpenid === meOpenid);
      g.currentBabyId = (own || g.babies[0]).id;
      // 从 storage 读第一个宝宝的数据（mergeForBaby 已写入）
      try {
        const local = wx.getStorageSync('panda_feeding_baby_' + g.currentBabyId) || {};
        g.records = local.records || [];
        g.stockItems = local.stockItems || [];
        g.measures = local.measures || [];
        g.vaccineDone = local.vaccineDone || [];
        g.supplies = local.supplies || { milk: 0, milkFeeds: 0, d3Days: 0 };
        g.vaccine = local.vaccine || {};
        g.foodAllergyMap = local.foodAllergyMap || {};
        g.diaperStock = local.diaperStock || 0;
        g.shelfWarnings = local.shelfWarnings || [];
        g.vaccinePlan = local.vaccinePlan || [];
      } catch(e) {}
    }
    // 始终同步 g.baby 为当前宝宝
    g.baby = g.babies.find(b => b.id === g.currentBabyId) || g.babies[0];

  }
  // 兜底：如果 g.records 空但云端有 records，按 babyId 过滤后给当前宝宝
  if ((!g.records || g.records.length === 0) && data.records && data.records.length > 0) {
    console.log('[merge] 兜底 records=', data.records.length, 'currentBabyId=', g.currentBabyId);
    // 没有宝宝时，直接清空 records（避免显示旧数据）
    if (!g.currentBabyId) {
      console.log('[merge] 没有宝宝，清空 records');
      g.records = [];
      return;
    }
    // 按当前宝宝的 babyId 过滤，不要把其他宝宝的记录都拉过来
    const filtered = (data.records || [])
      .map(r => r.data || r)
      .filter(r => {
        if (!r) return false;
        if (r.babyId) return r.babyId === g.currentBabyId;  // 新数据按 babyId 匹配
        // 旧数据无 babyId → 只归到第一个宝宝
        const firstBid = (g.babies && g.babies[0] && g.babies[0].id) || g.currentBabyId;
        return g.currentBabyId === firstBid;
      });
    console.log('[merge] 兜底过滤后 records=', filtered.length);
    g.records = filtered;
    try {
      const local = wx.getStorageSync('panda_feeding_baby_' + g.currentBabyId) || {};
      local.records = g.records;
      wx.setStorageSync('panda_feeding_baby_' + g.currentBabyId, local);
    } catch(e) {}
  }
}

/* ==================== 推送（防抖） ==================== */
let _pushTimer = null;
let _conflictShown = 0;

/* 多端冲突手动合并提示：
   云端返回 conflicts（同一条被多端修改且云端较新）。
   「保留本机」→ 强制重推本地版本覆盖云端；「使用云端」→ 拉取云端合并。
   30 分钟内只弹一次，避免静默同步时反复打扰。 */
function handleConflicts(conflicts) {
  if (!conflicts || !conflicts.length) return;
  const now = Date.now();
  if (now - _conflictShown < 30 * 60 * 1000) return;
  _conflictShown = now;
  try {
    const last = wx.getStorageSync('panda_conflict_last') || 0;
    if (now - last < 30 * 60 * 1000) return;
  } catch (e) {}
  const n = conflicts.length;
  wx.showModal({
    title: '发现数据冲突',
    content: '有 ' + n + ' 条记录与其他设备同时修改。点击「保留本机」将以本机版本覆盖；「使用云端」则采用其他设备最新版本（推荐）。',
    confirmText: '保留本机',
    cancelText: '使用云端',
    success: (res) => {
      if (!res.confirm) {
        // 使用云端：拉取合并（云端 _u 较大，merge 后云端胜出）
        try {
          wx.setStorageSync('panda_conflict_last', Date.now());
          const app = getApp();
          pullAll().then(() => { try { app.persist && app.persist(); } catch (e) {} }).catch(() => {});
        } catch (e) {}
        return;
      }
      // 保留本机：强制重推本地版本（本地未 merge，仍是本机值）
      try {
        wx.setStorageSync('panda_conflict_last', Date.now());
        const app = getApp();
        const batches = buildPush(app ? app.globalData : {});
        batches.force = conflicts.map(c => c._id);
        getOpenid().then(openid => {
          if (!openid) return;
          callFn('cloudData', { action: 'push', batches }).catch(() => {});
        }).catch(() => {});
      } catch (e) {}
    }
  });
}

function pushAll(immediate) {
  if (!cloudReady()) return Promise.resolve();
  markPushDirty();
  if (_pushTimer) { clearTimeout(_pushTimer); _pushTimer = null; }
  if (immediate) {
    // 立即执行，不等防抖
    return doPushNow();
  }
  return new Promise(resolve => {
    _pushTimer = setTimeout(() => { _pushTimer = null; doPushNow().then(resolve); }, PUSH_DEBOUNCE);
  });
}

/** 小程序切后台/退出前冲刷未推送的数据（避免防抖窗口内数据丢失） */
function flushPush() {
  if (!_pushTimer && !hasPendingPush()) return Promise.resolve();
  clearTimeout(_pushTimer);
  _pushTimer = null;
  return doPushNow();
}

/** 实际推送（带失败重试一次） */
function doPushNow(attempt) {
  attempt = attempt || 0;
  return new Promise(resolve => {
    try {
      const app = getApp();
      const batches = buildPush(app ? app.globalData : {});
      console.log('[push] babies=', (batches.upserts.babies||[]).length,
        'records=', (batches.upserts.records||[]).length,
        'inventory=', (batches.upserts.inventory||[]).length);
      getOpenid().then(openid => {
        console.log('[push] openid=', openid || '(空)');
        if (!openid) {
          console.log('[push] 失败：openid 为空，未调用云函数');
          return resolve();
        }
        console.log('[push] 调用云函数 cloudData...');
        callFn('cloudData', { action: 'push', batches }).then(r => {
          console.log('[push] 云函数返回', r && r.code, 'msg=', r && r.msg, 'conflicts=', (r && r.conflicts || []).length);
          if (r && r.code === 0) {
            clearPushDirty(); // 已成功上云，清掉待推送标记
            // push 成功后清除已同步墓碑（避免无限重传）
            try {
              const t = getTombs();
              const b = batches.tombstones || {};
              Object.keys(b).forEach(kind => {
                (b[kind] || []).forEach(x => { if (t[kind] && t[kind][x.cid]) delete t[kind][x.cid]; });
              });
              setTombs(t);
            } catch (e) {}
            // 一致性校验：云端返回冲突 → 手动合并提示
            handleConflicts(r.conflicts || []);
          } else if (attempt < 1) {
            console.log('[push] 云函数返回失败，2秒后重试 attempt=', attempt);
            // 云函数返回失败：2 秒后重试一次（网络/瞬时错误）
            setTimeout(() => doPushNow(attempt + 1).then(resolve), 2000);
            return;
          }
          resolve();
        }).catch(e => {
          console.log('[push] 云函数调用异常', e);
          if (attempt < 1) { setTimeout(() => doPushNow(attempt + 1).then(resolve), 2000); return; }
          resolve();
        });
      }).catch(e => {
        console.log('[push] getOpenid 失败', e);
        resolve();
      });
    } catch (e) {
      console.log('[push] doPushNow 异常', e);
      if (attempt < 1) { setTimeout(() => doPushNow(attempt + 1).then(resolve), 2000); return; }
      resolve();
    }
  });
}

/** 登录成功后：先拉云端合并，再推送本地（新账号自动注册用户资料） */
function syncAfterLogin(profile) {
  if (!cloudReady()) return Promise.resolve();
  return getOpenid().then(() => {
    // 上报用户资料
    const p = profile || {};
    return callFn('cloudData', {
      action: 'push',
      batches: {
        upserts: { babies: [], metas: [], records: [], inventory: [], measures: [], vaccines: [] },
        tombstones: {}
      }
    }).then(() => pullAll()).catch(() => pullAll());
  });
}

module.exports = {
  cloudReady,
  getOpenid,
  tomb,
  ensureIds,
  ensure: ensureIds,
  pushAll,
  flushPush,
  hasPendingPush,
  doPushNow,
  pullAll,
  deleteAccount,
  mergeInto,
  syncAfterLogin,
  _buildPush: buildPush
};
