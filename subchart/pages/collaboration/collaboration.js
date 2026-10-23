// pages/collaboration/collaboration.js —— 多人协作：云端家庭闭环
const app = getApp();
const qrcode = require('../../utils/qrcode.js');
const cs = require('../../../utils/cloud-sync.js');
const permUtil = require('../../../utils/perm.js');

/* 可设置权限的模块 */
const PERM_MODULES = [
  { key: 'profile', label: '成长档案' },
  { key: 'records', label: '喂养记录' },
  { key: 'inventory', label: '喂养台' },
  { key: 'reminders', label: '今日提醒' }
];

Page({
  onShareTimeline() {
    return { title: this._t('熊宝喂养 · 邀请家人共同记录', 'Panda Feeding · Invite family to record together') };
  },

  data: {
    lang: 'zh',
    roleLabelMap: {},
    familyRolesView: ['妈妈', '爸爸', '爷爷', '奶奶', '外公', '外婆', '阿姨', '叔叔', '其他'],
    safeTop: (app.globalData && app.globalData.safeTop) || 88,
    cloudOk: false,        // 云开发是否可用
    loading: false,
    family: null,          // 当前家庭（云端），null 表示未创建/未加入
    fams: [],              // 我所在的全部家庭（创建者在前；可同时创建 + 加入亲友家庭）
    famIdx: 0,             // 当前选中的家庭下标
    members: [],           // 云端成员
    isOwner: false,
    showJoin: false,       // 加入家庭弹窗
    joinCode: '',
    joinSaving: false,
    // 家庭角色（亲友加入时自选 / 创建者可修改）
    familyRoles: ['妈妈', '爸爸', '爷爷', '奶奶', '外公', '外婆', '阿姨', '叔叔', '其他'],
    joinFamilyRole: '',
    joinFamilyRoleIdx: -1,
    babyName: '',
    showInvite: false,
    invite: { familyName: '', code: '', expireText: '' },
    showCreate: false,     // 创建家庭弹窗
    showMemberAction: false, // 成员操作菜单弹窗
    actionMember: null,      // 当前操作的成员
    hasMyFamily: false,    // 是否已创建自己的家庭（解散后恢复 false，创建按钮重新出现）
    joinedCount: 0,        // 已加入的亲友家庭数（满 3 后隐藏加入按钮，退出后恢复）
    familyNameInput: '',
    // 成员权限设置抽屉
    showPerm: false,
    permModules: PERM_MODULES,
    permEditor: null,      // { openid, nickname, role, perms: {}, babyIds: [], allBabies: true, babies: [] }
    permSaving: false,
    pendingJoin: null,     // 待审核的加入申请
    // ===== 扫码加入家庭（与我的页一致：10秒超时 · 失败弹窗 · 确认加入 · 申请中/成功状态） =====
    showScan: false,
    scanState: '',
    scanResult: '',
    scanCode: '',
    myFamilyRole: ''
  },

  _en() { return (wx.getStorageSync('lang') || this.data.lang || 'zh') === 'en'; },
  _t(zh, enTxt) { return this._en() ? enTxt : zh; },

  /* 亲友角色英文标签（底层仍存中文值，仅显示层映射） */
  _roleMap() {
    const en = {
      '妈妈': 'Mom', '爸爸': 'Dad', '爷爷': 'Grandpa', '奶奶': 'Grandma',
      '外公': 'Grandpa (maternal)', '外婆': 'Grandma (maternal)',
      '阿姨': 'Aunt', '叔叔': 'Uncle', '其他': 'Other'
    };
    if (!this._en()) return {};
    return en;
  },

  /* 亲友自己修改亲属关系 */
  openMyRolePicker() {
    const fam = this.data.family;
    if (!fam || fam._selfOnly) return;
    const myOpenid = this._myOpenid;
    const me = (this.data.members || []).find(m => m.openid === myOpenid);
    if (!me) return;
    wx.showActionSheet({
      itemList: this.data.familyRolesView,
      success: (res) => {
        const newRole = this.data.familyRoles[res.tapIndex];
        wx.showLoading({ title: this._t('保存中', 'Saving') });
        cs.updateMemberPerms(fam._id, myOpenid, {}, newRole).then(r => {
          wx.hideLoading();
          this.setData({ members: r.members || [], 'family.members': r.members || [], myFamilyRole: newRole });
          wx.showToast({ title: this._t('身份已更新为' + newRole, 'Role updated to ' + (this._roleMap()[newRole] || newRole)), icon: 'none' });
        }).catch(e => {
          wx.hideLoading();
          wx.showToast({ title: this._t('保存失败：' + (e.message || ''), 'Save failed: ' + (e.message || '')), icon: 'none' });
        });
      }
    });
  },

  onShow() {
    {
      const en = (wx.getStorageSync('lang') || 'zh') === 'en';
      const ROLE_EN = ['Mom', 'Dad', 'Grandpa', 'Grandma', 'Grandpa (maternal)', 'Grandma (maternal)', 'Aunt', 'Uncle', 'Other'];
      this.setData({
        lang: en ? 'en' : 'zh',
        roleLabelMap: this._roleMap(),
        familyRolesView: en ? ROLE_EN : ['妈妈', '爸爸', '爷爷', '奶奶', '外公', '外婆', '阿姨', '叔叔', '其他']
      });
    }
    this.setData({ babyName: (app.globalData.baby || {}).name || '' });
    const cloudOk = cs.cloudReady();
    this.setData({ cloudOk });
    // 无需创建家庭：默认主用户自己为一个家庭（邀请家人后才成为多人家庭）
    this.initSelfFamily();
    
    // 处理扫码进入的待处理邀请码（登录后自动填入）
    const pendingInviteCode = app.globalData.pendingInviteCode;
    const user = wx.getStorageSync('panda_user') || {};
    if (pendingInviteCode && user.logged && user.openid) {
      app.globalData.pendingInviteCode = null;
      // 自动打开加入弹窗并填入邀请码
      this.openJoin();
      this.setData({ joinCode: pendingInviteCode });
      wx.showToast({ title: this._t('已识别邀请码，请选择身份后提交', 'Invite code detected. Choose your role, then submit.'), icon: 'none' });
    }
    
    if (cloudOk) {
      // 先显示本地数据，后台拉取最新
      this.loadFamily();
      cs.pull().then(() => {
        this.loadFamily();
      }).catch(() => {});
    }
    // 每 2 秒自动刷新一次，检测新的加入申请
    this._refreshTimer = setInterval(() => {
      if (cs.cloudReady()) this.loadFamily();
    }, 2000);
  },

  onHide() {
    if (this._refreshTimer) {
      clearInterval(this._refreshTimer);
      this._refreshTimer = null;
    }
  },

  onUnload() {
    if (this._refreshTimer) {
      clearInterval(this._refreshTimer);
      this._refreshTimer = null;
    }
  },

  goBack() {
    wx.navigateBack();
  },

  /* ============ 默认个人家庭 ============ */
  initSelfFamily() {
    if (this.data.family && !this.data.family._selfOnly) return; // 已有云端多人家庭
    const user = wx.getStorageSync('panda_user') || {};
    const babyName = (app.globalData.baby || {}).name || '';
    const selfFamily = {
      name: babyName ? (babyName + '的家庭') : '我的家庭',
      ownerOpenid: this._myOpenid || '',
      members: [{
        openid: this._myOpenid || '',
        // 未注册登录显示「去登录或注册」，注册登录后显示真实账户名与头像
        nickname: user.logged ? (user.nickname || '未设置昵称') : '去登录或注册',
        avatar: (user.logged && user.avatar) ? user.avatar : '/images/brand-logo.png',
        role: 'owner',
        joinedAt: ''
      }],
      _selfOnly: true
    };
    this.setData({ family: selfFamily, members: selfFamily.members, isOwner: true, hasMyFamily: false, joinedCount: 0 });
  },

  /* ============ 家庭加载（多家庭并存：我创建的 + 我加入的亲友家庭） ============ */
  loadFamily() {
    this.setData({ loading: true });
    return cs.getOpenid().then(openid => {
      this._myOpenid = openid;
      this.setData({ myOpenid: openid });
      return cs.getMyFamilies();
    }).then(async fams => {
      // 检测到新成员加入，自动关闭分享二维码弹窗
      if (this.data.showInvite && fams && fams.length) {
        const fam = fams.find(f => f._id === (this.data.family || {})._id);
        if (fam && (fam.members || []).length > 2) {
          this.setData({ showInvite: false });
        }
      }
      console.log('[loadFamily] fams=', fams && fams.length);
      
      // 检查待审核状态：从 pendingApplications 中查找当前用户的申请
      let pendingJoin = null;
      const myOid = this._myOpenid;
      for (const fam of (fams || [])) {
        // 我不是创建者，检查我在 pendingApplications 中的状态
        if (fam.ownerOpenid !== myOid) {
          const me = (fam.pendingApplications || []).find(m => m && m.openid === myOid);
          if (me && (me.status || 'pending') !== 'rejected') {
            pendingJoin = {
              familyId: fam._id,
              familyName: fam.name,
              status: 'pending'
            };
            break;
          }
        }
      }
      if (pendingJoin) {
        console.log('[loadFamily] 待审核状态，显示待加入提醒');
        // 同步设置到 globalData，确保其他页面（我的宝贝页、切换宝宝抽屉）也能识别
        app.globalData.pendingJoin = pendingJoin;
        app.globalData.myFamily = null;
        this.setData({ 
          loading: false,
          pendingJoin: pendingJoin,
          family: null,
          members: [],
          isOwner: false,
          fams: [],
          famIdx: 0
        });
        return;
      }
      // 没有待审核状态时，清除 globalData.pendingJoin
      app.globalData.pendingJoin = null;
      
      // 检查：如果没有宝宝但有自己创建的家庭，自动解散该家庭
      const babyCount = (app.globalData.babies || []).length;
      const myFamilies = (fams || []).filter(f => f.ownerOpenid === myOid);
      if (babyCount === 0 && myFamilies.length) {
        console.log('[loadFamily] 没有宝宝但有自己创建的家庭，自动解散');
        // 只解散自己创建的家庭，加入的家庭保留
        for (const fam of myFamilies) {
          try {
            await cs.dismissFamily(fam._id);
          } catch (e) {
            console.log('[loadFamily] 解散家庭失败', e);
          }
        }
        // 重新加载家庭列表（剩下加入的家庭）
        const remaining = (fams || []).filter(f => f.ownerOpenid !== myOid);
        if (remaining.length) {
          const idx = 0;
          this.setData({ fams: remaining, famIdx: 0, hasMyFamily: false, joinedCount: remaining.length });
          this.applyFamily(remaining[0]);
          this.checkPendingInvite();
          cs.pull();
        } else {
          this.initSelfFamily();
          this.setData({ loading: false });
        }
        return;
      }
      
      if (fams && fams.length) {
        // 默认选中第一个（自己创建的在前）；若当前已选中某家庭则保留选中
        const keepIdx = this.data.famIdx;
        const idx = (keepIdx >= 0 && keepIdx < fams.length) ? keepIdx : 0;
        // 创建按钮：仅在自己未创建家庭时显示（解散后自动恢复）；加入按钮：未创建家庭且未加入其他家庭时显示
        const myOid = this._myOpenid;
        const hasMyFamily = fams.some(f => f.ownerOpenid === myOid);
        const joinedCount = fams.filter(f => f.ownerOpenid !== myOid).length;
        this.setData({ fams, famIdx: idx, hasMyFamily, joinedCount });
        this.applyFamily(fams[idx]);
        // 主账户检测到待审核加入申请 → 自动弹窗
        this.checkPendingInvite();
        // 拉取并合并最新数据（记录 / 疫苗 / 库存等）
        cs.pull();
      } else {
        // 云端无家庭 → 保持默认个人家庭
        this.initSelfFamily();
        this.setData({ loading: false });
      }
    }).catch((err) => {
      this.initSelfFamily();
      this.setData({ loading: false });
      const full = JSON.stringify(err || {});
      const real = (err && (err.message || err.errMsg)) ? String(err.message || err.errMsg) : full;
      console.error('[collab] getMyFamilies fail full:', err, full);
      wx.showModal({ title: this._t('拉取失败', 'Sync failed'), content: String(real).slice(0, 200), showCancel: false });
    });
  },

  /* 应用某个家庭为当前展示（复用成员/权限/审核逻辑） */
  applyFamily(family) {
    if (!family) return;
    const user = wx.getStorageSync('panda_user') || {};
    const members = (family.members || []).map(m => {
      if (m.role === 'owner' && m.openid === this._myOpenid) {
        return Object.assign({}, m, {
          nickname: user.logged ? (user.nickname || m.nickname || '未设置昵称') : (m.nickname || '去登录或注册'),
          avatar: (user.logged && user.avatar) ? user.avatar : '/images/brand-logo.png'
        });
      }
      return m;
    });
    // 批量把 cloud:// 头像转临时 URL
    const cloudIds = members.filter(m => m.avatar && m.avatar.indexOf('cloud://') === 0).map(m => m.avatar);
    if (cloudIds.length) {
      wx.cloud.getTempFileURL({ fileList: cloudIds }).then(r => {
        const urlMap = {};
        (r.fileList || []).forEach(f => { urlMap[f.fileID] = f.tempFileURL; });
        const fixed = members.map(m => ({ ...m, avatar: urlMap[m.avatar] || m.avatar }));
        this.setData({
          family: Object.assign({}, family, { members: fixed }),
          members: fixed,
          isOwner: family.ownerOpenid === this._myOpenid,
          loading: false
        });
      }).catch(() => {});
    }
    // 待审核申请从 pendingApplications 获取，正式成员就是 members（创建者也在其中）
    // 待审核申请也做昵称兜底
    const fmtDate = (ts) => {
      if (!ts) return '';
      const d = new Date(Number(ts));
      if (isNaN(d.getTime())) return '';
      return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    };
    const pendingMembers = (family.pendingApplications || []).filter(p => p && (p.status || 'pending') !== 'rejected').map(p => {
      let nick = p.nickname || '';
      if (!nick || /^[\x00-\x1F\x7F-\x9F]+$/.test(nick) || nick.length < 1) {
        nick = '亲友用户';
      }
      return Object.assign({}, p, { nickname: nick, appliedAt: fmtDate(p.appliedAt || p.createdAt) });
    });
    const meInfo = members.find(m => m.openid === this._myOpenid);
    this.setData({
      family: Object.assign({}, family, { members }),
      members,
      pendingMembers,
      myFamilyRole: meInfo ? (meInfo.familyRole || '') : '',
      isOwner: family.ownerOpenid === this._myOpenid,
      loading: false
    });
  },

  /* 切换当前家庭 */
  switchFamily(e) {
    const idx = Number(e.currentTarget.dataset.idx);
    const fam = (this.data.fams || [])[idx];
    if (!fam) return;
    this.setData({ famIdx: idx });
    this.applyFamily(fam);
  },

  /* ============ 加入其他家庭（邀请码 / 扫码；创建者也可加入亲友家庭；加入时自选家庭角色） ============ */
  openJoin() {
    // 先检查是否登录
    const user = wx.getStorageSync('panda_user') || {};
    if (!user.logged || !user.openid) {
      wx.showModal({
        title: this._t('提示', 'Notice'),
        content: this._t('请先登录账号后再加入家庭', 'Please sign in before joining a family'),
        showCancel: false,
        success: () => {
          // 跳转到我的页，自动弹出登录抽屉
          const app = getApp();
          app.globalData.pendingLogin = true;
          wx.switchTab({ url: '/pages/plan/plan' });
        }
      });
      return;
    }
    // 规则：一个账号只能创建或加入1个家庭
    const hasMyFamily = this.data.hasMyFamily;
    const joined = (this.data.fams || []).filter(f => !f._selfOnly && f.ownerOpenid !== this._myOpenid).length;
    if (hasMyFamily) {
      wx.showToast({ title: this._t('您已创建家庭，不能再加入其他家庭', 'You already created a family and cannot join another'), icon: 'none' });
      return;
    }
    if (joined >= 1) {
      wx.showToast({ title: this._t('您已加入1个家庭，不能再加入其他家庭', 'You already joined one family and cannot join another'), icon: 'none' });
      return;
    }
    this.setData({ showJoin: true, joinCode: '', joinFamilyRole: '', joinFamilyRoleIdx: -1 });
  },
  closeJoin() {
    this.setData({ showJoin: false });
  },
  onJoinCode(e) {
    this.setData({ joinCode: e.detail.value });
  },
  onJoinRoleChange(e) {
    const idx = Number(e.detail.value);
    const roles = this.data.familyRoles;
    this.setData({ joinFamilyRoleIdx: idx, joinFamilyRole: roles[idx] || '' });
  },
  /* ==================== 扫码加入家庭（跳转到我的页扫码，用同一套代码） ==================== */
  scanJoin() {
    // 先检查是否登录
    const user = wx.getStorageSync('panda_user') || {};
    if (!user.logged || !user.openid) {
      wx.showModal({
        title: this._t('提示', 'Notice'),
        content: this._t('请先登录账号后再扫码加入家庭', 'Please sign in before scanning to join'),
        showCancel: false,
        success: () => {
          const app = getApp();
          app.globalData.pendingLogin = true;
          wx.switchTab({ url: '/pages/plan/plan' });
        }
      });
      return;
    }
    // 跳转到我的页，调用同一套扫码加入功能
    wx.switchTab({
      url: '/pages/plan/plan',
      success: () => {
        // 跳转成功后，自动触发我的页的扫码功能
        setTimeout(() => {
          const page = getCurrentPages().pop();
          if (page && page.scan) {
            page.scan();
          }
        }, 500);
      }
    });
  },

  // 扫码成功 → 点击加入家庭（弹出身份选择弹窗，用户选完再提交申请）
  confirmJoin() {
    const code = this.data.scanCode || '';
    if (!code) {
      wx.showToast({ title: this._t('邀请码为空', 'Invite code is empty'), icon: 'none' });
      return;
    }
    // 先检查是否登录
    const user = wx.getStorageSync('panda_user') || {};
    if (!user.logged || !user.openid) {
      wx.showModal({
        title: this._t('提示', 'Notice'),
        content: this._t('请先登录账号后再加入家庭', 'Please sign in before joining a family'),
        showCancel: false,
        success: () => {
          this.setData({ showScan: false });
          const app = getApp();
          app.globalData.pendingLogin = true;
          wx.switchTab({ url: '/pages/plan/plan' });
        }
      });
      return;
    }
    // 关闭扫码弹窗，打开手动加入弹窗，自动填入邀请码，让用户选身份
    this.setData({ showScan: false, showJoin: true, joinCode: code, joinFamilyRole: '', joinFamilyRoleIdx: -1 });
  },
  doJoinSubmit(code) {
    const that = this;
    this.setData({ scanState: 'joining' });
    const user = wx.getStorageSync('panda_user') || {};
    cs.joinFamily(code, (user.logged && user.nickname) ? user.nickname : '去登录或注册', (user.logged && user.avatar) ? user.avatar : '/images/brand-logo.png').then(r => {
      if (r.applying) {
        that.setData({ scanState: 'applying', scanResult: r.name || '家庭' });
      } else if (r.already) {
        that.setData({ scanState: 'done', scanResult: r.name || '家庭' });
        wx.showToast({ title: this._t('你已在该家庭中', 'You are already in this family'), icon: 'none' });
      } else {
        that.setData({ scanState: 'done', scanResult: r.name || '家庭' });
      }
      // 刷新家庭权限缓存 + 拉取云端数据
      cs.getMyFamily();
      cs.pull();
      that.loadFamily();
    }).catch(e => {
      wx.showToast({ title: this._t('加入失败：' + (e.message || ''), 'Join failed: ' + (e.message || '')), icon: 'none' });
      that.setData({ scanState: 'fail' });
    });
  },
  doJoin() {
    const code = (this.data.joinCode || '').trim().toUpperCase();
    if (!code) {
      wx.showToast({ title: this._t('请输入邀请码', 'Please enter the invite code'), icon: 'none' });
      return;
    }
    // 提交申请前必须先登录
    const user = wx.getStorageSync('panda_user') || {};
    if (!user.logged || !user.openid) {
      wx.showModal({
        title: this._t('提示', 'Notice'),
        content: this._t('请先登录账号后再申请加入家庭', 'Please sign in before requesting to join'),
        showCancel: false,
        success: () => {
          this.setData({ showJoin: false });
          // 跳转到登录页
          const app = getApp();
          app.globalData.pendingLogin = true;
          wx.switchTab({ url: '/pages/plan/plan' });
        }
      });
      return;
    }
    // 先弹窗确认：告知加入家庭后不能新建宝宝、不能创建家庭
    wx.showModal({
      title: this._t('确认加入家庭', 'Join this family?'),
      content: this._t('加入家庭后，你将作为「亲友」身份使用小程序：\n\n• 不能新建自己的宝宝\n• 不能创建自己的家庭\n• 可以查看和记录家庭共享宝宝的喂养信息\n\n确定要申请加入吗？', 'You will use the app as a family member:\n\n• You cannot create your own baby\n• You cannot create your own family\n• You can view and record the shared baby\n\nRequest to join?'),
      confirmText: '申请加入',
      cancelText: '取消',
      success: (res) => {
        if (!res.confirm) return;
        this.doJoinSubmit(code, user);
      }
    });
  },
  doJoinSubmit(code, user) {
    // 提交前确保昵称不为空：如果昵称为空或默认占位，先拉取微信头像昵称
    if (!user.nickname || user.nickname === '去登录或注册' || user.nickname.length < 1) {
      wx.getUserProfile({
        desc: '用于加入家庭时显示你的昵称',
        success: (profile) => {
          const newUser = Object.assign({}, user, {
            nickname: profile.userInfo.nickName,
            avatar: profile.userInfo.avatarUrl
          });
          wx.setStorageSync('panda_user', newUser);
          this.setData({ joinSaving: true });
          cs.joinFamily(code, newUser.nickname, newUser.avatar, this.data.joinFamilyRole).then(r => {
            this.setData({ joinSaving: false, showJoin: false });
            if (r.already) { wx.showToast({ title: this._t('你已在该家庭中', 'You are already in this family'), icon: 'none' }); }
            else if (r.applying) { wx.showToast({ title: this._t('已申请加入，等待主账户审核', 'Request sent, waiting for creator approval'), icon: 'none' }); }
            else {
              const fam = { _id: r.familyId || '', familyNo: '', name: r.name || '已加入的家庭', ownerOpenid: '', members: r.members || [], inviteCode: '', inviteExpire: 0 };
              this.setData({ fams: [fam], famIdx: 0 });
              this.applyFamily(fam);
              wx.showToast({ title: this._t('已加入家庭', 'Family joined'), icon: 'success' });
            }
            this.loadFamily();
            cs.pull();
          }).catch(e => {
            this.setData({ joinSaving: false });
            wx.showToast({ title: e.message || this._t('加入失败', 'Join failed'), icon: 'none' });
          });
        },
        fail: () => {
          this.setData({ joinSaving: false });
          wx.showToast({ title: this._t('请授权昵称后再提交申请', 'Please authorize your nickname before submitting'), icon: 'none' });
        }
      });
      return;
    }
    this.setData({ joinSaving: true });
    cs.joinFamily(code, user.nickname, user.avatar || '/images/brand-logo.png', this.data.joinFamilyRole).then(r => {
      this.setData({ joinSaving: false, showJoin: false });
      if (r.already) {
        wx.showToast({ title: this._t('你已在该家庭中', 'You are already in this family'), icon: 'none' });
      } else if (r.applying) {
        wx.showToast({ title: this._t('已申请加入「' + (r.name || '家庭') + '」，等待主账户审核', 'Requested to join "' + (r.name || 'family') + '", waiting for approval'), icon: 'none' });
      } else {
        // 立即展示加入的家庭（名称/成员；家庭号由 loadFamily 拉取补充），再拉取云端刷新
        const fam = {
          _id: r.familyId || '', familyNo: '', name: r.name || '已加入的家庭',
          ownerOpenid: '', members: r.members || [], inviteCode: '', inviteExpire: 0
        };
        this.setData({ fams: [fam], famIdx: 0 });
        this.applyFamily(fam);
        wx.showToast({ title: this._t('已加入「' + (r.name || '家庭') + '」', 'Joined "' + (r.name || 'family') + '"'), icon: 'success' });
      }
      this.loadFamily();
      cs.pull();
    }).catch(e => {
      this.setData({ joinSaving: false });
      wx.showToast({ title: e.message || this._t('加入失败，请确认邀请码', 'Join failed — check the invite code'), icon: 'none' });
    });
  },

  /* ============ 创建家庭 ============ */
  openCreate() {
    // 规则：一个账号只能创建或加入1个家庭
    const joined = (this.data.fams || []).filter(f => !f._selfOnly && f.ownerOpenid !== this._myOpenid).length;
    if (joined >= 1) {
      wx.showToast({ title: this._t('您已加入家庭，不能再创建家庭', 'You joined a family already and cannot create one'), icon: 'none' });
      return;
    }
    // 至少要有一位宝宝才能创建家庭邀请成员
    if (!((app.globalData.babies || []).length)) {
      wx.showModal({
        title: this._t('请先添加宝宝', 'Add a baby first'),
        content: this._t('创建家庭需要先添加至少一位宝宝，才能邀请家人一起记录', 'Add at least one baby before creating a family so family can record together'),
        confirmText: '去添加',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) wx.navigateTo({ url: '/pages/my-babies/my-babies' });
        }
      });
      return;
    }
    this.setData({ showCreate: true, familyNameInput: (app.globalData.baby || {}).name ? (app.globalData.baby.name + '的喂养家庭') : '' });
  },
  closeCreate() {
    this.setData({ showCreate: false });
  },
  onFamilyName(e) {
    this.setData({ familyNameInput: e.detail.value });
  },
  doCreateFamily() {
    const name = (this.data.familyNameInput || '').trim() || '我的喂养家庭';
    this.setData({ showCreate: false, loading: true });
    const user = wx.getStorageSync('panda_user') || {};
    cs.createFamily(name, (user.logged && user.nickname) ? user.nickname : '去登录或注册', (user.logged && user.avatar) ? user.avatar : '/images/brand-logo.png').then(r => {
      this.setData({ loading: false });
      // 立即展示创建的家庭（家庭名/家庭号/邀请二维码/家庭成员/解散按钮），再拉取云端刷新最新成员
      const fam = {
        _id: r.familyId || '', familyNo: r.familyNo || '', name: r.name || name,
        ownerOpenid: (this._myOpenid || user.openid || ''),
        members: r.members || [], inviteCode: r.inviteCode || '', inviteExpire: r.inviteExpire || 0
      };
      this.setData({ fams: [fam], famIdx: 0 });
      this.applyFamily(fam);
      wx.showToast({ title: this._t('家庭已创建，家庭号 ' + (r.familyNo || '') + '，快分享二维码邀请家人', 'Family created. ID ' + (r.familyNo || '') + ' — share the QR code to invite family'), icon: 'none' });
      this.loadFamily();
    }).catch(e => {
      this.setData({ loading: false });
      wx.showToast({ title: this._t('创建失败：' + (e.message || ''), 'Create failed: ' + (e.message || '')), icon: 'none' });
    });
  },

  /* ============ 邀请二维码（云端邀请码） ============ */
  openInvite() {
    const fam = this.data.family;
    if (!fam) return;
    if (fam._selfOnly) {
      // 默认个人家庭：首次邀请家人时自动创建云端家庭并生成邀请码
      const user = wx.getStorageSync('panda_user') || {};
      const babyName = (app.globalData.baby || {}).name || '';
      this.setData({ loading: true });
      cs.createFamily(babyName ? (babyName + '的家庭') : '我的喂养家庭', (user.logged && user.nickname) ? user.nickname : '去登录或注册', (user.logged && user.avatar) ? user.avatar : '/images/brand-logo.png')
        .then(() => cs.getMyFamily())
        .then(f => {
          if (!f) throw new Error('未获取到家庭信息，请检查云函数部署');
          this.setData({ family: f, members: f.members || [], isOwner: (f.ownerOpenid === this._myOpenid), loading: false });
          return f;
        })
        .then(f => this.doInvite(f))
        .catch(e => {
          this.setData({ loading: false });
          wx.showToast({ title: this._t('创建家庭失败：' + (e.message || ''), 'Create family failed: ' + (e.message || '')), icon: 'none' });
        });
      return;
    }
    this.doInvite(fam);
  },

  doInvite(fam) {
    wx.showLoading({ title: this._t('生成中…', 'Generating...') });
    cs.refreshInvite(fam._id).then(r => {
      wx.hideLoading();
      const now = new Date(r.inviteExpire || Date.now());
      const expireText = '有效期至 ' + (now.getMonth() + 1) + '月' + now.getDate() + '日 ' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
      this.setData({
        showInvite: true,
        invite: { familyName: this.data.family.name, code: r.inviteCode, expireText, memberCount: (this.data.members || []).length }
      });
      setTimeout(() => this.drawQr(), 80);
    }).catch(e => {
      wx.hideLoading();
      wx.showToast({ title: this._t('生成失败：' + (e.message || ''), 'Generate failed: ' + (e.message || '')), icon: 'none' });
    });
  },

  // 二维码内容：家庭ID + 邀请码（扫码端解析后调用 joinFamily 入群）
  drawQr() {
    if (!this.data.showInvite) return;
    const inv = this.data.invite;
    const famId = (this.data.family || {})._id || '';
    const content = 'https://panda-feeding.app/invite?fid=' + famId + '&code=' + inv.code;
    const qr = qrcode(0, 'M');
    qr.addData(content);
    qr.make();
    const count = qr.getModuleCount();
    const size = 240;
    const margin = 4;
    const cell = size / (count + margin * 2);
    const ctx = wx.createCanvasContext('inviteQr', this);
    ctx.setFillStyle('#ffffff');
    ctx.fillRect(0, 0, size, size);
    ctx.setFillStyle('#1c2b1c');
    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) {
        if (qr.isDark(r, c)) {
          ctx.fillRect(Math.round(margin * cell + c * cell), Math.round(margin * cell + r * cell), Math.ceil(cell), Math.ceil(cell));
        }
      }
    }
    ctx.draw();
  },

  closeInvite() { this.setData({ showInvite: false }); },
  noop() {},

  shareInvite() {
    wx.showToast({ title: this._t('已生成分享卡片，点右上角转发给亲友', 'Share card ready — tap the top-right menu to send it'), icon: 'none' });
  },

  onShareAppMessage() {
    const inv = this.data.invite || {};
    const famId = (this.data.family || {})._id || '';
    return {
      title: this._t('邀请你加入' + (inv.familyName || '宝宝的喂养家庭') + '，一起记录喂养', 'Join ' + (inv.familyName || 'our feeding family') + ' and record feedings together'),
      path: '/pages/index/index?invite=' + (inv.code || ''),
      imageUrl: ''
    };
  },

  /* ============ 成员管理 ============ */
  // 点击成员：创建者可移除，普通成员提示
  editMember(e) {
    const fam = this.data.family;
    if (!fam) return;
    const idx = e.currentTarget.dataset.index;
    const m = (this.data.members || [])[idx];
    if (!m) return;
    // 本人未注册登录：引导去登录/注册
    const user = wx.getStorageSync('panda_user') || {};
    if (!user.logged && m.openid === this._myOpenid) {
      wx.showModal({
        title: this._t('去登录或注册', 'Sign in or sign up'),
        content: this._t('登录后可设置头像与账户名，并与亲友云端共享喂养记录', 'Sign in to set your avatar and name, and share records with family in the cloud'),
        confirmText: '去登录',
        cancelText: '取消',
        success: r => {
          if (r.confirm) wx.switchTab({ url: '/pages/plan/plan' });
        }
      });
      return;
    }
    if (m.status === 'pending') return; // 待审核成员走同意/拒绝按钮
    if (this.data.isOwner && m.openid !== this._myOpenid) {
      // 主账户：弹出成员操作菜单
      this.setData({ showMemberAction: true, actionMember: m });
    } else if (this.data.isOwner) {
      wx.showToast({ title: this._t('这是你本人', 'This is you'), icon: 'none' });
    }
  },

  closeMemberAction() {
    this.setData({ showMemberAction: false, actionMember: null });
  },
  // 菜单里点击设置亲友关系
  onActionSetPerm() {
    const m = this.data.actionMember;
    this.closeMemberAction();
    if (m) this.openPermEditor(m);
  },
  // 菜单里点击移除成员
  onActionRemove() {
    const m = this.data.actionMember;
    this.closeMemberAction();
    if (m) this.confirmRemove(m);
  },

  confirmRemove(m) {
    const fam = this.data.family;
    wx.showModal({
      title: this._t('移除成员', 'Remove member'),
      content: this._t('确定移除 ' + (m.nickname || '该成员') + ' 吗？移除后将无法看到家庭数据。', 'Remove ' + (m.nickname || 'this member') + '? They will lose access to family data.'),
      success: r => {
        if (!r.confirm) return;
        cs.removeMember(fam._id, m.openid).then(members => {
          this.setData({ members });
          wx.showToast({ title: this._t('已移除', 'Removed'), icon: 'none' });
        }).catch(e => wx.showToast({ title: this._t('移除失败：' + (e.message || ''), 'Remove failed: ' + (e.message || '')), icon: 'none' }));
      }
    });
  },

  /* ---- 打开成员权限设置抽屉 ---- */
  openPermEditor(m) {
    const myOpenid = (app.globalData.user && app.globalData.user.openid) || '';
    // 只显示自己创建的宝宝，不显示别人共享给我的
    // ownerOpenid 为空的旧数据也认为是自己的（兼容）
    const perms = (m.perms && typeof m.perms === 'object') ? m.perms : {};
    // 权限级别：view=仅查看，edit=查看和编辑
    const accessLevel = perms.accessLevel === 'view' ? 'view' : 'edit';
    console.log('[openPermEditor] myOpenid=', myOpenid, 'accessLevel=', accessLevel);
    this.setData({
      showPerm: true,
      permEditor: {
        openid: m.openid,
        nickname: m.nickname || '该成员',
        role: m.role,
        familyRole: m.familyRole || '',
        familyRoleIdx: this.data.familyRoles.indexOf(m.familyRole || ''),
        accessLevel
      }
    });
  },
  closePerm() { this.setData({ showPerm: false }); },
  noop2() {},
  /* 设置家庭角色（妈妈/爸爸等，滑动选择） */
  onPermRoleChange(e) {
    const idx = Number(e.detail.value);
    const roles = this.data.familyRoles;
    this.setData({ 'permEditor.familyRole': roles[idx] || '', 'permEditor.familyRoleIdx': idx });
  },

  /* 切换某模块权限：无 → 只读 → 可编辑 循环 */
  cycleModulePerm(e) {
    const key = e.currentTarget.dataset.key;
    const editor = this.data.permEditor;
    const cur = editor.perms[key];
    const next = cur === 'edit' ? 'none' : (cur === 'view' ? 'edit' : 'view');
    this.setData({ ['permEditor.perms.' + key]: next });
  },
  /* 直接设置模块权限值 */
  /* 设置权限级别 */
  setAccessLevel(e) {
    const val = e.currentTarget.dataset.val;
    this.setData({ 'permEditor.accessLevel': val });
  },
  /* 保存权限 */
  savePerms() {
    const editor = this.data.permEditor;
    const fam = this.data.family;
    if (!editor || !fam || fam._selfOnly) return;
    const perms = { accessLevel: editor.accessLevel };
    this.setData({ permSaving: true });
    cs.updateMemberPerms(fam._id, editor.openid, perms, editor.familyRole || '').then(r => {
      this.setData({ permSaving: false, showPerm: false, members: r.members || [], 'family.members': r.members || [] });
      wx.showToast({ title: this._t('权限已保存', 'Permissions saved'), icon: 'none' });
    }).catch(e => {
      this.setData({ permSaving: false });
      wx.showToast({ title: this._t('保存失败：' + (e.message || ''), 'Save failed: ' + (e.message || '')), icon: 'none' });
    });
  },

  /* 检测待审核加入申请：当前用户是 owner 且家庭里有 pending 成员 → 自动弹窗 */
  checkPendingInvite() {
    const fam = this.data.family;
    if (!fam || fam._selfOnly) return;
    if (fam.ownerOpenid !== this._myOpenid) return;
    const pending = (fam.members || []).find(m => m.status === 'pending');
    if (!pending) return;
    // 同一申请本次页面只自动弹一次，避免反复打扰
    if (this._pendingNotified === pending.openid) return;
    this._pendingNotified = pending.openid;
    wx.showModal({
      title: this._t('亲友申请加入', 'Family join request'),
      content: (pending.nickname || '该亲友') + ' 申请加入你的家庭「' + (fam.name || '') + '」',
      confirmText: '同意加入',
      cancelText: '稍后处理',
      confirmColor: '#5B8C4E',
      success: res => {
        if (res.confirm) {
          this.doApprove(pending.openid);
        }
        // 稍后处理：不做任何操作，pending 成员留在列表里可手动审核/拒绝
      }
    });
  },

  /* 共用：同意加入 → 默认成员身份（查看和编辑权限都打开） */
  doApprove(openid) {
    const fam = this.data.family;
    if (!fam) return;
    // 最多6个亲友成员（不含创建者）
    const members = this.data.members || [];
    const memberCount = members.filter(m => m.role !== 'owner').length;
    if (memberCount >= 6) {
      wx.showToast({ title: this._t('家庭成员已满，最多6个亲友', 'Family is full — up to 6 members'), icon: 'none' });
      return;
    }
    wx.showLoading({ title: this._t('审核中', 'Reviewing') });
    cs.approveMember(fam._id, openid, 'member').then(r => {
      wx.hideLoading();
      const members = r.members || [];
      // 从待审核列表中移除已同意的成员
      const pendingMembers = (this.data.pendingMembers || []).filter(x => x.openid !== openid);
      this.setData({ members, 'family.members': members, pendingMembers });
      wx.showToast({ title: this._t('已同意加入', 'Approved'), icon: 'none' });
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({ title: this._t('操作失败：' + (err.message || ''), 'Failed: ' + (err.message || '')), icon: 'none' });
    });
  },

  /* ---- 主账户审核：同意加入 → 自动打开成员设置弹窗，可修改亲友角色和权限 ---- */
  approveMember(e) {
    const fam = this.data.family;
    const openid = e.currentTarget.dataset.openid;
    const m = (this.data.members || []).find(x => x.openid === openid)
           || (this.data.pendingMembers || []).find(x => x.openid === openid);
    if (!fam || fam._selfOnly || !m) return;
    wx.showModal({
      title: this._t('审核加入申请', 'Review join request'),
      content: this._t('同意 ' + (m.nickname || '该亲友') + ' 加入家庭吗？同意后可设置亲属关系和使用权限。', 'Approve ' + (m.nickname || 'this member') + ' to join? You can then set their relationship and permissions.'),
      confirmText: '同意并设置',
      cancelText: '拒绝',
      success: res => {
        if (!res.confirm) {
          wx.showLoading({ title: this._t('处理中', 'Processing') });
          cs.rejectMember(fam._id, openid).then(r => {
            wx.hideLoading();
            this.setData({ members: r.members || [], 'family.members': r.members || [] });
            wx.showToast({ title: this._t('已拒绝', 'Declined'), icon: 'none' });
          }).catch(err => {
            wx.hideLoading();
            wx.showToast({ title: this._t('操作失败：' + (err.message || ''), 'Failed: ' + (err.message || '')), icon: 'none' });
          });
          return;
        }
        // 同意：先通过审核，再自动打开权限设置弹窗
        wx.showLoading({ title: this._t('同意中', 'Approving') });
        cs.approveMember(fam._id, openid, 'member').then(r => {
          wx.hideLoading();
          const members = r.members || [];
          this.setData({ members, 'family.members': members });
          // 找到刚加入的成员，打开设置弹窗
          const newMember = members.find(x => x.openid === openid);
          if (newMember) {
            this.openPermEditor(newMember);
          }
          wx.showToast({ title: this._t('已同意加入，请设置亲属关系', 'Approved — now set their relationship'), icon: 'none' });
        }).catch(err => {
          wx.hideLoading();
          wx.showToast({ title: this._t('操作失败：' + (err.message || ''), 'Failed: ' + (err.message || '')), icon: 'none' });
        });
      }
    });
  },

  /* ---- 主账户审核：拒绝加入 ---- */
  rejectMemberJoin(e) {
    const fam = this.data.family;
    const openid = e.currentTarget.dataset.openid;
    // 待审核成员在 pendingMembers 中，正式成员在 members 中，两处都要查
    const m = (this.data.members || []).find(x => x.openid === openid)
           || (this.data.pendingMembers || []).find(x => x.openid === openid);
    if (!fam || fam._selfOnly || !m) return;
    wx.showModal({
      title: this._t('拒绝加入', 'Decline request'),
      content: this._t('确定拒绝 ' + (m.nickname || '该亲友') + ' 的加入申请吗？', 'Decline the join request from ' + (m.nickname || 'this member') + '?'),
      success: r => {
        if (!r.confirm) return;
        cs.rejectMember(fam._id, openid).then(res => {
          // 从待审核列表中移除已拒绝的成员
          const pendingMembers = (this.data.pendingMembers || []).filter(x => x.openid !== openid);
          this.setData({ members: res.members || [], 'family.members': res.members || [], pendingMembers });
          wx.showToast({ title: this._t('已拒绝', 'Declined'), icon: 'none' });
        }).catch(e => wx.showToast({ title: this._t('操作失败：' + (e.message || ''), 'Failed: ' + (e.message || '')), icon: 'none' }));
      }
    });
  },

  /* 取消加入家庭的申请（亲友端） */
  cancelJoinApply() {
    const pendingJoin = this.data.pendingJoin;
    if (!pendingJoin || !pendingJoin.familyId) return;
    wx.showModal({
      title: this._t('取消申请', 'Cancel request'),
      content: this._t('确定要取消加入该家庭的申请吗？', 'Cancel your request to join this family?'),
      success: (res) => {
        if (res.confirm) {
          const cs = getApp().cloudSync;
          wx.showLoading({ title: this._t('取消中...', 'Cancelling...') });
          cs.call('familyCloud', { action: 'cancelJoinApply', familyId: pendingJoin.familyId }).then(r => {
            wx.hideLoading();
            if (r && r.ok !== false) {
              wx.showToast({ title: this._t('已取消申请', 'Request cancelled'), icon: 'success' });
              this.setData({ pendingJoin: null });
              // 刷新页面
              this.loadFamily();
            } else {
              wx.showToast({ title: (r && r.errMsg) || '取消失败', icon: 'none' });
            }
          }).catch(e => {
            wx.hideLoading();
            wx.showToast({ title: this._t('取消失败', 'Cancel failed'), icon: 'none' });
          });
        }
      }
    });
  },

  /* 重命名家庭名称（仅创建者） */
  renameFamily() {
    if (!this.data.isOwner) return;
    const fam = this.data.family;
    if (!fam || !fam._id) return;
    wx.showModal({
      title: this._t('重命名家庭', 'Rename family'),
      editable: true,
      placeholderText: '请输入家庭名称',
      content: fam.name || '',
      success: (res) => {
        if (res.confirm) {
          const newName = (res.content || '').trim();
          if (!newName) {
            wx.showToast({ title: this._t('家庭名称不能为空', 'Family name cannot be empty'), icon: 'none' });
            return;
          }
          if (newName === fam.name) return;
          const cs = getApp().cloudSync;
          wx.showLoading({ title: this._t('保存中...', 'Saving...') });
          cs.call('familyCloud', { action: 'renameFamily', familyId: fam._id, name: newName }).then(r => {
            wx.hideLoading();
            if (r && r.ok !== false) {
              wx.showToast({ title: this._t('重命名成功', 'Renamed'), icon: 'success' });
              // 更新本地数据
              this.setData({
                'family.name': newName
              });
              // 刷新家庭列表
              this.loadFamily();
            } else {
              wx.showToast({ title: (r && r.errMsg) || '重命名失败', icon: 'none' });
            }
          }).catch(e => {
            wx.hideLoading();
            wx.showToast({ title: this._t('重命名失败', 'Rename failed'), icon: 'none' });
          });
        }
      }
    });
  },

  /* 退出家庭：创建者退出 = 解散整个家庭；成员退出 = 退出并失去权限 */
  onLeave() {
    console.log('[onLeave] tap');
    const fam = this.data.family;
    console.log('[onLeave] fam=', !!fam, '_selfOnly=', fam && fam._selfOnly, 'ownerOpenid=', fam && fam.ownerOpenid, '_myOpenid=', this._myOpenid);
    if (!fam) return;
    if (fam._selfOnly) {
      wx.showToast({ title: this._t('当前仅你一人，无需退出', 'You are the only member, nothing to leave'), icon: 'none' });
      return;
    }
    const isOwner = fam.ownerOpenid === this._myOpenid;
    console.log('[onLeave] isOwner=', isOwner);
    if (isOwner) {
      // 创建者退出 = 解散家庭：先详细说明影响
      wx.showModal({
        title: this._t('解散家庭提醒', 'Dissolve family?'),
        content: this._t('确定解散整个家庭吗？解散后其他成员将失去所有权限。', 'Dissolve the whole family? Other members will lose all access.'),
        success: r => {
          if (!r.confirm) return;
          cs.leaveFamily(fam._id).then(res => {
            // 清除本地权限缓存
            try { require('../../utils/perm.js').setMyPerm(null); } catch (e) {}
            // 立即清空本地家庭数据，再重新拉取
            this.setData({
              fams: [],
              family: { name: '我的家庭', ownerOpenid: this._myOpenid, members: [{ openid: this._myOpenid, nickname: '我', role: 'owner' }], _selfOnly: true },
              members: [],
              isOwner: true,
              hasMyFamily: false,
              joinedCount: 0,
              showInvite: false
            });
            // 重新拉取数据，自动移除未授权的宝宝
            return cs.pull().then(() => {
              this.loadFamily();
              wx.showToast({ title: this._t('家庭已解散', 'Family dissolved'), icon: 'none' });
            });
          }).catch(e => wx.showToast({ title: this._t('退出失败：' + (e.message || ''), 'Leave failed: ' + (e.message || '')), icon: 'none' }));
        }
      });
      return;
    }
    wx.showModal({
      title: this._t('退出家庭', 'Leave family'),
      content: this._t('退出后将失去该家庭宝宝的查看与编辑权限。确定退出？', 'You will lose view and edit access to this family. Leave anyway?'),
      confirmText: '退出',
      cancelText: '取消',
      success: r => {
        if (!r.confirm) return;
        cs.leaveFamily(fam._id).then(res => {
          // 1. 先清除本地权限缓存，确保共享宝宝数据被移除
          try { require('../../utils/perm.js').setMyPerm(null); } catch (e) {}
          // 2. 清除共享宝宝的本地存储数据
          try {
            const myOpenid = this._myOpenid || '';
            const localBabies = app.globalData.babies || [];
            localBabies.forEach(b => {
              // 只清除共享宝宝（非自己创建的）的本地数据
              if (b.ownerOpenid && b.ownerOpenid !== myOpenid) {
                // 宝宝数据实际存储键为 panda_feeding_baby_<id>，旧代码删的是 panda_baby_<id>，导致退出后残留
                try { wx.removeStorageSync('panda_feeding_baby_' + b.id); } catch (e) {}
                try { wx.removeStorageSync('panda_baby_' + b.id); } catch (e) {}
              }
            });
          } catch (e) { console.log('[onLeave] 清除本地数据失败', e); }
          // 3. 刷新家庭列表（自动更新权限缓存），再拉取数据
          return cs.getMyFamily().then(() => {
            // 4. 清除 globalData 中的共享宝宝
            try {
              const myOpenid = this._myOpenid || '';
              const filteredBabies = (app.globalData.babies || []).filter(b => !b.ownerOpenid || b.ownerOpenid === myOpenid);
              app.globalData.babies = filteredBabies;
              // 清除 globalData 中的共享宝宝记录
              app.globalData.records = (app.globalData.records || []).filter(r => {
                const baby = filteredBabies.find(b => b.id === r.babyId);
                return !!baby;
              });
              // 保存到本地存储
              app.saveBabyData();
            } catch (e) { console.log('[onLeave] 清除 globalData 失败', e); }
            return cs.pull().then(() => {
              // 5. 切换到第一个可见宝宝（如果当前宝宝被移除）
              if (app.globalData.babies && app.globalData.babies.length) {
                const cur = app.globalData.babies.find(b => b.id === app.globalData.currentBabyId);
                if (!cur) {
                  app.switchBaby(app.globalData.babies[0].id);
                }
              } else {
                // 没有宝宝了，清空当前宝宝
                app.globalData.baby = null;
                app.globalData.currentBabyId = '';
                app.globalData.records = [];
              }
              this.loadFamily();
              wx.showToast({ title: isOwner ? '家庭已解散' : '已退出家庭', icon: 'none' });
            });
          });
        }).catch(e => wx.showToast({ title: this._t('退出失败：' + (e.message || ''), 'Leave failed: ' + (e.message || '')), icon: 'none' }));
      }
    });
  },

});
