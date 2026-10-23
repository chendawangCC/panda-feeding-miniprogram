const STORAGE_KEY = 'panda_feeding_data';      // 共享数据（宝宝列表/当前宝宝/家庭成员）
const cloudSync = require('./utils/cloud-sync.js'); // 多人协作云端同步（家庭）
// 统一把英文端仍写死中文的 wx.showToast / showModal / showLoading / showActionSheet 提示翻成英文
const promptI18n = require('./utils/prompt-i18n.js');
promptI18n.install();
const cloudData = require('./utils/cloud-data.js');  // 全量数据云端同步（云开发后端）
const BABY_KEY = 'panda_feeding_baby_';        // 每宝宝独立数据（记录/库存/成长足迹/提醒源）
const { buildVaccinePlan, VACCINE_PROGRAM } = require('./utils/vaccine-data.js');

let idSeq = 0;
function genId() {
  idSeq += 1;
  return 'b' + Date.now() + '_' + idSeq + '_' + Math.floor(Math.random() * 1000);
}

/* 默认耗材库存（喂养台）：不预置示例数据，全部由用户真实录入 */
function defaultStockItems() {
  return [];
}

/* 旧版本预置耗材（纸尿裤/奶粉/棉柔巾）判定：
   这类条目是早前版本内置的示例数据，库存恒为 0，容易被云端同步再次带回。
   判定条件从严：名称完全匹配 + 预置尺码 + 无任何用户填写过的耗材属性 + 库存为 0。 */
function isLegacyPresetStock(s) {
  if (!s || !s.name) return false;
  const name = String(s.name).trim();
  if (['纸尿裤', '奶粉', '棉柔巾'].indexOf(name) < 0) return false;
  const size = String(s.size || '').trim().toUpperCase();
  if (['', '通用'.toUpperCase(), 'NB', 'S', 'M', 'L', 'XL', 'XXL'].indexOf(size) < 0) return false;
  if (s.produceDate || s.shelfLife || s.price || s.buyUrl || s.warrantyUntil) return false;
  if (Number(s.count) > 0) return false;
  return true;
}

/* 默认保质期提醒（喂养台） */
function defaultShelfWarnings() {
  // 初始无预置提醒：保质期提醒由真实记录（吸奶 / 奶粉开罐）自动生成
  return [];
}

/* 默认已完成疫苗（宝宝成长档案） */
function defaultVaccineDone() {
  return [];
}

/* 默认测量记录：按宝宝生日生成 0~4 月龄（身高/体重/头围） */
function defaultMeasures() {
  // 初始无预置测量：由用户在成长档案中真实录入身高/体重/头围
  return [];
}

/* 顶部安全区常用算法：状态栏高度 + 导航栏高度（微信官方示例算法，随机型自适应） */
let SAFE_TOP = 88;
try {
  // 新 API 替换弃用的 getSystemInfoSync
  const __win = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
  const __menu = wx.getMenuButtonBoundingClientRect ? wx.getMenuButtonBoundingClientRect() : null;
  const __sb = __win.statusBarHeight || 20;
  if (__menu) {
    SAFE_TOP = Math.round(__sb + (__menu.top - __sb) * 2 + __menu.height);
  } else {
    SAFE_TOP = Math.round(__sb + 44);
  }
} catch (e) {}

App({
  globalData: {
    safeTop: SAFE_TOP,
    pendingFlowers: [],   // 收到的新花队列（打开小程序弹送花动画弹窗）
    lastFlowerReadAt: 0,
    lang: 'zh',
    t: function(key) {
      const lang = wx.getStorageSync('lang') || 'zh';
      const dict = lang === 'en' ? require('./i18n/en.js') : require('./i18n/zh.js');
      const keys = key.split('.');
      let val = dict;
      for (const k of keys) {
        val = val && val[k];
      }
      return val || key;
    },
    // 家庭急救跟做配置（并入急救模块）
    settings: {
      vibration: true,
      stepVibration: true
    },
    // 宝宝列表（多宝宝）
    babies: [],
    currentBabyId: '',
    // 当前宝宝档案（与 babies 中 currentBabyId 对应，页面直接读它）
    baby: {
      name: '',
      gender: '',
      birthday: '',
      relation: '',
      time: '',
      delivery: '',
      blood: '',
      weight: '',
      height: '',
      avatar: '/images/brand-logo.png'
    },
    familyMembers: [],
    // ===== 以下为「当前宝宝」的数据，切换宝宝时整体替换 =====
    records: [],
    sleepFloat: null, // { index, startTime } 睡眠悬浮窗（进行中的睡眠）
    pendingSleepEdit: false,
    diaperStock: 0,
    supplies: {
      milk: 0,           // 奶粉库存（罐）：由用户真实录入
      milkFeeds: 0,     // 当前开封奶粉剩余可冲泡次数：随真实配方奶记录递减
      d3Days: 0          // 维生素 D3 保质期剩余天数：由用户真实录入
    },
    vaccine: {},
    // 完整疫苗计划（免费+自费，按出生日期推算应种日期）
    vaccinePlan: [],
    // 辅食过敏判断记录：{ 食材: true|false }（已判断过的食材不再重复出现）
    foodAllergyMap: {},
    // 登录用户账号（微信一键登录 / 手机号登录）
    user: { openid: '', avatar: '', nickname: '', phone: '', logged: false },
    // 母乳储存国标时限（吸奶记录联动保质期提醒）
    MILK_STORAGE: {
      room:    { label: '室温', unit: 'h', value: 4,  desc: '室温 ≤25℃ · 4 小时内' },
      fridge:  { label: '冷藏', unit: 'h', value: 48, desc: '冷藏 4℃ · 48 小时内' },
      freezer: { label: '冷冻', unit: 'm', value: 3,  desc: '冷冻 -18℃ · 3 个月内' }
    },
    // 配方奶粉开罐后国标建议：28 天内用完
    FORMULA_OPEN_DAYS: 28
  },

  onLaunch(options) {
    // 初始化云开发（语音识别需上传录音到云存储并由云函数识别）
    if (wx.cloud) {
      try { wx.cloud.init({ traceUser: true, env: wx.cloud.DYNAMIC_CURRENT_ENV }); } catch (e) {}
    }

    // 处理从聊天链接/扫码进入的邀请码
    if (options && options.query) {
      const inviteCode = options.query.inviteCode || options.query.scene || options.query.code || '';
      if (inviteCode) {
        this.globalData.pendingInviteCode = inviteCode.toString().trim().toUpperCase();
        console.log('[onLaunch] 检测到邀请码:', this.globalData.pendingInviteCode);
        // 等用户信息加载完成后，自动跳转到协作页
        setTimeout(() => {
          const user = wx.getStorageSync('panda_user') || {};
          if (!user.logged || !user.openid) {
            // 未登录：先标记需要登录，登录完成后自动弹申请
            this.globalData.pendingLogin = true;
            wx.switchTab({ url: '/pages/plan/plan' });
          } else {
            // 已登录：直接跳转到协作页，自动弹申请弹窗
            wx.navigateTo({ url: '/subchart/pages/collaboration/collaboration' });
          }
        }, 500);
      }
    }

    // 载入登录用户账号
    this.loadUser();

    const saved = wx.getStorageSync(STORAGE_KEY);
    if (saved) {
      // 兼容旧版单宝宝数据：无 babies 时从旧 baby 迁移
      let babies = saved.babies && saved.babies.length ? saved.babies : [];
      // 只有当确实有旧数据需要迁移时，才创建默认宝宝（避免每次登录都创建未命名宝宝）
      if (!babies.length && (saved.baby || (this.globalData.baby && this.globalData.baby.name))) {
        const legacy = saved.baby || Object.assign({}, this.globalData.baby);
        legacy.id = genId();
        babies = [legacy];
      }
      this.globalData.babies = babies;
      // 头像迁移：旧默认头像（emoji 熊猫/空）统一为品牌 logo，确保与宝宝详情设置头像一致
      babies.forEach(b => {
        if (!b.avatar || b.avatar === '🐼') b.avatar = '/images/brand-logo.png';
      });
      let curId = saved.currentBabyId;
      if (!curId && babies[0]) {
        curId = babies[0].id || genId();
        babies[0].id = curId;
      }
      this.globalData.currentBabyId = curId;

      if (saved.familyMembers) this.globalData.familyMembers = saved.familyMembers;

      // 首次迁移：旧版共享 records/footprints/supplies 等并入第一个宝宝的独立存储
      const babyData = wx.getStorageSync(BABY_KEY + curId) || {};
      if (!wx.getStorageSync(BABY_KEY + curId)) {
        if (saved.records) babyData.records = saved.records;
        if (typeof saved.diaperStock === 'number') babyData.diaperStock = saved.diaperStock;
        if (saved.supplies) babyData.supplies = saved.supplies;
        if (saved.vaccine) babyData.vaccine = saved.vaccine;
        wx.setStorageSync(BABY_KEY + curId, babyData);
      }
    } else {
      // 全新安装：默认为空（无预置宝宝，由用户手动添加）
      this.globalData.babies = [];
      this.globalData.currentBabyId = '';
    }

    // 版本迁移：清空旧的母乳提醒确认记录（ack id 生成逻辑已更新）
    const MILESTONE_VERSION = '20261010_2'; // 版本号，改一次就清空一次
    const savedVersion = wx.getStorageSync('milkAckVersion') || '';
    if (savedVersion !== MILESTONE_VERSION) {
      this.globalData.acknowledgedMilks = [];
      const allBabies = this.globalData.babies || [];
      allBabies.forEach(baby => {
        const babyData = wx.getStorageSync(BABY_KEY + baby.id) || {};
        babyData.acknowledgedMilks = [];
        wx.setStorageSync(BABY_KEY + baby.id, babyData);
      });
      wx.setStorageSync('milkAckVersion', MILESTONE_VERSION);
    }

    // 载入当前宝宝数据到 globalData
    this.loadBabyData(this.globalData.currentBabyId);
    this.loadAvatars();
    // 兼容老数据：统一补齐宝宝号（B-001/B-002…），补号后持久化
    if (typeof this.ensureBabyNos === 'function') this.ensureBabyNos();

    // 多人协作：启动时静默拉取云端家庭数据并合并（已加入家庭时生效）
    try { cloudSync.pull(); } catch (e) {}
    // 全量数据云端同步：启动/回前台时静默拉取合并（登录后生效）
    this._cloudPullPending = true;
  },

  onShow() {
    if (!cloudData.cloudReady()) return;
    const u = this.globalData.user || {};
    if (!u.logged) return;
    // 先刷新家庭权限缓存，再拉取数据（确保解散家庭后立即移除共享宝宝）
    const afterGetFamily = () => {
      this.checkJoinStatus();
      if (this._joinTimer) clearInterval(this._joinTimer);
      this._joinTimer = setInterval(() => this.checkJoinStatus(), 5000);
      // 前台时拉取家庭数据（亲友/创建者端数据同步）
      try {
        cloudSync.pull().then(r => {
          console.log('[onShow pull] result=', r);
          // 补推：上次断网 / 关窗时未成功上云的改动（电脑端小程序常见），回到前台自动补一次
          try {
            if (cloudData.hasPendingPush && cloudData.hasPendingPush()) {
              console.log('[onShow] 检测到未上云改动，补推');
              cloudData.pushAll(true);
            }
          } catch (e) {}
        }).catch(e => console.log('[onShow pull] fail', e));
        // 前台每2秒自动 pull 一次，实时同步家庭成员数据
        if (this._pullTimer) clearInterval(this._pullTimer);
        this._pullTimer = setInterval(() => {
          cloudSync.pull().catch(() => {});
        }, 2000);
      } catch (e) { console.log('[onShow pull] err', e); }
    };
    try {
      cloudSync.getMyFamily().then(afterGetFamily).catch(() => afterGetFamily());
    } catch (e) {
      afterGetFamily();
    }
    // 去掉 onShow 自动 pull（避免覆盖本地最新头像）
    // this._pullBusy = true;
    // cloudData.pullAll().then(data => {
    //   try {
    //     cloudData.mergeInto(this, data);
    //     this.cleanupSharedBabies(data);
    //     this.persist();
    //   } catch (e) {}
    //   this._pullBusy = false;
    //   this._emitPullDone();
    // }).catch(() => { this._pullBusy = false; });
  },

  /* 清理失去权限的家庭共享宝宝：云端返回的可见宝宝为权威，本地残留的非本人宝宝移除 */
  cleanupSharedBabies(data) {
    try {
      const g = this.globalData;
      const perm = require('./utils/perm.js');
      const my = perm.getMyOpenid();
      if (!my) return;
      const visible = {};
      ((data && data.babies) || []).forEach(b => { if (b && b._id) visible[b._id] = 1; });
      const removed = [];
      const beforeLen = (g.babies || []).length;
      g.babies = (g.babies || []).filter(b => {
        if (!b.ownerOpenid || b.ownerOpenid === my) return true; // 自己的宝宝永远保留
        if (visible[b.id]) return true;                           // 仍有权限 → 保留
        removed.push(b.id);                                       // 失去权限 → 移除
        return false;
      });
      if (!removed.length) return;
      removed.forEach(id => { try { wx.removeStorageSync('panda_feeding_baby_' + id); } catch (e) {} });
      if (removed.indexOf(g.currentBabyId) >= 0) {
        g.currentBabyId = g.babies.length ? g.babies[0].id : '';
        this.loadBabyData(g.currentBabyId);
      }
      this.persist();
    } catch (e) {}
  },

  /* 根据 openid 获取记录者显示名：优先家庭身份（妈妈/爸爸），其次微信昵称；找不到返回空（调用方用记录快照） */
  getOpenidDisplayName(openid) {
    if (!openid) return '';
    const g = this.globalData;
    if (g.user && g.user.openid && g.user.openid === openid) return '我';
    try {
      const perm = require('./utils/perm.js');
      const me = perm.getMyPerm();
      if (me && me.families) {
        for (const f of me.families) {
          const m = (f.members || []).find(x => x.openid === openid);
          if (m) {
            let role = (m.familyRole || '').trim();
            // 兼容：创建者 familyRole 为空时，从该账号创建的宝宝 relation 中获取（创建宝宝时设置的身份）
            if (!role && m.role === 'owner' && f.ownerOpenid === openid) {
              const ownerBaby = (g.babies || []).find(b => b.ownerOpenid === openid);
              if (ownerBaby) role = (ownerBaby.relation || '').trim();
            }
            if (role) return role;
            if (m.nickname) return m.nickname;
          }
        }
      }
    } catch (e) {}
    return '';
  },

  /* 云端拉取完成通知：页面注册回调，拉取中注册则完成后执行，未拉取则稍后自行刷新 */
  onPullDone(cb) {
    if (typeof cb !== 'function') return;
    if (this._pullBusy) {
      if (!this._pullCbs) this._pullCbs = [];
      this._pullCbs.push(cb);
    } else {
      setTimeout(cb, 0);
    }
  },
  _emitPullDone() {
    const cbs = this._pullCbs || [];
    this._pullCbs = [];
    cbs.forEach(cb => { try { cb(); } catch (e) {} });
  },

  /* 将某宝宝的数据载入 globalData（records/库存/足迹/提醒源/档案） */
  loadBabyData(babyId) {
    const baby = this.globalData.babies.find(b => b.id === babyId);
    if (baby) this.globalData.baby = baby;
    const data = wx.getStorageSync(BABY_KEY + babyId) || {};
    // 双宝宝隔离兜底：旧版本同步进来的条目若带的是其他 babyId，不进入当前宝宝
    const onlyBaby = (arr) => (arr || []).filter(x => !x || !x.babyId || x.babyId === babyId);
    this.globalData.records = onlyBaby(data.records);
    this.globalData.diaperStock = typeof data.diaperStock === 'number' ? data.diaperStock : 0;
    this.globalData.supplies = Object.assign({ milk: 0, milkFeeds: 0, d3Days: 0 }, data.supplies);
    this.globalData.vaccine = Object.assign({}, data.vaccine);
    // 耗材库存：未录入过（空数组）时也补默认商品，方便直接编辑尺码/数量
    const stock = onlyBaby(data.stockItems);
    this.globalData.stockItems = stock.length ? stock : defaultStockItems();
    this.globalData.shelfWarnings = data.shelfWarnings || defaultShelfWarnings();
    this.globalData.measures = data.measures ? onlyBaby(data.measures) : defaultMeasures(baby && baby.birthday);
    this.globalData.vaccineDone = onlyBaby(data.vaccineDone);
    // 疫苗计划：本地旧数据可能缺 group 中文字段（只存了 short 英文缩写），加载时按 short 反查补上中文名，
    // 否则日历红点/今日提醒会显示 MMR、JE-I 等英文缩写
    let vp = data.vaccinePlan;
    if (!vp || !vp.length) {
      vp = buildVaccinePlan(baby && baby.birthday);
    } else {
      vp = vp.map(v => {
        if (!v.group && v.short) {
          const ref = VACCINE_PROGRAM.find(x => x.short === v.short);
          if (ref) v.group = ref.group;
        }
        return v;
      });
    }
    this.globalData.vaccinePlan = vp;
    this.globalData.foodAllergyMap = data.foodAllergyMap || {};
    // 加载母乳提醒已确认列表
    this.globalData.acknowledgedMilks = data.acknowledgedMilks || [];
  },

  /* 退出登录：清空本地全部业务数据（记录/宝宝/足迹/库存/疫苗/权限/草稿），
     数据完全与账号绑定——云端已同步，重新登录后从云端拉取恢复。
     保留 panda_user（登录态/昵称头像，用于快速重登）。 */
  clearAllLocalData() {
    const g = this.globalData;
    // 1) globalData 业务字段全部归零
    g.babies = [];
    g.baby = null;
    g.currentBabyId = '';
    g.records = [];
    g.supplies = { milk: 0, milkFeeds: 0, d3Days: 0 };
    g.vaccine = {};
    g.vaccineDone = {};
    g.vaccinePlan = [];
    g.stockItems = [];
    g.shelfWarnings = [];
    g.measures = { heights: [], weights: [], headRounds: [] };
    g.diaperStock = 0;
    g.foodAllergyMap = {};
    g.familyMembers = [];
    // 清空家庭信息和待审核状态
    g.myFamily = null;
    g.pendingJoin = null;
    g.myFamilies = [];
    // 2) 主存储（宝宝列表/当前宝宝）
    try { wx.removeStorageSync(STORAGE_KEY); } catch (e) {}
    // 3) 每个宝宝分片存储 panda_feeding_baby_*
    try {
      const keys = wx.getStorageInfoSync().keys || [];
      keys.forEach(k => {
        if (k.indexOf('panda_feeding_baby_') === 0) { try { wx.removeStorageSync(k); } catch (e) {} }
      });
    } catch (e) {}
    // 4) 其他业务缓存：权限/足迹互动/营养品/草稿/冲突会话
    ['panda_my_perm', 'panda_foot_comments', 'panda_foot_drafts', 'panda_foot_likes',
     'panda_supp_list', 'panda_conflict_last', 'panda_publish_session',
     'panda_remind_settings', 'panda_summary_opts'].forEach(k => {
      try { wx.removeStorageSync(k); } catch (e) {}
    });
  },

  /* 保存当前宝宝数据到分 key 存储 */
  isLegacyPresetStock,

  saveBabyData() {
    const g = this.globalData;
    if (!g.currentBabyId) return;
    // 后端同步：为每个数据项分配稳定云端 id（幂等，持久化）
    cloudData.ensure(g.records);
    cloudData.ensure(g.stockItems);
    cloudData.ensure(g.measures);
    cloudData.ensure(g.vaccineDone);
    wx.setStorageSync(BABY_KEY + g.currentBabyId, {
      records: g.records,
      diaperStock: g.diaperStock,
      supplies: g.supplies,
      vaccine: g.vaccine,
      vaccinePlan: g.vaccinePlan,
      stockItems: g.stockItems,
      shelfWarnings: g.shelfWarnings,
      measures: g.measures,
      vaccineDone: g.vaccineDone,
      foodAllergyMap: g.foodAllergyMap,
      acknowledgedMilks: g.acknowledgedMilks || []
    });
    // 多人协作：数据变更后防抖推送云端（已加入家庭时生效）
    try { console.log('[pushCloud] calling cloudSync.push()'); cloudSync.push(); } catch (e) { console.log('[pushCloud] err', e); }
    // 全量数据上云（多端/多成员同步）
    try { cloudData.pushAll(); } catch (e) {}
  },

  /* 本地删除项 → 云端墓碑（后端增量删除同步） */
  tombCloud(kind, cid) {
    try { cloudData.tomb(kind, cid, this.globalData.currentBabyId); cloudData.pushAll(); } catch (e) {}
  },

  /* 登录后：先拉云端所有历史记录合并本地，再推送本地新增数据（删小程序不丢记录） */
  syncCloudAfterLogin() {
    if (!cloudData.cloudReady()) return Promise.resolve();
    console.log('[syncCloud] start pull from cloud first');
    // 第一步：先从云端拉取所有历史记录，就算本地被清空（删小程序）也能恢复全部数据
    return cloudData.pullAll().then((data) => {
      console.log('[syncCloud] pull ok, merging cloud data to local');
      // 先把云端数据合并到本地
      try {
        cloudData.mergeInto(this, data);
        this.persist();
      } catch (e) {}
      // 第二步：再把本地新增的未上传数据推送到云端，不会覆盖云端已有历史
      return cloudData.pushAll();
    }).then(() => {
      console.log('[syncCloud] sync done, new local data uploaded');
    }).catch(e => {
      console.log('[syncCloud] sync FAIL', e && e.message);
    });
  },

  /* 亲友端：检查自己的加入申请审批结果，弹出通知 */
  checkJoinStatus() {
    console.log('[checkJoinStatus] called');
    try {
      const cs = require('./utils/cloud-sync.js');
      // 1. 检查创建者端：是否有新的待审批申请（先执行，确保能弹窗）
      console.log('[checkJoinStatus] calling getPendingApprovals...');
      cs.getPendingApprovals().then(pending => {
        console.log('[checkJoinStatus] pending approvals=', pending && pending.length, pending);
        if (!pending || !pending.length) return;
        // 避免重复弹窗：按 openid + appliedAt 去重（新申请会重新弹窗）
        // 存到本地存储，冷启动也不重复
        this._notifiedApprovalIds = this._notifiedApprovalIds || wx.getStorageSync('panda_notified_approval_ids') || {};
        const newPending = pending.filter(m => {
          const key = m.openid + '_' + (m.appliedAt || 0);
          return !this._notifiedApprovalIds[key];
        });
        console.log('[checkJoinStatus] newPending=', newPending.length);
        if (!newPending.length) return;
        const m = newPending[0];
        const key = m.openid + '_' + (m.appliedAt || 0);
        this._notifiedApprovalIds[key] = true;
        wx.setStorageSync('panda_notified_approval_ids', this._notifiedApprovalIds);

        // 使用自定义弹窗（样式统一）
        const pages = getCurrentPages();
        const targetPage = pages.find(p => 
          p.route === 'pages/plan/plan' || p.route === 'pages/index/index'
        );
        if (targetPage) {
          targetPage._globalAlertCallback = {
            confirm: () => {
              cs.approveMember(m.familyId, m.openid, 'member').then(() => {
                wx.showToast({ title: '已同意加入', icon: 'none' });
                cs.getMyFamily().then(() => cs.pull()).catch(() => {});
              }).catch(e => wx.showToast({ title: '操作失败：' + (e.message || ''), icon: 'none' }));
            },
            cancel: () => {
              cs.rejectMember(m.familyId, m.openid).then(() => {
                wx.showToast({ title: '已拒绝', icon: 'none' });
              }).catch(e => wx.showToast({ title: '操作失败：' + (e.message || ''), icon: 'none' }));
            }
          };
          targetPage.setData({
            showGlobalAlert: true,
            globalAlert: {
              title: promptI18n.translate('亲友加入申请'),
              message: promptI18n.translate(`${m.nickname || '亲友'}（${m.familyRole || '成员'}）申请加入家庭，是否同意？`),
              type: 'confirm',
              confirmText: promptI18n.translate('同意'),
              cancelText: promptI18n.translate('拒绝')
            }
          });
        } else {
          // 兜底：如果不在 plan 页面，使用原生弹窗
          wx.showModal({
            title: '亲友加入申请',
            content: `${m.nickname || '亲友'}（${m.familyRole || '成员'}）申请加入家庭，是否同意？`,
            confirmText: '同意',
            cancelText: '拒绝',
            success: (res) => {
              if (res.confirm) {
                cs.approveMember(m.familyId, m.openid, 'member').then(() => {
                  wx.showToast({ title: '已同意加入', icon: 'none' });
                  cs.getMyFamily().then(() => cs.pull()).catch(() => {});
                }).catch(e => wx.showToast({ title: '操作失败：' + (e.message || ''), icon: 'none' }));
              } else {
                cs.rejectMember(m.familyId, m.openid).then(() => {
                  wx.showToast({ title: '已拒绝', icon: 'none' });
                }).catch(e => wx.showToast({ title: '操作失败：' + (e.message || ''), icon: 'none' }));
              }
            }
          });
        }
      }).catch(e => console.log('[checkJoinStatus] approvals fail', e && e.message));
      
      // 0. 获取当前家庭信息，设置到 globalData
      cs.getMyFamily().then(f => {
        this.globalData.myFamily = f || null;
      }).catch(() => {});
      // 0.1 检查待审核状态（直接从家庭成员中判断，不依赖云函数）
      cs.getMyFamilies().then(fams => {
        const myOpenid = this.globalData.user && this.globalData.user.openid || '';
        let pendingJoin = null;
        for (const fam of (fams || [])) {
          if (fam.ownerOpenid !== myOpenid) {
            const me = (fam.pendingApplications || []).find(m => m && m.openid === myOpenid);
            if (me && (me.status || 'pending') !== 'rejected') {
              pendingJoin = { familyId: fam._id, familyName: fam.name, status: 'pending' };
              break;
            }
          }
        }
        this.globalData.pendingJoin = pendingJoin;
      }).catch(() => {});
      
      // 2. 检查亲友端：我加入家庭的结果通知
      cs.getMyJoinStatus().then(results => {
        if (!results || !results.length) return;
        // 只处理已完成的申请（active 或 rejected），pending 不弹窗
        const doneResults = results.filter(r => r.status === 'active' || r.status === 'rejected');
        if (!doneResults.length) return;
        // 避免重复弹窗：按 familyId + status + updatedAt 去重（存到本地存储，冷启动也不重复）
        this._notifiedJoinIds = this._notifiedJoinIds || wx.getStorageSync('panda_notified_join_ids') || {};
        const pending = doneResults.filter(r => {
          const ts = r.auditedAt || r.appliedAt || 0;
          const key = r.familyId + '_' + r.status + '_' + ts;
          return !this._notifiedJoinIds[key];
        });
        if (!pending.length) return;
        const r = pending[0];
        const ts = r.auditedAt || r.appliedAt || 0;
        const key = r.familyId + '_' + r.status + '_' + ts;
        this._notifiedJoinIds[key] = true;
        wx.setStorageSync('panda_notified_join_ids', this._notifiedJoinIds);
        const msg = r.status === 'active'
          ? `🎉 你已成功加入「${r.familyName}」家庭`
          : `😢 很遗憾，你加入「${r.familyName}」家庭的申请被拒绝了`;

        // 使用自定义弹窗（样式统一）
        const pages = getCurrentPages();
        const targetPage = pages.find(p => 
          p.route === 'pages/plan/plan' || p.route === 'pages/index/index'
        );
        if (targetPage) {
          targetPage._globalAlertCallback = {
            confirm: () => {
              if (r.status === 'rejected' && cs.cancelJoinApply) {
                try { cs.cancelJoinApply(r.familyId).catch(() => {}); } catch (e) {}
              }
              cs.getMyFamily().then(() => cs.pull()).then(() => {
                wx.reLaunch({ url: '/pages/my-babies/my-babies' });
              }).catch(() => {
                wx.reLaunch({ url: '/pages/my-babies/my-babies' });
              });
            }
          };
          targetPage.setData({
            showGlobalAlert: true,
            globalAlert: {
              title: promptI18n.translate('加入申请结果'),
              message: promptI18n.translate(msg),
              type: 'alert',
              confirmText: promptI18n.translate('知道了')
            }
          });
        } else {
          // 兜底：如果不在 plan 页面，使用原生弹窗
          wx.showModal({
            title: '加入申请结果',
            content: msg,
            showCancel: false,
            confirmText: '知道了',
            success: () => {
              cs.getMyFamily().then(() => cs.pull()).then(() => {
                wx.reLaunch({ url: '/pages/my-babies/my-babies' });
              }).catch(() => {
                wx.reLaunch({ url: '/pages/my-babies/my-babies' });
              });
            }
          });
        }
      }).catch(e => console.log('[checkJoinStatus] join status fail', e && e.message));
    } catch (e) {}
  },

  /* 切换宝宝 */
  switchBaby(babyId) {
    if (!babyId || babyId === this.globalData.currentBabyId) return;
    this.saveBabyData();
    this.globalData.currentBabyId = babyId;
    this.loadBabyData(babyId);
    wx.setStorageSync(STORAGE_KEY, this.packShared());
    // 切换宝宝后从云端拉取最新数据，确保只显示云端喂养信息
    try {
      const cs = require('./utils/cloud-sync.js');
      cs.pull().catch(() => {});
    } catch (e) {}
  },

  /* 新增宝宝（profile 需含 name/birthday 等）；newCurrent=true 时切换为新宝宝 */
  /* 兼容老数据：为无宝宝号的宝宝按序补号并持久化 */
  ensureBabyNos() {
    try {
      let changed = false;
      (this.globalData.babies || []).forEach(b => {
        if (!b.babyNo) {
          b.babyNo = this.genBabyNo();
          changed = true;
        }
      });
      if (changed) this.persist();
    } catch (e) {}
  },

  /* 生成宝宝号：账号下按序号 B-001/B-002…，稳定展示用 */
  genBabyNo() {
    // 用时间戳后4位 + 随机数，保证多账号间不重复
    const ts = Date.now() % 10000;
    const rand = Math.floor(Math.random() * 100);
    return 'B-' + String(ts).padStart(4, '0') + String(rand).padStart(2, '0');
  },

  addBaby(profile, newCurrent) {
    // 最多 3 个宝宝
    if ((this.globalData.babies || []).length >= 3) {
      wx.showToast({ title: '最多只能添加3个宝宝', icon: 'none' });
      return null;
    }
    // 校验：宝宝名字不能为空
    if (!profile || !profile.name || !profile.name.trim()) {
      wx.showToast({ title: '请填写宝宝名字', icon: 'none' });
      return null;
    }
    // 已加入家庭作为亲友 → 不能创建宝宝
    const me = this.globalData.user || {};
    const myOpenid = me.openid || '';
    const myFam = this.globalData.myFamily;
    if (myFam && myFam.ownerOpenid && myFam.ownerOpenid !== myOpenid) {
      wx.showToast({ title: '你已加入家庭成为亲友，不能创建宝宝', icon: 'none' });
      return null;
    }
    // 如果用户有家庭，宝宝自动归属到该家庭
    const familyId = (this.globalData.myFamily && this.globalData.myFamily._id) || '';
    const p = Object.assign({}, profile, { id: genId(), ownerOpenid: me.openid || '', familyId, createdAt: Date.now() });
    if (!p.babyNo) p.babyNo = this.genBabyNo();
    this.globalData.babies.push(p);
    if (newCurrent !== false) {
      // 先设置 currentBabyId，再 saveBabyData（否则 saveBabyData 开头 if(!currentBabyId) 直接退出）
      this.globalData.currentBabyId = p.id;
      this.globalData.baby = p;
      this.globalData.records = [];
      this.globalData.diaperStock = 0;
      this.globalData.supplies = { milk: 0, milkFeeds: 0, d3Days: 0 };
      this.globalData.vaccine = {};
      this.globalData.vaccinePlan = buildVaccinePlan(p.birthday);
      this.globalData.stockItems = defaultStockItems();
      this.globalData.shelfWarnings = defaultShelfWarnings();
      this.globalData.measures = defaultMeasures(p.birthday);
      this.globalData.vaccineDone = defaultVaccineDone();
      this.saveBabyData();
      wx.setStorageSync(BABY_KEY + p.id, {
        records: [], diaperStock: 0, supplies: this.globalData.supplies, vaccine: this.globalData.vaccine,
        vaccinePlan: this.globalData.vaccinePlan,
        stockItems: this.globalData.stockItems, shelfWarnings: this.globalData.shelfWarnings,
        measures: this.globalData.measures, vaccineDone: this.globalData.vaccineDone
      });
    }
    wx.setStorageSync(STORAGE_KEY, this.packShared());
    return p;
  },

  /* 更新某宝宝档案 */
  updateBaby(babyId, profile) {
    const i = this.globalData.babies.findIndex(b => b.id === babyId);
    if (i < 0) return;
    this.globalData.babies[i] = Object.assign({}, this.globalData.babies[i], profile, { id: babyId });
    if (babyId === this.globalData.currentBabyId) {
      this.globalData.baby = this.globalData.babies[i];
    }
    wx.setStorageSync(STORAGE_KEY, this.packShared());
    this.loadAvatars();
    // 保存后广播刷新所有存活页面（成长档案 / 我的宝贝 / 记录页等），头像信息立即一致
    try {
      getCurrentPages().forEach(pg => {
        if (pg && pg.route && typeof pg.refresh === 'function') {
          try { pg.refresh(); } catch (e) {}
        }
      });
    } catch (e) {}
  },

  /* 移除宝宝：档案与独立数据一并删除；若删的是当前宝宝则自动切换到剩余第一个 */
  removeBaby(babyId) {
    const i = this.globalData.babies.findIndex(b => b.id === babyId);
    if (i < 0) return false;
    this.globalData.babies.splice(i, 1);
    wx.removeStorageSync(BABY_KEY + babyId);
    if (babyId === this.globalData.currentBabyId) {
      if (this.globalData.babies.length) {
        this.globalData.currentBabyId = this.globalData.babies[0].id;
        this.loadBabyData(this.globalData.currentBabyId);
      } else {
        // 最后一个宝宝也被移除：默认无宝宝（空状态）
        this.globalData.babies = [];
        this.globalData.currentBabyId = '';
        this.globalData.records = [];
        this.globalData.diaperStock = 0;
        this.globalData.supplies = { milk: 0, milkFeeds: 0, d3Days: 0 };
        this.globalData.vaccine = {};
        this.globalData.vaccinePlan = [];
        this.globalData.stockItems = [];
        this.globalData.shelfWarnings = [];
        this.globalData.measures = [];
        this.globalData.vaccineDone = [];
      }
    }
    wx.setStorageSync(STORAGE_KEY, this.packShared());
    // 后端：彻底删除该宝宝云端数据（异步静默）
    try {
      if (cloudData.cloudReady()) {
        const u = this.globalData.user || {};
        if (u.logged || u.openid) {
          cloudData.getOpenid().then(() => {
            wx.cloud.callFunction({ name: 'cloudData', data: { action: 'wipe', babyId } }).then(r => {
              if (r.result && r.result.code === 0) {
                console.log('[removeBaby] wipe success babyId=', babyId);
              } else {
                console.log('[removeBaby] wipe fail', r.result);
                wx.showToast({ title: '云端删除失败，已删除本地', icon: 'none' });
              }
            }).catch(e => {
              console.log('[removeBaby] wipe error', e);
              wx.showToast({ title: '网络错误，云端未删除', icon: 'none' });
            });
          }).catch(() => {});
        }
      }
    } catch (e) {}
    return true;
  },

  getCurrentBaby() {
    return this.globalData.baby;
  },

  /* 头像独立 key 优先：从 panda_avatar_<id> 读取并覆盖 babies[i].avatar（独立 key 极小，永不受总量限制影响） */
  loadAvatars() {
    try {
      (this.globalData.babies || []).forEach(b => {
        if (!b.id) return;
        const av = wx.getStorageSync('panda_avatar_' + b.id);
        if (av) b.avatar = av;
      });
      const cur = this.globalData.babies.find(b => b.id === this.globalData.currentBabyId);
      if (cur) this.globalData.baby = cur;
    } catch (e) {}
  },

  packShared() {
    const g = this.globalData;
    return {
      babies: g.babies,
      currentBabyId: g.currentBabyId,
      familyMembers: g.familyMembers
    };
  },

  /* 睡眠悬浮：开始（存进行中睡眠的记录索引与开始时间） */
  startSleepFloat(index, startTime) {
    this.globalData.sleepFloat = { index, startTime };
  },

  /* 睡眠悬浮：结束（长按 3s / 手动保存时调用），自动写入结束时间并持久化 */
  endSleepFloat(endTime) {
    const s = this.globalData.sleepFloat;
    if (!s) return false;
    const rec = this.globalData.records[s.index];
    if (rec && s.startTime) {
      rec.sleepEnd = endTime;
      rec.sleepSeconds = this.calcDur(s.startTime, endTime);
      this.persist();
    }
    this.globalData.sleepFloat = null;
    return true;
  },

  /* HH:mm 时间差（分钟），跨天 +1440 */
  calcDur(a, b) {
    if (!a || !b) return 0;
    const pa = a.split(':').map(Number);
    const pb = b.split(':').map(Number);
    let d = (pb[0] * 60 + pb[1]) - (pa[0] * 60 + pa[1]);
    if (d < 0) d += 1440;
    return d;
  },

  persist() {
    this.saveBabyData();
    wx.setStorageSync(STORAGE_KEY, this.packShared());
  },

  /* ==================== 账号（登录用户） ==================== */
  getUser() {
    return this.globalData.user;
  },

  /* 权限校验：需登录（未登录 → 提示并引导登录，返回 false） */
  requireLogin() {
    const u = this.globalData.user || {};
    if (u.logged) return true;
    this.globalData.pendingLogin = true;
    wx.showModal({
      title: '需要登录',
      content: '登录后即可使用该功能，支持多人协作与云端同步',
      confirmText: '去登录',
      cancelText: '取消',
      success: (r) => {
        if (r.confirm) {
          wx.switchTab({ url: '/pages/plan/plan' });
        } else {
          this.globalData.pendingLogin = false;
        }
      }
    });
    return false;
  },

  /* 权限校验：需登录 + 已添加宝宝 */
  requireBaby() {
    if (!this.requireLogin()) return false;
    if ((this.globalData.babies || []).length) return true;
    wx.showModal({
      title: '需要添加宝宝',
      content: '添加宝宝后即可记录喂养点滴',
      confirmText: '去添加',
      cancelText: '取消',
      success: (r) => {
        if (r.confirm) wx.navigateTo({ url: '/pages/baby-edit/baby-edit?add=1' });
      }
    });
    return false;
  },
  saveUser(user) {
    const wasLogged = !!this.globalData.user.logged;
    this.globalData.user = Object.assign({}, this.globalData.user, user);
    wx.setStorageSync('panda_user', this.globalData.user);
    // 首次登录成功：触发云端全量同步（拉取云端合并 + 推送本地）
    if (this.globalData.user.logged && !wasLogged) {
      this.syncCloudAfterLogin();
      // 首次登录：先引导开启麦克风，避免首次长按语音键时系统授权弹窗与录音面板叠加卡住
      setTimeout(() => { try { this.maybeAskVoiceAuth(); } catch (e) {} }, 1800);
    }
    return this.globalData.user;
  },
  /* 首次登录引导开启麦克风：只在从未询问过时弹一次，
     用户同意后直接调起系统授权，之后长按语音键不会再弹系统弹窗 */
  maybeAskVoiceAuth(tries) {
    const user = this.globalData.user || {};
    if (!user.logged) return;
    if (wx.getStorageSync('voiceAuthPrompted')) return;
    if (this._voiceAuthPrompting) return;
    // 页面上已有登录/资料/记录抽屉等弹层时先让位，避免两个弹窗叠加
    const attempt = typeof tries === 'number' ? tries : 0;
    let busy = false;
    try {
      const pages = (typeof getCurrentPages === 'function') ? getCurrentPages() : [];
      const d = (pages.length && pages[pages.length - 1].data) || {};
      busy = !!(d.loginVisible || d.profileVisible || d.showQuick || d.showVoice || d.showPolicy || (d.record && d.record.visible));
    } catch (e) {}
    if (busy) {
      if (attempt < 3) setTimeout(() => { this.maybeAskVoiceAuth(attempt + 1); }, 2000);
      return;
    }
    this._voiceAuthPrompting = true;
    const en = (wx.getStorageSync('lang') || 'zh') === 'en';
    const done = () => { this._voiceAuthPrompting = false; };
    wx.getSetting({
      success: (res) => {
        const st = (res && res.authSetting) || {};
        if (st['scope.record'] === true) { done(); wx.setStorageSync('voiceAuthPrompted', true); return; }
        if (st['scope.record'] === false) { done(); wx.setStorageSync('voiceAuthPrompted', true); return; }
        wx.setStorageSync('voiceAuthPrompted', true);
        wx.showModal({
          title: en ? 'Enable Voice Input' : '开启语音录入',
          content: en
            ? 'Allow microphone access so one sentence can record a feed by voice. You can change it anytime in Settings - Permissions & Privacy.'
            : '允许使用麦克风后，长按语音键一句话即可完成喂养记录。随时可在「我的 - 权限与隐私」中修改。',
          confirmText: en ? 'Enable' : '去开启',
          cancelText: en ? 'Not now' : '以后再说',
          confirmColor: '#c99a2e',
          success: (m) => {
            if (!m.confirm) { done(); return; }
            wx.authorize({
              scope: 'scope.record',
              success: () => {
                done();
                wx.showToast({ title: en ? 'Microphone enabled' : '麦克风已开启', icon: 'success' });
              },
              fail: () => {
                done();
                wx.showToast({ title: en ? 'You can enable it in Permissions & Privacy' : '可在「权限与隐私」中开启', icon: 'none' });
              }
            });
          },
          fail: done
        });
      },
      fail: done
    });
  },

  loadUser() {
    const saved = wx.getStorageSync('panda_user');
    this.globalData.user = Object.assign({}, {
      openid: '', avatar: '', nickname: '', phone: '', logged: false
    }, saved || {});
    return this.globalData.user;
  },
  onHide() {
    if (this._joinTimer) { clearInterval(this._joinTimer); this._joinTimer = null; }
    if (this._pullTimer) { clearInterval(this._pullTimer); this._pullTimer = null; }
    // 切后台前冲刷未推送的数据（避免防抖窗口内保存的记录丢失上传）
    try { cloudData.flushPush(); } catch (e) {}
  }
});
