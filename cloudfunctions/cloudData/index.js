/**
 * 云函数 cloudData —— 熊宝喂养全量数据云端同步（多端 / 多成员全同步）
 *
 * 数据模型（集合首次调用自动创建）：
 *   panda_users      用户资料（loginUser 共用 users 集合，此处保持独立 users 兼容）
 *   panda_babies     宝宝档案  { _id: babyId, ownerOpenid, data:{...}, updatedAt }
 *   panda_baby_meta  宝宝小数据 { _id: babyId, ownerOpenid, data:{supplies,vaccine,foodAllergyMap,diaperStock,shelfWarnings,vaccinePlan}, updatedAt }
 *   panda_records    喂养记录  { _id: babyId_cid, ownerOpenid, babyId, cid, data:{...}, updatedAt }
 *   panda_inventory  耗材库存  { _id: babyId_cid, ownerOpenid, babyId, cid, data:{...}, updatedAt }
 *   panda_measures   测量记录  { _id: babyId_cid, ownerOpenid, babyId, cid, data:{...}, updatedAt }
 *   panda_vaccines   疫苗状态  { _id: babyId_cid, ownerOpenid, babyId, cid, data:{...}, updatedAt }
 *   panda_tombs      删除墓碑  { _id: babyId_cid, ownerOpenid, babyId, cid, updatedAt }（删除项增量同步）
 *   panda_families   家庭（familyCloud 使用）
 *
 * actions:
 *   pull   { }                返回当前用户可见全部宝宝的全量数据（records/inventory/measures/vaccines/meta/babies/tombs）
 *   push   { batches }        批量增量同步：{ upserts: {records:[...], inventory:[...], measures:[...], vaccines:[...], metas:[...], babies:[...]}, tombstones: {records:['cid',...], ...} }
 *   wipe   { babyId }         彻底删除某宝宝云端数据（移除宝宝时调用）
 *
 * 可见性 / 权限：
 *   - 自己创建的宝宝（ownerOpenid = 本人）
 *   - 所在家庭（panda_families.members 含本人）的 owner 所创建的宝宝
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const COLLS = {
  babies: 'panda_babies',
  metas: 'panda_baby_meta',
  records: 'panda_records',
  inventory: 'panda_inventory',
  measures: 'panda_measures',
  vaccines: 'panda_vaccines',
  tombs: 'panda_tombs'
};
const COLLECTION_NAMES = Object.values(COLLS);

async function ensureCollections() {
  for (const name of COLLECTION_NAMES) {
    try { await db.createCollection(name); } catch (e) { /* 已存在 */ }
  }
}

function ok(data) { return { code: 0, ...data }; }
function fail(msg, code = -1) { return { code, msg }; }

/** 查询辅助：小结果集整页取回（云数据库单次 limit 上限 100/1000） */
async function getColl(name, where) {
  const MAX = 1000;
  let all = [];
  let skip = 0;
  for (;;) {
    let q = db.collection(name);
    if (where) q = q.where(where);
    const r = await q.skip(skip).limit(MAX).get();
    all = all.concat(r.data || []);
    if (!r.data || r.data.length < MAX) break;
    skip += MAX;
    if (skip > 20000) break; // 安全上限
  }
  return all;
}

/** 获取家庭（本人创建或本人正式加入的，待审核的不算） */
async function myFamilies(openid) {
  const created = await getColl('panda_families', { ownerOpenid: openid });
  let joined = [];
  try {
    joined = await getColl('panda_families', { 'members.openid': openid });
  } catch (e) { joined = []; }
  // 过滤掉待审核状态的家庭：只有正式成员（status 不是 pending）才算加入
  joined = joined.filter(f => {
    const me = (f.members || []).find(m => m.openid === openid);
    return me && me.status !== 'pending';
  });
  const map = {};
  created.concat(joined).forEach(f => { if (f && f._id) map[f._id] = f; });
  return Object.values(map);
}

/** 当前用户可见的宝宝 id 列表（自己的 + 家庭 owner 的） */
async function visibleBabyIds(openid) {
  const ids = [];
  const my = await getColl(COLLS.babies, { ownerOpenid: openid });
  my.forEach(b => { if (b && b._id && ids.indexOf(b._id) < 0) ids.push(b._id); });
  // 兼容旧数据：没有 ownerOpenid 字段的平铺记录，视为本人数据（limit 20 防全表扫描）
  try {
    const _ = db.command;
    const orphanRes = await db.collection(COLLS.babies).where({ ownerOpenid: _.exists(false) }).limit(20).get();
    (orphanRes.data || []).forEach(b => { if (b && b._id && ids.indexOf(b._id) < 0) ids.push(b._id); });
  } catch (e) {}
  const fams = await myFamilies(openid);
  for (const f of fams) {
    const owner = f.ownerOpenid;
    if (!owner || owner === openid) continue;
    const fb = await getColl(COLLS.babies, { ownerOpenid: owner });
    fb.forEach(b => { if (b && b._id && ids.indexOf(b._id) < 0) ids.push(b._id); });
  }
  return ids;
}

/**
 * 判断 openid 是否可写某宝宝（按宝宝所属家庭 + 权限级别）
 * 规则：
 *   - 宝宝 owner 本人恒可写
 *   - 家庭成员按 accessLevel 判定：view=仅查看不可写，edit=查看和编辑可写
 *   - 家庭中所有宝宝共享同一权限级别
 */
async function canWrite(babyId, openid, module) {
  try {
    const r = await db.collection(COLLS.babies).doc(babyId).get();
    const b = r.data;
    if (!b) {
      console.log('[canWrite] baby not found babyId=', babyId);
      return false;
    }
    // 兼容：ownerOpenid 可能在顶层或 data 字段中
    const owner = b.ownerOpenid || (b.data && b.data.ownerOpenid) || '';
    console.log('[canWrite] babyId=', babyId, 'owner=', owner, 'openid=', openid);
    // 旧数据可能没有 ownerOpenid 字段（平铺结构），视为本人数据放行
    if (!owner || owner === openid) {
      console.log('[canWrite] pass: owner is me or empty');
      return true;
    }
    const fams = await myFamilies(openid);
    console.log('[canWrite] myFams count=', fams.length, 'ids=', fams.map(f => f._id));
    for (const f of fams) {
      console.log('[canWrite] check fam=', f._id, 'ownerOpenid=', f.ownerOpenid, 'targetOwner=', owner);
      if (f.ownerOpenid !== owner) continue;
      const m = (f.members || []).find(x => x.openid === openid);
      if (!m) {
        console.log('[canWrite] not member of this fam');
        continue; // 不是该家庭成员，继续检查下一个家庭
      }
      console.log('[canWrite] found member, status=', m.status);
      // 权限级别：view=仅查看不可写，edit=查看和编辑可写
      const perms = m.perms || {};
      const accessLevel = perms.accessLevel || 'edit'; // 默认可编辑（兼容旧数据）
      console.log('[canWrite] accessLevel=', accessLevel);
      if (accessLevel === 'view') return false;
      return true;
    }
    console.log('[canWrite] fail: no matching family');
    return false;
  } catch (e) {
    console.log('[canWrite] err babyId=', babyId, 'openid=', openid, e);
    return false;
  }
}

/**
 * 批量 upsert + 版本冲突检测（一致性校验核心）
 * 每条先查云端 _u：云端较新（cloudU > localU）且未强制 → 跳过写入并记入 conflicts；
 * forceIds 内的 _id 无条件覆盖（用户手动选择「保留本机」）。
 * 写入时统一落库 _u（=本地最后修改时间），保证跨端版本比较准确。
 */
async function upsertChecked(name, docs, forceIds) {
  const conflicts = [];
  forceIds = forceIds || [];
  if (name === 'panda_babies') console.log('[upsert] babies forceIds=', forceIds, 'docs=', (docs||[]).map(d=>d._id));
  for (const d of docs || []) {
    if (!d || !d._id) continue;
    const force = forceIds.indexOf(d._id) >= 0;
    const doc = Object.assign({}, d);
    delete doc._id; // set 时不能更新 _id
    doc._u = (typeof doc._u === 'number' && doc._u > 0) ? doc._u : (doc.updatedAt || Date.now());
    if (!force) {
      try {
        const ex = await db.collection(name).doc(d._id).get().catch(() => null);
        if (ex && ex.data) {
          // 兼容历史嵌套结构：_u 可能被包在 data.data 里
          const cloudU = ex.data._u || (ex.data.data && ex.data.data._u) || 0;
          const localU = doc._u || 0;
          if (cloudU > localU) {
            conflicts.push({ _id: d._id, kind: name, localU: localU, cloudU: cloudU });
            continue;
          }
        }
      } catch (e) { /* 查询失败视为可写 */ }
    }
    try {
      // 业务对象直接放 data，cid/babyId/ownerOpenid/_u/updatedAt 提到顶层
      // （pull 端按顶层 cid 合并；历史数据被多包了一层 data，pull 时会自动兼容）
      const body = (doc.data && doc.data.data) ? doc.data.data : (doc.data !== undefined ? doc.data : {});
      const top = { data: body, updatedAt: doc.updatedAt || Date.now(), _u: doc._u || Date.now() };
      if (doc.cid !== undefined) top.cid = doc.cid;
      if (doc.familyId !== undefined) top.familyId = doc.familyId;
      // babies 集合需要顶层 ownerOpenid/avatar/name 等供 pull 查询
      if (name === 'panda_babies') {
        if (doc.avatar !== undefined) top.avatar = doc.avatar;
        if (doc.name !== undefined) top.name = doc.name;
      }
      // records/inventory/measures/vaccines 都需要顶层 babyId 供 pull 按宝宝过滤
      if (doc.babyId !== undefined) top.babyId = doc.babyId;
      if (doc.ownerOpenid !== undefined) top.ownerOpenid = doc.ownerOpenid;
      await db.collection(name).doc(d._id).set(top);
      if (name === 'panda_babies') console.log('[upsert] babies set ok _id=', d._id, 'ownerOpenid=', doc.ownerOpenid, 'avatar=', doc.avatar);
    } catch (e) {
      console.log('[upsert] babies update FAIL _id=', d._id, e.message);
    }
  }
  return conflicts;
}

/** 批量删除（墓碑同步） */
async function removeMany(name, ids) {
  for (const id of ids || []) {
    if (!id) continue;
    try { await db.collection(name).doc(id).remove(); } catch (e) { /* 不存在也 OK */ }
  }
}

/* ==================== pull：全量拉取 ==================== */
async function doPull(openid) {
  const babyIds = await visibleBabyIds(openid);
  const data = { babies: [], metas: [], records: [], inventory: [], measures: [], vaccines: [], tombs: [] };
  // 先按宝宝拉档案/疫苗
  for (const bid of babyIds) {
    const baby = await getColl(COLLS.babies, { _id: bid });
    console.log('[pull] baby id=', bid, 'top.avatar=', baby[0] && baby[0].avatar, 'data.avatar=', baby[0] && baby[0].data && baby[0].data.avatar);
    // 清理 data 字段的无限递归嵌套（data.data.data...），并自动修复云端数据
    const cleanedBaby = baby.map(b => {
      if (!b || !b.data) return b;
      let depth = 0;
      let cur = b.data;
      // 找到最内层的 data（不含 data 字段的那一层）
      while (cur && cur.data && depth < 20) { cur = cur.data; depth++; }
      if (depth > 0) {
        console.log('[pull] 清理宝宝嵌套数据 bid=', bid, '嵌套深度=', depth);
        // 自动修复云端：用最内层 data 直接替换 data 字段（注意：不要 { data: cur }，否则又多嵌套一层）
        try {
          db.collection(COLLS.babies).doc(bid).update({ data: cur }).catch(()=>{});
        } catch (e) {}
      }
      return Object.assign({}, b, { data: cur });
    });
    data.babies = data.babies.concat(cleanedBaby);
    const meta = await getColl(COLLS.metas, { _id: bid });
    data.metas = data.metas.concat(meta);
    data.vaccines = data.vaccines.concat(await getColl(COLLS.vaccines, { babyId: bid }));
  }
  // records/measures 按可见宝宝过滤拉取（历史无 babyId 的数据只归属本人）
  // 修复越权：原先全表拉取会把陌生宝宝的数据返回给客户端
  for (const bid of babyIds) {
    data.records = data.records.concat(await getColl(COLLS.records, { babyId: bid }));
    data.measures = data.measures.concat(await getColl(COLLS.measures, { babyId: bid }));
    data.tombs = data.tombs.concat(await getColl(COLLS.tombs, { babyId: bid }));
  }
  data.records = data.records.concat(await getColl(COLLS.records, { ownerOpenid: openid }));
  data.measures = data.measures.concat(await getColl(COLLS.measures, { ownerOpenid: openid }));
  // 库存耗材：有家庭则家庭成员共享，无家庭只跟随账号
  const fams = await myFamilies(openid);
  const invOwners = [openid];
  if (fams.length) {
    // 有家庭：拉取家庭中所有成员的库存（familyId 匹配或 ownerOpenid 匹配兼容旧数据）
    const familyIds = fams.map(f => f._id);
    const allInv = await getColl(COLLS.inventory, {});
    // 收集所有家庭成员的 openid（创建者 + 成员）
    const memberOpenids = [];
    fams.forEach(f => {
      memberOpenids.push(f.ownerOpenid);
      (f.members || []).forEach(m => memberOpenids.push(m.openid));
    });
    // 家庭成员的库存墓碑也要回传（成员删了创建者的库存，创建者才能同步消失）
    memberOpenids.forEach(o => { if (o && invOwners.indexOf(o) < 0) invOwners.push(o); });
    data.inventory = allInv.filter(inv => {
      if (!inv) return false;
      // 新数据：familyId 匹配
      if (inv.familyId && familyIds.indexOf(inv.familyId) >= 0) return true;
      // 旧数据兼容：ownerOpenid 是家庭成员
      if (inv.ownerOpenid && memberOpenids.indexOf(inv.ownerOpenid) >= 0) return true;
      return false;
    });
  } else {
    // 无家庭：只拉取自己的库存
    data.inventory = await getColl(COLLS.inventory, { ownerOpenid: openid });
  }
  // 库存墓碑跟随账号 / 家庭成员
  for (const o of invOwners) {
    data.tombs = data.tombs.concat(await getColl(COLLS.tombs, { kind: 'inventory', ownerOpenid: o }));
  }
  // 去重：同一文档可能同时命中 babyId 与 ownerOpenid 条件
  const dedupe = (arr) => {
    const m = {};
    (arr || []).forEach(d => { if (d && d._id) m[d._id] = d; });
    return Object.keys(m).map(k => m[k]);
  };
  ['babies', 'metas', 'records', 'inventory', 'measures', 'vaccines', 'tombs'].forEach(k => {
    data[k] = dedupe(data[k]);
  });
  // 兼容历史嵌套结构：历史写入把业务对象包成了 { data: { cid, data: 业务对象 } }
  const flatten = (arr) => (arr || []).map(d => {
    if (!d) return d;
    const inner = (d.data && d.data.data) ? d.data.data : d.data;
    const cid = d.cid || (d.data && d.data.cid) || '';
    return Object.assign({}, d, { cid: cid, data: inner || {} });
  });
  ['records', 'inventory', 'measures', 'vaccines'].forEach(k => { data[k] = flatten(data[k]); });
  data.metas = (data.metas || []).map(m => {
    if (!m) return m;
    const wrap = m.data || {};
    const inner = (wrap && wrap.data) ? wrap.data : wrap;
    return Object.assign({}, m, { data: inner || {}, updatedAt: m.updatedAt || wrap.updatedAt || wrap._u || 0 });
  });
  return data;
}

/* ==================== push：增量同步 ==================== */
async function doPush(openid, batches) {
  batches = batches || {};
  const ups = batches.upserts || {};
  const tombs = batches.tombstones || {};
  const force = Array.isArray(batches.force) ? batches.force : [];
  const conflicts = [];

  // 按集合处理，逐条校验权限（模块映射：records/inventory/measures→profile/vaccines→profile）
  const plan = [
    ['babies', COLLS.babies, ''],
    ['metas', COLLS.metas, 'profile'],
    ['records', COLLS.records, 'records'],
    ['inventory', COLLS.inventory, 'inventory'],
    ['measures', COLLS.measures, 'profile'],
    ['vaccines', COLLS.vaccines, 'profile']
  ];
  for (const [key, coll, module] of plan) {
    const docs = ups[key] || [];
    const writes = [];
    for (const d of docs) {
      if (!d || !d._id) continue;
      const babyId = d.babyId || (key === 'babies' ? d._id : '');
      if (key === 'babies') {
        // 宝宝档案：测试阶段放宽权限，只要是本人 openid 就能写（兼容旧数据 ownerOpenid 为空的情况）
        console.log('[push] babies d._id=', d._id, 'd.ownerOpenid=', d.ownerOpenid, 'openid=', openid, 'd.avatar=', d.avatar);
        if (d.ownerOpenid && d.ownerOpenid !== openid) continue; // 有 ownerOpenid 且不是本人，才跳过
        writes.push(d);
      } else if (key === 'inventory') {
        // 库存耗材：有家庭则家庭成员共享可写，无家庭只有 owner 本人可写
        if (d.familyId) {
          // 有 familyId：检查是否是该家庭成员
          const fams = await myFamilies(openid);
          const isMember = fams.some(f => f._id === d.familyId);
          if (!isMember) { console.log('[push] inventory skip not family member d._id=', d._id); continue; }
        } else {
          // 无 familyId：只有 owner 本人可写
          if (d.ownerOpenid !== openid) { console.log('[push] inventory skip not owner d._id=', d._id); continue; }
        }
        // 库存文档 id 以创建者 openid 拼接，成员编辑时会用自己 openid 另建一份重复文档
        // → 按 cid 复用已有文档 id，保证同一条库存全家庭只有一份
        if (d.cid) {
          try {
            const exist = await getColl(COLLS.inventory, { cid: d.cid });
            if (exist.length) d._id = exist[0]._id;
          } catch (e) {}
        }
        writes.push(d);
      } else {
        if (!babyId) { console.log('[push] skip no babyId key=', key, 'd._id=', d._id); continue; }
        const ok = await canWrite(babyId, openid, module);
        if (!ok) { console.log('[push] canWrite false key=', key, 'babyId=', babyId, 'openid=', openid); continue; }
        writes.push(d);
      }
    }
    console.log('[push] plan key=', key, 'docs=', docs.length, 'writes=', writes.length);
    const cf = await upsertChecked(coll, writes, force);
    for (const c of cf) conflicts.push(c);
  }

  // 墓碑：records/inventory/measures/vaccines（逐条校验删除权限）
  const tombCollMap = [
    ['records', COLLS.records, 'records'],
    ['inventory', COLLS.inventory, 'inventory'],
    ['measures', COLLS.measures, 'profile'],
    ['vaccines', COLLS.vaccines, 'profile']
  ];
  for (const [key, coll, module] of tombCollMap) {
    const arr = tombs[key] || [];
    const ids = [];
    for (const t of arr) {
      if (!t || !t.cid) continue;
      // 库存耗材：有家庭则家庭成员共享可删除，无家庭只有 owner 本人可删除
      if (key === 'inventory') {
        if (t.familyId) {
          const fams = await myFamilies(openid);
          const isMember = fams.some(f => f._id === t.familyId);
          if (!isMember) continue;
        } else {
          if (t.ownerOpenid !== openid) continue;
        }
      } else {
        if (!(await canWrite(t.babyId, openid, module))) continue; // 无删除权限跳过
      }
      // 同步墓碑到 panda_tombs，并删除对应文档
      // 库存墓碑用 inv_cid 稳定键：成员之间删除同一条不会写出多个墓碑
      const tombId = key === 'inventory' ? ('inv_' + t.cid) : (t.babyId + '_' + t.cid);
      try {
        await db.collection(COLLS.tombs).doc(tombId).set({
          _id: tombId,
          ownerOpenid: openid,
          babyId: t.babyId || '',
          cid: t.cid,
          kind: key,
          updatedAt: t.updatedAt || Date.now()
        });
      } catch (e) {}
      if (key === 'inventory') {
        // 库存文档 _id 由创建者拼接（owner_cid），删除者 openid 可能不同
        // → 按 cid 反查真实文档再删除（修复成员删除创建者库存无效）
        const found = await getColl(COLLS.inventory, { cid: t.cid });
        found.forEach(x => { if (x && x._id) ids.push(x._id); });
        if (t._id) ids.push(t._id);
      } else {
        ids.push(t.babyId + '_' + t.cid);
      }
    }
    await removeMany(coll, ids);
  }
  return { synced: 1, conflicts: conflicts };
}

/* ==================== wipe：彻底删除宝宝云端数据 ==================== */
async function doWipe(openid, babyId) {
  if (!babyId) return fail('缺少 babyId');
  const b = await canWrite(babyId, openid);
  if (!b) return fail('无权限删除该宝宝');
  // 校验 owner（兼容旧数据：ownerOpenid 为空也允许删除）
  let babyOwner = '';
  try {
    const r = await db.collection(COLLS.babies).doc(babyId).get();
    if (!r.data) return fail('宝宝不存在');
    babyOwner = r.data.ownerOpenid || (r.data.data && r.data.data.ownerOpenid) || '';
    if (babyOwner && babyOwner !== openid) return fail('仅创建者可删除宝宝');
  } catch (e) {
    return fail('宝宝不存在');
  }
  for (const coll of [COLLS.records, COLLS.inventory, COLLS.measures, COLLS.vaccines, COLLS.tombs, COLLS.metas, COLLS.babies]) {
    const docs = await getColl(coll, { babyId });
    await removeMany(coll, docs.map(d => d._id));
  }
  await db.collection(COLLS.babies).doc(babyId).remove().catch(() => {});
  console.log('[doWipe] success babyId=', babyId, 'babyOwner=', babyOwner);
  return ok({ wiped: babyId });
}

exports.main = async (event) => {
  await ensureCollections();
  const ctx = cloud.getWXContext();
  const openid = ctx.OPENID;
  if (!openid) return fail('获取 openid 失败');
  const action = event && event.action;
  console.log('[main] action=', action);
  try {
    if (action === 'pull') {
      const data = await doPull(openid);
      return ok({ data });
    }
    if (action === 'push') {
      // 回传冲突：客户端据此弹出「保留本机 / 使用云端」
      const r = await doPush(openid, event.batches || {});
      return ok({ synced: (r && r.synced) || 0, conflicts: (r && r.conflicts) || [] });
    }
    if (action === 'wipe') {
      return await doWipe(openid, event.babyId);
    }

    // ---- 全库清零（测试用：删除所有集合所有文档） ----
    if (action === 'resetAll') {
      const allNames = Object.values(COLLS).concat(['panda_families', 'panda_baby_meta']);
      const result = {};
      for (const name of allNames) {
        let deleted = 0;
        let guard = 0;
        while (guard++ < 100) {
          const r = await db.collection(name).limit(100).get().catch(() => ({ data: [] }));
          if (!r.data || !r.data.length) break;
          for (const d of r.data) {
            await db.collection(name).doc(d._id).remove().catch(() => {});
            deleted++;
          }
          if (r.data.length < 100) break;
        }
        result[name] = deleted;
      }
      console.log('[resetAll] done', result);
      return ok({ deleted: result });
    }

    // ---- 注销账号：永久删除本人全部云端数据，再登录即全新账号 ----
    if (action === 'deleteAccount') {
      // 1) 删除本人名下所有业务集合数据（分页逐条删）
      for (const name of COLLECTION_NAMES) {
        let guard = 0;
        while (guard++ < 50) {
          const r = await db.collection(name).where({ ownerOpenid: openid }).limit(100).get().catch(() => ({ data: [] }));
          if (!r.data || !r.data.length) break;
          for (const d of r.data) { await db.collection(name).doc(d._id).remove().catch(() => {}); }
          if (r.data.length < 100) break;
        }
      }
      // 2) 家庭：本人是创建者 → 解散家庭（closed）；本人是成员 → 从成员列表移除
      const famCol = db.collection('panda_families');
      const mineAsOwner = await famCol.where({ ownerOpenid: openid }).get().catch(() => ({ data: [] }));
      for (const f of (mineAsOwner.data || [])) {
        await famCol.doc(f._id).update({ data: { closed: true }, closed: true }).catch(() => {});
      }
      const mineAsMember = await famCol.where({ members: _.elemMatch({ openid }) }).get().catch(() => ({ data: [] }));
      for (const f of (mineAsMember.data || [])) {
        const members = (f.members || []).filter(m => m.openid !== openid);
        await famCol.doc(f._id).update({ data: { members }, members }).catch(() => {});
      }
      // 3) 删除 users 集合里的用户记录（重新登录 = 新用户）
      await db.collection('users').where({ openid }).remove().catch(() => {});
      return ok({ deleted: true });
    }
    return fail('未知 action: ' + action);
  } catch (e) {
    return fail('cloudData 执行失败: ' + (e && e.message || e));
  }
};
