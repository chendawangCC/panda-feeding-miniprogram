/**
 * 云函数 familyCloud —— 多人协作云端闭环
 *
 * 家庭 + 数据同步统一入口。集合（首次调用自动创建）：
 *   panda_families    家庭文档：{ _id, name, ownerOpenid, members[], inviteCode, inviteExpire, data, updatedAt }
 *   panda_subscriptions 订阅消息登记：{ _id, familyId, openid, templateIds[], createdAt, expireAt }
 *
 * actions:
 *   login           返回当前 openid
 *   create          { name }                           创建家庭（owner + 邀请码）
 *   join            { inviteCode }                     凭邀请码加入家庭，返回家庭含数据包
 *   get             返回当前 openid 所在家庭（不含数据包，体积考虑走 pullData）
 *   refreshInvite   重新生成邀请码（仅 owner / 成员可）
 *   removeMember    { openid }                         移除成员（仅 owner）
 *   leave           退出家庭（owner 不可退）
 *   pushData        { familyId, data, baseVersion }    成员上传数据包（version+1，最后写入者胜）
 *   pullData        { familyId }                       成员拉取最新数据包
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const COLLECTIONS = ['panda_families', 'panda_subscriptions'];
const INVITE_TTL = 30 * 60 * 1000; // 邀请码有效期 30 分钟
const FAM = 'panda_families';
const SUB = 'panda_subscriptions';

async function ensureCollections() {
  for (const name of COLLECTIONS) {
    try { await db.createCollection(name); } catch (e) { /* 已存在 */ }
  }
}

function ok(data) { return { code: 0, ...data }; }
function fail(msg, code = -1) { return { code, msg }; }

/** 是否存在「仍待审核」的申请（已拒绝 rejected 的不算，允许重新申请/换家庭/创建家庭） */
async function hasPendingApply(openid) {
  try {
    const res = await db.collection(FAM).where({ 'pendingApplications.openid': openid }).get();
    return (res.data || []).some(fam => fam.ownerOpenid !== openid &&
      (fam.pendingApplications || []).some(m => m && m.openid === openid && (m.status || 'pending') !== 'rejected'));
  } catch (e) { return false; }
}

function genInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

/** 生成唯一 6 位家庭号（数字） */
async function genFamilyNo() {
  for (let i = 0; i < 10; i++) {
    const no = String(Math.floor(100000 + Math.random() * 900000));
    const r = await db.collection(FAM).where({ familyNo: no }).limit(1).get().catch(() => ({ data: [] }));
    if (!r.data || !r.data.length) return no;
  }
  return '0' + String(Date.now()).slice(-5);
}

function pickMember(family, openid) {
  return (family.members || []).find(m => m.openid === openid) || null;
}

exports.main = async (event) => {
  await ensureCollections();
  const ctx = cloud.getWXContext();
  const openid = ctx.OPENID;
  if (!openid) return fail('获取 openid 失败');
  const action = event && event.action;

  try {
    switch (action) {

      case 'login':
        return ok({ openid });

      // ---- 创建家庭（一个账号只能创建 1 个家庭） ----
      case 'create': {
        // 已创建过未解散的家庭 → 拒绝
        try {
          const mine = await db.collection(FAM).where({ ownerOpenid: openid }).get();
          if ((mine.data || []).some(f => !f.closed)) return fail('你已创建过一个家庭，如需重新创建请先退出并解散当前家庭');
        } catch (e) { /* 查询失败不阻断 */ }
        // 已加入其他家庭（作为亲友）→ 拒绝
        try {
          const _ = db.command;
          const joined = await db.collection(FAM)
            .where({ 'members.openid': openid, ownerOpenid: _.neq(openid) })
            .count();
          if ((joined.total || 0) > 0) return fail('你已加入家庭，不能再创建家庭，请先退出当前家庭');
        } catch (e) { /* 查询失败不阻断 */ }
        // 有待审核的家庭申请 → 拒绝（已拒绝的不算，允许重新创建）
        try {
          if (await hasPendingApply(openid)) return fail('你有待审核的家庭申请，请等待审核结果后再创建家庭');
        } catch (e) { /* 查询失败不阻断 */ }
        const name = (event.name || '').toString().trim();
        const nickname = (event.nickname || '我').toString().trim();
        const avatar = event.avatar || '🐼';
        const familyId = 'fam_' + Date.now() + '_' + Math.floor(Math.random() * 1e6);
        const inviteCode = genInviteCode();
        const now = Date.now();
        // 唯一 6 位家庭号（创建时生成，展示/标识用）
        const familyNo = await genFamilyNo();
        // 创建者的亲友身份：从该账号创建的第一个宝宝的 relation 中获取（创建宝宝时设置的身份，如"妈妈"）
        let ownerFamilyRole = '';
        try {
          const ownerBabiesRes = await db.collection('panda_babies').where({ ownerOpenid: openid }).limit(1).get();
          if (ownerBabiesRes.data && ownerBabiesRes.data[0]) {
            const b = ownerBabiesRes.data[0];
            ownerFamilyRole = (b.relation || (b.data && b.data.relation) || '').trim();
          }
        } catch (e) { /* 获取宝宝身份失败不阻断 */ }
        const doc = {
          _id: familyId,
          familyNo,
          name: name || '我的喂养家庭',
          ownerOpenid: openid,
          members: [{ openid, nickname, avatar, role: 'owner', familyRole: ownerFamilyRole, joinedAt: now }],
          inviteCode,
          inviteExpire: now + INVITE_TTL,
          data: { version: 1, babies: [], babiesData: {}, updatedAt: now },
          updatedAt: now
        };
        await db.collection(FAM).add({ data: doc });
        // 创建家庭后，自动把该账号创建的所有宝宝标记 familyId
        try {
          const babiesRes = await db.collection('panda_babies').where({ ownerOpenid: openid }).get();
          const babyUpdates = (babiesRes.data || []).map(b => 
            db.collection('panda_babies').doc(b._id).update({ data: { familyId, updatedAt: Date.now() } })
          );
          if (babyUpdates.length) await Promise.all(babyUpdates);
        } catch (e) { /* 宝宝关联失败不阻断家庭创建 */ }
        return ok({ familyId, familyNo, name: doc.name, inviteCode, inviteExpire: doc.inviteExpire, members: doc.members });
      }

      // ---- 扫码 / 邀请码加入 ----
      case 'join': {
        const code = (event.inviteCode || '').toString().trim().toUpperCase();
        if (!code) return fail('邀请码为空');
        
        // 检查账号是否有宝宝：有宝宝则不能加入家庭成为亲友，只能创建家庭
        try {
          const babiesRes = await db.collection('panda_babies').where({ ownerOpenid: openid }).count();
          if ((babiesRes.total || 0) > 0) {
            return fail('你已有宝宝，无法加入家庭成为亲友，请先删除全部宝宝或创建自己的家庭');
          }
        } catch (e) {}
        
        // 检查是否已经创建了家庭：已创建家庭则不能加入其他家庭
        try {
          const myFamRes = await db.collection(FAM).where({ ownerOpenid: openid }).count();
          if ((myFamRes.total || 0) > 0) {
            return fail('你已创建家庭，不能再加入其他家庭');
          }
        } catch (e) {}
        
        // 检查是否已经加入了其他家庭（作为亲友）：已加入则不能再加入其他家庭
        try {
          const _ = db.command;
          const joinedRes = await db.collection(FAM)
            .where({ 'members.openid': openid, ownerOpenid: _.neq(openid) })
            .count();
          if ((joinedRes.total || 0) > 0) {
            return fail('你已加入家庭，不能再加入其他家庭');
          }
        } catch (e) {}
        
        const r = await db.collection(FAM).where({ inviteCode: code }).limit(1).get();
        if (!r.data.length) return fail('邀请码无效，请检查后重试');
        const fam = r.data[0];
        if (fam.closed) return fail('该家庭已解散，无法加入');
        if (Date.now() > fam.inviteExpire) return fail('邀请码已过期，请让家人重新分享');
        // 已在「其他家庭」待审 → 不能再申请本家庭；本家庭的待审/已拒绝由下方 existingPending 处理
        try {
          const pendFams = await db.collection(FAM).where({ 'pendingApplications.openid': openid }).get();
          const hasOtherPending = (pendFams.data || []).some(f2 => f2._id !== fam._id && f2.ownerOpenid !== openid &&
            (f2.pendingApplications || []).some(m => m && m.openid === openid && (m.status || 'pending') !== 'rejected'));
          if (hasOtherPending) return fail('你有待审核的家庭申请，请等待审核结果后再加入其他家庭');
        } catch (e) {}
        const me = pickMember(fam, openid);
        if (me) {
          return ok({ familyId: fam._id, name: fam.name, already: true, applying: me.status === 'pending', members: fam.members, data: fam.data });
        }
        // 加入亲友家庭上限：一个账号最多加入 3 个亲友家庭（不含自己创建的家庭）
        try {
          const _ = db.command;
          const joined = await db.collection(FAM)
            .where({ 'members.openid': openid, ownerOpenid: _.neq(openid) })
            .count();
          if ((joined.total || 0) >= 3) return fail('最多可加入 3 个亲友家庭');
        } catch (e) {}
        // 检查是否已经有待审核申请
        const existingPending = (fam.pendingApplications || []).find(m => m.openid === openid);
        if (existingPending && (existingPending.status || 'pending') !== 'rejected') {
          return ok({ familyId: fam._id, name: fam.name, already: true, applying: true, members: fam.members, data: fam.data });
        }
        // 家庭成员上限：最多 6 人（正式成员）
        if ((fam.members || []).length >= 6) return fail('家庭成员已满（最多6人）');
        // 待审核申请数量上限：最多 10 个
        // 重新申请：清掉自己此前的 rejected 记录，避免越积越多
        const pendingList = (fam.pendingApplications || []).filter(m => !(m.openid === openid && m.status === 'rejected'));
        if (pendingList.length >= 10) return fail('待审核申请太多，请稍后再试');
        const nickname = (event.nickname || '我').toString().trim();
        const avatar = event.avatar || '👶';
        const FAMILY_ROLES = ['妈妈', '爸爸', '爷爷', '奶奶', '外公', '外婆', '阿姨', '叔叔', '其他'];
        const familyRole = FAMILY_ROLES.indexOf(event.familyRole) >= 0 ? event.familyRole : '';
        // 申请制：待审核申请存到 pendingApplications，不进 members，由主账户审核同意后再加入
        pendingList.push({ openid, nickname, avatar, familyRole, appliedAt: Date.now() });
        await db.collection(FAM).doc(fam._id).update({ data: { pendingApplications: pendingList, updatedAt: Date.now() } });
        return ok({ familyId: fam._id, name: fam.name, already: false, applying: true, members: fam.members, data: fam.data });
      }

      // ---- 亲友取消加入申请 ----
      case 'cancelJoinApply': {
        const familyId = event.familyId;
        if (!familyId) return fail('家庭ID为空');
        const r = await db.collection(FAM).doc(familyId).get().catch(() => null);
        if (!r || !r.data) return fail('家庭不存在');
        const fam = r.data;
        // 从 pendingApplications 中删除自己（只能取消自己的申请）
        const pendingList = fam.pendingApplications || [];
        const before = pendingList.length;
        const afterList = pendingList.filter(m => m.openid !== openid);
        const after = afterList.length;
        if (before === after) return fail('未找到你的申请记录');
        await db.collection(FAM).doc(familyId).update({ data: { pendingApplications: afterList, updatedAt: Date.now() } });
        return ok({ cancelled: true });
      }

      // ---- 主账户审核：同意加入并设置权限 ----
      // ---- 创建者查询待审批成员 ----
      case 'getPendingApprovals': {
        const mine = await db.collection(FAM).where({ ownerOpenid: openid }).get().catch(() => ({ data: [] }));
        const pending = [];
        (mine.data || []).forEach(fam => {
          // pendingApplications 存储在 data 字段中，不是顶层
          const pendingList = (fam.data && fam.data.pendingApplications) || fam.pendingApplications || [];
          pendingList.forEach(m => {
            if (m && m.openid !== openid && (m.status || 'pending') !== 'rejected') {
              pending.push({
                familyId: fam._id,
                familyName: fam.name,
                openid: m.openid,
                nickname: m.nickname || '亲友',
                avatar: m.avatar || '',
                familyRole: m.familyRole || '',
                appliedAt: m.appliedAt || 0
              });
            }
          });
        });
        return ok({ pending });
      }

      case 'approveJoin': {
        const familyId = event.familyId;
        const target = event.targetOpenid;
        const role = ['owner', 'admin', 'member', 'viewer'].indexOf(event.role) >= 0 ? event.role : 'member';
        if (!familyId || !target) return fail('参数缺失');
        const r = await db.collection(FAM).doc(familyId).get().catch(() => null);
        if (!r || !r.data) return fail('家庭不存在');
        const fam = r.data;
        const me = pickMember(fam, openid);
        if (!me || me.role !== 'owner') return fail('仅主账户可审核');
        if ((fam.members || []).length >= 6) return fail('家庭成员已满（最多6人）');
        // 从 pendingApplications 中找到待审核申请
        const pendingList = fam.pendingApplications || [];
        const apply = pendingList.find(m => m.openid === target);
        if (!apply) return fail('未找到待审核申请');
        // 从 pendingApplications 中删除
        const newPendingList = pendingList.filter(m => m.openid !== target);
        // 加到 members 数组中
        const FAMILY_ROLES = ['妈妈', '爸爸', '爷爷', '奶奶', '外公', '外婆', '阿姨', '叔叔', '其他'];
        const fr = FAMILY_ROLES.indexOf(event.familyRole) >= 0 ? event.familyRole : apply.familyRole;
        const newMember = {
          openid: target,
          nickname: apply.nickname || '亲友',
          avatar: apply.avatar || '',
          role: role,
          status: 'active',
          familyRole: fr,
          joinedAt: Date.now(),
          auditedAt: Date.now()
        };
        const newMembers = (fam.members || []).concat([newMember]);
        await db.collection(FAM).doc(familyId).update({ data: { members: newMembers, pendingApplications: newPendingList, updatedAt: Date.now() } });
        return ok({ members: newMembers });
      }

      // ---- 主账户审核：拒绝加入 ----
      case 'rejectJoin': {
        const familyId = event.familyId;
        const target = event.targetOpenid;
        if (!familyId || !target) return fail('参数缺失');
        const r = await db.collection(FAM).doc(familyId).get().catch(() => null);
        if (!r || !r.data) return fail('家庭不存在');
        const fam = r.data;
        const me = pickMember(fam, openid);
        if (!me || me.role !== 'owner') return fail('仅主账户可审核');
        // 不直接删除，标记为 rejected，让亲友端能收到被拒绝通知
        const pendingList = fam.pendingApplications || [];
        const newPendingList = pendingList.map(m => {
          if (m.openid !== target) return m;
          return Object.assign({}, m, { status: 'rejected', auditedAt: Date.now() });
        });
        await db.collection(FAM).doc(familyId).update({ data: { pendingApplications: newPendingList, updatedAt: Date.now() } });
        return ok({ members: fam.members });
      }

      // ---- 主账户设置成员权限（模块查看/编辑 + 宝宝范围） ----
      case 'updateMemberPerms': {
        const familyId = event.familyId;
        const target = event.targetOpenid;
        const perms = event.perms || {};
        if (!familyId || !target || typeof perms !== 'object') return fail('参数缺失');
        const r = await db.collection(FAM).doc(familyId).get().catch(() => null);
        if (!r || !r.data) return fail('家庭不存在');
        const fam = r.data;
        const me = pickMember(fam, openid);
        if (!me || me.role !== 'owner') return fail('仅主账户可设置权限');
        if (target === openid) return fail('不能设置自己的权限');
        // 权限级别：view=仅查看，edit=查看和编辑（家庭中所有宝宝共享同一权限级别）
        const accessLevel = (perms.accessLevel === 'view') ? 'view' : 'edit';
        const clean = { accessLevel };
        const FAMILY_ROLES = ['妈妈', '爸爸', '爷爷', '奶奶', '外公', '外婆', '阿姨', '叔叔', '其他'];
        const familyRole = FAMILY_ROLES.indexOf(event.familyRole) >= 0 ? event.familyRole : undefined;
        fam.members = (fam.members || []).map(m => {
          if (m.openid !== target) return m;
          const upd = Object.assign({}, m, { perms: clean });
          if (familyRole !== undefined) upd.familyRole = familyRole;
          return upd;
        });
        await db.collection(FAM).doc(familyId).update({ data: { members: fam.members, updatedAt: Date.now() } });
        return ok({ members: fam.members });
      }

      // ---- 获取我所在全部家庭（自己创建的在前；多家庭并存：可同时作为创建者+亲友） ----
      // ---- 亲友查询自己的加入申请状态 ----
      case 'getMyJoinStatus': {
        const results = [];
        // 1. 从 members 中查找正式成员（不包括我自己创建的家庭）
        const all = await db.collection(FAM).where({
          'members.openid': openid
        }).get().catch(() => ({ data: [] }));
        (all.data || []).forEach(fam => {
          // 创建者自己的家庭不返回（不触发加入成功弹窗）
          if (fam.ownerOpenid === openid) return;
          const me = (fam.members || []).find(m => m.openid === openid);
          if (me) {
            results.push({
              familyId: fam._id,
              familyName: fam.name,
              status: me.status || 'active',
              auditedAt: me.auditedAt || 0
            });
          }
        });
        // 2. 从 pendingApplications 中查找待审核和已拒绝申请
        const pendingAll = await db.collection(FAM).where({
          'pendingApplications.openid': openid
        }).get().catch(() => ({ data: [] }));
        (pendingAll.data || []).forEach(fam => {
          const me = (fam.pendingApplications || []).find(m => m.openid === openid);
          if (me) {
            results.push({
              familyId: fam._id,
              familyName: fam.name,
              status: me.status || 'pending',
              appliedAt: me.appliedAt || 0,
              auditedAt: me.auditedAt || 0
            });
          }
        });
        return ok({ results });
      }

      // ---- 清理所有待审核成员（仅创建者，调试用） ----
      case 'clearPendingMembers': {
        const familyId = event.familyId;
        if (!familyId) return fail('家庭ID为空');
        const r = await db.collection(FAM).doc(familyId).get().catch(() => null);
        if (!r || !r.data) return fail('家庭不存在');
        const fam = r.data;
        if (fam.ownerOpenid !== openid) return fail('仅创建者可操作');
        const before = (fam.members || []).length;
        fam.members = (fam.members || []).filter(m => m.status !== 'pending');
        const after = fam.members.length;
        await db.collection(FAM).doc(familyId).update({ data: { members: fam.members, updatedAt: Date.now() } });
        return ok({ cleared: before - after, members: fam.members });
      }

      // ---- 重命名家庭（仅创建者） ----
      case 'renameFamily': {
        const familyId = event.familyId;
        const newName = (event.name || '').toString().trim();
        if (!familyId) return fail('家庭ID为空');
        if (!newName) return fail('家庭名称不能为空');
        if (newName.length > 20) return fail('家庭名称不能超过20个字');
        
        const fam = await db.collection(FAM).doc(familyId).get().catch(() => null);
        if (!fam || !fam.data) return fail('家庭不存在');
        if (fam.data.ownerOpenid !== openid) return fail('只有创建者才能重命名家庭');
        if (fam.data.closed) return fail('家庭已解散');
        
        await db.collection(FAM).doc(familyId).update({
          data: { name: newName, updatedAt: Date.now() }
        });
        return ok({ familyId, name: newName });
      }

      case 'get': {
        // 防御：直接从 wx 上下文取 openid
        const myOpenid = (typeof ctx !== 'undefined' && ctx && ctx.OPENID) || openid;
        // 自己创建的家庭（ownerOpenid 单字段查询，无需数组索引）
        let fams = [];
        try {
          const mine = await db.collection(FAM).where({ ownerOpenid: myOpenid }).get();
          fams = fams.concat(mine.data || []);
        } catch (e) {}
        // 加入的家庭（members.openid 数组查询，需要数组索引；缺失索引时降级为空，不影响已创建家庭的展示）
        try {
          const joined = await db.collection(FAM).where({ 'members.openid': myOpenid }).get();
          (joined.data || []).forEach(f => { if (f && f._id && !fams.some(x => x._id === f._id)) fams.push(f); });
        } catch (e) { /* 数组索引缺失：加入家庭暂不可见，需在云开发控制台为 panda_families 创建 members.openid 索引 */ }
        // 待审核申请的家庭（pendingApplications.openid 查询）
        try {
          const pending = await db.collection(FAM).where({ 'pendingApplications.openid': myOpenid }).get();
          (pending.data || []).forEach(f => { if (f && f._id && !fams.some(x => x._id === f._id)) fams.push(f); });
        } catch (e) {}
        // 过滤掉已解散的家庭
        fams = fams.filter(f => f && !f.closed);
        fams.sort((a, b) => (a.ownerOpenid === myOpenid ? 0 : 1) - (b.ownerOpenid === myOpenid ? 0 : 1));
        return ok({
          families: fams.map(f => ({ _id: f._id, familyNo: f.familyNo || '', name: f.name, ownerOpenid: f.ownerOpenid, members: f.members, pendingApplications: f.pendingApplications || [], inviteCode: f.inviteCode, inviteExpire: f.inviteExpire }))
        });
      }

      // ---- 刷新邀请码 ----
      case 'refreshInvite': {
        const familyId = event.familyId;
        const r = await db.collection(FAM).doc(familyId).get().catch(() => null);
        if (!r || !r.data) return fail('家庭不存在');
        if (r.data.closed) return fail('家庭已解散');
        if (!pickMember(r.data, openid)) return fail('你不在该家庭中');
        const inviteCode = genInviteCode();
        const inviteExpire = Date.now() + INVITE_TTL;
        await db.collection(FAM).doc(familyId).update({ data: { inviteCode, inviteExpire, updatedAt: Date.now() } });
        return ok({ inviteCode, inviteExpire });
      }

      // ---- 移除成员（仅 owner） ----
      case 'removeMember': {
        const familyId = event.familyId;
        const target = event.openid;
        const r = await db.collection(FAM).doc(familyId).get().catch(() => null);
        if (!r || !r.data) return fail('家庭不存在');
        const fam = r.data;
        if (fam.ownerOpenid !== openid) return fail('仅家庭创建者可移除成员');
        if (target === openid) return fail('不能移除自己');
        fam.members = (fam.members || []).filter(m => m.openid !== target);
        await db.collection(FAM).doc(familyId).update({ data: { members: fam.members, updatedAt: Date.now() } });
        return ok({ members: fam.members });
      }

      // ---- 退出家庭 ----
      // 创建者退出 = 解散整个家庭：成员全部失去权限，宝宝数据仅保留在创建者账号中编辑/查看；
      // 成员退出 = 直接退出，失去该家庭的查看/编辑权限。
      case 'leave': {
        const familyId = event.familyId;
        const r = await db.collection(FAM).doc(familyId).get().catch(() => null);
        if (!r || !r.data) return fail('家庭不存在');
        const fam = r.data;
        if (fam.ownerOpenid === openid) {
          // 创建者退出 → 解散家庭：删除家庭文档（关闭通道），清理该家庭全部订阅登记
          await db.collection(FAM).doc(familyId).remove().catch(() => {});
          await db.collection(SUB).where({ familyId }).remove().catch(() => {});
          return ok({ dissolved: true });
        }
        fam.members = (fam.members || []).filter(m => m.openid !== openid);
        // 同时撤销该成员可能遗留的待审核申请，避免创建者侧留下鬼影申请
        const pendingApplications = (fam.pendingApplications || []).filter(m => !m || m.openid !== openid);
        const patch = { members: fam.members, pendingApplications, updatedAt: Date.now() };
        const nestedPending = fam.data && fam.data.pendingApplications;
        if (Array.isArray(nestedPending)) {
          patch.data = Object.assign({}, fam.data, {
            pendingApplications: nestedPending.filter(m => !m || m.openid !== openid)
          });
        }
        await db.collection(FAM).doc(familyId).update({ data: patch });
        // 清理该成员的订阅登记
        await db.collection(SUB).where({ familyId, openid }).remove().catch(() => {});
        return ok({});
      }

      // ---- 上传数据包（成员） ----
      case 'pushData': {
        const familyId = event.familyId;
        const data = event.data;
        if (!familyId || !data) return fail('参数缺失');
        const r = await db.collection(FAM).doc(familyId).get().catch(() => null);
        if (!r || !r.data) return fail('家庭不存在');
        if (!pickMember(r.data, openid)) return fail('你不在该家庭中');
        // 过滤掉已经被创建者删除、但亲友设备本地仍残留的宝宝，避免家庭数据包把它复活
        const famOwner = r.data.ownerOpenid || '';
        const live = {};
        const hasBabyList = Array.isArray(data.babies);
        if (hasBabyList) {
          const kept = [];
          for (const b of data.babies) {
            if (!b || !b.id) continue;
            let okBaby = true;
            try {
              const br = await db.collection('panda_babies').doc(b.id).get();
              const baby = br && br.data;
              const owner = baby && (baby.ownerOpenid || (baby.data && baby.data.ownerOpenid));
              if (!baby || (owner && famOwner && owner !== famOwner)) okBaby = false;
            } catch (e) { /* 查询失败时保守保留，避免误删成员数据 */ }
            if (okBaby) { kept.push(b); live[b.id] = 1; }
          }
          data.babies = kept;
        }
        if (data.babiesData && typeof data.babiesData === 'object') {
          const bd = {};
          Object.keys(data.babiesData).forEach(k => {
            if (!hasBabyList || live[k]) bd[k] = data.babiesData[k];
          });
          data.babiesData = bd;
        }
        // 兼容旧嵌套结构：r.data.data 可能是 { data: 数据包, updatedAt } 或直接就是数据包
        const oldData = (r.data.data && r.data.data.data) ? r.data.data.data : (r.data.data || {});
        const cur = oldData || { version: 0 };
        const nextVersion = Math.max(cur.version || 0, event.baseVersion || 0) + 1;
        data.version = nextVersion;
        data.updatedAt = Date.now();
        // 直接把数据包放到 data 字段，不再嵌套 { data: data }
        await db.collection(FAM).doc(familyId).update({ data: data });
        return ok({ version: nextVersion });
      }

      // ---- 拉取数据包（成员） ----
      case 'pullData': {
        const familyId = event.familyId;
        const r = await db.collection(FAM).doc(familyId).get().catch(() => null);
        if (!r || !r.data) return fail('家庭不存在');
        if (!pickMember(r.data, openid)) return fail('你不在该家庭中');
        // 兼容旧嵌套结构：r.data.data 可能是 { data: 数据包, updatedAt } 或直接就是数据包
        const d = r.data.data;
        const result = (d && d.data) ? d.data : (d || null);
        return ok({ data: result });
      }

      // ---- 订阅消息登记 ----
      case 'subscribe': {
        const familyId = event.familyId;
        const templateIds = Array.isArray(event.templateIds) ? event.templateIds : [];
        if (!familyId || !templateIds.length) return fail('参数缺失');
        const now = Date.now();
        // 个人主账户（self）：无家庭也可开启提醒推送
        if (familyId !== 'self') {
          const r = await db.collection(FAM).doc(familyId).get().catch(() => null);
          if (!r || !r.data) return fail('家庭不存在');
          const me = pickMember(r.data, openid);
          if (!me) return fail('你不在该家庭中');
          if (me.status === 'pending') return fail('加入申请待主账户审核');
        }
        const where = { familyId, openid };
        const exist = await db.collection(SUB).where(where).limit(1).get();
        // 合并已有授权：用户分次授权（每次最多 3 个模板）不能把上一批冲掉
        const prev = exist.data.length ? (exist.data[0].templateIds || []) : [];
        const merged = prev.slice();
        templateIds.forEach(t => { if (merged.indexOf(t) < 0) merged.push(t); });
        const prevLang = (exist.data.length && exist.data[0].lang === 'en') ? 'en' : 'zh';
        const lang = event.lang === 'en' ? 'en' : (event.lang === 'zh' ? 'zh' : prevLang);
        const rec = { familyId, openid, templateIds: merged, lang, updatedAt: now, expireAt: now + 30 * 24 * 3600 * 1000 };
        if (exist.data.length) {
          await db.collection('panda_subscriptions').doc(exist.data[0]._id).update({ data: rec });
        } else {
          rec.createdAt = now;
          await db.collection(SUB).add({ data: rec });
        }
        return ok({ subscribed: true });
      }

      // ---- 切换语言：已授权订阅也要跟着改推送语言 ----
      case 'setLang': {
        const lang = event.lang === 'en' ? 'en' : 'zh';
        try {
          const r = await db.collection(SUB).where({ openid }).update({ data: { lang, updatedAt: Date.now() } });
          return ok({ lang, updated: (r && r.stats && r.stats.updated) || 0 });
        } catch (e) {
          return fail('语言同步失败：' + e.message, -2);
        }
      }

      default:
        return fail('未知操作：' + action);
    }
  } catch (e) {
    return fail('服务异常：' + e.message, -2);
  }
};
