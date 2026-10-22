/**
 * utils/perm.js —— 家庭成员权限控制（按宝宝所属家庭判定）
 *
 * 权限模型（家庭成员的 perms 字段）：
 *   profile/records/inventory/reminders：false=不可见 | 'view'=只读 | 'edit'=可编辑
 *   babyIds：可访问的宝宝 id 列表（空数组=全部宝宝）
 *
 * 角色默认：
 *   owner / admin  → 全部模块 edit、全部宝宝
 *   member（默认） → 全部模块 edit、全部宝宝（主账户可下调）
 *   viewer         → 全部模块 view、全部宝宝
 *
 * 多家庭并存：一个账号可同时作为创建者（拥有自己的家庭/宝宝）与亲友（加入别人的家庭）。
 *   判定规则：先定位「宝宝所属家庭」（宝宝的 ownerOpenid），再查我在该家庭的角色与权限；
 *   自己的宝宝（无 owner 或 owner=本人）→ 始终全部权限；
 *   不在对方家庭 → 完全不可见/不可编辑。
 *
 * 缓存结构：{ myOpenid, families: [{ _id, name, ownerOpenid, members: [{openid, role, perms}] }] }
 */

const PERM_KEY = 'panda_my_perm';

/* 各模块默认权限 */
const DEFAULT_PERMS = {
  profile: 'edit',
  records: 'edit',
  inventory: 'edit',
  reminders: 'edit'
};

/** 读取当前用户权限缓存；无缓存 → null（视为个人自用/主账户，全权限） */
function getMyOpenid() {
  const me = getMyPerm();
  return (me && me.myOpenid) || '';
}

function getMyPerm() {
  try {
    const p = wx.getStorageSync(PERM_KEY);
    if (p && p.myOpenid) return p;
  } catch (e) {}
  return null;
}

/** 写入当前用户权限缓存（cloud-sync 拉取家庭后调用；传 null 清除） */
function setMyPerm(perm) {
  try { wx.setStorageSync(PERM_KEY, perm || null); } catch (e) {}
}

/** 根据角色派生完整权限（角色兜底） */
function rolePerms(role, perms) {
  const base = Object.assign({}, DEFAULT_PERMS);
  if (role === 'viewer') {
    Object.keys(base).forEach(k => { base[k] = 'view'; });
  }
  // 宝宝详情页（profile）只有 owner/admin 可编辑，家庭成员默认只读
  if (role !== 'owner' && role !== 'admin') {
    base.profile = 'view';
  }
  return Object.assign(base, perms || {});
}

/** 查宝宝所属 ownerOpenid（从 app.globalData.babies，mergeInto 合并时已带 ownerOpenid） */
function babyOwner(babyId) {
  try {
    const app = getApp();
    const b = (app.globalData.babies || []).find(x => x && x.id === babyId);
    return b && b.ownerOpenid;
  } catch (e) {
    return undefined;
  }
}

/** 在全部家庭中找我的成员记录（含所在家庭） */
function myMemberships() {
  const me = getMyPerm();
  if (!me || !me.myOpenid) return [];
  const out = [];
  (me.families || []).forEach(f => {
    const m = (f.members || []).find(x => x.openid === me.myOpenid);
    if (m) out.push({ family: f, member: m });
  });
  return out;
}

/**
 * 当前用户对「某宝宝的某模块」的权限：false | 'view' | 'edit'
 * 规则：
 *   - 自己的宝宝 → edit
 *   - 家庭成员 → 按 accessLevel：view=仅查看，edit=查看和编辑
 *   - 不在家庭 → false
 *   - 家庭中所有宝宝共享同一权限级别
 * @param {string} module - 模块名
 * @param {string} babyId - 宝宝ID
 * @param {string} [ownerOpenid] - 可选，宝宝所属者openid（云端数据自带，优先使用）
 */
function modulePerm(module, babyId, ownerOpenid) {
  const me = getMyPerm();
  // 如果没有权限缓存（未同步家庭/个人自用模式）：
  // - 宝宝无 owner（个人自用）→ 全权限
  // - 宝宝有 owner，但 owner 是我自己 → 全权限
  // - 宝宝有 owner，且不是我自己 → 不可见（防止退出家庭后残留数据）
  if (!me || !me.myOpenid) {
    const owner = ownerOpenid || babyOwner(babyId);
    if (!owner) return 'edit';
    // 从本地用户信息中获取我的 openid，判断是不是自己的宝宝
    try {
      const localMe = wx.getStorageSync('panda_user') || {};
      if (localMe.openid && localMe.openid === owner) return 'edit';
    } catch (e) {}
    return false;
  }
  // 优先使用传入的 ownerOpenid（云端数据自带），避免从本地查找时拿到旧值或缺失
  const owner = ownerOpenid || babyOwner(babyId);
  if (!owner || owner === me.myOpenid) return 'edit'; // 自己的宝宝
  const ms = myMemberships().filter(x => x.family.ownerOpenid === owner);
  if (!ms.length) return false; // 不在该宝宝所属家庭 → 不可见
  // 家庭中所有宝宝共享同一权限级别，取最高权限
  let best = false;
  ms.forEach(({ member }) => {
    const perms = member.perms || {};
    const accessLevel = perms.accessLevel || 'edit'; // 默认可编辑（兼容旧数据）
    if (accessLevel === 'edit') best = 'edit';
    else if (accessLevel === 'view' && best !== 'edit') best = 'view';
  });
  return best;
}

/** 某模块（可选指定宝宝）是否可查看 */
function canView(module, babyId, ownerOpenid) {
  const v = modulePerm(module, babyId, ownerOpenid);
  return v === 'view' || v === 'edit';
}

/** 某模块（可选指定宝宝）是否可编辑/新增 */
function canEdit(module, babyId, ownerOpenid) {
  return modulePerm(module, babyId, ownerOpenid) === 'edit';
}

/** 是否可访问某宝宝（在宝宝所属家庭中任一成员身份即可，无缓存/自己宝宝恒可） */
function canAccessBaby(babyId, ownerOpenid) {
  const me = getMyPerm();
  // 如果没有权限缓存（未同步家庭/个人自用模式）：
  // - 宝宝无 owner（个人自用）→ 可见
  // - 宝宝有 owner，但 owner 是我自己 → 可见
  // - 宝宝有 owner，且不是我自己 → 不可见（防止退出家庭后残留数据）
  if (!me || !me.myOpenid) {
    const owner = ownerOpenid || babyOwner(babyId);
    if (!owner) return true;
    // 从本地用户信息中获取我的 openid，判断是不是自己的宝宝
    try {
      const localMe = wx.getStorageSync('panda_user') || {};
      if (localMe.openid && localMe.openid === owner) return true;
    } catch (e) {}
    return false;
  }
  // 优先使用传入的 ownerOpenid（云端数据自带），避免从本地查找时拿到旧值
  const owner = ownerOpenid || babyOwner(babyId);
  if (!owner || owner === me.myOpenid) return true;
  return myMemberships().some(x => x.family.ownerOpenid === owner);
}

/** 主账户（owner/admin）无限制（按宝宝所属家庭） */
function isAdmin(babyId) {
  const me = getMyPerm();
  if (!me || !me.myOpenid) return true;
  const owner = babyOwner(babyId);
  if (!owner || owner === me.myOpenid) return true;
  return myMemberships().some(x => x.family.ownerOpenid === owner && (x.member.role === 'owner' || x.member.role === 'admin'));
}

module.exports = {
  DEFAULT_PERMS,
  rolePerms,
  getMyOpenid,
  getMyPerm,
  setMyPerm,
  modulePerm,
  canView,
  canEdit,
  canAccessBaby,
  isAdmin,
  PERM_KEY
};
