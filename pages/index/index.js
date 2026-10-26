const app = getApp();
const remindUtil = require('../../utils/remind.js');
const perm = require('../../utils/perm.js');
const { exifTime } = require('../../utils/exif-time.js');
const { diffDays } = require('../../utils/vaccine-data.js');

function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
}


/* 跨时区辅助：按某个时区偏移（分钟，东为正）把绝对时刻格式化成 YYYY-MM-DD */
function dateStrAtOffset(ms, offMin) {
  const d = new Date(ms + (offMin || 0) * 60000);
  return d.getUTCFullYear() + '-' + ('0' + (d.getUTCMonth() + 1)).slice(-2) + '-' + ('0' + d.getUTCDate()).slice(-2);
}
/* 记录发生时刻：优先绝对时间戳 ts，其次云端版本时间 _u（老数据也能跨时区算对） */
function recordTs(r) {
  const t = Number(r && (r.ts || r._u)) || 0;
  return t > 0 ? t : 0;
}
function pad(n) {
  return n < 10 ? '0' + n : '' + n;
}

Page({

  onShareAppMessage() {
    return {
        imageUrl: '/images/share-cover.png', title: '熊宝喂养 · 宝宝喂养记录助手', path: 'pages/index/index' };
  },
  onShareTimeline() {
    return { title: '熊宝喂养 · 宝宝喂养记录助手' };
  },
  data: {

    safeTop: (app.globalData && app.globalData.safeTop) || 88,
    navTop: ((app.globalData && app.globalData.safeTop) || 88) - 44,
    greeting: '早上好',
    guide: { visible: false, title: '', desc: '', primary: '', mode: '' },
    reminder: {
      nextTime: '',
      type: '',
      remainText: '',
      hasRecord: false,
      icon: '🍼'
    },
    tools: [
      { iconImg: '/images/icons/tool-inventory.png', bg: '#fff2b9', title: '喂养台', desc: '物资余量与补货', action: 'feeding' },
      { iconImg: '/images/icons/tool-book.png', bg: '#fff2b9', title: '育儿百科全书', desc: '成长知识随时查', action: 'encyclopedia' },
      { iconImg: '/images/icons/sos.png', bg: '#ffe3cc', title: 'SOS 指导', desc: '紧急照护指引', action: 'sos' },
      { iconImg: '/images/icons/tool-growth.png', bg: '#fff2b9', title: '宝宝成长档案', desc: '记录每个重要时刻', action: 'baby' }
    ],
    showReminder: false,

    // ===== 全局提醒弹窗 =====
    showGlobalAlert: false,
    globalAlert: {
      title: '',
      message: '',
      type: 'confirm', // confirm / alert
      confirmText: '确定',
      cancelText: '取消'
    },
    eduRec: { ageText: '', type: '', title: '', content: '', tip: '' },
    rmode: 'list',            // list | restock | detail
    remindersRead: false,
    hasReminder: false,
    reminders: { items: [], todos: [] },
    selectedAdd: 1,
    restockInfo: { kind: 'milk', title: '奶粉补货', unit: '次', stock: 0, days: 0, options: [] },
    detailInfo: { title: '', rows: [], actionText: '', actionKey: '' }
  },

  onLoad(options) {
    // 分享/邀请码入口：分享卡片带 invite 参数 → 自动加入云端家庭
    if (options && options.invite) {
      const code = decodeURIComponent(options.invite).trim().toUpperCase();
      if (code) this.handleInvite(code);
    }
    // 录音管理器
    this.recorder = wx.getRecorderManager();
    this.recorder.onStop((res) => this.onRecorderStop(res));
    this.recorder.onError(() => {
      wx.showToast({ title: '录音失败，请检查麦克风权限', icon: 'none' });
      this.setData({ recording: false });
      if (this.recorderTimer) clearInterval(this.recorderTimer);
    });
    // 音频播放（列表 & 预览共用）
    this.audioCtx = wx.createInnerAudioContext();
    this.audioCtx.onEnded(() => this.setData({ playingId: '' }));
    this.audioCtx.onError(() => {
      this.setData({ playingId: '' });
      wx.showToast({ title: '播放失败', icon: 'none' });
    });
    // 录音预览播放器
    this.recPlayer = wx.createInnerAudioContext();
    this.recPlayer.onEnded(() => this.setData({ recPlaying: false }));
    this.recPlayer.onStop(() => this.setData({ recPlaying: false }));
    this.recPlayer.onError(() => {
      this.setData({ recPlaying: false });
      wx.showToast({ title: '预览播放失败', icon: 'none' });
    });
  },


  // 处理分享邀请码：不自动提交申请；先要求登录，登录后进入协作页弹出申请弹窗
  handleInvite(code) {
    code = String(code || '').trim().toUpperCase();
    if (!code) return;
    if (app.globalData) app.globalData.pendingInviteCode = code;
    const user = app.getUser() || {};
    if (!user.logged || !user.openid) {
      app.globalData.pendingLogin = true;
      wx.showToast({ title: '请先登录账号后再加入家庭', icon: 'none' });
      wx.switchTab({ url: '/pages/plan/plan' });
      return;
    }
    const pages = getCurrentPages();
    const cur = pages[pages.length - 1];
    if (cur && cur.route === 'subchart/pages/collaboration/collaboration') return;
    wx.navigateTo({ url: '/subchart/pages/collaboration/collaboration' });
  },
  onUnload() {
    if (this.recorderTimer) clearInterval(this.recorderTimer);
    if (this.recPlayer) {
      this.recPlayer.destroy();
      this.recPlayer = null;
    }
    if (this.audioCtx) {
      this.audioCtx.destroy();
      this.audioCtx = null;
    }
    if (this._syncTimer) { clearInterval(this._syncTimer); this._syncTimer = null; }
  },

  /* 按当前时间生成问候语：凌晨好 / 早上好 / 中午好 / 下午好 / 傍晚好 */
  timeGreeting(rel) {
    const h = new Date().getHours();
    let part = '早上好';
    if (h >= 0 && h < 6) part = '凌晨好';
    else if (h >= 6 && h < 11) part = '早上好';
    else if (h >= 11 && h < 13) part = '中午好';
    else if (h >= 13 && h < 18) part = '下午好';
    else part = '傍晚好';
    return rel ? (part + '，' + rel) : part;
  },

  /* 当前用户在当前宝宝所属家庭里的身份；同一账号可能同时在自己的家庭和亲友家庭中，必须按宝宝 owner 匹配家庭 */
  getFamilyRoleForBaby() {
    const baby = app.globalData.baby || {};
    const me = app.getUser() || {};
    const myOpenid = me.openid || '';
    const babyOwner = baby.ownerOpenid || '';
    const babyFamilyId = baby.familyId || '';
    if (!myOpenid || (!babyOwner && !babyFamilyId)) return '';

    const candidates = [];
    // 先放 app.globalData.myFamily（最近一次云端家庭信息），再放权限缓存，避免同一家庭旧缓存覆盖新身份
    const currentFamily = app.globalData.myFamily;
    if (currentFamily && currentFamily._id) candidates.push(currentFamily);
    try {
      const p = perm.getMyPerm();
      if (p && p.myOpenid === myOpenid) candidates.push.apply(candidates, p.families || []);
    } catch (e) {}

    const seen = {};
    for (let i = 0; i < candidates.length; i++) {
      const fam = candidates[i];
      if (!fam || !fam._id || seen[fam._id]) continue;
      seen[fam._id] = true;
      // 有 owner 时按 owner 匹配；老数据缺少 owner 时按宝宝 familyId 匹配
      if (babyOwner) {
        if (!fam.ownerOpenid || fam.ownerOpenid !== babyOwner) continue;
      } else if (babyFamilyId && fam._id !== babyFamilyId) {
        continue;
      }
      const member = (fam.members || []).find(x => x && x.openid === myOpenid);
      const role = member && (member.familyRole || '').trim();
      if (role) return role;
    }
    return '';
  },

  /* 问候称呼：家庭成员的 familyRole 优先；自己的宝宝/未加入家庭时回退到宝宝档案 relation */
  getGreetingRole() {
    const baby = app.globalData.baby || {};
    const me = app.getUser() || {};
    const myOpenid = me.openid || '';
    const babyOwner = baby.ownerOpenid || '';
    const familyRole = this.getFamilyRoleForBaby();
    if (familyRole) return familyRole;
    // 自己的宝宝，或老数据没有 owner 字段：沿用创建宝宝时设置的亲属关系
    if (!babyOwner || !myOpenid || babyOwner === myOpenid) {
      return (baby.relation || '').trim();
    }
    // 亲友的家庭角色尚未同步时，不显示宝宝创建者的“妈妈/爸爸”，避免误称
    return '';
  },

  refreshGreeting() {
    const g = this.timeGreeting(this.getGreetingRole());
    if (this.data.greeting !== g) this.setData({ greeting: g });
  },

  onShow() {
    const lang = wx.getStorageSync('lang') || 'zh';
    // 按语言动态设置工具卡片，保留喂养台和成长档案原中文
    const tools = lang === 'en' ? [
      { iconImg: '/images/icons/tool-inventory.png', bg: '#fff2b9', title: 'Feeding Station', desc: 'Stock & restock', action: 'feeding' },
      { iconImg: '/images/icons/tool-book.png', bg: '#fff2b9', title: 'Parenting Guide', desc: 'Growth knowledge', action: 'encyclopedia' },
      { iconImg: '/images/icons/sos.png', bg: '#ffe3cc', title: 'SOS Guide', desc: 'Emergency care', action: 'sos' },
      { iconImg: '/images/icons/tool-growth.png', bg: '#fff2b9', title: 'Baby Profile', desc: 'Record every moment', action: 'baby' }
    ] : [
      { iconImg: '/images/icons/tool-inventory.png', bg: '#fff2b9', title: '喂养台', desc: '物资余量与补货', action: 'feeding' },
      { iconImg: '/images/icons/tool-book.png', bg: '#fff2b9', title: '育儿百科全书', desc: '成长知识随时查', action: 'encyclopedia' },
      { iconImg: '/images/icons/sos.png', bg: '#ffe3cc', title: 'SOS 指导', desc: '紧急照护指引', action: 'sos' },
      { iconImg: '/images/icons/tool-growth.png', bg: '#fff2b9', title: '宝宝成长档案', desc: '记录每个重要时刻', action: 'baby' }
    ];
    this.setData({ lang: lang, tools: tools });
    console.log('[index onShow] records=', (app.globalData.records||[]).length, 'currentBabyId=', app.globalData.currentBabyId, 'baby=', (app.globalData.baby||{}).id);
    (app.globalData.records||[]).forEach((r,i) => console.log('[index onShow] r', i, 'type=', r.type, 'date=', r.date, 'by=', r.by && r.by.name));
    this.guideFirst();
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      // 首页没有自己的遮罩层；显式复位，避免从快速记录/记录页切回时沿用 hidden 状态
      this.getTabBar().setData({ selected: 0, hidden: false });
    }
    // 如果没有宝宝，清空喂养记录（避免显示旧记录）
    const user = app.getUser();
    if (!user.logged || !app.globalData.baby || !app.globalData.baby.id) {
      app.globalData.records = [];
      app.globalData.measures = { heights: [], weights: [], headRounds: [] };
    }
    // 问候语随当前时间变化；称呼优先使用当前用户在当前宝宝所属家庭里的身份
    this.refreshGreeting();
    if (typeof app.onPullDone === 'function') {
      app.onPullDone(() => this.refreshGreeting());
    }
    this.buildNextReminder();
    this.buildReminders();
    this.buildEduRec();
    // 启动定时同步：每 10 秒拉取一次云端数据，实现家庭共享记录实时同步
    this.startPeriodicSync();
  },

  onHide() {
    if (this._syncTimer) { clearInterval(this._syncTimer); this._syncTimer = null; }
  },

  /* 定时同步：每 10 秒拉取一次云端数据 */
  startPeriodicSync() {
    // 只在已登录且加入了家庭时才启动定时同步
    const user = app.getUser();
    if (!user.logged) return;
    const hasFamily = !!(app.globalData.myFamily && app.globalData.myFamily._id);
    if (!hasFamily) return;
    if (this._syncTimer) clearInterval(this._syncTimer);
    // 间隔缩短到3秒，加快多端同步速度
    this._syncTimer = setInterval(() => {
      if (this._syncing) return; // 避免重复请求
      this._syncing = true;
      console.log('[index periodicSync] 定时拉取云端数据...');
      try {
        const cloudData = require('../../utils/cloud-data.js');
        cloudData.pull().then(() => {
          // 刷新首页显示
          this.setData({
            records: app.globalData.records || []
          });
          this.buildNextReminder();
          this.buildReminders();
          this.refreshGreeting();
          this._syncing = false;
        }).catch(e => {
          console.log('[index periodicSync] 拉取失败', e);
          this._syncing = false;
        });
      } catch (e) {
        console.log('[index periodicSync] 错误', e);
        this._syncing = false;
      }
    }, 3000); // 缩短到3秒，多端同步更快
    // 启动后立即触发一次同步
    setTimeout(() => {
      try {
        const cloudData = require('../../utils/cloud-data.js');
        cloudData.pull();
      } catch(e) {}
    }, 500);
  },

  /* 首次打开引导：登录/注册 → 添加宝宝 → 开始记录（品牌风格弹窗） */
  guideFirst() {
    const key = 'panda_guide_done';
    if (wx.getStorageSync(key)) return;
    // 分享邀请进入时不要叠加登录/添加宝宝引导，先完成加入家庭流程
    if (app.globalData && app.globalData.pendingInviteCode) return;
    wx.setStorageSync(key, true);
    const u = app.getUser() || {};
    if (u.logged) {
      if (!(app.globalData.babies || []).length) {
        this.setData({
          guide: { visible: true, title: '添加宝宝', desc: '添加宝宝后即可开始记录喂养点滴', primary: '去添加', mode: 'baby' }
        });
      }
      return;
    }
    // 未登录：引导登录/注册（记录页账号卡可一键登录）
    this.setData({
      guide: { visible: true, title: '登录 / 注册', desc: '登录后即可为宝宝记录喂养点滴，还支持多人协作与云端同步', primary: '去登录', mode: 'login' }
    });
  },

  guidePrimary() {
    const mode = this.data.guide.mode;
    this.setData({ 'guide.visible': false });
    if (mode === 'login') {
      // 去登录：跳记录页并自动弹出登录抽屉
      app.globalData.pendingLogin = true;
      wx.switchTab({ url: '/pages/plan/plan' });
    } else {
      // 去添加：直接进入新增宝宝页面
      wx.navigateTo({ url: '/pages/baby-edit/baby-edit?add=1' });
    }
  },

  guideSkip() {
    this.setData({ 'guide.visible': false });
  },

  /* ==================== 黄色卡片：最后一条喂养记录详情 ==================== */
  buildNextReminder() {
    const records = app.globalData.records || [];
    const feedTypes = ['母乳', '配方奶', '瓶喂母乳', '吸奶', '辅食', '喝水', '换尿布', '睡眠', '营养品', '洗澡', '体温'];
    const ts = todayStr();
    const nowMs = Date.now();
    console.log('[buildNextReminder] records=', records.length, 'ts=', ts, 'currentBabyId=', app.globalData.currentBabyId);
    records.forEach((r,i) => { if (i < 5) console.log('[buildNextReminder] r', i, 'type=', r.type, 'date=', r.date, 'inFeedTypes=', feedTypes.indexOf(r.type) >= 0); });
    // 只取「当天」的喂养记录：当天没有记录 → 显示每日祝福语；当天有记录 → 显示最新一条
    // 跨国家庭：按记录自带的时区判断「今天」；老数据无 tz 时，24 小时内发生的记录也视为当前（避免对方看不到刚喂的记录）
    let last = null;
    for (let i = records.length - 1; i >= 0; i--) {
      const r = records[i];
      if (!r || feedTypes.indexOf(r.type) < 0) continue;
      const rTs = recordTs(r);
      const isToday = (r.tz === 0 || r.tz) ? (r.date === dateStrAtOffset(nowMs, r.tz)) : (r.date === ts || (rTs > 0 && nowMs - rTs >= 0 && nowMs - rTs < 24 * 3600000));
      if (isToday) { last = r; break; }
    }
    if (!last) {
      this.setData({
        reminder: {
          lastDetail: '', lastTime: '', agoText: '',
          hasRecord: false, icon: '🍼', iconImg: '/images/icons/blessing-flower.png',
          blessing: this.dailyBlessing()
        }
      });
      return;
    }
    const now = new Date();
    let lastDt = recordTs(last);
    if (!lastDt) {
      const dp = String(last.date || todayStr()).split('-').map(Number);
      const tp = String(last.time || '00:00').split(':').map(Number);
      lastDt = new Date(dp[0], (dp[1] || 1) - 1, dp[2] || 1, tp[0] || 0, tp[1] || 0, 0).getTime();
    }
    const agoMin = Math.round((now.getTime() - lastDt) / 60000);
    // 图标与记录页保持一致（记录页各类型图片图标）
    const iconMap = { 母乳: '/images/icons/rec-nursing.png', 配方奶: '/images/icons/rec-bottle.png', 瓶喂母乳: '/images/icons/rec-bottle.png', 吸奶: '/images/icons/rec-pump.png', 换尿布: '/images/icons/rec-diaper.png', 营养品: '/images/icons/rec-supplement.png', 睡眠: '/images/icons/rec-sleep.png', 辅食: '/images/icons/rec-food.png', 喝水: '/images/icons/rec-water.png', 洗澡: '/images/icons/rec-bath.png', 体温: '/images/icons/rec-temp.png' };
    const detail = this.feedDetail(last);
    this.setData({
      reminder: {
        lastDetail: detail,
        lastTime: last.time || '--:--',
        agoText: this.agoText(agoMin),
        hasRecord: true,
        icon: iconMap[last.type] || '🍼',
        iconImg: iconMap[last.type] || ''
      }
    });
  },

  /* 最后一条记录的详情文案（随语言切换） */
  feedDetail(r) {
    const en = (this.data.lang || wx.getStorageSync('lang') || 'zh') === 'en';
    switch (r.type) {
      case '母乳':
        return (en ? 'Breastfeeding · ' : '母乳 · ') + this.fmtDur(r.total || 0);
      case '配方奶':
        return (en ? 'Bottle Feeding · ' : '配方奶 · ') + (r.amount || 0) + ' ml';
      case '瓶喂母乳':
        return (en ? 'Bottle Feeding · ' : '瓶喂母乳 · ') + (r.amount || 0) + ' ml';
      case '吸奶':
        return en ? ('Pumping · ' + ((r.pumpTotal || 0)) + ' ml total') : ('吸奶 · 共 ' + ((r.pumpTotal || 0)) + ' ml');
      case '辅食':
        return en ? ('Solid Food · ' + ((r.simpleAmount || 0)) + ' serving(s)') : ('辅食 · ' + ((r.simpleAmount || 0)) + ' 份');
      case '喝水':
        return (en ? 'Water · ' : '喝水 · ') + (r.water || 0) + ' ml';
      case '洗澡':
        return en ? 'Bath Time' : '洗澡';
      case '体温':
        return (en ? 'Temperature · ' : '量体温 · ') + (r.temperature || '36.5') + '℃';
      case '换尿布':
        return en ? 'Diaper Change' : '换尿布';
      case '睡眠':
        return en ? 'Sleep' : '睡眠';
      case '营养品':
        return (en ? 'Supplements · ' : '营养品 · ') + (r.supps || []).join(en ? ', ' : '、');
      default:
        return en ? ('Record · ' + r.type) : (r.type + '记录');
    }
  },

  /* 秒数 → 时长文案 */
  fmtDur(sec) {
    const en = (this.data.lang || wx.getStorageSync('lang') || 'zh') === 'en';
    if (!sec) return en ? '0 min' : '0 分钟';
    const mm = Math.floor(sec / 60);
    const ss = sec % 60;
    if (en) return ss ? (mm + ' min ' + ss + ' sec') : (mm + ' min');
    return ss ? mm + ' 分 ' + ss + ' 秒' : mm + ' 分钟';
  },

  /* 距今多久文案 */
  agoText(min) {
    const en = (this.data.lang || wx.getStorageSync('lang') || 'zh') === 'en';
    if (en) {
      if (min < 1) return 'Just now';
      if (min < 60) return min + ' min ago';
      const hh = Math.floor(min / 60);
      if (hh < 24) {
        const mm = min % 60;
        return mm ? (hh + ' hr ' + mm + ' min ago') : (hh + ' hr ago');
      }
      const dd = Math.floor(hh / 24);
      return dd === 1 ? 'Yesterday' : (dd + ' days ago');
    }
    if (min < 1) return '刚刚';
    if (min < 60) return min + ' 分钟前';
    const hh = Math.floor(min / 60);
    if (hh < 24) {
      const mm = min % 60;
      return mm ? hh + ' 小时 ' + mm + ' 分前' : hh + ' 小时前';
    }
    const dd = Math.floor(hh / 24);
    return dd + ' 天前';
  },

  /* 每日祝福语（无记录时展示，按日期每天自动换一条，随语言切换） */
  dailyBlessing() {
    const en = (this.data.lang || wx.getStorageSync('lang') || 'zh') === 'en';
    const list = [
      '愿你与宝宝相处的每一天，都被温柔以待',
      '记录是爱的证据，今天也要好好爱自己',
      '照顾宝宝的你辛苦了，记得留一点时间给自己',
      '每一个小细节，都是你给宝宝的温柔守护',
      '愿你今天笑容常在，和宝宝一起慢慢长大',
      '你的耐心和爱，是宝宝最好的养分',
      '今天也要记得按时喝水、好好吃饭哦',
      '新手妈妈的日常，也值得被认真记录',
      '愿你被爱包围，和宝宝共度美好时光',
      '慢慢来，你和宝宝都做得很好',
      '宝宝的每一个眼神，都在说谢谢你',
      '你是宝宝的全世界，也是自己的光',
      '把温柔留给孩子，也别忘了留一点给自己',
      '每一个平凡的日夜，都在累积不平凡的爱',
      '累了就歇一歇，妈妈的休息也很重要',
      '愿今晚的月亮，替疲惫的你守夜',
      '今天的小进步，都是明天的底气',
      '你给予的爱，正在变成宝宝眼里的星光',
      '喂奶、换尿布、哄睡，每件小事都值得骄傲',
      '愿你和宝宝，都被世界温柔相待',
      '你做得已经足够好，剩下的交给时间',
      '清晨的第一缕阳光，也为你和宝宝停留',
      '每一份付出，都在悄悄开花',
      '今天也辛苦啦，抱抱自己吧'
    ];
    const listEn = [
      'Every day with baby, be treated gently',
      'Recording is proof of love, love yourself too',
      'You care for baby, keep time for yourself',
      'Every little detail is your gentle care',
      'May you smile today as baby grows',
      'Your patience is baby\'s best nutrient',
      'Remember water and meals today too',
      'A new mom\'s days deserve recording',
      'May you be surrounded by love today',
      'Take it slow, you two are doing great',
      'Every look from baby says thank you',
      'You are baby\'s world, and your own light',
      'Keep gentleness for yourself too',
      'Ordinary days build extraordinary love',
      'Rest when tired, mom\'s rest matters',
      'May the moon watch over tired you',
      'Small steps today, strength tomorrow',
      'Your love is starlight in baby\'s eyes',
      'Feeding, diapers, sleep all count',
      'May you and baby be treated gently',
      'You have done enough, let time do more',
      'Morning light stops for you and baby',
      'Every effort is quietly blooming',
      'You did well today, give yourself a hug'
    ];
    const d = new Date();
    const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    const pool = en ? listEn : list;
    const start = seed % pool.length;
    if (en) return pool[start];
    // 祝福语不超过 14 个字：命中超长则顺延替换为新的短祝福语
    for (let i = 0; i < list.length; i++) {
      const b = list[(start + i) % list.length];
      if (b.length <= 14) return b;
    }
    // 全部超长（兜底）：取最短一条
    return list.reduce((a, b) => (b.length < a.length ? b : a));
  },

  /* 距下一次提醒的剩余时间 */
  fmtRemain(min) {
    if (min < 1) return '1 分钟';
    const hh = Math.floor(min / 60);
    const mm = min % 60;
    return hh > 0 ? (mm > 0 ? hh + ' 小时 ' + mm + ' 分钟' : hh + ' 小时') : (mm + ' 分钟');
  },

  fmtAgo(min) {
    if (min < 1) return '刚刚';
    const hh = Math.floor(min / 60);
    const mm = min % 60;
    return hh > 0 ? (hh + ' 小时 ' + mm + ' 分钟') : (mm + ' 分钟');
  },

  /* ==================== 真实数据构建提醒 / 待办（联动库存预警·保质期·疫苗·喂养，仅显示 2 小时内临近到期） ==================== */
  // 宝宝月龄（小数，含天数折算）
  calcBabyMonths(birthday) {
    if (!birthday) return 0;
    const b = String(birthday).split('-').map(Number);
    const now = new Date();
    let months = (now.getFullYear() - b[0]) * 12 + (now.getMonth() - (b[1] - 1));
    // 天数折算
    const dayDiff = now.getDate() - (b[2] || 1);
    if (dayDiff < 0) {
      months -= 1;
      const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
      months += (prevMonth + dayDiff) / prevMonth;
    } else {
      const curMonthDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      months += dayDiff / curMonthDays;
    }
    return Math.max(0, months);
  },

  // 辅食阶段名
  supplementStage(months) {
    if (months < 7) return '6月龄 初始添加期';
    if (months < 10) return '7-9月龄 咀嚼练习期';
    if (months < 13) return '10-12月龄 过渡三餐期';
    if (months < 25) return '13-24月龄 三餐两点期';
    return '幼儿期';
  },

  // 按宝宝月龄生成每日辅食推荐食谱（依据中国居民膳食指南婴幼儿喂养建议）
  buildSupplementRecipe(months) {
    const m = Math.floor(months);
    if (m < 6) return null;
    // 按日期轮换菜单：一年中的第几天 % 套数，保证每天推荐不同
    const nowD = new Date();
    const start = new Date(nowD.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((nowD - start) / 86400000);
    let title = '', meals = [], tips = [];
    if (m === 6) {
      title = '6月龄 · 辅食刚开始（排敏期）';
      // 按满6月后的天数决定排敏进度
      const b = new Date(g.baby.birthday + 'T00:00:00');
      const sixMo = new Date(b.getFullYear(), b.getMonth() + 6, b.getDate());
      const daysSince = Math.max(0, Math.floor((Date.now() - sixMo.getTime()) / 86400000));
      const vegSets = [
        [
          { time: '上午', food: '强化铁婴儿米粉 5-10g', note: '用水或奶调稀至流勺状，从1勺开始' },
          { time: '下午', food: '南瓜泥 10-20g', note: '第1次吃南瓜观察3天过敏' },
          { time: '加餐', food: '苹果泥 10-20g', note: '不加糖不加盐' }
        ],
        [
          { time: '上午', food: '强化铁婴儿米粉 5-10g', note: '用水或奶调稀' },
          { time: '下午', food: '胡萝卜泥 10-20g', note: '第1次吃胡萝卜观察3天过敏' },
          { time: '加餐', food: '香蕉泥 10-20g', note: '现做现吃' }
        ],
        [
          { time: '上午', food: '强化铁婴儿米粉 5-10g', note: '用水或奶调稀' },
          { time: '下午', food: '土豆泥 10-20g', note: '第1次吃土豆观察3天过敏' },
          { time: '加餐', food: '梨泥 10-20g', note: '现做现吃' }
        ]
      ];
      if (daysSince < 7) {
        // 第1周：纯米粉排敏期
        meals = [
          { time: '上午', food: '强化铁婴儿米粉 5-10g', note: '用水或奶调稀至流勺状，从1勺开始' },
          { time: '下午', food: '（暂停新食物）', note: '本周只吃米粉，观察是否有皮疹/呕吐/腹泻' }
        ];
        tips = ['第1周只吃米粉排敏，不加菜泥果泥', '每次只喂1-2勺，观察3天无过敏反应', '优先高铁食材，奶量仍为主约800-1000ml/天'];
      } else if (daysSince < 14) {
        // 第2周：加1种蔬菜泥
        const s = vegSets[dayOfYear % 3];
        meals = [
          s[0],
          s[1],
          { time: '加餐', food: '（暂停果泥）', note: '本周只加一种蔬菜泥，不混新食物' }
        ];
        tips = ['第2周开始每天加1种蔬菜泥，每种观察3天', '蔬菜排敏顺序：南瓜→胡萝卜→土豆→菠菜', '奶量仍为主约800-1000ml/天', '不加糖不加盐'];
      } else {
        // 第3周起：菜泥+果泥
        meals = vegSets[dayOfYear % 3];
        tips = ['菜泥果泥都已试过，每天1-2次辅食', '继续观察新食物过敏，每种新食物观察3天', '奶量仍为主约800-1000ml/天', '不加糖不加盐'];
      }
    } else if (m <= 9) {
      title = '7-9月龄 · 学习咀嚼';
      const sets = [
        [
          { time: '早餐后', food: '稠粥 30-50g + 蛋黄 1/2个', note: '主食从稀到稠' },
          { time: '午餐', food: '猪肉泥 20-30g + 南瓜泥 20-30g', note: '红肉补铁' },
          { time: '下午茶', food: '豆腐泥 20g', note: '可给蒸软胡萝卜条练抓握' },
          { time: '晚餐', food: '碎菜粥 30-50g', note: '与家人同桌' }
        ],
        [
          { time: '早餐后', food: '烂面条 30-50g + 蛋黄 1/2个', note: '换口味' },
          { time: '午餐', food: '鱼肉泥 20-30g + 菠菜泥 20-30g', note: '注意去刺' },
          { time: '下午茶', food: '苹果泥 30g', note: '练习抓握' },
          { time: '晚餐', food: '烂面 30-50g', note: '清淡' }
        ],
        [
          { time: '早餐后', food: '小米粥 30-50g + 蒸蛋黄', note: '粗粮搭配' },
          { time: '午餐', food: '牛肉泥 20-30g + 胡萝卜泥 20-30g', note: '高铁高蛋白' },
          { time: '下午茶', food: '香蕉泥 30g', note: '现做现吃' },
          { time: '晚餐', food: '碎菜面 30-50g', note: '与家人同桌' }
        ]
      ];
      meals = sets[dayOfYear % 3];
      tips = ['每日2-3次辅食，逐渐加量', '油5-10g/天，用核桃油/橄榄油', '开始用勺子，练习咀嚼', '奶量约700-800ml/天'];
    } else if (m <= 12) {
      title = '10-12月龄 · 过渡三餐';
      const sets = [
        [
          { time: '早餐', food: '软粥 50g + 蒸蛋 1个', note: '主食+蛋白质' },
          { time: '午餐', food: '软饭 50g + 鸡肉末 30g + 西兰花碎 30g', note: '食物切小丁' },
          { time: '下午茶', food: '苹果块 50g', note: '练习抓食' },
          { time: '晚餐', food: '烂面 50g + 豆腐 30g', note: '与三餐同步' }
        ],
        [
          { time: '早餐', food: '小馄饨 50g + 蒸蛋 1个', note: '换花样' },
          { time: '午餐', food: '软饭 50g + 猪肉末 30g + 番茄碎 30g', note: '荤素搭配' },
          { time: '下午茶', food: '香蕉块 50g + 小饼干2块', note: '练抓握' },
          { time: '晚餐', food: '软饭 50g + 鱼 30g', note: '清淡少盐' }
        ],
        [
          { time: '早餐', food: '小米粥 50g + 蒸蛋 1个', note: '粗粮搭配' },
          { time: '午餐', food: '软饭 50g + 牛肉末 30g + 菠菜碎 30g', note: '补铁' },
          { time: '下午茶', food: '梨块 50g', note: '练习咀嚼' },
          { time: '晚餐', food: '饺子 50g + 蔬菜汤', note: '与家人同桌' }
        ]
      ];
      meals = sets[dayOfYear % 3];
      tips = ['每日2-3餐辅食+1-2次加餐', '食物有颗粒感，锻炼咀嚼', '可吃少量家庭食物（少盐无调味）', '油5-10g/天，奶量约600-700ml/天'];
    } else {
      title = '13-24月龄 · 三餐两点';
      const sets = [
        [
          { time: '早餐', food: '软饭 50g + 鸡蛋 1个 + 奶 300ml', note: '主食+蛋+奶' },
          { time: '上午加餐', food: '苹果 100g', note: '少量' },
          { time: '午餐', food: '软饭 75g + 红烧肉末 50g + 青菜 50g', note: '小块化' },
          { time: '下午加餐', food: '酸奶 100g', note: '避免含糖零食' },
          { time: '晚餐', food: '番茄鸡蛋面 50g + 西兰花 50g', note: '清淡' }
        ],
        [
          { time: '早餐', food: '馒头 50g + 鸡蛋 1个 + 奶 300ml', note: '换花样' },
          { time: '上午加餐', food: '香蕉 100g', note: '少量' },
          { time: '午餐', food: '软饭 75g + 清蒸鱼 50g + 胡萝卜 50g', note: '去刺' },
          { time: '下午加餐', food: '小点心 20g', note: '少量' },
          { time: '晚餐', food: '猪肉水饺 75g + 蔬菜汤', note: '少盐' }
        ],
        [
          { time: '早餐', food: '小米粥 50g + 鸡蛋 1个 + 奶 300ml', note: '粗粮搭配' },
          { time: '上午加餐', food: '梨 100g', note: '少量' },
          { time: '午餐', food: '软饭 75g + 牛肉末 50g + 菠菜 50g', note: '补铁' },
          { time: '下午加餐', food: '奶 200ml + 小饼干2块', note: '少量' },
          { time: '晚餐', food: '菜肉粥 75g + 豆腐 30g', note: '清淡' }
        ]
      ];
      meals = sets[dayOfYear % 3];
      tips = ['每日3餐+2次加餐', '继续喝母乳/配方奶约500ml', '少盐少糖，避免整粒坚果、果冻等呛噎食物', '肉禽鱼总量50-75g/天，蛋1个'];
    }
    return { title, stage: this.supplementStage(months), meals, tips };
  },

  buildReminders() {
    const g = app.globalData;
    const items = [];
    const todos = [];
    const ts = todayStr();
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const WINDOW = 120; // 2 小时内到期的提醒才显示
    const todayCount = (type) => (g.records || []).filter(r => r && r.date === ts && r.type === type).length;
    // 没有真实宝宝时，不生成宝宝相关提醒（喂养/营养品/疫苗/辅食），库存与到期仍保留
    const hasBaby = !!(g.baby && g.baby.id && (g.baby.name || g.baby.birthday));

    // —— 库存预警：遍历所有耗材库存物品，任何物品库存低于阈值都提醒 ——
    const stockGroups = {};
    (g.stockItems || []).forEach(s => {
      if (!s.name) return;
      // 电器类物品不参与首页库存偏低/用尽提醒，只在保修期到期时才提醒
      if (/吸奶器|消毒器|温奶器|摇奶器|辅食机|料理机|恒温壶|烘干机|洗衣机|电器|暖奶器/.test(s.name)) return;
      // 过滤旧版本预置示例耗材（纸尿裤/奶粉/棉柔巾，库存 0 且无耗材属性），避免假的库存提醒
      if (app.isLegacyPresetStock && app.isLegacyPresetStock(s)) return;
      const size = s.size || '通用';
      const groupKey = s.name + '_' + size;
      const isFormula = /奶粉|配方奶|配方牛奶/.test(s.name);
      if (!stockGroups[groupKey]) {
        stockGroups[groupKey] = {
          name: s.name,
          size: size,
          unit: s.unit || '个',
          count: 0,
          isFormula: isFormula,
          threshold: isFormula ? 2 : 10 // 奶粉低于 2 罐才提醒；其他耗材低于 10 个提醒
        };
      }
      stockGroups[groupKey].count += Number(s.count) || 0;
    });
    // 对每个库存分组，低于阈值则生成提醒
    const dismissedStockLow = wx.getStorageSync('dismissed_stock_low') || {};
    Object.keys(stockGroups).forEach(groupKey => {
      const g = stockGroups[groupKey];
      // 奶粉：剩余 < 2 罐提醒（1 罐或更少）；其他耗材：剩余 ≤ 10 提醒
      const lowNow = g.count > 0 && (g.isFormula ? g.count < g.threshold : g.count <= g.threshold);
      if (lowNow) {
        // 已点知道了的库存偏低提醒不再显示
        if (dismissedStockLow[groupKey]) {
          // 如果补货后库存回到阈值以上，清除忽略状态，下次再偏低会重新提醒
          return;
        }
        const isUrgent = g.count <= (g.isFormula ? 1 : 3); // 奶粉仅剩1罐/其他耗材低于3个显示红色紧急标签
        items.push({
          key: 'stock_low_' + groupKey, rawName: groupKey, iconImg: '/images/icons/rec-stats.png', icon: '', title: g.name + (g.size !== '通用' ? '（' + g.size + '码）' : '') + '库存偏低',
          desc: g.isFormula
            ? ('仅剩 ' + g.count + ' ' + g.unit + ' · 低于 2 罐，建议及时补货')
            : ('剩余 ' + g.count + ' ' + g.unit + ' · 建议及时补货'),
          tag: isUrgent ? '紧急' : '需补货', tagClass: isUrgent ? 'red' : 'amber',
          actionLabel: '知道了', actionKey: 'dismiss_stock_low', minutesUntil: 0
        });
      } else if (dismissedStockLow[groupKey]) {
        // 补货后库存回到正常，清除忽略状态
        delete dismissedStockLow[groupKey];
        wx.setStorageSync('dismissed_stock_low', dismissedStockLow);
      }
    });

    // —— 库存用尽提醒：曾经有库存、现在全部用完才提醒一次，补货后自动消失 ——
    // 本地缓存记录已用尽的物品类型
    let exhaustedList = [];
    try { exhaustedList = wx.getStorageSync('panda_exhausted') || []; } catch (e) {}
    // 按物品大类分组统计当前总库存
    const groupMap = {};
    (g.stockItems || []).forEach(s => {
      if (!s.name) return;
      // 电器类物品不参与首页库存用尽提醒
      if (/吸奶器|消毒器|温奶器|摇奶器|辅食机|料理机|恒温壶|烘干机|洗衣机|电器|暖奶器/.test(s.name)) return;
      // 过滤旧版本预置示例耗材，避免假的“用尽”提醒
      if (app.isLegacyPresetStock && app.isLegacyPresetStock(s)) return;
      let groupName = s.name;
      if (s.name.indexOf('纸尿裤') >= 0 || s.name.indexOf('拉拉裤') >= 0) groupName = '纸尿裤';
      else if (s.name.indexOf('奶粉') >= 0 || s.name.indexOf('牛奶粉') >= 0 || s.name.indexOf('羊奶粉') >= 0) groupName = '配方奶粉';
      else if (s.name.indexOf('D3') >= 0 || s.name.indexOf('维生素D') >= 0) groupName = '维生素D3';
      groupMap[groupName] = (groupMap[groupName] || 0) + (Number(s.count) || 0);
    });
    // 检查每个分组：如果当前总库存=0，加入已用尽列表；如果>0，从已用尽列表移除
    const newExhausted = [];
    Object.keys(groupMap).forEach(gname => {
      if (groupMap[gname] <= 0) {
        // 用完了，加入提醒
        newExhausted.push(gname);
        // 已点知道了忽略的提醒不再显示
        const dismissedExhausted = wx.getStorageSync('dismissed_exhausted') || {};
        if (!dismissedExhausted[gname]) {
          items.push({
            key: 'exhausted_' + gname, rawName: gname, iconImg: '/images/icons/rec-stats.png', icon: '', title: gname + '库存已用尽',
            desc: '所有尺码/批次均已用完，请及时补货',
            tag: '需补货', tagClass: 'red', actionLabel: '知道了', actionKey: 'dismiss_exhausted', minutesUntil: 0
          });
        }
      } else {
        // 补货后自动清除该类物品的忽略状态，下次再用尽会重新提醒
        const dismissedExhausted = wx.getStorageSync('dismissed_exhausted') || {};
        if (dismissedExhausted[gname]) {
          delete dismissedExhausted[gname];
          wx.setStorageSync('dismissed_exhausted', dismissedExhausted);
        }
      }
    });
    // 保存最新的已用尽列表
    try { wx.setStorageSync('panda_exhausted', newExhausted); } catch (e) {}

    // —— 保质期提醒：母乳到期（吸奶记录 × 国标储存时限，精确到秒） ——
    const MS = g.MILK_STORAGE || {};
    (g.records || []).forEach((r) => {
      if (!r || r.type !== '吸奶') return;
      const minfo = remindUtil.expireOf(r, MS);
      if (!minfo) return;
      const st = MS[r.storage] ? r.storage : 'fridge';
      const cfg = MS[st] || MS.fridge;
      const dp = String(r.date || todayStr()).split('-').map(Number);
      // 解析时间（支持 HH:MM 和 HH:MM:SS）
      const tp = String(r.time || '00:00').split(':').map(Number);
      const startSec = tp[2] || 0;
      // 跨时区：优先用记录绝对时间戳，避免把对方时区的墙上时间按本机时区重算
      const _abs = recordTs(r);
      const start = _abs ? new Date(_abs) : new Date(dp[0], (dp[1] || 1) - 1, dp[2] || 1, tp[0] || 0, tp[1] || 0, startSec);
      let expire;
      if (cfg.unit === 'h') expire = new Date(start.getTime() + cfg.value * 3600000);
      else expire = new Date(start.getFullYear(), start.getMonth() + cfg.value, start.getDate(), start.getHours(), start.getMinutes(), startSec);
      const sec = Math.round((expire - now) / 1000);
      const min = Math.round(sec / 60);
      if (min <= WINDOW) {
        const inDate = String(r.date || '').slice(5).replace('-', '/');
        const inTime = r.time || '';
        const expireTime = String(expire.getHours()).padStart(2, '0') + ':' + String(expire.getMinutes()).padStart(2, '0') + ':' + String(expire.getSeconds()).padStart(2, '0');
        const itemKey = r.id || ('rec_' + Date.now());
        // 已处理（日历「知道了」/ 库存页 / 其它成员）的母乳到期提醒不再显示
        if (remindUtil.isMilkAcked(r, minfo.ymd)) return;
        items.push({
          key: itemKey, iconImg: '/images/icons/rec-pump.png', icon: '',
          title: min < 0 ? '母乳已到期（' + (cfg.label || '') + '）' : '母乳即将到期（' + (cfg.label || '') + '）',
          desc: min < 0
            ? inDate + ' ' + inTime + ' 入库 · 已于 ' + expireTime + ' 到期，请丢弃'
            : inDate + ' ' + inTime + ' 入库 · 将于 ' + expireTime + ' 到期',
          tag: min < 0 ? '已到期' : '即将到期', tagClass: 'red',
          // 已到期的按钮改成"知道了"，点击后本条提醒消失
          actionLabel: min < 0 ? '知道了' : '去查看',
          actionKey: min < 0 ? 'dismiss_milk' : 'record',
          milkAckId: minfo.ackId,
          milkRecId: r.id || '',
          minutesUntil: min
        });
      }
    });

    // —— 保质期提醒：库存商品到期（生产日期 + 保质期） ——
    (g.stockItems || []).forEach((s) => {
      if (!s.produceDate || !s.shelfLife) return;
      const pp = String(s.produceDate).split('-').map(Number);
      const pd = new Date(pp[0], (pp[1] || 1) - 1, pp[2] || 1);
      const ex = new Date(pd.getTime() + Number(s.shelfLife) * 86400000);
      ex.setHours(0, 0, 0, 0);
      const min = Math.round((ex - now) / 60000);
      if (min <= WINDOW) {
        items.push({
          key: 'stock_' + (s.id || Date.now()), iconImg: '/images/icons/rec-stats.png', icon: '',
          title: (s.name || '库存商品') + (min < 0 ? '已过期' : '即将过期'),
          desc: min < 0 ? '已于 ' + (ex.getMonth() + 1) + '月' + ex.getDate() + '日到期，请勿使用' : '今天到期，请及时处理或补货',
          tag: min < 0 ? '已过期' : '今天到期', tagClass: 'red',
          actionLabel: '去处理', actionKey: 'inventory', minutesUntil: min
        });
      }
    });

    // —— 保修期提醒：电器保修到期（临近 7 天内或已过期） ——
    (g.stockItems || []).forEach((s) => {
      if (!s.warrantyUntil) return;
      const wp = String(s.warrantyUntil).split('-').map(Number);
      const wex = new Date(wp[0], (wp[1] || 1) - 1, wp[2] || 1);
      wex.setHours(0, 0, 0, 0);
      const wmin = Math.round((wex - now) / 60000);
      if (wmin <= 7 * 1440) {
        const left = Math.ceil(wmin / 1440);
        items.push({
          key: 'warr_' + (s.id || Date.now()), iconImg: '/images/icons/rec-stats.png', icon: '',
          title: (s.name || '电器') + (wmin < 0 ? '已过保修期' : '即将过保修期'),
          desc: wmin < 0 ? '已于 ' + (wex.getMonth() + 1) + '月' + wex.getDate() + ' 日到期' : '剩余约 ' + left + ' 天保修到期',
          tag: wmin < 0 ? '已到期' : '即将到期', tagClass: wmin < 0 ? 'red' : 'amber',
          actionLabel: '去详情', actionKey: 'inventory', minutesUntil: wmin
        });
      }
    });

    // —— 奶粉开罐到期提醒：库存里没有奶粉也照样提醒（按开罐日 + 国标天数） ——
    const enK = (wx.getStorageSync('lang') === 'en');
    (g.shelfWarnings || []).forEach((w) => {
      if (!w || w.kind !== 'formulaOpen' || !w.date) return;
      const op = String(w.date).split('-').map(Number);
      const oex = new Date(op[0], (op[1] || 1) - 1, op[2] || 1);
      oex.setHours(0, 0, 0, 0);
      const omin = Math.round((oex - now) / 60000);
      if (omin > 3 * 1440) return;            // 到期前 3 天才开始提醒
      const oleft = Math.ceil(omin / 1440);
      const mdd = (oex.getMonth() + 1) + (enK ? '/' : '月') + oex.getDate() + (enK ? '' : '日');
      items.push({
        key: 'milkopen_' + (w.id || Date.now()), iconImg: '/images/icons/rec-bottle.png', icon: '',
        title: enK
          ? ('Opened formula ' + (omin < 0 ? 'has expired' : 'expires in ' + oleft + ' day(s)'))
          : ('奶粉开罐' + (omin < 0 ? '已到期' : '剩 ' + oleft + ' 天到期')),
        desc: enK
          ? (omin < 0 ? 'Passed the use-by date of ' + mdd + ', discard it' : 'Use before ' + mdd + ' (within ' + (w.openDays || 28) + ' days of opening)')
          : (omin < 0 ? '已超过 ' + mdd + ' 的用完期限，请丢弃' : '建议 ' + mdd + ' 前用完（开罐后 ' + (w.openDays || 28) + ' 天内）'),
        tag: enK ? (omin < 0 ? 'Expired' : 'Expiring') : (omin < 0 ? '已到期' : '即将到期'),
        tagClass: 'red',
        actionLabel: enK ? 'Manage' : '去处理', actionKey: 'inventory', minutesUntil: omin
      });
    });

    if (hasBaby) {
    const lang = this.data.lang || wx.getStorageSync('lang') || 'zh';
    // —— 喂养提醒：按宝宝月龄推荐间隔，有上次记录则提前10分钟提醒；无记录则常驻「今天该喂奶了」 ——
    const feedTypes = ['母乳', '配方奶', '瓶喂母乳'];
    const feeds = (g.records || []).filter(r => r && feedTypes.indexOf(r.type) >= 0).slice()
      .sort((a, b) => (((b.date || '') + (b.time || '')) > ((a.date || '') + (a.time || '')) ? 1 : -1));
    // 月龄推荐喂奶间隔（分钟）：新生儿2h，随月龄拉长
    const bm = (g.baby && g.baby.birthday) ? this.calcBabyMonths(g.baby.birthday) : 6;
    const feedIntervalMin = bm < 1 ? 120 : bm < 3 ? 150 : bm < 6 ? 180 : bm < 12 ? 240 : 300;
    const intervalText = Math.round(feedIntervalMin / 60 * 10) / 10 + ' 小时';
    if (feeds.length) {
      const last = feeds[0];
      let lastMs = recordTs(last);
      if (!lastMs) {
        const dp = String(last.date || todayStr()).split('-').map(Number);
        const tp = String(last.time || '00:00').split(':').map(Number);
        lastMs = new Date(dp[0], (dp[1] || 1) - 1, dp[2] || 1, tp[0] || 0, tp[1] || 0).getTime();
      }
      const nextMs = lastMs + feedIntervalMin * 60000;
      // 提前 10 分钟开始提醒
      const min = Math.round((nextMs - now.getTime()) / 60000) - 10;
      if (min <= WINDOW) {
        const passedMin = Math.max(0, Math.round((now.getTime() - lastMs) / 60000));
        todos.push({
          key: 'feed', iconImg: '/images/icons/rec-nursing.png', icon: '',
          title: lang === 'en' ? (min < 0 ? 'Time to feed' : 'Upcoming feed') : (min < 0 ? '该喂奶了' : '即将到喂奶时间'),
          desc: lang === 'en' ? ('Last feed was ' + passedMin + ' mins ago · Recommended interval ' + intervalText + (min < 0 ? ' (Overdue)' : '')) : ('距上次喂养已 ' + passedMin + ' 分钟 · 建议间隔 ' + intervalText + (min < 0 ? '（已超时）' : '')),
          tag: lang === 'en' ? (min < 0 ? 'Overdue' : 'Upcoming') : (min < 0 ? '已超时' : '临近'), tagClass: min < 0 ? 'red' : 'amber',
          done: false, actionLabel: lang === 'en' ? 'Log' : '去记录', actionKey: 'record', minutesUntil: min
        });
      }
    } else {
      // 时间轴上没有任何亲喂/瓶喂记录：常驻提醒今天该喂奶了
      todos.push({
        key: 'feed', iconImg: '/images/icons/rec-nursing.png', icon: '',
        title: lang === 'en' ? 'Time to feed today' : '今天该喂奶了',
        desc: lang === 'en' ? ('No feeding record today, recommended interval ' + intervalText) : ('今天还没有亲喂或瓶喂记录，建议间隔 ' + intervalText),
        tag: lang === 'en' ? 'Pending' : '待记录', tagClass: 'amber',
        done: false, actionLabel: lang === 'en' ? 'Log' : '去记录', actionKey: 'record', minutesUntil: 0
      });
    }

    // —— 待办：补充维生素 D（仅用户设置过 D3 定时提醒后出现；时间取用户设置，默认 10:30） ——
    const vitdSet = (g.records || []).some(r => r.type === '营养品' && r.supps && r.supps.some(n => /维生素D3|维生素D|D3|维生素AD|AD/.test(n)) && (r.suppRemindFreq || r.suppRemindTime));
    if (vitdSet) {
      const vitDLast = (g.records || []).slice().reverse().find(r => r.type === '营养品' && r.supps && r.supps.some(n => /维生素D3|维生素D|D3|维生素AD|AD/.test(n)));
      const vitDDone = (g.records || []).some(r => r.date === ts && r.type === '营养品' && r.supps && r.supps.some(n => /维生素D3|维生素D|D3|维生素AD|AD/.test(n)));
      if (!vitDDone) {
        const vt = String(vitDLast && vitDLast.suppRemindTime ? vitDLast.suppRemindTime : '10:30').split(':').map(Number);
        const vTarget = (vt[0] * 60 + (vt[1] || 0)) - nowMin;
        if (vTarget <= WINDOW) {
          todos.push({
            key: 'vitd', iconImg: '/images/icons/rec-supplement.png', icon: '', title: '补充维生素 D',
            desc: (vitDLast && vitDLast.suppRemindTime ? vitDLast.suppRemindTime : '10:30') + ' · 每日一次' + (vTarget < 0 ? '（已过时间，请补喂）' : ''),
            tag: '待完成', tagClass: 'amber', done: false, actionLabel: '去记录', actionKey: 'record', minutesUntil: vTarget
          });
        }
      }
    }

    // —— 待办：营养品补充提醒（记录日期 + 频率推进到今天，按服用时间判断临近） ——
    const FREQ_DAYS = { '每日': 1, '每2天': 2, '每3天': 3, '每周': 7, '每两周': 14 };
    const suppRecs = (g.records || []).filter(r => r.type === '营养品' && r.suppRemindFreq && FREQ_DAYS[r.suppRemindFreq]);
    suppRecs.forEach((r, i) => {
      const rd = new Date(r.date + 'T00:00:00');
      if (isNaN(rd.getTime())) return;
      rd.setDate(rd.getDate() + FREQ_DAYS[r.suppRemindFreq]);
      const ymd = rd.getFullYear() + '-' + String(rd.getMonth() + 1).padStart(2, '0') + '-' + String(rd.getDate()).padStart(2, '0');
      if (ymd !== ts) return;
      let smin = 0;
      if (r.suppRemindTime) {
        const sp = String(r.suppRemindTime).split(':').map(Number);
        smin = ((sp[0] || 0) * 60 + (sp[1] || 0)) - nowMin;
      }
      if (smin > WINDOW) return;
      todos.push({
        key: 'supp' + i, iconImg: '/images/icons/rec-supplement.png', icon: '', title: '补充营养品',
        desc: (r.supps || []).join('、') + ' · ' + (r.suppRemindTime || '') + ' · ' + r.suppRemindFreq + (smin < 0 ? '（已过时间）' : ''),
        tag: '待完成', tagClass: 'amber', done: false, actionLabel: '去记录', actionKey: 'record', minutesUntil: smin
      });
    });

    // —— 待办：辅食提醒（宝宝满 6 月龄后，每天上午 9:00 提醒，时间可在 storage 配置） ——
    const baby = g.baby || {};
    if (baby.birthday) {
      const months = this.calcBabyMonths(baby.birthday);
      if (months >= 6) {
        const supTime = '09:00'; // 默认 9:00（可被 storage 覆盖）
        let setTime = supTime;
        try { const st = wx.getStorageSync('panda_supplement_remind_time'); if (st) setTime = st; } catch (e) {}
        const sp = String(setTime).split(':').map(Number);
        const sMin = ((sp[0] || 0) * 60 + (sp[1] || 0)) - nowMin;
        if (sMin <= WINDOW) {
          todos.push({
            key: 'supplement', iconImg: '/images/icons/rec-food.png', icon: '', title: lang === 'en' ? 'Today Solid Food' : '今日辅食安排',
            desc: setTime + ' · ' + this.supplementStage(months) + (lang === 'en' ? (sMin < 0 ? ' (Due now)' : '') : (sMin < 0 ? '（已到时间）' : '')),
            tag: lang === 'en' ? 'Solid Food' : '辅食', tagClass: 'amber', done: false,
            actionLabel: lang === 'en' ? 'View Recipe' : '看食谱', actionKey: 'supplement', minutesUntil: sMin,
            months: months
          });
        }
      }
    }

    // —— 疫苗提醒：仅近 2 天即将接种（今天/明天/后天），过期或已接种不再提醒 ——
    const plan = g.vaccinePlan || [];
    const pendingList = plan.filter(v => v.status === 'pending');
    const vEff = v => v.doneDate || v.dueDate;
    const nearList = pendingList.filter(v => {
      const d = diffDays(ts, vEff(v));
      return d >= 0 && d <= 2;
    });
    if (nearList.length) {
      const sorted = nearList.slice().sort((a, b) => (vEff(a) > vEff(b) ? 1 : -1));
      todos.push({
        key: 'vaccine', icon: '', iconImg: '/images/icons/vaccine-remind.png', title: '疫苗待接种',
        desc: sorted.map(v => (v.group || v.short || '疫苗') + (v.dose ? v.dose + '剂' : '') + '（' + vEff(v) + '）').join('、'),
        tag: '待接种', tagClass: 'red',
        done: false, actionLabel: '去处理', actionKey: 'vaccine', minutesUntil: 0
      });
    }
    } // end if (hasBaby)

    // 站内提醒开关（权限与隐私页配置）：按类别过滤
    let rs = {};
    try { rs = wx.getStorageSync('panda_remind_settings') || {}; } catch (e) {}
    const catOf = (k) => {
      if (k === 'vaccine') return 'vaccine';
      if (k === 'feed') return 'feed';
      if (k.indexOf('supp') === 0 || k === 'vitd') return 'nutrition';
      if (k.indexOf('milkExp') === 0) return 'milk';
      return 'stock'; // 库存预警 / 耗材保质期 / 保修期 / D3
    };
    const remindOn = (k) => rs[catOf(k)] !== false;
    const filtered = items.filter(i => remindOn(i.key));
    const filteredTodos = todos.filter(t => remindOn(t.key));

    const pending = filtered.length > 0 || filteredTodos.some(t => !t.done);
    this.setData({
      reminders: { items: filtered, todos: filteredTodos },
      hasReminder: !this.data.remindersRead && pending
    });
  },

  /* ==================== 今日提醒弹窗 ==================== */
  refreshReminderDialog() {
    const WINDOW = 120;
    const items = this.data.reminders.items.filter(i => i.minutesUntil <= WINDOW);
    const allTodos = this.data.reminders.todos.filter(t => t.minutesUntil <= WINDOW);
    // 按真实分类拆分待办：喂养（含该喂奶/今日辅食） / 营养品（去掉维生素D） / 疫苗
    const feedTodos = allTodos.filter(t => t.key === 'feed' || t.key === 'supplement');
    const suppTodos = allTodos.filter(t => t.key.indexOf('supp') === 0 && t.key !== 'supplement');
    const vaccineTodos = allTodos.filter(t => t.key === 'vaccine');
    this.setData({
      reminders: {
        items,
        feedTodos, suppTodos, vaccineTodos
      },
      remindEmpty: items.length === 0 && allTodos.length === 0
    });
  },
  openReminder() {
    this.buildReminders();
    this.refreshReminderDialog();
    this.setData({ showReminder: true, rmode: 'list' });
  },

  confirmReminder() {
    this.setData({ showReminder: false, remindersRead: true, hasReminder: false });
    wx.showToast({ title: '提醒已读', icon: 'none' });
  },

  // ===== 全局提醒弹窗 =====
  closeGlobalAlert() {
    this.setData({ showGlobalAlert: false });
  },
  onGlobalAlertCancel() {
    this.setData({ showGlobalAlert: false });
    if (this._globalAlertCallback && this._globalAlertCallback.cancel) {
      this._globalAlertCallback.cancel();
    }
  },
  onGlobalAlertConfirm() {
    this.setData({ showGlobalAlert: false });
    if (this._globalAlertCallback && this._globalAlertCallback.confirm) {
      this._globalAlertCallback.confirm();
    }
  },

  noop() {},

  /* 列表项操作：去补货 / 去详情 / 去记录 */
  onReminderAction(e) {
    const key = e.currentTarget.dataset.key;
    const g = app.globalData;

    // 母乳已到期：点击"知道了"后本条提醒消失（actionKey=dismiss_milk）
    if (key === 'dismiss_milk') {
      // 母乳到期：统一处理状态（日历红点 / 首页 / 库存页 / 家庭成员同步）
      const itemKey = e.currentTarget.dataset.itemkey || '';
      const recId = e.currentTarget.dataset.itemrec || '';
      if (itemKey.indexOf('milk_') === 0) {
        remindUtil.ackMilkById(itemKey, recId);
      } else {
        const dismissed = wx.getStorageSync('dismissed_milk_exp') || {};
        dismissed[itemKey] = true;
        wx.setStorageSync('dismissed_milk_exp', dismissed);
      }
      wx.showToast({ title: '已标记为处理', icon: 'success' });
      // 重新拉取并渲染弹窗，保留其他提醒
      this.buildReminders();
      this.refreshReminderDialog();
      return;
    }
    // 库存已用尽：点击"知道了"后本条提醒消失（actionKey=dismiss_exhausted）
    if (key === 'dismiss_exhausted') {
      // 拿到当前这条物品的名称
      const gname = e.currentTarget.dataset.itemname || '';
      const dismissed = wx.getStorageSync('dismissed_exhausted') || {};
      dismissed[gname] = true;
      wx.setStorageSync('dismissed_exhausted', dismissed);
      wx.showToast({ title: '已知道了', icon: 'success' });
      this.buildReminders();
      this.refreshReminderDialog();
      return;
    }
    // 库存偏低：点击"知道了"后本条提醒消失（actionKey=dismiss_stock_low）
    if (key === 'dismiss_stock_low') {
      const groupKey = e.currentTarget.dataset.itemname || '';
      const dismissed = wx.getStorageSync('dismissed_stock_low') || {};
      dismissed[groupKey] = true;
      wx.setStorageSync('dismissed_stock_low', dismissed);
      wx.showToast({ title: '已知道了', icon: 'success' });
      this.buildReminders();
      this.refreshReminderDialog();
      return;
    }
    if (key === 'milk' || key === 'diaper' || key === 'd3' || key.indexOf('stock_') === 0 || key.indexOf('warr_') === 0) {
      // 库存/补货/到期/保修类提醒：直接进入耗材库存管理页
      this.setData({ showReminder: false });
      wx.navigateTo({ url: '/subchart/pages/inventory/inventory' });
    } else if (key === 'supplement') {
      // 今日辅食：按宝宝月龄推荐每日食谱
      const baby = g.baby || {};
      const months = this.calcBabyMonths(baby.birthday);
      const recipe = this.buildSupplementRecipe(months);
      let suppRemindTime = '09:00';
      try { const st = wx.getStorageSync('panda_supplement_remind_time'); if (st) suppRemindTime = st; } catch (e) {}
      this.setData({ rmode: 'recipe', recipeInfo: recipe, suppRemindTime });
    } else if (key === 'vaccine') {
      // 去宝宝成长档案页，并自动滚动定位到疫苗模块
      this.setData({ showReminder: false });
      wx.navigateTo({ url: '/subchart/pages/baby-profile/baby-profile?focus=vaccine' });
    } else if (key === 'inventory') {
      // 去库存管理处理到期商品
      this.setData({ showReminder: false });
      wx.navigateTo({ url: '/subchart/pages/inventory/inventory' });
    } else if (key === 'record') {
      // 去记录：跳到记录页并自动弹出快速记录抽屉（和点 tabbar 中间 + 一致）
      this.setData({ showReminder: false });
      app.globalData.pendingQuickAdd = true;
      wx.switchTab({ url: '/pages/plan/plan' });
    }
  },

  // 修改辅食每日提醒时间
  onSuppTimeChange(e) {
    if (!perm.canEdit('reminders', app.globalData.currentBabyId)) {
      wx.showToast({ title: '当前账号仅有查看权限，无法修改提醒', icon: 'none' });
      return;
    }
    const t = e.detail.value || '09:00';
    try { wx.setStorageSync('panda_supplement_remind_time', t); } catch (e) {}
    this.setData({ suppRemindTime: t });
    wx.showToast({ title: '提醒时间已改为 ' + t, icon: 'none' });
  },

  backToList() {
    this.setData({ rmode: 'list' });
  },

  /* ----- 补货面板 ----- */
  selectRestock(e) {
    this.setData({ selectedAdd: Number(e.currentTarget.dataset.val) });
  },

  confirmRestock() {
    const g = app.globalData;
    const info = this.data.restockInfo;
    if (info.kind === 'diaper') {
      g.diaperStock += this.data.selectedAdd;
      app.persist();
      this.buildReminders();
      this.setData({ rmode: 'list' });
      wx.showToast({ title: '补货成功，当前 ' + g.diaperStock + ' 片', icon: 'none' });
    } else {
      g.supplies.milkFeeds = (g.supplies.milkFeeds || 0) + this.data.selectedAdd;
      app.persist();
      this.buildReminders();
      this.setData({ rmode: 'list' });
      wx.showToast({ title: '补货成功，当前可用 ' + g.supplies.milkFeeds + ' 次', icon: 'none' });
    }
  },

  /* ----- 详情面板 ----- */
  confirmDetail() {
    const g = app.globalData;
    const key = this.data.detailInfo.actionKey;
    if (key === 'd3') {
      g.supplies.d3Days = 180;
    }
    app.persist();
    this.buildReminders();
    this.setData({ rmode: 'list' });
    wx.showToast({ title: '已更新', icon: 'none' });
  },

  /* 每日早教推荐：根据宝宝月龄推荐，每天更新（中英双语内容库，按语言切换） */
  buildEduRec() {
    const baby = app.globalData.baby || {};
    const en = (this.data.lang || wx.getStorageSync('lang') || 'zh') === 'en';

    // 早教内容库（按月龄分组）—— 中文
    const eduLib = {
      '0-3': [
        { type: '早教儿歌', title: '摇篮曲', content: '摇篮曲：轻轻哼起《小星星》，让宝宝在温柔的歌声中安静入睡。', tip: '每天睡前哼唱，培养宝宝的音乐感知和安全感。' },
        { type: '黑白卡', title: '视觉刺激', content: '黑白卡：在宝宝眼前20-30cm处缓慢移动黑白对比卡片，刺激视觉发育。', tip: '每次1-2分钟，每天2-3次，促进宝宝视神经发育。' },
        { type: '抚触按摩', title: '亲子抚触', content: '亲子抚触：用温和的手法轻轻按摩宝宝的手脚、背部，促进亲子关系。', tip: '洗完澡后做抚触，每次5-10分钟，注意保暖。' },
      ],
      '4-6': [
        { type: '早教儿歌', title: '拔萝卜', content: '拔萝卜：边唱边做动作，让宝宝感受节奏和韵律。', tip: '抱着宝宝轻轻晃动，让宝宝感受音乐节奏。' },
        { type: '翻身练习', title: '宝宝翻身', content: '翻身练习：用玩具引导宝宝从仰卧翻到俯卧，锻炼背部肌肉。', tip: '每次练习2-3分钟，不要勉强，多鼓励。' },
        { type: '抓握训练', title: '抓握玩具', content: '抓握训练：给宝宝不同材质的玩具，让宝宝练习抓握和换手。', tip: '选择安全无毒的玩具，注意观察宝宝反应。' },
      ],
      '7-12': [
        { type: '早教儿歌', title: '两只老虎', content: '两只老虎：边唱边做手指游戏，锻炼宝宝手部精细动作。', tip: '大人先做示范，让宝宝模仿手指动作。' },
        { type: '爬行练习', title: '学爬引导', content: '爬行练习：用玩具在前方引导宝宝爬行，锻炼四肢协调能力。', tip: '在地板上铺软垫，确保安全，每次5-10分钟。' },
        { type: '认知训练', title: '认物游戏', content: '认物游戏：指着家里的物品告诉宝宝名称，比如"这是灯""这是桌子"。', tip: '每天练习几次，每次认识2-3个物品。' },
      ],
      '1-2': [
        { type: '早教唐诗', title: '静夜思', content: '静夜思\n床前明月光，疑是地上霜。\n举头望明月，低头思故乡。', tip: '每天读1-2遍，让宝宝感受语言的韵律和节奏。' },
        { type: '早教操', title: '宝宝操', content: '宝宝操：抱着宝宝做简单的伸展运动，活动四肢关节。', tip: '动作要轻柔，跟着音乐节奏做，每次5分钟。' },
        { type: '积木游戏', title: '搭积木', content: '积木游戏：和宝宝一起搭积木，锻炼手眼协调和空间认知。', tip: '从简单的搭高开始，逐步增加难度。' },
      ],
      '2-3': [
        { type: '早教唐诗', title: '悯农', content: '悯农\n锄禾日当午，汗滴禾下土。\n谁知盘中餐，粒粒皆辛苦。', tip: '结合吃饭时讲，让宝宝懂得珍惜粮食。' },
        { type: '讲故事', title: '绘本阅读', content: '绘本阅读：选择画面丰富、文字简单的绘本，和宝宝一起阅读。', tip: '每天睡前读1-2本，培养阅读习惯。' },
        { type: '涂鸦画画', title: '宝宝涂鸦', content: '涂鸦画画：给宝宝纸和蜡笔，让宝宝自由涂鸦，发挥想象力。', tip: '不要教宝宝画"像"，鼓励自由表达。' },
      ],
    };
    // 早教内容库（按月龄分组）—— 英文，与中文一一对应
    const eduLibEn = {
      '0-3': [
        { type: 'Nursery Rhyme', title: 'Lullaby', content: 'Lullaby: hum "Twinkle Twinkle Little Star" softly and let your baby drift off to the gentle singing.', tip: 'Sing before bed every day to build musical awareness and a sense of security.' },
        { type: 'Black & White Cards', title: 'Visual Stimulation', content: 'Black & white cards: move the high-contrast card slowly 20-30cm in front of your baby to stimulate visual development.', tip: '1-2 minutes each time, 2-3 times a day, to support optic nerve development.' },
        { type: 'Baby Massage', title: 'Parent-Child Touch', content: 'Baby massage: gently massage your baby\'s hands, feet and back with soft strokes to strengthen bonding.', tip: 'Do it after bath, 5-10 minutes each time, and keep your baby warm.' },
      ],
      '4-6': [
        { type: 'Nursery Rhyme', title: 'Pulling the Radish', content: 'Pulling the radish: sing the song and act it out so your baby feels the rhythm.', tip: 'Hold your baby and sway gently to help them feel the beat.' },
        { type: 'Rolling Practice', title: 'Baby Rolls Over', content: 'Rolling practice: use a toy to guide your baby from lying on the back to the tummy, strengthening back muscles.', tip: '2-3 minutes each time; never force it, just encourage.' },
        { type: 'Grasping Practice', title: 'Grasp the Toy', content: 'Grasping practice: offer toys of different textures so your baby practises grasping and switching hands.', tip: 'Choose safe, non-toxic toys and watch your baby\'s reaction.' },
      ],
      '7-12': [
        { type: 'Nursery Rhyme', title: 'Two Tigers', content: 'Two tigers: sing along with finger play to train fine motor skills.', tip: 'Show it first, then let your baby copy the finger movements.' },
        { type: 'Crawling Practice', title: 'Learning to Crawl', content: 'Crawling practice: place a toy ahead to guide your baby to crawl, building limb coordination.', tip: 'Put a soft mat on the floor for safety, 5-10 minutes each time.' },
        { type: 'Cognitive Training', title: 'Naming Objects', content: 'Naming objects: point at things at home and tell your baby their names, such as "this is the lamp", "this is the table".', tip: 'Practise a few times a day, 2-3 objects each time.' },
      ],
      '1-2': [
        { type: 'Classic Poem', title: 'Quiet Night Thoughts', content: 'Quiet Night Thoughts\nMoonlight before my bed, like frost upon the ground.\nI raise my head to the bright moon, and lower it thinking of home.', tip: 'Read it 1-2 times a day so your baby feels the rhythm of language.' },
        { type: 'Baby Exercise', title: 'Baby Workout', content: 'Baby workout: hold your baby and do simple stretching to move the arms and legs.', tip: 'Keep movements gentle, follow the music, about 5 minutes each time.' },
        { type: 'Block Play', title: 'Building Blocks', content: 'Block play: build blocks together to train hand-eye coordination and spatial awareness.', tip: 'Start with simple stacking and increase difficulty gradually.' },
      ],
      '2-3': [
        { type: 'Classic Poem', title: 'The Farmer', content: 'The Farmer\nHoeing under the midday sun, sweat falling into the soil.\nWho knows that every grain on the plate comes from such hard work.', tip: 'Talk about it at mealtime to teach your baby to value food.' },
        { type: 'Storytelling', title: 'Picture Book Reading', content: 'Picture book reading: pick books with rich pictures and simple words and read together.', tip: 'Read 1-2 books before bed to build a reading habit.' },
        { type: 'Scribbling', title: 'Baby Scribbles', content: 'Scribbling: give your baby paper and crayons and let them draw freely and imagine.', tip: 'Don\'t push them to draw "realistically" — encourage free expression.' },
      ],
    };
    const lib = en ? eduLibEn : eduLib;

    // 没有宝宝时，随机推荐早教内容
    if (!baby.birthday) {
      // 把所有月龄组的内容合并成一个列表
      const allContent = Object.keys(lib).flatMap(k => lib[k]);
      // 每天根据日期选择不同的推荐内容
      const today = new Date();
      const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
      const idx = dayOfYear % allContent.length;
      const rec = allContent[idx];
      this.setData({
        eduRec: {
          ageText: en ? 'General activity' : '通用早教推荐',
          type: rec.type,
          title: rec.title,
          content: rec.content,
          tip: rec.tip
        }
      });
      return;
    }
    // 计算月龄
    const birth = new Date(String(baby.birthday).replace(/-/g, '/'));
    const now = new Date();
    let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
    let days = now.getDate() - birth.getDate();
    if (days < 0) {
      months--;
      days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    }
    if (months < 0) months = 0;
    const ageText = en
      ? (months < 1
          ? days + (days === 1 ? ' day' : ' days')
          : (months + (months === 1 ? ' month' : ' months') + (days > 0 ? ' ' + days + (days === 1 ? ' day' : ' days') : '')))
      : (months < 1 ? days + '天' : months + '个月' + (days > 0 ? days + '天' : ''));

    // 根据月龄选择分组
    let groupKey = '0-3';
    if (months >= 1 && months <= 3) groupKey = '0-3';
    else if (months >= 4 && months <= 6) groupKey = '4-6';
    else if (months >= 7 && months <= 12) groupKey = '7-12';
    else if (months >= 13 && months <= 24) groupKey = '1-2';
    else if (months >= 25) groupKey = '2-3';

    const group = lib[groupKey] || lib['0-3'];

    // 每天根据日期选择不同的推荐内容
    const today = new Date();
    const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
    const idx = dayOfYear % group.length;
    const rec = group[idx];

    this.setData({
      eduRec: {
        ageText: ageText,
        type: rec.type,
        title: rec.title,
        content: rec.content,
        tip: rec.tip
      }
    });
  },

  syncData() {
    wx.showToast({ title: '已为你同步最新数据', icon: 'none' });
  },

  /* 工具「更多」展开/收起 */

  onTool(e) {
    const action = e.currentTarget.dataset.action;
    console.log('[onTool] 点击工具:', action, e.currentTarget.dataset);
    const urls = {
      baby: '/subchart/pages/baby-profile/baby-profile',
      feeding: '/subchart/pages/inventory/inventory',
      vaccine: '/subchart/pages/vaccine/vaccine',
      sos: '/subchart/pages/firstaid/index/index',
      encyclopedia: '/subchart/pages/encyclopedia/encyclopedia'
    };
    const url = urls[action] || urls.encyclopedia;
    // 免登录：SOS、育儿百科全书（未登录也可使用）
    const free = action === 'sos' || action === 'encyclopedia';
    if (!free) {
      // 喂养台录入：需登录；成长档案 / 疫苗：需登录 + 宝宝
      const ok = action === 'feeding' ? app.requireLogin() : app.requireBaby();
      if (!ok) return;
    }
    wx.navigateTo({
      url: url,
      fail: (err) => {
        console.error('onTool navigateTo fail', action, url, err);
        wx.showToast({ title: '打开失败：' + ((err && err.errMsg) || '未知'), icon: 'none' });
      }
    });
  },

  goPlan() {
    wx.switchTab({ url: '/pages/plan/plan' });
  }
});
