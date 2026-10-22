/**
 * utils/cloud-sync.js —— 多人协作云端同步前端封装
 *
 * 依赖云函数：familyCloud（家庭/邀请码/成员/数据推拉）、loginUser（openid）
 *
 * ⚠️ 订阅消息模板配置：
 *   在 mp.weixin.qq.com「功能-订阅消息」申请提醒类模板后，把模板 ID 填到下方
 *   REMIND_TEMPLATES（type 与 pushReminder 云函数 TMPL_MAP 对应）。
 *   示例：[{ type: 'vaccine', tmplId: 'xxx' }, { type: 'supplement', tmplId: 'xxx' },
 *          { type: 'stock', tmplId: 'xxx' }, { type: 'milk', tmplId: 'xxx' }]
 */
// ⚠️ 订阅消息模板：在 mp.weixin.qq.com「功能 → 订阅消息」申请模板后，
//   把模板 ID 填入下方对应 tmplId（type 与 pushReminder 云函数 TMPL_MAP 对应）。
//   只填已申请的即可；未填的类型的提醒只在站内弹窗显示，不推送。
//   申请指引见 README-后端部署.md 第五节。
// 已按「我的模板」实际标题重新映射（2026-09-10 核对）：
//   疫苗倒计时提醒 / 宝宝喂养提醒(温馨提示) / 库存不足提醒 / 保质期到期提醒
const REMIND_TEMPLATES = [
  { type: 'vaccine',    tmplId: 'gRiBoOCq_rVNKHiPHNbBSO4vfJIOAgh9Rdoj2prJeDE' },  // 疫苗倒计时提醒：下次接种时间/还剩天数/疫苗
  { type: 'supplement', tmplId: 'j5ugla1ONKIwJmm0WJaOUO6BYT7Lvn5cv880cJmjRKc' },  // 宝宝喂养提醒：温馨提示/距离上次（营养品补充用）
  { type: 'stock',      tmplId: 'Ed2TJf1e7tw2iTQLZM0zPVvZnJvTO48TxqwTngYzxug' },  // 库存不足提醒：库存信息/物料名称/当前库存数
  { type: 'milk',       tmplId: '0HAU94XpzyNdezbODf77pPypaEeqyNFsiGwE4TWZmpM' }   // 保质期到期提醒：过期日期/食物名称/物品名称/剩余天数（母乳/耗材到期用）
];
// 备用模板：宝宝喂养提醒（喂养时间/间隔时长/喂养奶量/喂养类型）
//   j5ugla1ONKIwJmm0WJaOUH1gqbEXorwucxDDAY3OWu4 —— 后续可接「喂养间隔提醒」推送

const META_KEY = 'panda_cloud_meta';
const BABY_KEY = 'panda_feeding_baby_';
const STORAGE_KEY = 'panda_feeding_data';

function getMeta() {
  try { return wx.getStorageSync(META_KEY) || {}; } catch (e) { return {}; }
}
function setMeta(m) {
  try { wx.setStorageSync(META_KEY, m); } catch (e) {}
}

function callFn(name, data) {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name,
      data,
      success: res => resolve(res.result || {}),
      fail: reject
    });
  });
}

/** 获取当前 openid */
function getOpenid() {
  const meta = getMeta();
  if (meta.openid) return Promise.resolve(meta.openid);
  return callFn('loginUser', {}).then(r => {
    if (r && r.code === 0 && r.openid) { setMeta(Object.assign(getMeta(), { openid: r.openid })); return r.openid; }
    throw new Error((r && r.msg) || '获取 openid 失败');
  });
}

/** 云端可用性 */
function cloudReady() {
  return !!(wx.cloud && wx.cloud.callFunction);
}

/* ==================== 家庭操作 ==================== */

/** 获取我所在全部家庭（多家庭并存：可同时作为创建者+亲友；自己创建的在前） */
function getMyFamily() {
  console.log('[getMyFamily] called');
  return getOpenid().then(openid => callFn('familyCloud', { action: 'get' }).then(r => {
    console.log('[getMyFamily] result code=', r.code);
    if (r.code !== 0) throw new Error(r.msg);
    // 兼容旧版云函数返回 { family }：新云函数返回 { families }
    const families = r.families || (r.family ? [r.family] : []);
    console.log('[getMyFamily] families=', families.length);
    if (families.length) {
      console.log('[getMyFamily] families=', families.length, 'first._id=', families[0]._id);
      // 同步当前用户权限缓存（perm.js 按宝宝所属家庭判定）
      syncMyPerm(families, openid);
      // 把 familyId 存到 meta，用于 push/pull
      const f = families[0];
      const meta = getMeta();
      console.log('[getMyFamily] old meta.familyId=', meta.familyId, 'new f._id=', f._id);
      if (!meta.familyId || meta.familyId !== f._id) {
        setMeta(Object.assign({}, meta, {
          familyId: f._id,
          familyName: f.name
        }));
        console.log('[getMyFamily] setMeta familyId=', f._id);
      }
    } else {
      const perm = require('./perm.js');
      perm.setMyPerm(null);
    }
    return families[0] || null;
  }));
}

/** 获取我所在的全部家庭（创建者在前；多家庭并存） */
function getMyFamilies() {
  return getOpenid().then(openid => callFn('familyCloud', { action: 'get' }).then(r => {
    if (r.code !== 0) throw new Error(r.msg);
    const families = r.families || (r.family ? [r.family] : []);
    if (families.length) {
      syncMyPerm(families, openid);
    } else {
      const perm = require('./perm.js');
      perm.setMyPerm(null);
    }
    return families || [];
  }));
}

/** 将当前用户在全部家庭中的身份写入权限缓存（perm.js 读取） */
function syncMyPerm(families, myOpenid) {
  const perm = require('./perm.js');
  // 找当前用户在家庭里的 familyRole（妈妈/爸爸/爷爷/奶奶等）
  let myFamilyRole = '';
  if (families && families.length) {
    const f = families[0];
    const me = (f.members || []).find(m => m.openid === myOpenid);
    if (me) myFamilyRole = me.familyRole || '';
  }
  perm.setMyPerm({
    myOpenid,
    myFamilyRole: myFamilyRole,
    families: (families || []).map(f => ({
      _id: f._id, name: f.name, ownerOpenid: f.ownerOpenid,
      members: (f.members || []).map(m => ({
        openid: m.openid, nickname: m.nickname, avatar: m.avatar,
        role: m.role, familyRole: m.familyRole || '', perms: m.perms || {}, status: m.status
      }))
    }))
  });
}

/** 创建家庭 */
function createFamily(name, nickname, avatar) {
  return callFn('familyCloud', { action: 'create', name, nickname, avatar }).then(r => {
    if (r.code !== 0) throw new Error(r.msg);
    setMeta(Object.assign(getMeta(), {
      familyId: r.familyId, familyName: r.name, inviteCode: r.inviteCode, inviteExpire: r.inviteExpire, version: 0
    }));
    return r;
  });
}

/** 凭邀请码加入家庭（可选家庭角色：妈妈/爸爸/爷爷/奶奶等） */
function joinFamily(inviteCode, nickname, avatar, familyRole) {
  return callFn('familyCloud', { action: 'join', inviteCode, nickname, avatar, familyRole }).then(async r => {
    if (r.code !== 0) throw new Error(r.msg);
    // 申请制：待审核（applying）状态不写入本地家庭，主账户审核通过后才同步
    if (r.applying) return r;
    setMeta(Object.assign(getMeta(), {
      familyId: r.familyId, familyName: r.name, inviteCode: '', inviteExpire: 0, version: 0
    }));
    // 加入后立即拉取云端数据包合并到本地
    if (r.data) await applyCloudData(r.data);
    // 刷新当前用户权限缓存（加入家庭后按角色/权限生效）
    try { await getMyFamily(); } catch (e) {}
    return r;
  });
}

/** 主账户审核：同意加入并设置权限（owner/admin/member/viewer） */
function approveMember(familyId, targetOpenid, role) {
  return callFn('familyCloud', { action: 'approveJoin', familyId, targetOpenid, role }).then(r => {
    if (r.code !== 0) throw new Error(r.msg);
    return r;
  });
}

/** 创建者查询待审批加入申请 */
function getPendingApprovals() {
  console.log('[getPendingApprovals] calling cloud function...');
  return callFn('familyCloud', { action: 'getPendingApprovals' }).then(r => {
    console.log('[getPendingApprovals] result=', r);
    if (r.code !== 0) throw new Error(r.msg);
    return r.pending || [];
  }).catch(e => {
    console.log('[getPendingApprovals] error=', e);
    throw e;
  });
}

/** 亲友查询自己的加入申请审批结果 */
function getMyJoinStatus() {
  return callFn('familyCloud', { action: 'getMyJoinStatus' }).then(r => {
    if (r.code !== 0) throw new Error(r.msg);
    return r.results || [];
  });
}

/** 主账户设置成员权限：模块查看/编辑（perms）+ 宝宝范围（perms.babyIds） */
function updateMemberPerms(familyId, targetOpenid, perms, familyRole) {
  return callFn('familyCloud', { action: 'updateMemberPerms', familyId, targetOpenid, perms, familyRole }).then(r => {
    if (r.code !== 0) throw new Error(r.msg);
    return r;
  });
}

/** 主账户审核：拒绝加入 */
function rejectMember(familyId, targetOpenid) {
  return callFn('familyCloud', { action: 'rejectJoin', familyId, targetOpenid }).then(r => {
    if (r.code !== 0) throw new Error(r.msg);
    return r;
  });
}

/** 刷新邀请码 */
function refreshInvite(familyId) {
  return callFn('familyCloud', { action: 'refreshInvite', familyId }).then(r => {
    if (r.code !== 0) throw new Error(r.msg);
    setMeta(Object.assign(getMeta(), { inviteCode: r.inviteCode, inviteExpire: r.inviteExpire }));
    return r;
  });
}

/** 移除成员（仅创建者） */
function removeMember(familyId, openid) {
  return callFn('familyCloud', { action: 'removeMember', familyId, openid }).then(r => {
    if (r.code !== 0) throw new Error(r.msg);
    return r.members;
  });
}

/** 退出家庭 */
function leaveFamily(familyId) {
  return callFn('familyCloud', { action: 'leave', familyId }).then(r => {
    if (r.code !== 0) throw new Error(r.msg);
    setMeta(Object.assign(getMeta(), { familyId: '', familyName: '', inviteCode: '', inviteExpire: 0 }));
    return r;
  });
}

/* ==================== 数据包打包 / 合并 ==================== */

/** 打包本地全部数据为云端数据包 */
function packData() {
  const app = getApp();
  const g = app.globalData;
  const babies = (g.babies || []).map(b => Object.assign({}, b));
  const babiesData = {};
  (babies || []).forEach(b => {
    let d;
    try { d = wx.getStorageSync(BABY_KEY + b.id) || {}; } catch (e) { d = {}; }
    babiesData[b.id] = d;
  });
  return {
    version: getMeta().version || 0,
    babies,
    babiesData,
    updatedAt: Date.now()
  };
}

/** 云端数据包合并到本地（版本比较，云端更新则覆盖） */
function applyCloudData(pkg) {
  return new Promise((resolve) => {
    const app = getApp();
    const g = app.globalData;
    console.log('[applyCloudData] pkg=', pkg && pkg.babies ? 'has babies' : 'no babies', 'records=', (pkg && pkg.records || []).length);
    if (!pkg || !pkg.babies) return resolve(false);
    const meta = getMeta();
    
    // 如果是 cloudData 云函数返回的格式（有顶层 records），用 mergeInto 处理
    if (pkg.records || pkg.inventory || pkg.measures || pkg.vaccines) {
      try {
        const cloudData = require('./cloud-data.js');
        cloudData.mergeInto(app, pkg);
        console.log('[applyCloudData] mergeInto done, records=', (g.records||[]).length);
      } catch (e) { console.log('[applyCloudData] mergeInto err', e); }
      resolve(true);
      return;
    }
    
    // 否则是 familyCloud 返回的格式（babiesData），按原逻辑处理
    // 1) 宝宝列表合并（以云端为准，保留本地独有宝宝）
    let localBabies = g.babies || [];
    const cloudBabies = pkg.babies || [];
    const byId = {};
    localBabies.forEach(b => { byId[b.id] = b; });
    cloudBabies.forEach(b => { 
      const local = byId[b.id] || {};
      byId[b.id] = Object.assign({}, local, b);
    });
    let merged = Object.keys(byId).map(k => byId[k]);
    g.babies = merged;
    // 2) 按宝宝授权过滤（传入 ownerOpenid，避免从本地查找时的时序问题）
    const perm = require('./perm.js');
    merged = merged.filter(b => perm.canAccessBaby(b.id, b.ownerOpenid));
    // 兜底：如果过滤后当前选中的宝宝不在列表中，但 g.baby 有值，把它加回列表
    // （防止亲友加入家庭后，因权限缓存时序问题导致共享宝宝被过滤，进而黄色区域消失）
    if (g.currentBabyId && !merged.find(b => b.id === g.currentBabyId) && g.baby && g.baby.id === g.currentBabyId) {
      merged = [g.baby, ...merged];
    }
    g.babies = merged;
    // 2) 每宝宝数据写本地
    const bd = pkg.babiesData || {};
    Object.keys(bd).forEach(bid => {
      try { wx.setStorageSync(BABY_KEY + bid, bd[bid] || {}); } catch (e) {}
    });
    // 3) 保持当前宝宝
    const cur = merged.find(b => b.id === g.currentBabyId) || merged[0];
    if (cur && cur.id !== g.currentBabyId) {
      g.currentBabyId = cur.id;
      app.switchBaby(cur.id);
    } else if (cur) {
      app.loadBabyData(cur.id);
    }
    // 4) 更新元信息版本
    setMeta(Object.assign(meta, { version: pkg.version, familyName: pkg.familyName || meta.familyName }));
    resolve(true);
  });
}

/** 防抖推送本地数据包到云端 */
let _pushTimer = null;
function push() {
  const meta = getMeta();
  console.log('[push] meta=', JSON.stringify(meta));
  if (!meta.familyId) return Promise.resolve(false);
  return new Promise(resolve => {
    _pushTimer && clearTimeout(_pushTimer);
    _pushTimer = setTimeout(() => {
      const pkg = packData();
      console.log('[push] start familyId=', meta.familyId, 'baseVersion=', pkg.version);
      callFn('familyCloud', { action: 'pushData', familyId: meta.familyId, data: pkg, baseVersion: pkg.version }).then(r => {
        console.log('[push] result=', r.code, 'newVersion=', r.version);
        if (r.code === 0) setMeta(Object.assign(getMeta(), { version: r.version }));
        resolve(r.code === 0);
      }).catch(e => { console.log('[push] fail', e); resolve(false); });
    }, 50);
  });
}

/** 拉取云端最新数据包并合并 */
function pull() {
  const meta = getMeta();
  console.log('[pull] meta=', JSON.stringify(meta));
  // 调 cloudData.pull 拉取所有可见宝宝数据（自己创建的 + 家庭共享的）
  return callFn('cloudData', { action: 'pull' }).then(r => {
    if (r.code !== 0) return false;
    const result = applyCloudData(r.data);
    // 触发 pull 完成回调，让页面自动刷新
    try { getApp() && getApp()._emitPullDone && getApp()._emitPullDone(); } catch (e) {}
    return result;
  }).catch(e => {
    console.log('[pull] cloudData fail, fallback to familyCloud pullData', e);
    // 降级：如果 cloudData 失败，用 familyCloud.pullData
    if (!meta.familyId) return false;
    return callFn('familyCloud', { action: 'pullData', familyId: meta.familyId }).then(r => {
      if (r.code !== 0) return false;
      const result = applyCloudData(r.data);
      // 触发 pull 完成回调，让页面自动刷新
      try { getApp() && getApp()._emitPullDone && getApp()._emitPullDone(); } catch (e) {}
      return result;
    }).catch(() => false);
  });
}

/* ==================== 订阅消息 ==================== */

/** 开启提醒推送：请求订阅授权并登记模板 */
function enableRemind() {
  const meta = getMeta();
  // 无家庭时以主账户（self）开启：主账户可直接使用提醒推送
  const configured = REMIND_TEMPLATES.filter(t => t.tmplId && String(t.tmplId).trim());
  if (!configured.length) return Promise.reject(new Error('尚未配置订阅消息模板：请在小程序后台「功能-订阅消息」申请模板后，把模板 ID 填入 utils/cloud-sync.js 的 REMIND_TEMPLATES'));
  const tmplIds = configured.map(t => t.tmplId);
  return new Promise((resolve, reject) => {
    wx.requestSubscribeMessage({
      tmplIds,
      success: async (res) => {
        const granted = configured.filter(t => res[t.tmplId] === 'accept');
        if (!granted.length) return reject(new Error('未同意订阅，未开启提醒推送'));
        try {
          const r = await callFn('familyCloud', { action: 'subscribe', familyId: meta.familyId || 'self', templateIds: granted });
          resolve(r);
        } catch (e) { reject(e); }
      },
      fail: reject
    });
  });
}

module.exports = {
  REMIND_TEMPLATES,
  cloudReady,
  getOpenid,
  getMyFamily,
  getMyFamilies,
  createFamily,
  joinFamily,
  approveMember,
  getPendingApprovals,
  getMyJoinStatus,
  updateMemberPerms,
  rejectMember,
  refreshInvite,
  removeMember,
  leaveFamily,
  packData,
  applyCloudData,
  push,
  pull,
  enableRemind,
  META_KEY
};
