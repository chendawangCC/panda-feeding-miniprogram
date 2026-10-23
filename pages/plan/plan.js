const app = getApp();
const cs = require('../../utils/cloud-sync.js');
const perm = require('../../utils/perm.js');

function calcDays(birthday) {
  if (!birthday) return 0;
  const parts = birthday.split('-').map(Number);
  const b = new Date(parts[0], parts[1] - 1, parts[2]);
  const now = new Date();
  return Math.max(0, Math.floor((now - b) / 86400000));
}

/* 本地日历日期（不要用 toISOString：它按 UTC 取日期，东八区凌晨 / 西半球傍晚都会差一天） */
function localDateStr(d) {
  d = d || new Date();
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
}

Page({

  onShareAppMessage() {
    return {
        imageUrl: '/images/share-cover.png', title: '熊宝喂养 · 记录宝宝喂养每一刻', path: 'pages/plan/plan' };
  },
  onShareTimeline() {
    return { title: '熊宝喂养 · 记录宝宝喂养每一刻' };
  },
  data: {
    guide: { visible: false, title: '', desc: '', primary: '', mode: '' },
    safeTop: (app.globalData && app.globalData.safeTop) || 88,
    today: localDateStr(new Date()),
    // ===== 账号登录（合并自我的页） =====
    user: { openid: '', avatar: '', nickname: '', phone: '', logged: false },
    loginVisible: false,
    loginTab: 'wechat',

    profileVisible: false,
    avatarUrl: '',
    nickname: '',
    // ===== 数据导出 / 扫码（合并自我的页） =====
    showScan: false,
    scanState: '',
    scanResult: '',
    scanCode: '',
    exportVisible: false,
    exportPreviewVisible: false,
    previewImg: '',
    exportCanvasH: 1200,
    exporting: false,
    exportItems: [
      { key: 'records', label: '喂养记录', desc: '按日期统计喂奶 / 睡眠 / 换尿布等每日小结', checked: true, count: 0 },
      { key: 'babies', label: '宝宝成长档案', desc: '宝宝的出生与基本信息档案', checked: true, count: 0 },
      { key: 'cost', label: '喂养台成本统计', desc: '奶粉、纸尿裤等喂养物品的购入成本统计', checked: true, count: 0 },
      { key: 'allergy', label: '过敏统计手册', desc: '辅食过敏与不过敏食物统计', checked: true, count: 0 }
    ],
    exportStart: '',
    exportEnd: '',
    headerDate: '',

    // ===== 全局提醒弹窗 =====
    showGlobalAlert: false,
    globalAlert: {
      title: '',
      message: '',
      type: 'confirm', // confirm / alert
      confirmText: '确定',
      cancelText: '取消'
    },
    dates: [],
    selectedDate: 2,
    todayIndex: 2,
    calendarOpen: false,
    monthDays: [],
    calTitle: '',
    calYear: 0,
    calMonth: 0,
    baby: {},
    ageText: '',
    babySwitchVisible: false,
    babyList: [],
    currentBabyId: '',
    weather: { icon: '🌤', img: '/images/icons/weather-sun.png', type: '--', temp: '--℃' },
    nextReminder: { hint: '下一次提醒', time: '', text: '暂无待办提醒' },
    foodOptions: [], // 初始化时从缓存加载
    foodNewName: '',
    foodUnits: ['g', 'ml', '勺'],
    showAllergyGuide: false,
    allergyStats: { allergyCount: 0, allergyFoods: [], safeCount: 0, safeFoods: [] },
    showSuppRemind: false,
    suppFreqOptions: ['每日', '每2天', '每3天', '每周', '每两周'],
    showFoodPicker: false,
    foodUnitIdx: 0,
    showDayRemind: false,
    dayRemind: { date: '', label: '', items: [] },
    showVoice: false,
    voiceState: {
      recording: false,
      recognizing: false,
      seconds: 0,
      result: '',
      fallback: false
    },
    timeline: [],
    hasRecord: false,

    myOpenid: ((app.globalData.user && app.globalData.user.openid) || (wx.getStorageSync('panda_user') || {}).openid) || '',
    showQuick: false,
    quickMode: false,
    diaperSizes: ['NB', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
    showRecordTimePicker: false,
    recordTimeTarget: null,
    record: {
      visible: false,
      editIndex: -1,
      time: '',
      recordDate: localDateStr(new Date()),
      type: '母乳',
      icon: '🍼',
      hint: '轻点左右一侧开始或暂停计时',
      milkType: '配方奶',
      amount: 180,
      bottleStart: '', bottleEnd: '',
      milkOpen: false,
      milkWarn: false,
      openDays: 28,
      nursingL: 0,
      nursingR: 0,
      nursingActive: '',
      pumpL: 0,
      pumpR: 0,
      pumpLeftAmt: 0,
      pumpRightAmt: 0,
      pumpActive: '',
      pumpStart: '', pumpEnd: '', pumpLastSide: '',
      storage: 'fridge',
      supps: ['AD', 'DHA', '钙片', '鱼油', '乳糖酶', '益生菌'],
      selectedSupps: [],
      diaperChoice: '',
      peeColor: '',
      stoolColor: '',
      stoolTexture: '',
      diaperSize: '',
      diaperAmount: 0,
      diaperStock: 24,
      sleepSeconds: 0,
      sleepRunning: false,
      sleepStart: '',
      sleepEnd: '',
      water: 60,
      simpleAmount: 1,
      selectedFoods: [],
      selectedFoodsText: '',
      foodWeight: 50,
      foodUnit: 'g',
      foodUnitIdx: 0,
      allergy: false,
      foodAllergy: {},
      pendingAllergyFoods: [],
      temperature: '',
      tempEditing: false,
      bathStart: '', bathEnd: '', bathSeconds: 0
    }
  },

  onLoad() {
    this.setData({ openDays: (app.globalData.FORMULA_OPEN_DAYS || 28) });
    // 加载辅食列表（从本地缓存）
    this.setData({ foodOptions: this.loadFoodOptions() });
    // 初始化展开日历的月份为今天
    const today = new Date();
    this.setData({
      calYear: today.getFullYear(),
      calMonth: today.getMonth(),
      calTitle: this.calTitleOf(today.getFullYear(), today.getMonth())
    });
    this.initRealDateHeader();
    this.rebuildAround(today);
    // 按真实记录构建时间轴（默认空，有记录才显示）
    this.buildTimeline();
    // 账号状态（我的=记录页，顶部账号卡）
    this.loadAccount();
  },

  /* 按选中日期从真实记录构建时间轴（倒序：最新在上） */
  buildTimeline(nowDate) {
    // 没有宝宝时，时间轴完全为空
    if (!app.globalData.baby || !app.globalData.baby.id) {
      this.setData({ timeline: [], hasRecord: false });
      return;
    }
    const date = this.selDateStr();
    const records = app.globalData.records || [];
    const list = [];
    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      if (r && r.date === date) {
        list.push(this.mapRecordToCard(r, i));
      }
    }
    list.sort((a, b) => {
      // 优先用 _u 时间戳排序（精确到毫秒），没有的话再用 time 字符串
      const tsA = a._u || 0;
      const tsB = b._u || 0;
      if (tsA && tsB) return tsB - tsA;
      return (b.time || '').localeCompare(a.time || '');
    });
    // 每种喂养类型单独显示「本次记录已过去多久」，同类型多条只显示在最新一条上
    const now = nowDate || new Date();
    const nowTs = now.getTime();
    for (const r of list) {
      const d = this.cardDate(r);
      r._ts = d ? d.getTime() : null;
    }
    const latestByType = {};
    for (let i = 0; i < list.length; i++) {
      const t = list[i].type;
      if (!latestByType[t] || (list[i]._ts || 0) > (latestByType[t]._ts || 0)) {
        latestByType[t] = list[i];
      }
    }
    for (const r of list) {
      if (latestByType[r.type] === r && r._ts) {
        const agoMin = Math.round((nowTs - r._ts) / 60000);
        if (this._tlEn()) r.prevText = agoMin < 1 ? 'just now' : this.fmtInterval(agoMin) + ' ago';
        else r.prevText = agoMin < 1 ? '刚刚' : '已过去 ' + this.fmtInterval(agoMin);
        r.isLatest = true;
      } else {
        r.prevText = '';
        r.isLatest = false;
      }
    }
    this.setData({ timeline: list, hasRecord: list.length > 0 });
    // 同步刷新展开日历的 hasRecord 状态（记录增删改后自动更新暗色底）
    // 保留展开日历当前浏览的月份，不跳转到选中日期
    const calBase = new Date(this.data.calYear, this.data.calMonth, 1);
    this.setData({ monthDays: this.buildMonthDays(calBase) });
  },

  /* 记录时间（date+time）转 Date */
  cardDate(c) {
    const dp = String(c.date || '').split('-').map(Number);
    const tp = String(c.time || '00:00').split(':').map(Number);
    if (dp.length < 2) return null;
    return new Date(dp[0], (dp[1] || 1) - 1, dp[2] || 1, tp[0] || 0, tp[1] || 0);
  },

  /* 两条记录间隔（分钟），a 较新 b 较旧 */
  diffMin(a, b) {
    const da = this.cardDate(a);
    const db = this.cardDate(b);
    if (!da || !db) return null;
    return Math.round((da - db) / 60000);
  },

  /* 间隔展示 */
  fmtInterval(min) {
    if (min === null || min === undefined || min < 0) return '';
    const en = this._tlEn();
    if (en) {
      if (min < 1) return '<1 min';
      if (min < 60) return min + ' min';
      const eh = Math.floor(min / 60);
      const em = min % 60;
      if (eh < 24) return em ? eh + ' hr ' + em + ' min' : eh + ' hr';
      const ed = Math.floor(eh / 24);
      const erh = eh % 24;
      return erh ? ed + ' d ' + erh + ' hr' : ed + ' d';
    }
    if (min < 1) return '不到 1 分钟';
    if (min < 60) return min + ' 分钟';
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h < 24) return m ? h + ' 小时 ' + m + ' 分' : h + ' 小时';
    const d = Math.floor(h / 24);
    const rh = h % 24;
    return rh ? d + ' 天 ' + rh + ' 小时' : d + ' 天';
  },

  /* 日期条文案：zh=10 月 23 日，周五 / en=Oct 23, Fri */
  fmtDateLabel(d, withYear) {
    const en = this._tlEn();
    const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const WK = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const ZH_W = ['周日','周一','周二','周三','周四','周五','周六'];
    if (en) {
      return withYear
        ? (WK[d.getDay()] + ', ' + MON[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear())
        : (MON[d.getMonth()] + ' ' + d.getDate() + ', ' + WK[d.getDay()]);
    }
    return (withYear ? d.getFullYear() + ' 年 ' : '') + (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日，' + ZH_W[d.getDay()];
  },

  /* 整月日历标题：zh=2026 年 10 月 / en=Oct 2026 */
  calTitleOf(y, m) {
    const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return this._tlEn() ? (MON[m] + ' ' + y) : (y + ' 年 ' + (m + 1) + ' 月');
  },

  /* 当前是否英文界面（时间轴卡片在 onLoad 阶段构建，需回退读 storage） */
  _tlEn() {
    const stored = wx.getStorageSync('lang');
    return (stored || (this.data && this.data.lang) || 'zh') === 'en';
  },

  /* 时间轴通用词表（显示层英译，底层记录值仍保持中文） */
  _tlWords() {
    const en = this._tlEn();
    return {
      en: en,
      T: (zh, enTxt) => (en ? enTxt : zh),
      v: (map, val) => (en && val && map[val] ? map[val] : val),
      diaper: { '嘘嘘': 'Wet', '臭臭': 'Dirty', '嘘嘘+臭臭': 'Wet + Dirty', '未选择': 'Not set' },
      pee: { '黄色': 'Yellow', '浅黄': 'Pale yellow', '无色': 'Colorless', '橙色': 'Orange', '粉色': 'Pink', '红色': 'Red', '棕色': 'Brown' },
      stool: { '水样': 'Watery', '糊状': 'Pasty', '软便': 'Soft', '奶瓣': 'Curds', '成形': 'Formed', '黏液': 'Mucus', '硬便': 'Hard', '稀': 'Loose' },
      stoolColor: { '黄色': 'Yellow', '金黄': 'Golden', '绿色': 'Green', '棕色': 'Brown', '黑色': 'Black', '红色': 'Red', '白色': 'White', '灰白': 'Pale' },
      supp: { 'AD': 'Vitamin AD', 'DHA': 'DHA', '钙片': 'Calcium', '鱼油': 'Fish oil', '乳糖酶': 'Lactase', '益生菌': 'Probiotics', '维生素D': 'Vitamin D', '铁剂': 'Iron' },
      food: {
        '高铁米粉': 'Iron-fortified cereal', '米糊': 'Rice cereal', '粥': 'Congee', '面条': 'Noodles',
        '土豆泥': 'Mashed potato', '南瓜泥': 'Pumpkin puree', '胡萝卜泥': 'Carrot puree', '西兰花泥': 'Broccoli puree',
        '牛肉': 'Beef', '鸡肉': 'Chicken', '鱼肉': 'Fish', '蛋黄': 'Egg yolk', '苹果泥': 'Apple puree',
        '香蕉泥': 'Banana puree', '猪肝泥': 'Pork liver puree', '米粉': 'Rice cereal', '鸡蛋': 'Egg', '豆腐': 'Tofu'
      },
      unit: { '克': 'g', '毫升': 'ml' }
    };
  },

  /* 将一条真实记录映射为时间轴卡片 */
  mapRecordToCard(r, idx) {
    const W = this._tlWords();
    const { T, v } = W;
    const by = r.by || null;
    // 记录者显示名：优先根据 openid 动态获取当前家庭身份/昵称，找不到则用记录快照（注销用户显示注销前名字）
    let byDisplayName = by ? (app.getOpenidDisplayName(by.openid) || by.name || '亲友') : '';
    if (W.en) {
      if (byDisplayName === '我') byDisplayName = 'Me';
      else if (byDisplayName === '亲友') byDisplayName = 'Family';
    }
    const base = { recIdx: idx, time: r.time || '--:--', date: r.date, by, byDisplayName, _rawRecord: r, _cid: r._cid || '', id: r.id || '' };
    switch (r.type) {
      case '母乳':
        return Object.assign(base, {
          type: 'nursing', title: T('亲喂', 'Breastfeeding'), icon: '🍼', iconImg: '/images/icons/rec-nursing.png', dot: '#b97b05', bg: '#fff2b9', border: '#f4d47b',
          metrics: [
            { label: T('总时长', 'Total'), value: this.minutes(r.total || (r.nursingL || 0) + (r.nursingR || 0)), color: '#b97b05' },
            { label: T('左侧', 'Left'), value: this.minutes(r.nursingL || 0), color: '#c77b09' },
            { label: T('右侧', 'Right'), value: this.minutes(r.nursingR || 0), color: '#b97b05' }
          ]
        });
      case '配方奶':
        return Object.assign(base, {
          type: 'bottle', title: r.milkType === '瓶喂母乳' ? T('瓶喂-母乳', 'Bottle · Breastmilk') : T('瓶喂-奶粉', 'Bottle · Formula'), icon: '🥛', iconImg: '/images/icons/rec-bottle.png', dot: '#587396', bg: '#e6edff', border: '#c6e2fb',
          metrics: [
            { label: T('开始', 'Start'), value: r.bottleStart || '--:--', color: '#587396' },
            { label: T('结束', 'End'), value: r.bottleEnd || '--:--', color: '#587396' }
          ],
          note: (r.amount || 0) + ' ml', tag: r.milkType === '瓶喂母乳' ? T('母乳', 'Breastmilk') : T('奶粉', 'Formula'), tagColor: '#587396'
        });
      case '吸奶':
        return Object.assign(base, {
          type: 'pump', title: T('吸奶', 'Pumping'), icon: '🫗', iconImg: '/images/icons/rec-pump.png', dot: '#a96017', bg: '#fff1df', border: '#f6d3ae',
          metrics: [
            { label: T('总量', 'Total'), value: (r.pumpTotal || 0) + ' ml', color: '#bd6b1b' },
            { label: T('左侧', 'Left'), value: (r.pumpLeftAmt || 0) + ' ml', color: '#c77b09' },
            { label: T('右侧', 'Right'), value: (r.pumpRightAmt || 0) + ' ml', color: '#a96017' }
          ]
        });
      case '换尿布':
        return Object.assign(base, {
          type: 'diaper', title: T('换尿布', 'Diaper Change') + (r.diaperSize ? (W.en ? ' · Size ' + r.diaperSize : ' · ' + r.diaperSize + '码') : ''), icon: '🧷', iconImg: '/images/icons/rec-diaper.png', dot: '#478163', bg: '#e8f4e4', border: '#b8e8e3',
          fields: [
            { label: T('状态', 'Status'), value: v(W.diaper, r.diaperChoice || '未选择') },
            { label: T('嘘嘘颜色', 'Pee color'), value: v(W.pee, r.peeColor) || '-' },
            { label: T('便便性状', 'Stool texture'), value: v(W.stool, r.stoolTexture) || '-' },
            { label: T('便便颜色', 'Stool color'), value: v(W.stoolColor, r.stoolColor) || '-' }
          ]
        });
      case '营养品': {
        const supps = (r.supps || []).map(x => v(W.supp, x));
        return Object.assign(base, {
          type: 'supplement', title: T('营养品', 'Supplements'), icon: '💊', iconImg: '/images/icons/rec-supplement.png', dot: '#478163', bg: '#e8f4e4', border: '#c9e8c7',
          value: supps.join(W.en ? ' / ' : '、') || T('未选择', 'Not set')
        });
      }
      case '睡眠':
        return Object.assign(base, {
          type: 'sleep', title: T('睡眠', 'Sleep'), icon: '🌙', iconImg: '/images/icons/rec-sleep.png', dot: '#6657bf', bg: '#eee9ff', border: '#ddd1fb',
          sleepRunning: !!r.sleepRunning,
          metrics: [
            { key: 'dur', label: T('时长', 'Duration'), value: this.minutes(r.sleepSeconds || 0), color: '#6657bf' },
            { key: 'start', label: T('开始', 'Start'), value: r.sleepStart || '--:--', color: '#6657bf' },
            { key: 'wake', label: T('醒来', 'Wake up'), value: r.sleepRunning ? (T('计时中 ', 'Timing ') + this.minutes(r.sleepSeconds || 0)) : (r.sleepEnd || '--:--'), color: '#6657bf' }
          ]
        });
      case '喝水':
        return Object.assign(base, {
          type: 'water', title: T('喝水', 'Water'), icon: '💧', iconImg: '/images/icons/rec-water.png', dot: '#587396', bg: '#e6edff', border: '#c6e2fb',
          note: (r.water || 0) + ' ml', tag: T('喝水', 'Water'), tagColor: '#587396'
        });
      case '体温':
        return Object.assign(base, {
          type: 'temp', title: T('体温', 'Temperature'), icon: '🌡️', dot: '#c9573a', bg: '#ffe7e0', border: '#f7c8b4',
          note: (r.temperature || '--') + ' ℃', tag: T('体温', 'Temperature'), tagColor: '#c9573a'
        });
      case '洗澡':
        return Object.assign(base, {
          type: 'bath', title: T('洗澡', 'Bath Time'), icon: '🛁', dot: '#4387bd', bg: '#d6f4f0', border: '#c6e2fb',
          metrics: [
            { label: T('开始', 'Start'), value: r.bathStart || '--:--', color: '#4387bd' },
            { label: T('结束', 'End'), value: r.bathEnd || '--:--', color: '#4387bd' },
            { label: T('时长', 'Duration'), value: this.minutesHM(r.bathSeconds || 0), color: '#4387bd' }
          ]
        });
      case '辅食': {
        const names = (r.foodNames || []).map(x => v(W.food, x));
        const unit = W.unit[r.foodUnit] || r.foodUnit || 'g';
        return Object.assign(base, {
          type: 'food', title: T('辅食', 'Solid Food'), icon: '🥄', iconImg: '/images/icons/rec-food.png', dot: '#a96017', bg: '#fff1df', border: '#f6d3ae',
          note: (names.join(W.en ? ' + ' : '+ ') ? (names.join(W.en ? ' + ' : '+ ') + ' · ') : '') + (r.foodWeight || r.simpleAmount || 0) + unit,
          tag: T('辅食', 'Solid Food'), tagColor: '#a96017'
        });
      }
      case '语音记录':
        return Object.assign(base, {
          type: 'voice', title: T('语音记录', 'Voice Note'), icon: '🎙️', dot: '#ffb2a6', bg: '#fff5f2', border: '#f8d3cb',
          note: r.note || '', tag: T('语音', 'Voice')
        });
      default:
        return Object.assign(base, { type: 'other', title: r.type || T('记录', 'Record'), icon: '📝', dot: '#e8e1d0', bg: '#ffffff', border: '#f3f0e7', note: r.note || '' });
    }
  },

  onShow() {
    const lang = wx.getStorageSync('lang') || 'zh';
    const i18n = lang === 'en' ? {
      breastfed: 'Breastfeeding',
      breastfedSub: 'Left/right timing',
      bottleFed: 'Bottle Feeding',
      bottleFedSub: 'Record milk amount',
      pump: 'Pumping',
      pumpSub: 'Left/right volume & time',
      supplement: 'Supplements',
      supplementSub: 'Multi-select allowed',
      solidFood: 'Solid Food',
      solidFoodSub: 'Record meal portion',
      water: 'Water',
      waterSub: 'Record water intake',
      diaper: 'Diaper Change',
      diaperSub: 'Select wet/dirty status',
      sleep: 'Sleep',
      sleepSub: 'Record sleep time',
      temp: 'Temperature',
      tempSub: 'Record baby temperature',
      bath: 'Bath Time',
      bathSub: 'Record bath duration',
      voiceInput: 'Voice Input',
      listening: 'Listening, release to stop',
      recognizing: 'Recognizing…',
      fillDetail: 'Fill in details',
      bottleBreastmilk: 'Expressed Breastmilk',
      slideBottleAmount: 'Slide to set bottle amount',
      per5mlStep: '5ml per step',
      milkOpened: 'Formula can opened',
      opened: 'Opened',
      notOpened: 'Not opened',
      openWarnPre: 'Expiry reminder · use within ',
      openWarnSuf: ' days of opening',
      startTime: 'Start Time',
      endTime: 'End Time',
      leftRightTimer: 'Tap left/right to start timer',
      totalFeedDuration: 'Total feeding time',
      leftRightRecord: 'Record left/right separately',
      totalAmount: 'Total amount',
      slidePumpAmount: 'Slide to set pumped amount',
      milkStorage: 'Breastmilk storage',
      roomTemp: 'Room temp 4h',
      fridge: 'Fridge 48h',
      freezer: 'Freezer 3 months',
      storageHint: 'Per national standard: room temp ≤25°C 4h / fridge 4°C 48h / freezer -18°C 3 months',
      saveEdit: 'Save Changes',
      saveRecord: 'Save Record',
      selectSupplements: 'Select supplements (multi-select)',
      addMore: 'Add more',
      nextReminder: 'Next reminder setting',
      setUpOptional: 'Set up (optional)',
      urineColor: 'Urine color',
      stoolColor: 'Stool color',
      wateryStool: 'Watery',
      pasteStool: 'Pasty',
      softStool: 'Soft',
      curdStool: 'Curdy',
      solidStool: 'Formed',
      mucusStool: 'Mucousy',
      diaperSize: 'Diaper size',
      diaperDeduct: 'Diapers used',
      stockLeft: 'Stock left',
      pieces: 'pcs',
      whatBabyAte: 'What baby ate',
      foodName: 'Food',
      tapSelectMulti: 'Tap to select (multi-select)',
      weight: 'Weight',
      allergic: 'Allergic reaction?',
      enterWaterMl: 'Enter water amount (ml)',
      waterAmount: 'Water amount',
      allergyGuide: 'Allergy Guide',
      allergyCount: 'Allergy events',
      allergyFoods: 'Allergy foods',
      safeCount: 'No allergy events',
      safeFoods: 'Safe foods',
      recordedSafeFoods: 'Recorded safe foods',
      commonAllergyFoods: 'Common allergenic foods',
      allergySymptoms: 'Common allergy symptoms',
      tips: 'Tips',
      allergyTipText: 'Food allergy depends on amount, cooking method, and fasting state. Avoid known allergens and consult a pediatrician before reintroducing.',
      selectFood: 'Select Food',
      multiSelect: 'Multi-select',
      enterNewFood: 'Enter new food name, e.g. porridge',
      sleepHint: 'Timer or manual start/end time, auto-calculate duration',
      sleepTip: 'Tap "Asleep" then save to continue timing; after waking, tap this record on the timeline, edit "Awake" and save to finish the sleep entry',
      sleepRunningTxt: 'Sleeping · tap to record "Awake"',
      fallAsleep: 'Fall Asleep',
      wakeUpTxt: 'Tap "Awake" to auto-record end time',
      tapStartSleep: 'Tap to auto-record start time',
      asleep: 'Asleep',
      awake: 'Awake',
      babyTemp: 'Baby Temperature',
      tempHint: 'Slide to select temperature · Normal range 36.0 ~ 37.5 ℃',
      bathTime: 'Bath Time',
      durationAutoCalc: 'Duration auto-calculated from start/end time',
      longPressToSpeak: 'Long press to speak',
      parsingVoice: 'Parsing voice content',
      releaseToFinish: 'Release to finish voice input',
      longPressMicHint: 'Long press the mic to start speaking',
      trySaying: 'Try saying:',
      example1: 'Breastfeeding for 15 minutes',
      example2: 'Had 120ml formula',
      example3: 'Diaper change: wet + dirty',
      example4: 'Slept for 40 minutes',
      example5: 'Temperature 37.5°C',
      example6: 'Bath time',
      example7: 'Drank 60ml water',
      example8: 'Temperature 37.2°C, baby feels warm',
      example9: 'Pumped 80ml breastmilk total',
      example10: 'Took vitamin D3 and probiotics'
    } : {
      breastfed: '亲喂',
      breastfedSub: '左右分别计时',
      bottleFed: '瓶喂',
      bottleFedSub: '记录喂奶量',
      pump: '吸奶',
      pumpSub: '左右量与计时',
      supplement: '营养品',
      supplementSub: '可多选记录',
      solidFood: '辅食',
      solidFoodSub: '记录辅食份量',
      water: '喝水',
      waterSub: '记录喝水量',
      diaper: '换尿布',
      diaperSub: '选择尿便情况',
      sleep: '睡眠',
      sleepSub: '记录睡眠时段',
      temp: '体温',
      tempSub: '记录宝宝体温',
      bath: '洗澡',
      bathSub: '记录洗澡时长',
      voiceInput: '语音录入',
      listening: '正在聆听，松开结束',
      recognizing: '正在识别…',
      fillDetail: '填写本次详情',
      bottleBreastmilk: '瓶喂母乳',
      slideBottleAmount: '滑动选择瓶喂量',
      per5mlStep: '每5ML一个档位',
      milkOpened: '本次奶粉开罐',
      opened: '已开罐',
      notOpened: '未开罐',
      openWarnPre: '到期提醒 · 开罐后 ',
      openWarnSuf: ' 天内用完（国标）',
      startTime: '开始时间',
      endTime: '结束时间',
      leftRightTimer: '左右点击计时',
      totalFeedDuration: '两侧喂奶总时长',
      leftRightRecord: '左右分别记录',
      totalAmount: '总量',
      slidePumpAmount: '滑动选择吸奶量',
      milkStorage: '本次母乳储存',
      roomTemp: '室温 4h',
      fridge: '冷藏 48h',
      freezer: '冷冻 3个月',
      storageHint: '按国标：室温≤25℃ 4小时 / 冷藏4℃ 48小时 / 冷冻-18℃ 3个月',
      saveEdit: '保存修改',
      saveRecord: '保存记录',
      selectSupplements: '选择本次营养品 可多选',
      addMore: '添加更多',
      nextReminder: '下次补充提醒设置',
      setUpOptional: '去设置（可不填）',
      urineColor: '嘘嘘颜色',
      stoolColor: '便便颜色',
      wateryStool: '水样便',
      pasteStool: '糊状便',
      softStool: '软便',
      curdStool: '奶瓣便',
      solidStool: '成形便',
      mucusStool: '黏液便',
      diaperSize: '纸尿裤尺码',
      diaperDeduct: '尿布扣除数量',
      stockLeft: '库存剩余',
      pieces: '片',
      whatBabyAte: '宝宝吃了什么',
      foodName: '辅食名称',
      tapSelectMulti: '点击选择（可多选）',
      weight: '重量',
      allergic: '是否过敏',
      enterWaterMl: '填写饮水量ml',
      waterAmount: '喝水量',
      allergyGuide: '过敏统计手册',
      allergyCount: '过敏次数',
      allergyFoods: '过敏食物',
      safeCount: '不过敏次数',
      safeFoods: '不过敏食物',
      recordedSafeFoods: '已记录的不过敏食物',
      commonAllergyFoods: '常见易过敏食物',
      allergySymptoms: '过敏常见表现',
      tips: '温馨提示',
      allergyTipText: '辅食过敏与剂量、烹饪方式、是否空腹等有关，已过敏食物建议回避并咨询儿科医生后再尝试。',
      selectFood: '选择辅食',
      multiSelect: '可多选',
      enterNewFood: '输入新辅食名称，如：玉米糊',
      sleepHint: '可计时或手动填写起止时间，自动统计时长',
      sleepTip: '点击「睡了」后点保存可持续计时；睡醒后点击时间轴上的这条记录，继续编辑「醒了」并保存，即可完成本次睡眠统计',
      sleepRunningTxt: '正在睡眠 · 点击记录「醒了」',
      fallAsleep: '睡着了',
      wakeUpTxt: '点击「醒了」自动记录结束时间',
      tapStartSleep: '点击自动记录开始时间',
      asleep: '睡了',
      awake: '醒了',
      babyTemp: '宝宝体温',
      tempHint: '滑动选择体温 · 正常范围 36.0 ~ 37.5 ℃',
      bathTime: '洗澡时间',
      durationAutoCalc: '时长按开始/结束时间自动计算',
      longPressToSpeak: '长按开始说话',
      parsingVoice: '正在解析语音内容',
      releaseToFinish: '松开即可完成语音输入',
      longPressMicHint: '长按麦克风开始说话',
      trySaying: '可以这样说：',
      example1: '亲喂 15 分钟',
      example2: '喝了 120 毫升奶粉',
      example3: '换尿布 嘘嘘+臭臭',
      example4: '睡了 40 分钟',
      example5: '量体温 37.5 度',
      example6: '洗澡',
      example7: '喝了 60 毫升水',
      example8: '宝宝体温37.2度，有点发烫',
      example9: '吸奶一共80毫升母乳',
      example10: '吃了D3和益生菌营养品'
    };
    const typeMap = {
  '母乳': 'Breastfeeding', '配方奶': 'Bottle Feeding', '瓶喂母乳': 'Bottle Feeding',
  '吸奶': 'Pumping', '营养品': 'Supplements', '辅食': 'Solid Food',
  '喝水': 'Water', '换尿布': 'Diaper Change', '睡眠': 'Sleep',
  '体温': 'Temperature', '洗澡': 'Bath Time'
};
    const hintMap = {
      '母乳': 'Tap left/right to start/pause timer',
      '配方奶': 'Fill in details and save',
      '瓶喂母乳': 'Fill in details and save',
      '吸奶': 'Enter left/right pumped amount, or time separately',
      '营养品': 'Select multiple supplements',
      '换尿布': 'Select wet/dirty status and save',
      '睡眠': 'Timer or manual start/end, auto-calc duration',
      '辅食': 'Enter food portion and save',
      '喝水': 'Slide to set water amount',
      '体温': 'Record baby temperature (°C)',
      '洗澡': 'Record bath time and duration'
    };
    const weekMap = {
  '周一': 'Mon', '周二': 'Tue', '周三': 'Wed', '周四': 'Thu',
  '周五': 'Fri', '周六': 'Sat', '周日': 'Sun'
};
    this.setData({ i18n, lang: lang, typeMap: typeMap, hintMap: hintMap, weekMap: weekMap });

    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      // 我的=记录页：第三项高亮
      this.getTabBar().setData({ selected: 2, hidden: (this._ovl || 0) > 0 });
    }
    // 引导「去登录」：进入记录页后自动弹出登录抽屉
    if (app.globalData.pendingLogin) {
      app.globalData.pendingLogin = false;
      this.openLogin();
    }
    // 计算是否在家庭中（不管是创建者还是成员）
    const myOpenid = (app.globalData.user && app.globalData.user.openid) || '';
    const hasFamily = !!(app.globalData.myFamily && app.globalData.myFamily._id);
    // 计算是否是亲友（在家庭中，但不是创建者）
    let isFamilyMember = false;
    if (hasFamily) {
      const isOwner = app.globalData.myFamily.ownerOpenid === myOpenid;
      isFamilyMember = !isOwner; // 不是创建者 → 是亲友
    }
    console.log('[plan] hasFamily=', hasFamily, 'isFamilyMember=', isFamilyMember, 'myFamily.ownerOpenid=', app.globalData.myFamily && app.globalData.myFamily.ownerOpenid, 'myOpenid=', myOpenid);
    // 账号与导出数据计数
    const user = app.getUser();
    // 未登录状态：清空所有宝宝信息和记录
    if (!user.logged) {
      app.globalData.babies = [];
      app.globalData.baby = null;
      app.globalData.currentBabyId = '';
      app.globalData.records = [];
      app.globalData.measures = { heights: [], weights: [], headRounds: [] };
    } else {
      // 已登录：如果有宝宝但没有选中当前宝宝，自动选中第一个宝宝
      // 注意：要过滤掉共享宝宝（用户被移除家庭后，共享宝宝不应该显示）
      // 过滤出用户自己的宝宝（不是共享的）
      const myOwnBabies = (app.globalData.babies || []).filter(b => {
        if (!b.ownerOpenid) return true; // 旧数据无 ownerOpenid → 视为自己的
        return b.ownerOpenid === myOpenid;
      });
      // 如果没有家庭，只显示自己的宝宝（不显示共享宝宝）
      const visibleBabies = hasFamily ? (app.globalData.babies || []) : myOwnBabies;
      if ((!app.globalData.baby || !app.globalData.baby.id) && visibleBabies.length) {
        const firstBaby = visibleBabies[0];
        app.switchBaby(firstBaby.id);
      }
      // 如果没有宝宝，清空喂养记录（避免显示其他宝宝的旧记录）
      if (!app.globalData.baby || !app.globalData.baby.id) {
        app.globalData.records = [];
        app.globalData.measures = { heights: [], weights: [], headRounds: [] };
      }
    }
    // 只传递需要的字段，避免对象包含循环引用
    const u = app.getUser() || {};
    const b = app.globalData.baby || {};
    this.setData({
      user: {
        logged: !!u.logged,
        nickname: u.nickname || '',
        avatar: u.avatar || '',
        phone: u.phone || '',
        openid: u.openid || ''
      },
      baby: b ? {
        id: b.id || '',
        name: b.name || '',
        birthday: b.birthday || '',
        gender: b.gender || '',
        avatar: b.avatar || '',
        relation: b.relation || '',
        ownerOpenid: b.ownerOpenid || ''
      } : {},
      birthDays: b && b.birthday ? this.calcAge(b.birthday) : 0,
      'exportItems[0].count': (app.globalData.records || []).length,
      'exportItems[1].count': (app.globalData.babies || []).length,
      'exportItems[2].count': this.costItems().length,
      'exportItems[3].count': Object.keys(app.globalData.foodAllergyMap || {}).length,
      isFamilyMember: isFamilyMember
    });
    if (wx.getStorageSync('panda_open_export')) {
      wx.removeStorageSync('panda_open_export');
      this.openExport();
    }
    this.setData({ 'record.diaperStock': app.globalData.diaperStock });
    console.log('[plan] baby.avatar=', app.globalData.baby && app.globalData.baby.avatar);
    console.log('[plan] baby=', (app.globalData.baby||{}).name, 'currentBabyId=', app.globalData.currentBabyId);
    // 加载当前宝宝视图（档案 / 上次间隔 / 亲喂记录）
    this.refreshBabyView();
    // 重建日历红点（疫苗/库存等修改后返回页面时更新展开和折叠日历）
    if (this._selDate) {
      this.rebuildAround(this._selDate);
    } else {
      this.rebuildAround(new Date());
    }
    // 云端拉取完成后若有新数据（家庭共享宝宝 / 成员新记录）再刷新视图
    app.onPullDone(() => { this.refreshBabyView(); });
    // 同步真实天气与当前温度
    this.loadWeather();
    this.setData({ myOpenid: ((app.globalData.user && app.globalData.user.openid) || (wx.getStorageSync('panda_user') || {}).openid) || '' });
    // 若从底部导航「+」进入，自动弹出快速新增面板
    if (app.globalData.pendingQuickAdd) {
      app.globalData.pendingQuickAdd = false;
      this.openQuick();
    }
    // 若从底部导航长按「+」进入，自动弹出语音记录面板
    if (app.globalData.pendingVoice) {
      app.globalData.pendingVoice = false;
      if (!this.guardBaby()) return;
      this.openVoice();
    }
    // 根据是否有弹窗打开，同步底部导航栏显隐（进入页面时若已打开弹窗则隐藏，否则恢复）
    this.syncTabBar();
    // 睡眠进行中 → 启动持续计时同步（时间轴实时刷新）
    this.startSleepRunningSync();
    // 启动定时同步：每 10 秒拉取一次云端数据，实现家庭共享记录实时同步
    this.startPeriodicSync();
    // 已登录且从未引导过麦克风：进入记录页时提示一次（避免首次长按语音键与系统授权弹窗叠加）
    const overlayOpen = this.data.showQuick || this.data.showVoice || this.data.loginVisible || (this.data.record && this.data.record.visible);
    if (!overlayOpen && app && app.maybeAskVoiceAuth) {
      setTimeout(() => { try { app.maybeAskVoiceAuth(); } catch (e) {} }, 900);
    }
  },

  onHide() {
    this.clearTimers();
  },

  /* 定时同步：每 10 秒拉取一次云端数据 */
  startPeriodicSync() {
    // 只在已登录且加入了家庭时才启动定时同步
    const user = app.getUser();
    if (!user.logged) return;
    const hasFamily = !!(app.globalData.myFamily && app.globalData.myFamily._id);
    if (!hasFamily) return;
    if (this._syncTimer) clearInterval(this._syncTimer);
    this._syncTimer = setInterval(() => {
      console.log('[periodicSync] 定时拉取云端数据...');
      try {
        const cloudData = require('../../utils/cloud-data.js');
        cloudData.pull().then(() => {
          this.refreshBabyView();
        }).catch(e => {
          console.log('[periodicSync] 拉取失败', e);
        });
      } catch (e) {
        console.log('[periodicSync] 错误', e);
      }
    }, 10000); // 10 秒
  },

  onUnload() {
    this.clearTimers();
    this.stopVoiceTimer();
  },

  /* ==================== 真实天气（云函数 getWeather，和风天气） ==================== */
  loadWeather(force) {
    if (!(wx.cloud && wx.cloud.callFunction)) { return; }
    // 缓存 30 分钟内直接使用，避免每次进入都重复请求；force=true 强制刷新
    const CACHE_KEY = 'panda_weather_cache';
    try {
      const cache = wx.getStorageSync(CACHE_KEY);
      if (!force && cache && cache.t && Date.now() - cache.t < 10 * 60 * 1000) {
        this.setData({ weather: cache.weather });
        return;
      }
    } catch (e) {}
    const apply = (w) => {
      this.setData({ weather: w });
      try { wx.setStorageSync(CACHE_KEY, { t: Date.now(), weather: w }); } catch (e) {}
    };
    // 真机容错：云函数失败/异常时自动重试（最多 2 次），避免一直显示 -- / --℃
    const retry = () => {
      this._wFail = (this._wFail || 0) + 1;
      if (this._wFail <= 2) {
        setTimeout(() => { this._wFail--; this.loadWeather(true); }, 1500);
      } else {
        this._wFail = 0;
      }
    };
    const fetch = (lat, lng) => {
      wx.cloud.callFunction({
        name: 'getWeather',
        data: { lat, lng },
        success: (r) => {
          const res = (r && r.result) || {};
          if (res.code === 0 && res.text) {
            this._wFail = 0;
            apply({ icon: res.icon || '🌤', img: this.weatherImg(res.iconCode), type: res.text, temp: (res.temp || '--') + '℃' });
          } else {
            // 云函数内部异常（如 Host 配置未生效）：优先用上次缓存，无缓存则重试
            try {
              const cache = wx.getStorageSync(CACHE_KEY);
              if (cache && cache.weather) { this.setData({ weather: cache.weather }); return; }
            } catch (e) {}
            retry();
          }
        },
        fail: (e) => {
          // 云函数不可用：使用上次成功缓存；无缓存则重试
          try {
            const cache = wx.getStorageSync(CACHE_KEY);
            if (cache && cache.weather) { this.setData({ weather: cache.weather }); return; }
          } catch (e) {}
          retry();
        }
      });
    };
    wx.getLocation({
      type: 'gcj02',
      success: (pos) => { fetch(pos.latitude, pos.longitude); },
      fail: (e) => { fetch(39.9042, 116.4074); }
    });
  },

  /* 和风天气 icon 编号 → 本地图标（与 sun 同风格） */
  weatherImg(code) {
    const n = parseInt(code, 10);
    if (n === 100 || (n >= 150 && n <= 153)) return '/images/icons/weather-sun.png';
    if (n >= 101 && n <= 103) return '/images/icons/weather-cloudy.png';
    if (n === 104) return '/images/icons/weather-overcast.png';
    if (n >= 200 && n < 300) return '/images/icons/weather-storm.png';
    if (n >= 300 && n < 400) return '/images/icons/weather-rain.png';
    if (n >= 400 && n < 500) return '/images/icons/weather-snow.png';
    if (n >= 500 && n < 600) return '/images/icons/weather-fog.png';
    return '/images/icons/weather-sun.png';
  },

  /* ==================== 工具函数 ==================== */
  nowTime() {
    const d = new Date();
    return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  },

  todayStr() {
    const d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  },

  /* 当前选中日期的字符串（用于新增记录归入选中日期 / 时间轴过滤） */
  selDateStr() {
    const sel = this._selDate || new Date();
    return sel.getFullYear() + '-' + ('0' + (sel.getMonth() + 1)).slice(-2) + '-' + ('0' + sel.getDate()).slice(-2);
  },

  calcAge(birthday) {
    if (!birthday) return '';
    const p = String(birthday).split('-');
    if (p.length !== 3) return '';
    const b = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    const n = new Date();
    let months = (n.getFullYear() - b.getFullYear()) * 12 + (n.getMonth() - b.getMonth());
    let days = n.getDate() - b.getDate();
    if (days < 0) {
      months -= 1;
      days += new Date(n.getFullYear(), n.getMonth(), 0).getDate();
    }
    const en = (this.data && this.data.lang ? this.data.lang : (wx.getStorageSync('lang') || 'zh')) === 'en';
    if (months < 1) return en ? (days + (days === 1 ? ' day' : ' days')) : (days + ' 天');
    if (en) {
      if (days === 0) return months + (months === 1 ? ' month' : ' months');
      return months + (months === 1 ? ' month ' : ' months ') + days + (days === 1 ? ' day' : ' days');
    }
    if (days === 0) return months + ' 个月';
    return months + ' 个月 ' + days + ' 天';
  },

  /* 睡眠计时起点时间戳：优先记录值，旧数据按当天 HH:MM 兜底 */
  _sleepStartTs(rec) {
    if (rec && rec.sleepStartTs) return Number(rec.sleepStartTs);
    if (rec && rec.sleepStart) {
      const hm = String(rec.sleepStart).split(':');
      const d = new Date();
      return new Date(d.getFullYear(), d.getMonth(), d.getDate(), Number(hm[0]) || 0, Number(hm[1]) || 0, 0, 0).getTime();
    }
    return Date.now();
  },

  minutes(sec) {
    sec = Math.max(0, Math.round(sec || 0));
    const en = this._tlEn();
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (en) {
      if (h > 0) return h + 'h ' + m + 'm' + (s ? ' ' + s + 's' : '');
      if (m > 0) return m + 'm' + (s ? ' ' + s + 's' : '');
      return s + 's';
    }
    if (h > 0) return h + '小时' + m + '分' + s + '秒';
    if (m > 0) return m + '分' + s + '秒';
    return s + '秒';
  },

  /* 时长显示到时/分（洗澡等不需精确到秒） */
  minutesHM(sec) {
    sec = Math.max(0, Math.round(sec || 0));
    const en = this._tlEn();
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (en) {
      if (h > 0) return h + 'h ' + m + 'm';
      return m + 'm';
    }
    if (h > 0) return h + '小时' + m + '分';
    return m + '分';
  },

  calcDuration(start, end) {
    const hs = Number(start.split(':')[0]);
    const ms = Number(start.split(':')[1]);
    const he = Number(end.split(':')[0]);
    const me = Number(end.split(':')[1]);
    let s = (he * 60 + me - hs * 60 - ms) * 60;
    if (s < 0) s += 86400;
    return s;
  },

  clearTimers() {
    if (this.nursingTimer) { clearInterval(this.nursingTimer); this.nursingTimer = null; }
    if (this.pumpTimer) { clearInterval(this.pumpTimer); this.pumpTimer = null; }
    if (this.sleepTimer) { clearInterval(this.sleepTimer); this.sleepTimer = null; }
    if (this._syncTimer) { clearInterval(this._syncTimer); this._syncTimer = null; }
    this.clearSleepRunningSync();
  },

  /* ==================== 真实日期：日期条 + 整月日历同步 ==================== */
  isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  },

  initRealDateHeader() {
    const d = new Date();
    this.setData({ headerDate: this.fmtDateLabel(d) });
  },

  // 以 anchor 为中心重建日期条（±2 天）、整月日历与选中态，保证两者同步
  rebuildAround(anchor) {
    this._selDate = anchor;
    const weeks = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const today = new Date();
    const dates = [];
    let todayIndex = 2;
    const m = this.buildRemindMaps();
    // 构建有喂养记录的日期集合（用于折叠日历区分有/无记录日期）
    const recordDates = {};
    (app.globalData.records || []).forEach(r => {
      if (r && r.date) recordDates[r.date] = true;
    });
    for (let i = -2; i <= 2; i++) {
      const d = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + i);
      const isToday = this.isSameDay(d, today);
      if (isToday) todayIndex = i + 2;
      const ymd = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      dates.push({
        week: weeks[d.getDay()],
        num: d.getDate(),
        label: this.fmtDateLabel(d),
        year: d.getFullYear(),
        month: d.getMonth(),
        day: d.getDate(),
        today: isToday,
        ymd,
        hasRecord: !!recordDates[ymd],
        hasVaccine: !!(m.dueMap[ymd] || m.shelfMap[ymd] || m.warrMap[ymd] || m.milkMap[ymd]),
        hasSupp: !!(m.suppMap[ymd] || m.d3Map[ymd])
      });
    }
    this.setData({
      dates,
      selectedDate: 2,
      todayIndex,
      // 只更新红点和折叠日历，不更新展开日历的月份（保留用户浏览位置）
      monthDays: this.buildMonthDays(new Date(this.data.calYear, this.data.calMonth, 1))
    });
    // 日期变化后按真实记录重建时间轴
    this.buildTimeline();
  },

  // 全部提醒红点 Map（疫苗/营养品/保质期/保修期/母乳到期/D3，日期栏与整月日历共用）
  buildRemindMaps() {
    const user = app.getUser();
    const g = app.globalData;
    // 未登录时，不显示任何红点提醒
    if (!user.logged) {
      return { dueMap: {}, suppMap: {}, milkMap: {}, shelfMap: {}, warrMap: {}, d3Map: {} };
    }
    // 没有宝宝时，不显示任何红点提醒
    if (!g.babies || g.babies.length === 0) {
      return { dueMap: {}, suppMap: {}, milkMap: {}, shelfMap: {}, warrMap: {}, d3Map: {} };
    }
    const ymdOf = (dt) => {
      if (!dt) return '';
      const p = String(dt).split('-').map(Number);
      if (p.length < 3 || !p[0]) return '';
      return p[0] + '-' + String(p[1] || 1).padStart(2, '0') + '-' + String(p[2] || 1).padStart(2, '0');
    };
    const dueMap = {};
    (g.vaccinePlan || [])
      .filter(v => v.status === 'pending')
      .forEach(v => { dueMap[v.doneDate || v.dueDate] = true; });

    const FREQ_DAYS = { '每日': 1, '每2天': 2, '每3天': 3, '每周': 7, '每两周': 14 };
    const suppMap = {};
    (g.records || [])
      .filter(r => r.type === '营养品' && r.suppRemindFreq && FREQ_DAYS[r.suppRemindFreq])
      .forEach(r => {
        // 如果用户手动修改过下次提醒日期，优先使用
        if (r.suppNextRemindDate) {
          suppMap[r.suppNextRemindDate] = true;
          return;
        }
        const rd = new Date(r.date + 'T00:00:00');
        if (isNaN(rd.getTime())) return;
        rd.setDate(rd.getDate() + FREQ_DAYS[r.suppRemindFreq]);
        suppMap[ymdOf(rd.getFullYear() + '-' + (rd.getMonth() + 1) + '-' + rd.getDate())] = true;
      });

    // 保质期到期（库存录入自动同步）
    const shelfMap = {};
    (g.stockItems || []).forEach(s => {
      if (!s.produceDate || !s.shelfLife) return;
      const pp = String(s.produceDate).split('-').map(Number);
      const ex = new Date(pp[0], (pp[1] || 1) - 1, (pp[2] || 1) + Number(s.shelfLife));
      shelfMap[ymdOf(ex.getFullYear() + '-' + (ex.getMonth() + 1) + '-' + ex.getDate())] = true;
    });

    // 保修期到期（电器）
    const warrMap = {};
    (g.stockItems || []).forEach(s => {
      if (s.warrantyUntil) warrMap[s.warrantyUntil] = true;
    });

    // 母乳储存到期（吸奶记录 × 国标储存时限）
    const MS = g.MILK_STORAGE || {};
    const ackMilks = g.acknowledgedMilks || [];
    const milkMap = {};
    (g.records || []).forEach(r => {
      if (!r || r.type !== '吸奶') return;
      const st = MS[r.storage] ? r.storage : 'fridge';
      const cfg = MS[st] || MS.fridge;
      const dp = String(r.date || '').split('-').map(Number);
      if (!dp[0]) return;
      // 储存时间优先用吸奶结束时间，如果没有则用记录时间
      const storageTime = r.pumpEnd || r.time || '00:00';
      const tp = String(storageTime).split(':').map(Number);
      const startSec = tp[2] || 0;
      const start = new Date(dp[0], (dp[1] || 1) - 1, dp[2] || 1, tp[0] || 0, tp[1] || 0, startSec);
      let expire;
      if (cfg.unit === 'h') expire = new Date(start.getTime() + cfg.value * 3600000);
      else expire = new Date(start.getFullYear(), start.getMonth() + cfg.value, start.getDate(), start.getHours(), start.getMinutes(), startSec);
      const y = expire.getFullYear() + '-' + String(expire.getMonth() + 1).padStart(2, '0') + '-' + String(expire.getDate()).padStart(2, '0');
      // 生成唯一的 ack id：优先用记录 id，如果没有则用日期+时间+储存条件组合
      const milkAckId = r.id ? ('milk_' + r.id + '_' + y) : ('milk_' + r.date + '_' + storageTime + '_' + st + '_' + y);
      // 已确认的母乳提醒不显示红点
      if (ackMilks.indexOf(milkAckId) >= 0) return;
      milkMap[y] = true;
    });

    // D3 属于营养品，不单独标红点（按营养品频率走 suppMap）
    const d3Map = {};
    return { dueMap, suppMap, shelfMap, warrMap, milkMap, d3Map };
  },

  // 指定日期的全部提醒详情（疫苗/营养品/保质期/保修期/母乳/D3）
  collectDayReminds(ymd) {
    const g = app.globalData;
    const items = [];
    const m = this.buildRemindMaps();
    (g.vaccinePlan || []).forEach(v => {
      if (v.status === 'pending' && (v.doneDate || v.dueDate) === ymd) {
        items.push({ tag: '疫苗', name: (v.group || v.short || '疫苗') + (v.dose ? v.dose + '剂' : '') + ' 应种', time: String(v.doneDate || v.dueDate).slice(5).replace('-', '/'), vaxId: v.id, vaxStatus: v.status, editable: true });
      }
    });
    const FREQ_DAYS = { '每日': 1, '每2天': 2, '每3天': 3, '每周': 7, '每两周': 14 };
    (g.records || []).forEach(r => {
      if (r.type !== '营养品' || !r.suppRemindFreq || !FREQ_DAYS[r.suppRemindFreq]) return;
      const rd = new Date(r.date + 'T00:00:00');
      if (isNaN(rd.getTime())) return;
      rd.setDate(rd.getDate() + FREQ_DAYS[r.suppRemindFreq]);
      // 如果用户手动修改过下次提醒日期，优先使用
      if (r.suppNextRemindDate) {
        rd.setTime(new Date(r.suppNextRemindDate + 'T00:00:00').getTime());
      }
      const y = rd.getFullYear() + '-' + String(rd.getMonth() + 1).padStart(2, '0') + '-' + String(rd.getDate()).padStart(2, '0');
      if (y === ymd) items.push({ tag: '营养品', name: '补充营养品：' + (r.supps || []).join('、'), time: r.suppRemindTime || '', suppId: r.id, editable: true });
    });
    (g.stockItems || []).forEach(s => {
      if (!s.produceDate || !s.shelfLife) return;
      const pp = String(s.produceDate).split('-').map(Number);
      const ex = new Date(pp[0], (pp[1] || 1) - 1, (pp[2] || 1) + Number(s.shelfLife));
      const y = ex.getFullYear() + '-' + String(ex.getMonth() + 1).padStart(2, '0') + '-' + String(ex.getDate()).padStart(2, '0');
      if (y === ymd) items.push({ tag: '保质期', name: (s.name || '耗材') + (s.size ? '（' + s.size + '）' : '') + ' 到期', time: String(ymd).slice(5).replace('-', '/') });
    });
    (g.stockItems || []).forEach(s => {
      if (s.warrantyUntil && s.warrantyUntil === ymd) {
        items.push({ tag: '保修期', name: (s.name || '电器') + ' 保修到期', time: String(ymd).slice(5).replace('-', '/'), stockId: s.id, editable: true });
      }
    });
    const MS = g.MILK_STORAGE || {};
    const ackMilks = g.acknowledgedMilks || [];
    (g.records || []).forEach(r => {
      if (!r || r.type !== '吸奶') return;
      const st = MS[r.storage] ? r.storage : 'fridge';
      const cfg = MS[st] || MS.fridge;
      const dp = String(r.date || '').split('-').map(Number);
      if (!dp[0]) return;
      // 储存时间优先用吸奶结束时间，如果没有则用记录时间
      const storageTime = r.pumpEnd || r.time || '00:00';
      // 解析时间（支持 HH:MM 和 HH:MM:SS）
      const tp = String(storageTime).split(':').map(Number);
      const startSec = tp[2] || 0;
      const start = new Date(dp[0], (dp[1] || 1) - 1, dp[2] || 1, tp[0] || 0, tp[1] || 0, startSec);
      let expire;
      if (cfg.unit === 'h') expire = new Date(start.getTime() + cfg.value * 3600000);
      else expire = new Date(start.getFullYear(), start.getMonth() + cfg.value, start.getDate(), start.getHours(), start.getMinutes(), startSec);
      // 到期日期（年月日，用于红点匹配）
      const y = expire.getFullYear() + '-' + String(expire.getMonth() + 1).padStart(2, '0') + '-' + String(expire.getDate()).padStart(2, '0');
      // 生成唯一的 ack id：优先用记录 id，如果没有则用日期+时间+储存条件组合
      const milkAckId = r.id ? ('milk_' + r.id + '_' + y) : ('milk_' + r.date + '_' + storageTime + '_' + st + '_' + y);
      // 已确认的母乳提醒不显示
      if (ackMilks.indexOf(milkAckId) >= 0) return;
      if (y === ymd) {
        const stockLabel = cfg.label || '冷藏';
        const inDate = String(r.date || '').slice(5).replace('-', '/');
        // 入库时间精确到分
        const inTime = storageTime;
        // 到期时间精确到分
        const expireTime = String(expire.getHours()).padStart(2, '0') + ':' + String(expire.getMinutes()).padStart(2, '0');
        items.push({
          tag: '母乳',
          name: '母乳到期（' + stockLabel + '）· ' + inDate + ' ' + inTime + ' 入库',
          time: '到期于 ' + String(ymd).slice(5).replace('-', '/') + ' ' + expireTime,
          milkAckId,
          canAck: true
        });
      }
    });
    return items;
  },

  // 点击红点（日期栏 / 整月日历共用）→ 弹出该日期提醒详情
  openDayRemind(e) {
    const ymd = e.currentTarget.dataset.ymd;
    if (!ymd) return;
    const items = this.collectDayReminds(ymd);
    const parts = ymd.split('-');
    const label = this.fmtDateLabel(new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
    this.setData({ showDayRemind: true, dayRemind: { date: ymd, label, items } });
  },
  closeDayRemind() {
    this.setData({ showDayRemind: false });
  },

  // 日历红点 → 修改提醒日期（疫苗/营养品）
  onDrVaxDate(e) {
    const idx = Number(e.currentTarget.dataset.index);
    const newDate = e.detail.value;
    const item = this.data.dayRemind.items[idx];
    if (!item) return;
    const g = app.globalData;

    // 处理疫苗
    if (item.vaxId) {
      const plan = g.vaccinePlan || [];
      const v = plan.find(x => x.id === item.vaxId);
      if (!v) return;
      v.dueDate = newDate;
      v.doneDate = '';
      app.persist();
    }
    // 处理营养品
    else if (item.suppId) {
      const records = g.records || [];
      const r = records.find(x => x.id === item.suppId);
      if (!r) return;
      r.suppNextRemindDate = newDate;
      app.persist();
    }
    // 处理保修期
    else if (item.stockId) {
      const stockItems = g.stockItems || [];
      const s = stockItems.find(x => x.id === item.stockId);
      if (!s) return;
      s.warrantyUntil = newDate;
      app.persist();
    }
    else {
      return;
    }

    // 刷新红点图 + 当天提醒列表
    this.buildRemindMaps();
    const ymd = this.data.dayRemind.date;
    // 保留展开日历当前浏览的月份，不跳转到今天
    const calBase = new Date(this.data.calYear, this.data.calMonth, 1);
    this.setData({
      monthDays: this.buildMonthDays(calBase),
      dayRemind: { ...this.data.dayRemind, items: this.collectDayReminds(ymd) }
    });
    wx.showToast({ title: '已更新提醒日期', icon: 'none' });
  },

  // 母乳储存到期 → 点击"知道了"后消失
  onDrMilkAck(e) {
    const idx = Number(e.currentTarget.dataset.index);
    const item = this.data.dayRemind.items[idx];
    if (!item || !item.milkAckId) return;
    const g = app.globalData;
    const ackMilks = g.acknowledgedMilks || [];
    if (ackMilks.indexOf(item.milkAckId) < 0) {
      ackMilks.push(item.milkAckId);
      g.acknowledgedMilks = ackMilks;
      app.persist();
    }
    // 刷新红点图 + 当天提醒列表
    this.buildRemindMaps();
    const ymd = this.data.dayRemind.date;
    // 保留展开日历当前浏览的月份，不跳转到今天
    const calBase = new Date(this.data.calYear, this.data.calMonth, 1);
    this.setData({
      monthDays: this.buildMonthDays(calBase),
      dayRemind: { ...this.data.dayRemind, items: this.collectDayReminds(ymd) }
    });
  },

  buildMonthDays(anchor) {
    const year = anchor.getFullYear();
    const month = anchor.getMonth();
    const first = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const m = this.buildRemindMaps();
    // 构建有喂养记录的日期集合（用于展开日历区分有/无记录日期）
    const recordDates = {};
    (app.globalData.records || []).forEach(r => {
      if (r && r.date) recordDates[r.date] = true;
    });
    const days = [];
    for (let i = 0; i < first; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const ymd = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      const cellDate = new Date(year, month, d);
      days.push({
        num: d,
        hasRecord: !!recordDates[ymd],
        hasVaccine: !!m.dueMap[ymd],
        hasSupp: !!(m.suppMap[ymd] || m.d3Map[ymd]),
        hasMilk: !!m.milkMap[ymd],
        hasShelf: !!m.shelfMap[ymd],
        hasWarr: !!m.warrMap[ymd],
        ymd,
        isToday: this.isSameDay(cellDate, today),
        isFuture: cellDate > new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
        isSelected: this.isSameDay(cellDate, this._selDate)
      });
    }
    return days;
  },

  selectDate(e) {
    const idx = Number(e.currentTarget.dataset.index);
    this.setData({ selectedDate: idx });
    this.applySelection();
  },

  // 日期条内切换：更新选中高亮，并同步日历选中态
  applySelection() {
    const d = this.data.dates[this.data.selectedDate];
    if (!d) return;
    const sel = new Date(d.year, d.month, d.day);
    this._selDate = sel;
    this.setData({
      monthDays: this.buildMonthDays(sel),
      calYear: d.year,
      calMonth: d.month,
      calTitle: this.calTitleOf(d.year, d.month)
    });
    // 选中日期变化后按真实记录重建时间轴
    this.buildTimeline();
  },

  changeDate(e) {
    const delta = Number(e.currentTarget.dataset.delta);
    const base = this._selDate ? new Date(this._selDate) : new Date();
    base.setDate(base.getDate() + delta);
    this.rebuildAround(base);
  },

  // 整月日历：切换年月（仅浏览月历，点击具体日期才选择并收起）
  calPrevMonth() { this.shiftCalMonth(-1); },
  calNextMonth() { this.shiftCalMonth(1); },
  calPrevYear() { this.shiftCalYear(-1); },
  calNextYear() { this.shiftCalYear(1); },
  shiftCalMonth(delta) {
    const base = new Date(this.data.calYear, this.data.calMonth + delta, 1);
    this.setData({
      calYear: base.getFullYear(),
      calMonth: base.getMonth(),
      calTitle: this.calTitleOf(base.getFullYear(), base.getMonth()),
      monthDays: this.buildMonthDays(base)
    });
  },
  shiftCalYear(delta) {
    const base = new Date(this.data.calYear + delta, this.data.calMonth, 1);
    this.setData({
      calYear: base.getFullYear(),
      calMonth: base.getMonth(),
      calTitle: this.calTitleOf(base.getFullYear(), base.getMonth()),
      monthDays: this.buildMonthDays(base)
    });
  },

  // 点击整月日历某天 → 与上方日期条同步选中，并收起日历
  selectCalendarDay(e) {
    const idx = Number(e.currentTarget.dataset.index);
    const day = this.data.monthDays[idx];
    if (!day) return;
    // 未来日期：只查看红点提醒，不选中、不补记录
    if (day.isFuture) {
      const hasAny = day.hasVaccine || day.hasSupp || day.hasMilk || day.hasShelf || day.hasWarr;
      if (hasAny) {
        this.openDayRemind({ currentTarget: { dataset: { ymd: day.ymd } } });
      }
      return;
    }
    // 第二下：该日期已选中且当日有提醒红点 → 查看红点信息
    if (day.isSelected && (day.hasVaccine || day.hasSupp || day.hasMilk || day.hasShelf || day.hasWarr)) {
      this.openDayRemind({ currentTarget: { dataset: { ymd: day.ymd } } });
      return;
    }
    const anchor = new Date(this.data.calYear, this.data.calMonth, day.num);
    // 选中日期后不自动收起，由用户点击横条收回
    this.rebuildAround(anchor);
  },

  toggleCalendar() {
    this.setData({ calendarOpen: !this.data.calendarOpen });
  },
  goToday() {
    // 跳转到今天，折叠日历和展开日历都跳转到今天
    const today = new Date();
    this.rebuildAround(today);
    // 同时更新展开日历的月份到今天
    this.setData({
      calYear: today.getFullYear(),
      calMonth: today.getMonth(),
      calTitle: this.calTitleOf(today.getFullYear(), today.getMonth()),
      monthDays: this.buildMonthDays(today)
    });
  },

  /* ==================== 快速新增 ==================== */
  /* 根据是否有弹窗打开，控制底部导航栏显隐（弹窗/抽屉打开时隐藏 tabBar） */
  syncTabBar() {
    const own = !!(this.data.showQuick || this.data.record.visible || this.data.showVoice || this.data.babySwitchVisible);
    const open = !!(own || this._ovl);
    const tab = typeof this.getTabBar === 'function' ? this.getTabBar() : null;
    if (tab) tab.setData({ hidden: open });
  },

  /* 点「+」：进入快速记录模式（米色空白页）+ 弹出快速记录抽屉（无关闭按钮，不可手动关闭） */
  /* 是否有宝宝：无宝宝不允许记录 */
  hasBaby() {
    return !!((app.globalData && app.globalData.babies) || []).length;
  },
  guardBaby() {
    if (this.hasBaby()) return true;
    wx.showToast({ title: '请先添加宝宝', icon: 'none' });
    setTimeout(() => {
      wx.navigateTo({ url: '/pages/my-babies/my-babies' });
    }, 600);
    return false;
  },

  openQuick() {
    if (!this.guardBaby()) return;
    const sel = this._selDate || new Date();
    const label = (sel.getMonth() + 1) + '月' + sel.getDate() + '日';
    const isToday = this.isSameDay(sel, new Date());
    this.setData({
      quickMode: true,
      showQuick: true,
      quickDateLabel: isToday ? '记录到：今天' : '补记录到：' + label,
      'voiceState.recording': false,
      'voiceState.recognizing': false,
      'voiceState.result': '',
      'voiceState.seconds': 0
    });
    this.syncTabBar();
  },

  closeQuick() {
    if (this.data.voiceState.recording && this.recorder) this.recorder.stop();
    this.stopVoiceTimer();
    // 点击关闭按钮：关闭快速记录抽屉并退出米色空白页，跳转到「记录」页
    this.setData({ showQuick: false, quickMode: false, 'voiceState.recording': false, 'voiceState.recognizing': false, 'voiceState.result': '' });
    this.syncTabBar();
    wx.switchTab({ url: '/pages/plan/plan' });
  },

  /* 抽屉内语音按钮：长按开始录音（麦克风授权已在首次登录时处理，这里不再叠加弹窗） */
  quickVoiceHoldStart() {
    const st = this.data.voiceState;
    if (st.recording || st.recognizing) return;
    const that = this;
    const en = (wx.getStorageSync('lang') || 'zh') === 'en';
    const go = () => {
      // 授权弹窗期间手指已松开，或停留过久：不再启动录音，避免语音面板卡住
      if (!that._voiceHolding || (Date.now() - (that._voiceHoldAt || 0)) > 2200) {
        that.setData({ 'voiceState.authDenied': false });
        wx.showToast({ title: en ? 'Microphone ready, hold to speak again' : '麦克风已就绪，请重新按住说话', icon: 'none' });
        return;
      }
      that.doVoiceRecord();
    };
    this._voiceHoldAt = this._voiceHoldAt || Date.now();
    wx.getSetting({
      success(res) {
        const auth = (res && res.authSetting) || {};
        if (auth['scope.record'] === true) { go(); return; }
        if (auth['scope.record'] === false) { that.voiceAuthDeniedTip(); return; }
        wx.authorize({
          scope: 'scope.record',
          success: go,
          fail() { that.voiceAuthDeniedTip(); }
        });
      },
      fail() { go(); }
    });
  },

  /* 麦克风被拒：引导去设置开启（不弹录音面板） */
  voiceAuthDeniedTip() {
    const en = (wx.getStorageSync('lang') || 'zh') === 'en';
    this.setData({ 'voiceState.authDenied': true, 'voiceState.recording': false });
    wx.showModal({
      title: en ? 'Microphone Not Enabled' : '麦克风未开启',
      content: en
        ? 'Voice input needs microphone access. Open settings to enable it, then hold the voice button again.'
        : '语音录入需要麦克风权限。前往设置开启后，再按住语音键即可录音。',
      confirmText: en ? 'Settings' : '去设置',
      cancelText: en ? 'Cancel' : '取消',
      confirmColor: '#c99a2e',
      success: (m) => { if (m.confirm) this.openVoiceSetting(); }
    });
  },

  /* 抽屉内语音按钮：松手停止并识别 */
  quickVoiceHoldEnd() {
    this.stopVoiceRecord();
  },

  noop() {},

  selectQuick(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ showQuick: false });
    // 点击立刻出现：快速抽屉收回的同时立即上拉对应记录抽屉，无延迟
    clearTimeout(this._quickTimer);
    this.openRecord(type);
  },

  /* ==================== 记录弹窗 ==================== */
  openRecord(e, prefill) {
    // 新增记录：需登录 + 已添加宝宝（编辑已有记录不拦截）
    if (!(e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.edit)) {
      if (!app.requireBaby()) return;
    }
    let type;
    if (typeof e === 'string') {
      type = e;
    } else if (e && e.currentTarget && e.currentTarget.dataset) {
      type = e.currentTarget.dataset.type;
    } else {
      type = '母乳';
    }
    this.clearTimers();
    const icons = { 母乳: '🍼', 配方奶: '🥛', 瓶喂母乳: '🥛', 吸奶: '🫗', 营养品: '💊', 睡眠: '🌙', 辅食: '🥄', 喝水: '💧', 换尿布: '🧷', 体温: '🌡️', 洗澡: '🛁' };
    const iconsImg = { 母乳: '/images/icons/rec-nursing.png', 配方奶: '/images/icons/rec-bottle.png', 瓶喂母乳: '/images/icons/rec-bottle.png', 吸奶: '/images/icons/rec-pump.png', 营养品: '/images/icons/rec-supplement.png', 睡眠: '/images/icons/rec-sleep.png', 辅食: '/images/icons/rec-food.png', 喝水: '/images/icons/rec-water.png', 换尿布: '/images/icons/rec-diaper.png' };
    const lang = wx.getStorageSync('lang') || 'zh';
    const typeMap = lang === 'en' ? {
      '母乳': 'Breastfeeding',
      '配方奶': 'Bottle Feeding',
      '瓶喂母乳': 'Bottle Feeding',
      '吸奶': 'Pumping',
      '营养品': 'Supplements',
      '换尿布': 'Diaper Change',
      '睡眠': 'Sleep',
      '辅食': 'Solid Food',
      '喝水': 'Water',
      '体温': 'Temperature',
      '洗澡': 'Bath Time'
    } : {};
    const hints = lang === 'en' ? {
      '母乳': 'Tap left/right to start/pause timer',
      '配方奶': 'Fill in details and save',
      '瓶喂母乳': 'Fill in details and save',
      '吸奶': 'Enter left/right pumped amount, or time separately',
      '营养品': 'Select multiple supplements',
      '换尿布': 'Select wet/dirty status and save',
      '睡眠': 'Timer or manual start/end, auto-calc duration',
      '辅食': 'Enter food portion and save',
      '喝水': 'Slide to set water amount',
      '体温': 'Record baby temperature (°C)',
      '洗澡': 'Record bath time and duration'
    } : {
      母乳: '轻点左右一侧开始或暂停计时',
      配方奶: '补充完成后，保存本次记录',
      瓶喂母乳: '补充完成后，保存本次记录',
      吸奶: '分别填写左右吸奶量，也可单独计时',
      营养品: '可同时选择多种营养品',
      换尿布: '选择尿便情况后保存记录',
      睡眠: '可计时或手动填写起止时间，自动统计时长',
      辅食: '填写辅食份量后保存',
      喝水: '滑动选择本次喝水量',
      体温: '记录宝宝体温（℃）',
      洗澡: '记录洗澡时间与时长'
    };
    const displayType = typeMap[type] || type;
    const titleMap = lang === 'en' ? {
      '母乳': 'Record Breastfeeding',
      '配方奶': 'Record Bottle Feeding',
      '瓶喂母乳': 'Record Expressed Milk',
      '吸奶': 'Record Pumping',
      '营养品': 'Record Supplements',
      '睡眠': 'Record Sleep',
      '辅食': 'Record Solid Food',
      '喝水': 'Record Water',
      '换尿布': 'Record Diaper Change',
      '体温': 'Record Temperature',
      '洗澡': 'Record Bath Time'
    } : {
      '母乳': '记录母乳',
      '配方奶': '记录配方奶',
      '瓶喂母乳': '记录瓶喂母乳',
      '吸奶': '记录吸奶',
      '营养品': '记录营养品',
      '睡眠': '记录睡眠',
      '辅食': '记录辅食',
      '喝水': '记录喝水',
      '换尿布': '记录换尿布',
      '体温': '记录体温',
      '洗澡': '记录洗澡'
    };
    const recordTitle = titleMap[type] || ('记录' + type);
    const now = this.nowTime();
    // 辅食：重量默认上一次记录（新增时），名称不预设默认值
    let lastFood = null;
    if (type === '辅食' && !(prefill && (prefill.foodWeight !== undefined || prefill.simpleAmount !== undefined))) {
      const _recs = app.globalData.records || [];
      for (let i = _recs.length - 1; i >= 0; i--) {
        if (_recs[i] && _recs[i].type === '辅食') { lastFood = _recs[i]; break; }
      }
    }
    const defFoodW = (prefill && (prefill.foodWeight !== undefined ? prefill.foodWeight : prefill.simpleAmount))
      || (lastFood && (lastFood.foodWeight !== undefined ? lastFood.foodWeight : (lastFood.simpleAmount || 0)))
      || '';   // 无历史记录时为空，由用户填写
    const defFoodU = (lastFood && lastFood.foodUnit) || 'g';
    // 换尿布：无记录时默认都不选择，有首次记录后默认上次选择
    let lastDiaper = null;
    if (type === '换尿布' && !(prefill && prefill.diaperChoice)) {
      const _recs = app.globalData.records || [];
      for (let i = _recs.length - 1; i >= 0; i--) {
        if (_recs[i] && _recs[i].type === '换尿布') { lastDiaper = _recs[i]; break; }
      }
    }
    const defDiaper = lastDiaper || {};
    this.setData({
      record: {
        ...this.data.record,
        visible: true,
        editIndex: -1,
        time: now,
        recordDate: localDateStr(new Date()),
        type,
        icon: icons[type] || '🍼',
        iconImg: iconsImg[type] || '',
        hint: hints[type] || '',
        nursingL: 0, nursingR: 0, nursingActive: '', nursingStart: '', nursingEnd: '', nursingLastSide: '',
        pumpL: 0, pumpR: 0, pumpLeftAmt: 0, pumpRightAmt: 0, pumpActive: '', pumpLastSide: '',
        storage: type === '吸奶' ? 'fridge' : 'fridge',
        milkOpen: false, milkWarn: false,
        supps: this.loadSuppList(),
        selectedSupps: [],
        suppTime: type === '营养品' ? now : '',
        suppRemindFreq: wx.getStorageSync('lastSuppRemindFreq') || '',
        suppRemindTime: wx.getStorageSync('lastSuppRemindTime') || '',
        diaperAmount: defDiaper.diaperAmount || 0,
        diaperChoice: defDiaper.diaperChoice || '',
        peeColor: defDiaper.peeColor || '',
        stoolColor: defDiaper.stoolColor || '',
        stoolTexture: defDiaper.stoolTexture || '',
        diaperSize: defDiaper.diaperSize || '',
        diaperStock: type === '换尿布' ? this.diaperStockBySize(defDiaper.diaperSize || this.defaultDiaperSize()) : 24,
        sleepSeconds: 0, sleepRunning: false, sleepStart: '', sleepEnd: '',
        temperature: '',
        waterEditing: false,
        bathStart: '', bathEnd: '', bathSeconds: 0,
        foodWeight: defFoodW,
        foodUnit: defFoodU,
        foodUnitIdx: Math.max(0, this.data.foodUnits.indexOf(defFoodU)),
        ...(prefill || {})
      },
      tempSliderVal: prefill && prefill.temperature ? Number(prefill.temperature) : 36.5
    });
    this.syncTabBar();
  },

  closeRecord() {
    this.clearTimers();
    if (this.data.quickMode) {
      // 快速记录模式：点关闭返回快速记录抽屉，继续记录其他项，不跳转我的页
      this.setData({ 'record.visible': false, showQuick: true });
    } else {
      this.setData({ 'record.visible': false });
    }
    this.syncTabBar();
  },

  onRecordDateChange(e) {
    this.setData({
      'record.recordDate': e.detail.value
    });
  },

  openRecordTimePicker(e) {
    const field = e.currentTarget.dataset.field;
    const rec = this.data.record;
    let minTime = '';
    let maxTime = '';
    // 如果打开的是结束时间，minTime就是对应的开始时间
    const endToStart = {
      bottleEnd: 'bottleStart',
      pumpEnd: 'pumpStart',
      nursingEnd: 'nursingStart',
      sleepEnd: 'sleepStart',
      bathEnd: 'bathStart'
    };
    if (endToStart[field] && rec[endToStart[field]]) {
      minTime = rec[endToStart[field]];
    }
    // 如果选择的是今天，时间不能超过当前时间
    const now = new Date();
    const todayStr = localDateStr(now);
    if (rec.recordDate === todayStr) {
      const hh = String(now.getHours()).padStart(2,'0');
      const mm = String(now.getMinutes()).padStart(2,'0');
      maxTime = `${hh}:${mm}`;
    }
    this.setData({ showRecordTimePicker: true, recordTimeTarget: { field, val: e.currentTarget.dataset.val || '', minTime, maxTime } });
  },

  closeRecordTimePicker() {
    this.setData({ showRecordTimePicker: false, recordTimeTarget: null });
  },

  onRecordTime(e) {
    const field = this.data.recordTimeTarget && this.data.recordTimeTarget.field;
    const val = e.detail.value;
    if (!field) {
      this.setData({ showRecordTimePicker: false, recordTimeTarget: null });
      return;
    }
    const rec = this.data.record;
    // 兜底校验：结束时间不能早于开始时间，开始时间不能晚于结束时间（picker已限制，这里静默修正）
    const timePairs = [
      { start: 'bottleStart', end: 'bottleEnd' },
      { start: 'pumpStart', end: 'pumpEnd' },
      { start: 'nursingStart', end: 'nursingEnd' },
      { start: 'sleepStart', end: 'sleepEnd' }
    ];
    let finalVal = val;
    for (const pair of timePairs) {
      if (field === pair.end && rec[pair.start] && val < rec[pair.start]) {
        finalVal = rec[pair.start];
      }
      if (field === pair.start && rec[pair.end] && val > rec[pair.end]) {
        finalVal = rec[pair.end];
      }
    }
    this.setData({ showRecordTimePicker: false, recordTimeTarget: null });
    this.setData({ ['record.' + field]: finalVal });
    const newRec = this.data.record;
    // 自动计算时长
    if (newRec.sleepStart && newRec.sleepEnd) {
      this.setData({ 'record.sleepSeconds': this.calcDuration(newRec.sleepStart, newRec.sleepEnd) });
    }
  },

  /* ----- 亲喂左右计时 ----- */
  toggleNursing(e) {
    const side = e.currentTarget.dataset.side;
    const rec = this.data.record;
    if (rec.nursingActive === side) {
      if (this.nursingTimer) { clearInterval(this.nursingTimer); this.nursingTimer = null; }
      const patch = { 'record.nursingActive': '' };
      patch['record.nursingEnd'] = this.nowTime(); // 暂停 → 记录结束计时时间
      this.setData(patch);
      return;
    }
    if (this.nursingTimer) { clearInterval(this.nursingTimer); this.nursingTimer = null; }
    const patch = { 'record.nursingActive': side };
    patch['record.nursingLastSide'] = side; // 记录本次计时侧（用于「上次」提示）
    if (!rec.nursingStart) {
      const start = this.nowTime(); // 首次开始计时 → 记录开始时间并同步主时间
      patch['record.nursingStart'] = start;
      patch['record.time'] = start;
    }
    this.setData(patch);
    this.nursingTimer = setInterval(() => {
      const key = side === '左' ? 'nursingL' : 'nursingR';
      this.setData({ ['record.' + key]: this.data.record[key] + 1 });
    }, 1000);
  },

  /* ----- 吸奶左右计时 ----- */
  togglePump(e) {
    const side = e.currentTarget.dataset.side;
    const rec = this.data.record;
    if (rec.pumpActive === side) {
      if (this.pumpTimer) { clearInterval(this.pumpTimer); this.pumpTimer = null; }
      const patch = { 'record.pumpActive': '' };
      patch['record.pumpEnd'] = this.nowTime(); // 暂停 → 记录结束计时时间
      this.setData(patch);
      return;
    }
    if (this.pumpTimer) { clearInterval(this.pumpTimer); this.pumpTimer = null; }
    const patch = { 'record.pumpActive': side };
    patch['record.pumpLastSide'] = side; // 记录本次计时侧（用于「上次」提示）
    if (!rec.pumpStart) {
      const start = this.nowTime(); // 首次开始计时 → 记录开始时间并同步主时间
      patch['record.pumpStart'] = start;
      patch['record.time'] = start;
    }
    this.setData(patch);
    this.pumpTimer = setInterval(() => {
      const key = side === '左' ? 'pumpL' : 'pumpR';
      this.setData({ ['record.' + key]: this.data.record[key] + 1 });
    }, 1000);
  },

  preventTap() {},

  onPumpSlider(e) {
    const side = e.currentTarget.dataset.side;
    const val = Number(e.detail.value) || 0;
    this.setData({ ['record.pump' + (side === '左' ? 'LeftAmt' : 'RightAmt')]: val });
  },

  onPumpAmount(e) {
    const side = e.currentTarget.dataset.side;
    let val = Number(e.detail.value);
    if (isNaN(val)) val = 0;
    if (val < 0) val = 0;
    if (val > 300) val = 300;
    this.setData({ ['record.pump' + (side === '左' ? 'LeftAmt' : 'RightAmt')]: val });
  },

  /* ----- 瓶喂奶量 ----- */
  adjustAmount(e) {
    const delta = Number(e.currentTarget.dataset.delta);
    const v = Math.max(0, Math.min(240, this.data.record.amount + delta));
    this.setData({ 'record.amount': v });
  },

  onAmountSlider(e) {
    this.setData({ 'record.amount': Number(e.detail.value) });
  },

  /* 瓶喂量：手动输入（0~330） */
  onAmountInput(e) {
    let v = Number(e.detail.value);
    if (isNaN(v)) v = 0;
    if (v < 0) v = 0;
    if (v > 330) v = 330;
    this.setData({ 'record.amount': v });
  },

  setMilkType(e) {
    this.setData({ 'record.milkType': e.currentTarget.dataset.type });
  },

  /* 库存里是否还有可扣减的配方奶粉 */
  hasFormulaStock() {
    const items = (app.globalData.stockItems || []);
    return items.some(s => s && /奶粉|配方奶|配方牛奶/.test(s.name || '')
      && !/吸奶器|消毒器|温奶器|摇奶器|辅食机|料理机|恒温壶|烘干机|暖奶器/.test(s.name || '')
      && (Number(s.count) || 0) > 0);
  },

  /**
   * 奶粉开罐（非必选）
   * 库存里没有奶粉也允许开罐：照样生成「开罐到期提醒」，只是不扣库存。
   * 勾选开罐时自动勾上到期提醒（用户仍可手动取消）。
   */
  toggleMilkOpen() {
    const open = !this.data.record.milkOpen;
    const days = app.globalData.FORMULA_OPEN_DAYS || 28;
    const en = wx.getStorageSync('lang') === 'en';
    const patch = { 'record.milkOpen': open };
    if (open) patch['record.milkWarn'] = true;
    this.setData(patch);
    if (!open) return;
    const stockText = this.hasFormulaStock()
      ? (en ? ' · stock −1 can' : ' · 库存 -1 罐')
      : (en ? ' · no stock to deduct' : ' · 库存无奶粉，不扣减');
    wx.showToast({
      title: (en ? 'Opened · expiry reminder in ' + days + ' days' : '已开罐 · 自动生成 ' + days + ' 天到期提醒') + stockText,
      icon: 'none',
      duration: 2500
    });
  },

  /* 勾选到期提醒（开罐后按国标 28 天） */
  toggleMilkWarn() {
    this.setData({ 'record.milkWarn': !this.data.record.milkWarn });
  },

  /**
   * 奶粉开罐 → 库存自动 -1 罐
   * 只在「新增配方奶记录 + 勾选已开罐」时调用一次（编辑不重复扣）
   * 返回扣减后的库存项；没有可扣减的奶粉时返回 null
   */
  deductFormulaCan() {
    const g = app.globalData;
    const items = (g.stockItems || []).slice();
    const idx = items.findIndex(s => s && /奶粉|配方奶|配方牛奶/.test(s.name || '')
      && !/吸奶器|消毒器|温奶器|摇奶器|辅食机|料理机|恒温壶|烘干机|暖奶器/.test(s.name || '')
      && (Number(s.count) || 0) > 0);
    if (idx < 0) return null;
    const cur = Number(items[idx].count) || 0;
    items[idx] = Object.assign({}, items[idx], { count: Math.max(0, cur - 1), _u: Date.now() });
    g.stockItems = items;
    return items[idx];
  },

  /* 母乳储存方式（国标） */
  onStorage(e) {
    const st = e.currentTarget.dataset.st;
    this.setData({ 'record.storage': st });
  },

  /* 同步奶粉开罐到期提醒：开罐+勾选 → 生成国标提醒（28 天）；取消 → 移除旧提醒 */
  syncMilkWarn(recBase) {
    const g = app.globalData;
    const days = g.FORMULA_OPEN_DAYS || 28;
    let warns = (g.shelfWarnings || []).slice();
    if (recBase.milkWarnId) {
      warns = warns.filter(w => w.id !== recBase.milkWarnId);
    }
    recBase.milkWarnId = '';
    if (recBase.milkOpen && recBase.milkWarn) {
      const now = new Date();
      const pad = n => (n < 10 ? '0' + n : '' + n);
      const dateLabel = (now.getMonth() + 1) + '.' + now.getDate();
      const expire = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
      const date = expire.getFullYear() + '-' + pad(expire.getMonth() + 1) + '-' + pad(expire.getDate());
      const id = 'w' + Date.now() + Math.floor(Math.random() * 1000);
      warns.push({
        id,
        kind: 'formulaOpen',
        openDays: days,
        name: '奶粉开罐 · ' + dateLabel,
        date,
        tip: '建议 ' + expire.getFullYear() + '年' + pad(expire.getMonth() + 1) + '月' + pad(expire.getDate()) + '日前用完（开罐后 ' + days + ' 天内 · 国标）'
      });
      recBase.milkWarnId = id;
      recBase.milkWarnDate = date;
    }
    g.shelfWarnings = warns;
  },

  /* ----- 营养品多选 ----- */
  /* 营养品列表持久化（默认 6 项，支持添加更多 / 长按移除） */
  loadSuppList() {
    try {
      const s = wx.getStorageSync('panda_supp_list');
      if (Array.isArray(s) && s.length) return s.slice();
    } catch (e) {}
    return ['AD', 'DHA', '钙片', '鱼油', '乳糖酶', '益生菌'];
  },
  saveSuppList(list) {
    try { wx.setStorageSync('panda_supp_list', list.slice()); } catch (e) {}
  },
  toggleSupp(e) {
    const name = e.currentTarget.dataset.name;
    const list = this.data.record.selectedSupps.slice();
    const i = list.indexOf(name);
    if (i >= 0) list.splice(i, 1); else list.push(name);
    this.setData({ 'record.selectedSupps': list });
  },

  /* 营养品补充提醒设置 */
  openSuppRemind() {
    this.setData({ showSuppRemind: true });
  },
  closeSuppRemind() {
    this.setData({ showSuppRemind: false });
  },
  setSuppFreq(e) {
    this.setData({ 'record.suppRemindFreq': e.currentTarget.dataset.freq });
  },
  confirmSuppRemind() {
    const rec = this.data.record;
    // 保存用户设置的提醒频率，下次记录时默认使用
    if (rec.suppRemindFreq) {
      wx.setStorageSync('lastSuppRemindFreq', rec.suppRemindFreq);
    }
    if (rec.suppRemindTime) {
      wx.setStorageSync('lastSuppRemindTime', rec.suppRemindTime);
    }
    this.setData({ showSuppRemind: false });
    wx.showToast({ title: '补充提醒已设置', icon: 'none' });
  },

  /* 长按移除营养品（持久化，下次不再出现） */
  removeSupp(e) {
    const name = e.currentTarget.dataset.name;
    const that = this;
    wx.showModal({
      title: '移除营养品',
      content: '确定移除「' + name + '」吗？移除后不再出现在可选列表中。',
      confirmText: '移除',
      confirmColor: '#C14C2E',
      success: (res) => {
        if (!res.confirm) return;
        const list = this.data.record.supps.filter(x => x !== name);
        const sel = this.data.record.selectedSupps.filter(x => x !== name);
        this.setData({ 'record.supps': list, 'record.selectedSupps': sel });
        this.saveSuppList(list);
        wx.showToast({ title: '已移除「' + name + '」', icon: 'none' });
      }
    });
  },

  /* 添加更多营养品 */
  addSupp() {
    wx.showModal({
      title: '新增营养品',
      editable: true,
      placeholderText: '请输入营养品名称',
      success: (res) => {
        if (res.confirm && res.content) {
          const name = String(res.content).trim();
          if (!name) return;
          const list = this.data.record.supps.slice();
          if (list.indexOf(name) < 0) list.push(name);
          const sel = this.data.record.selectedSupps.slice();
          if (sel.indexOf(name) < 0) sel.push(name);
          this.setData({ 'record.supps': list, 'record.selectedSupps': sel });
          this.saveSuppList(list);
        }
      }
    });
  },

  /* ----- 换尿布 ----- */
  selectDiaper(e) {
    const choice = e.currentTarget.dataset.choice;
    const patch = { 'record.diaperChoice': choice };
    // 联动：选嘘嘘 → 清空臭臭颜色/性状；选臭臭 → 清空嘘嘘颜色；嘘嘘+臭臭 → 全保留
    if (choice === '嘘嘘') {
      patch['record.stoolColor'] = '';
      patch['record.stoolTexture'] = '';
    } else if (choice === '臭臭') {
      patch['record.peeColor'] = '';
    }
    this.setData(patch);
  },

  selectDiaperSample(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ ['record.' + field]: e.currentTarget.dataset.val });
  },

  adjustDiaperAmount(e) {
    const delta = Number(e.currentTarget.dataset.delta);
    const max = this.data.record.diaperStock || 1;
    const v = Math.max(0, Math.min(max, this.data.record.diaperAmount + delta));
    this.setData({ 'record.diaperAmount': v });
  },

  /* 纸尿裤尺码选择：切换后显示对应尺码库存 */
  selectDiaperSize(e) {
    const size = e.currentTarget.dataset.size;
    this.setData({ 'record.diaperSize': size, 'record.diaperStock': this.diaperStockBySize(size) });
  },

  /* 从库存名称解析纸尿裤尺码（兼容旧数据「纸尿裤 L码」） */
  parseSize(name) {
    if (!name) return '';
    const m = String(name).match(/(NB|S|M|L|XL|XXL)/i);
    return m ? m[1].toUpperCase() : '';
  },

  /* 当前尺码纸尿裤库存数量 */
  diaperStockBySize(size) {
    if (!size) return 0;
    const items = (app.globalData.stockItems || []);
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const itSize = it.size || this.parseSize(it.name);
      if (itSize && itSize === size) return Number(it.count) || 0;
    }
    return 0;
  },

  /* 默认尺码：取有库存的纸尿裤尺码（NB→XL 顺序），否则 L */
  defaultDiaperSize() {
    const order = ['NB', 'S', 'M', 'L', 'XL'];
    for (let i = 0; i < order.length; i++) {
      if (this.diaperStockBySize(order[i]) > 0) return order[i];
    }
    return 'L';
  },

  /* 记录换尿布时按尺码从库存扣减，返回扣减与剩余 */
  deductDiaper(size, used) {
    const g = app.globalData;
    const items = (g.stockItems || []).slice();
    let idx = -1;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const itSize = it.size || this.parseSize(it.name);
      if (itSize && itSize === size) { idx = i; break; }
    }
    if (idx < 0) {
      wx.showToast({ title: '未录入「' + size + '码」纸尿裤库存', icon: 'none' });
      return { dropped: 0, remain: 0 };
    }
    const cur = Number(items[idx].count) || 0;
    const drop = Math.min(used, cur);
    const remain = Math.max(0, cur - drop);
    items[idx] = Object.assign({}, items[idx], { count: remain });
    g.stockItems = items;
    return { dropped: drop, remain };
  },

  /* ----- 睡眠 ----- */
  toggleSleep() {
    const rec = this.data.record;
    if (rec.sleepRunning) {
      // 点击「醒了」→ 自动记录结束时间，保存（若为悬浮睡眠则关闭悬浮窗）
      if (this.sleepTimer) { clearInterval(this.sleepTimer); this.sleepTimer = null; }
      const end = this.nowTime();
      this.setData({ 'record.sleepRunning': false, 'record.sleepEnd': end });
      this.saveRecord();
      wx.showToast({ title: '已记录「醒了」', icon: 'none' });
    } else {
      // 点击「睡着了」→ 仅在弹窗内开始计时（记录开始时间），不建记录、不开悬浮
      const start = this.nowTime();
      const startTs = Date.now();
      this.setData({ 'record.sleepRunning': true, 'record.sleepStart': start, 'record.sleepStartTs': startTs, 'record.sleepEnd': '', 'record.sleepSeconds': 0, 'record.time': start });
      this.clearSleepTimer();
      this.sleepTimer = setInterval(() => {
        const secs = Math.max(0, Math.floor((Date.now() - startTs) / 1000));
        this.setData({ 'record.sleepSeconds': secs });
      }, 1000);
    }
  },

  clearSleepTimer() {
    if (this.sleepTimer) { clearInterval(this.sleepTimer); this.sleepTimer = null; }
  },

  /* ==================== 睡眠进行中：全局持续计时，时间轴实时刷新 ==================== */
  startSleepRunningSync() {
    this.clearSleepRunningSync();
    this.sleepRunningSyncTick();
    this.sleepRunningTimer = setInterval(() => this.sleepRunningSyncTick(), 1000);
  },
  clearSleepRunningSync() {
    if (this.sleepRunningTimer) { clearInterval(this.sleepRunningTimer); this.sleepRunningTimer = null; }
  },
  sleepRunningSyncTick() {
    const g = app.globalData;
    let any = false, dirty = false;
    g.records.forEach((r, i) => {
      if (r && r.type === '睡眠' && r.sleepRunning && r.sleepStart) {
        any = true;
        const secs = Math.max(0, Math.floor((Date.now() - this._sleepStartTs(r)) / 1000));
        if (r.sleepSeconds !== secs) { r.sleepSeconds = secs; dirty = true; }
        this.refreshSleepCard(i, secs);
      }
    });
    // 节流持久化：每 30 秒写一次存储，避免每秒高频写入
    const now = Date.now();
    if (dirty && (!this._lastSleepPersist || now - this._lastSleepPersist > 30000)) {
      this._lastSleepPersist = now;
      app.persist();
    }
    if (!any) this.clearSleepRunningSync();
  },
  /* 更新时间轴中某条睡眠卡片的「时长」 */
  refreshSleepCard(idx, secs) {
    const tl = this.data.timeline || [];
    const ci = tl.findIndex(c => c.recIdx === idx);
    if (ci < 0) return;
    const card = tl[ci];
    const metrics = (card.metrics || []).map(m => {
      const isDur = m.key ? m.key === 'dur' : m.label === '时长';
      const isWake = m.key ? m.key === 'wake' : m.label === '醒来';
      if (isDur) return Object.assign({}, m, { value: this.minutes(secs) });
      if (isWake && card.sleepRunning) return Object.assign({}, m, { value: (this._tlEn() ? 'Timing ' : '计时中 ') + this.minutes(secs) });
      return m;
    });
    this.setData({ ['timeline[' + ci + '].metrics']: metrics });
  },

  /* ----- 体温 ----- */
  onTemperature(e) {
    let v = Number(e.detail.value);
    if (isNaN(v)) v = 36.5;
    v = Math.max(35, Math.min(41, v));
    this.setData({ 'record.temperature': v, tempSliderVal: v });
  },

  /* 体温数字点击进入手动输入 */
  onTempNumTap() {
    this.setData({ tempEditing: true });
  },
  onTempBlur() {
    this.setData({ tempEditing: false });
  },

  /* 体温滑动选择（35~41℃，步进 0.1） */
  onTempSlider(e) {
    const v = Number(e.detail.value);
    this.setData({ 'record.temperature': v, tempSliderVal: v });
  },

  /* ----- 喝水 / 辅食 ----- */
  onWater(e) {
    this.setData({ 'record.water': Number(e.detail.value), waterEditing: false });
  },

  /* 喝水量：点击数字进入手动输入 */
  onWaterNumTap() {
    this.setData({ waterEditing: true });
  },
  onWaterBlur() {
    this.setData({ waterEditing: false });
  },

  /* 喝水量：手动输入（0~330） */
  onWaterInput(e) {
    let v = Number(e.detail.value);
    if (isNaN(v)) v = 0;
    if (v < 0) v = 0;
    if (v > 330) v = 330;
    this.setData({ 'record.water': v });
  },

  /* ----- 辅食（设计稿：名称多选下拉 + 重量输入 + 单位下拉） ----- */
  openFoodPicker() {
    this.setData({ showFoodPicker: true });
  },
  closeFoodPicker() {
    this.setData({ showFoodPicker: false });
  },
  onFoodWeightInput(e) {
    this.setData({ 'record.foodWeight': Number(e.detail.value) || 0 });
  },
  onFoodUnitChange(e) {
    const idx = Number(e.detail.value);
    this.setData({ 'record.foodUnit': this.data.foodUnits[idx] || 'g', foodUnitIdx: idx });
  },
  syncFoodUnitIdx() {
    const u = this.data.record.foodUnit || 'g';
    this.setData({ foodUnitIdx: Math.max(0, this.data.foodUnits.indexOf(u)) });
  },

  /* 手动添加辅食类型 */
  onFoodNewInput(e) {
    this.setData({ foodNewName: e.detail.value });
  },
  addFoodCustom() {
    const name = (this.data.foodNewName || '').trim();
    if (!name) {
      wx.showToast({ title: '请输入辅食名称', icon: 'none' });
      return;
    }
    const opts = this.data.foodOptions.slice();
    if (opts.indexOf(name) >= 0) {
      wx.showToast({ title: '该辅食已存在', icon: 'none' });
      return;
    }
    opts.push(name);
    const list = this.data.record.selectedFoods.slice();
    if (list.indexOf(name) < 0) list.push(name);
    this.setData({
      foodOptions: opts,
      foodNewName: '',
      'record.selectedFoods': list,
      'record.selectedFoodsText': list.join('+ ')
    }, () => this.updateFoodAllergy());
    wx.showToast({ title: '已添加「' + name + '」', icon: 'success' });
  },

  toggleFood(e) {
    const name = e.currentTarget.dataset.name;
    const list = this.data.record.selectedFoods.slice();
    const i = list.indexOf(name);
    if (i >= 0) list.splice(i, 1); else list.push(name);
    this.setData({ 'record.selectedFoods': list, 'record.selectedFoodsText': list.join('+ ') }, () => this.updateFoodAllergy());
  },

  /* 辅食列表持久化 */
  loadFoodOptions() {
    try {
      const s = wx.getStorageSync('panda_food_list');
      if (Array.isArray(s) && s.length) return s.slice();
    } catch (e) {}
    return ['高铁米粉', '米糊', '粥', '面条', '土豆泥', '南瓜泥', '胡萝卜泥', '西兰花泥', '牛肉', '鸡肉', '鱼肉', '蛋黄', '苹果泥', '香蕉泥', '猪肝泥'];
  },
  saveFoodOptions(list) {
    try { wx.setStorageSync('panda_food_list', list.slice()); } catch (e) {}
  },

  /* 长按删除辅食选项 */
  removeFoodOption(e) {
    const name = e.currentTarget.dataset.name;
    wx.showModal({
      title: '移除辅食',
      content: '确定移除「' + name + '」吗？移除后不再出现在可选列表中。',
      confirmText: '移除',
      confirmColor: '#C14C2E',
      success: (res) => {
        if (!res.confirm) return;
        const opts = this.data.foodOptions.filter(x => x !== name);
        const sel = (this.data.record.selectedFoods || []).filter(x => x !== name);
        this.setData({
          foodOptions: opts,
          'record.selectedFoods': sel,
          'record.selectedFoodsText': sel.join('+ ')
        });
        this.saveFoodOptions(opts);
        wx.showToast({ title: '已移除「' + name + '」', icon: 'none' });
      }
    });
  },

  /* 根据已选食材动态计算待判断过敏的食材（历史已判断过的不再出现） */
  updateFoodAllergy() {
    const fm = app.globalData.foodAllergyMap || {};
    const sel = this.data.record.selectedFoods || [];
    const pending = sel.filter(f => fm[f] === undefined);
    const fa = this.data.record.foodAllergy || {};
    const na = {};
    Object.keys(fa).forEach(k => { if (sel.indexOf(k) >= 0) na[k] = fa[k]; });
    this.setData({ 'record.pendingAllergyFoods': pending, 'record.foodAllergy': na });
  },

  /* 记录某食材是否过敏（选择即持久化，之后不再询问该食材） */
  setFoodAllergy(e) {
    const food = e.currentTarget.dataset.food;
    const val = e.currentTarget.dataset.val === '1';
    this.setData({ ['record.foodAllergy.' + food]: val }, () => {
      const fm = Object.assign({}, (app.globalData.foodAllergyMap || {}));
      fm[food] = val;
      app.globalData.foodAllergyMap = fm;
      app.persist();
      this.updateFoodAllergy();
    });
  },

  setFoodUnit(e) {
    this.setData({ 'record.foodUnit': e.currentTarget.dataset.unit });
  },

  onFoodWeight(e) {
    this.setData({ 'record.foodWeight': Number(e.detail.value) || 0 });
  },

  toggleAllergy() {
    this.setData({ 'record.allergy': !this.data.record.allergy });
  },

  openAllergyGuide() {
    const records = app.globalData.records || [];
    const foodRecs = records.filter(r => r.type === '辅食');
    const allergyFoods = [], safeFoods = [];
    let allergyCount = 0, safeCount = 0;
    foodRecs.forEach(r => {
      const names = r.foodNames || [];
      if (r.allergy) {
        allergyCount++;
        names.forEach(f => { if (f && allergyFoods.indexOf(f) < 0) allergyFoods.push(f); });
      } else if (r.allergy === false) {
        safeCount++;
        names.forEach(f => { if (f && safeFoods.indexOf(f) < 0) safeFoods.push(f); });
      }
    });
    this.setData({
      allergyStats: { allergyCount, allergyFoods, safeCount, safeFoods },
      showAllergyGuide: true
    });
  },

  closeAllergyGuide() {
    this.setData({ showAllergyGuide: false });
  },

  onSimpleAmount(e) {
    this.setData({ 'record.simpleAmount': Number(e.detail.value) });
  },

  /* ==================== 保存记录（新增 / 编辑） ==================== */

  saveRecord() {
    if (!this.guardBaby()) return;
    if (!perm.canEdit('records', app.globalData.currentBabyId)) {
      wx.showToast({ title: '当前账号仅有查看权限，无法记录', icon: 'none' });
      return;
    }
    const rec = this.data.record;
    if (rec.type === '营养品' && rec.selectedSupps.length === 0) {
      wx.showToast({ title: '请至少选择一种营养品', icon: 'none' });
      return;
    }
    if (rec.type === '睡眠' && !rec.sleepStart) {
      wx.showToast({ title: '请先点击「睡着了」记录开始时间', icon: 'none' });
      return;
    }

    const g = app.globalData;
    const isEdit = rec.editIndex >= 0;
    const me = wx.getStorageSync('panda_user') || {};
    const myBy = (me.logged && me.openid) ? { openid: me.openid, name: (me.relation || '').trim() || me.nickname || '我', avatar: me.avatar || '' } : null;
    const recBase = isEdit
      ? Object.assign({}, g.records[rec.editIndex] || {})
      : Object.assign({ id: 'rec_' + Date.now() + '_' + Math.floor(Math.random() * 10000), type: rec.type, time: rec.time || this.nowTime(), date: rec.recordDate || this.selDateStr() }, myBy ? { by: myBy } : {});
    recBase.type = rec.type;
    recBase.recordDate = rec.recordDate || recBase.date;
    if (rec.time) recBase.time = rec.time;
    if (rec.type === '营养品') {
      recBase.supps = rec.selectedSupps.slice();
      recBase.suppTime = rec.suppTime || '';
      recBase.suppRemindFreq = rec.suppRemindFreq || '';
      recBase.suppRemindTime = rec.suppRemindTime || '';
      if (rec.suppTime) recBase.time = rec.suppTime; // 时间轴以服用时间为准
    }
    if (rec.type === '母乳') {
      recBase.nursingL = rec.nursingL;
      recBase.nursingR = rec.nursingR;
      recBase.total = rec.nursingL + rec.nursingR;
      recBase.nursingStart = rec.nursingStart || '';
      recBase.nursingEnd = rec.nursingEnd || '';
      recBase.nursingLastSide = rec.nursingLastSide || '';
      if (rec.nursingStart) recBase.time = rec.nursingStart; // 主时间=开始计时时间
    }
    if (rec.type === '配方奶') {
      recBase.amount = rec.amount;
      recBase.milkOpen = !!rec.milkOpen;
      recBase.milkWarn = !!rec.milkWarn;
      recBase.milkType = rec.milkType || '配方奶';
      recBase.bottleStart = rec.bottleStart || '';
      recBase.bottleEnd = rec.bottleEnd || '';
      if (rec.bottleStart) recBase.time = rec.bottleStart; // 主时间=开始时间
      this.syncMilkWarn(recBase);
    }
    if (rec.type === '吸奶') {
      recBase.pumpLeftAmt = rec.pumpLeftAmt;
      recBase.pumpRightAmt = rec.pumpRightAmt;
      recBase.pumpTotal = rec.pumpLeftAmt + rec.pumpRightAmt;
      recBase.storage = rec.storage || 'fridge';
      recBase.pumpStart = rec.pumpStart || '';
      recBase.pumpEnd = rec.pumpEnd || '';
      recBase.pumpLastSide = rec.pumpLastSide || '';
      if (rec.pumpStart) recBase.time = rec.pumpStart; // 主时间=开始计时时间
    }
    if (rec.type === '换尿布') {
      recBase.diaperChoice = rec.diaperChoice;
      recBase.peeColor = rec.peeColor;
      recBase.stoolColor = rec.stoolColor;
      recBase.stoolTexture = rec.stoolTexture;
      recBase.diaperSize = rec.diaperSize || '';
      recBase.diaperAmount = rec.diaperAmount || 0;
    }
    if (rec.type === '喝水') recBase.water = rec.water;
    if (rec.type === '体温') {
      // 未调整度数时默认记录 36.5℃
      recBase.temperature = rec.temperature || '36.5';
    }
    if (rec.type === '洗澡') {
      recBase.bathStart = rec.bathStart || '';
      recBase.bathEnd = rec.bathEnd || '';
      recBase.bathSeconds = (rec.bathStart && rec.bathEnd) ? this.calcDuration(rec.bathStart, rec.bathEnd) : (rec.bathSeconds || 0);
    }
    if (rec.type === '辅食') {
      recBase.simpleAmount = rec.simpleAmount;
      recBase.foodNames = rec.selectedFoods.slice();
      recBase.foodWeight = rec.foodWeight;
      recBase.foodUnit = rec.foodUnit || 'g';
      // 合并本次过敏判断到宝宝级记录；allergy 取决于本次吃的食材是否已知过敏
      const fm = Object.assign({}, (app.globalData.foodAllergyMap || {}));
      const fa = rec.foodAllergy || {};
      let anyAllergy = false;
      (rec.selectedFoods || []).forEach(f => {
        if (fa[f] !== undefined) fm[f] = !!fa[f];
        if (fm[f] === true) anyAllergy = true;
      });
      app.globalData.foodAllergyMap = fm;
      recBase.allergy = anyAllergy;
    }
    if (rec.type === '睡眠') {
      recBase.sleepStart = rec.sleepStart;
      recBase.sleepStartTs = rec.sleepStartTs || this._sleepStartTs(rec);
      recBase.sleepEnd = rec.sleepEnd || ''; // 未醒则留空
      recBase.sleepRunning = !!rec.sleepRunning;
      recBase.sleepSeconds = rec.sleepRunning ? (rec.sleepSeconds || 0) : this.calcDuration(rec.sleepStart, rec.sleepEnd);
      if (rec.sleepStart) recBase.time = rec.sleepStart; // 主时间=开始计时时间
    }

    // 记录级版本时间戳（云端增量同步用：修改后 _u 变新，覆盖云端旧版本）
    recBase._u = Date.now();
    // 记录发生时刻（绝对 epoch）+ 记录时区偏移（分钟，东为正）：
    // 跨国家庭按绝对时间算「多久前」，并按记录者时区判断「今天」，避免另一方看到 0 条或差 12 小时
    try {
      const _dp = String(recBase.date || '').split('-').map(Number);
      const _tp = String(recBase.time || '').split(':').map(Number);
      recBase.tz = -new Date().getTimezoneOffset();
      if (_dp[0] && _dp[1] && _dp[2]) {
        const _d = new Date(_dp[0], _dp[1] - 1, _dp[2], _tp[0] || 0, _tp[1] || 0, _tp[2] || 0);
        const _t = _d.getTime();
        if (isFinite(_t)) recBase.ts = _t;
      }
    } catch (e) {}

    const patch = { 'record.visible': false };
    let formulaCanLeft = null; // 本次开罐后剩余奶粉罐数（用于保存提示）
    if (isEdit) {
      // 编辑：更新该条记录（不重复消耗库存）
      g.records[rec.editIndex] = recBase;
    } else {
      // 新增：联动消耗库存
      if (rec.type === '配方奶') {
        g.supplies.milkFeeds = Math.max(0, (g.supplies.milkFeeds || 0) - 1);
        // 勾选「已开罐」→ 奶粉库存自动 -1 罐
        if (recBase.milkOpen) {
          const after = this.deductFormulaCan();
          if (after) formulaCanLeft = after.count;
        }
      }
      if (rec.type === '换尿布') {
        const used = Math.min(rec.diaperAmount, rec.diaperStock);
        const res = this.deductDiaper(rec.diaperSize, used);
        g.diaperStock = Math.max(0, (rec.diaperStock || 0) - used);
        patch['record.diaperStock'] = res.remain;
        patch['record.diaperSize'] = rec.diaperSize;
      }
      g.records.push(recBase);
    }

    app.persist();
    // 立即触发云端推送，不等防抖
    try { require('../../utils/cloud-data.js').pushAll(true); } catch (e) { console.log('[saveRecord pushAll err]', e); }
    this.clearTimers();
    // 保存后日历定位到用户选择的记录日期
    const recDate = rec.recordDate || this.data.today;
    const [y, m, d] = recDate.split('-').map(Number);
    patch.anchorDate = recDate;
    // 切换日历到对应月份
    patch.calYear = y;
    patch.calMonth = m - 1;
    patch.calTitle = this.calTitleOf(y, m);
    // 手动构造以选中日期为中心的5天日期条（补全红点字段）
    const weeks = ['日', '一', '二', '三', '四', '五', '六'];
    const target = new Date(y, m - 1, d);
    const today = new Date();
    // 重新构建有记录的日期map，确保刚保存的记录红点正确显示
    const recordDates = {};
    (app.globalData.records || []).forEach(r => {
      if (r && r.date) recordDates[r.date] = true;
    });
    const mRemind = this.buildRemindMaps();
    const dates = [];
    for (let i = -2; i <= 2; i++) {
      const cur = new Date(target.getFullYear(), target.getMonth(), target.getDate() + i);
      const ymd = cur.getFullYear() + '-' + String(cur.getMonth() + 1).padStart(2,'0') + '-' + String(cur.getDate()).padStart(2,'0');
      dates.push({
        week: weeks[cur.getDay()],
        num: cur.getDate(),
        year: cur.getFullYear(),
        month: cur.getMonth(),
        day: cur.getDate(),
        ymd,
        today: this.isSameDay(cur, today),
        hasRecord: !!recordDates[ymd],
        hasVaccine: !!(mRemind.dueMap[ymd] || mRemind.shelfMap[ymd] || mRemind.warrMap[ymd] || mRemind.milkMap[ymd]),
        hasSupp: !!(mRemind.suppMap[ymd] || mRemind.d3Map[ymd])
      });
    }
    patch.dates = dates;
    patch.selectedDate = 2;
    patch.monthDays = this.buildMonthDays(target);
    // 快速记录模式（点+进入）：保存完成后退出米色空白页，回到「我的」记录页
    if (this.data.quickMode) patch.quickMode = false;
    // 更新内部选中日期变量，和applySelection里保持一致
    this._selDate = new Date(y, m - 1, d);
    this.setData(patch, () => {
      this.buildTimeline();
      // 强制重建折叠日历+展开日历红点，确保所有记录类型保存后红点正确显示
      this.rebuildAround(this._selDate);
    });
    this.syncTabBar();
    if (rec.type === '睡眠' && rec.sleepRunning) this.startSleepRunningSync();
    if (rec.type === '换尿布') {
      wx.showToast({ title: (isEdit ? '已更新' : '已保存') + '，' + (rec.diaperSize || '') + '码剩 ' + (isEdit ? (rec.diaperStock || 0) : patch['record.diaperStock']) + ' 片', icon: 'none' });
    } else if (rec.type === '配方奶' && recBase.milkOpen && !isEdit) {
      const en = wx.getStorageSync('lang') === 'en';
      let tip;
      if (formulaCanLeft !== null) {
        tip = en ? 'Saved · opened, ' + formulaCanLeft + ' can(s) left' : '已保存 · 已开罐，奶粉库存剩 ' + formulaCanLeft + ' 罐';
      } else if (recBase.milkWarn && recBase.milkWarnDate) {
        const p = recBase.milkWarnDate.split('-');
        const dd = (Number(p[1]) || 0) + (en ? '/' : '月') + (Number(p[2]) || 0) + (en ? '' : '日');
        tip = en ? 'Saved · opened (no stock to deduct), use by ' + dd : '已保存 · 已开罐（库存无奶粉未扣减），' + dd + '前用完';
      } else {
        tip = en ? 'Saved · formula can opened' : '已保存 · 已开罐';
      }
      wx.showToast({ title: tip, icon: 'none', duration: 2800 });
    } else {
      wx.showToast({ title: (isEdit ? '已更新' : '已保存') + rec.type + '记录', icon: 'none' });
    }

    // 体温超正常值（>37.5℃）→ 联动 SOS 发烧降温指导
    if (!isEdit && rec.type === '体温' && Number(rec.temperature) > 37.5) {
      const deg = Number(rec.temperature).toFixed(1);
      const level = Number(rec.temperature) >= 39 ? '高烧' : '低烧';
      const that = this;
      wx.showModal({
        title: '宝宝体温偏高（' + level + '）',
        content: '本次体温 ' + deg + '℃，已超过正常范围（≤37.5℃）。建议学习 SOS「发烧降温处理」指导，掌握安全降温与用药方法。',
        confirmText: '去学习降温',
        cancelText: '稍后再说',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/subchart/pages/firstaid/prepare/prepare?skill=baby_fever' });
          }
        }
      });
    }
  },

  /* 编辑已有记录：按 recIdx 预填记录弹窗 */
  openRecordEdit(e) {
    const idx = Number(e.currentTarget.dataset.idx);
    const rec = app.globalData.records[idx];
    if (!rec) return;
    const icons = { 母乳: '🍼', 配方奶: '🥛', 瓶喂母乳: '🥛', 吸奶: '🫗', 营养品: '💊', 睡眠: '🌙', 辅食: '🥄', 喝水: '💧', 换尿布: '🧷', 体温: '🌡️', 洗澡: '🛁' };
    const iconsImg = { 母乳: '/images/icons/rec-nursing.png', 配方奶: '/images/icons/rec-bottle.png', 瓶喂母乳: '/images/icons/rec-bottle.png', 吸奶: '/images/icons/rec-pump.png', 营养品: '/images/icons/rec-supplement.png', 睡眠: '/images/icons/rec-sleep.png', 辅食: '/images/icons/rec-food.png', 喝水: '/images/icons/rec-water.png', 换尿布: '/images/icons/rec-diaper.png' };
    const lang = wx.getStorageSync('lang') || 'zh';
    const typeMap = lang === 'en' ? {
      '母乳': 'Breastfeeding',
      '配方奶': 'Bottle Feeding',
      '瓶喂母乳': 'Bottle Feeding',
      '吸奶': 'Pumping',
      '营养品': 'Supplements',
      '换尿布': 'Diaper Change',
      '睡眠': 'Sleep',
      '辅食': 'Solid Food',
      '喝水': 'Water',
      '体温': 'Temperature',
      '洗澡': 'Bath Time'
    } : {};
    const hints = lang === 'en' ? {
      '母乳': 'Tap left/right to start/pause timer',
      '配方奶': 'Fill in details and save',
      '瓶喂母乳': 'Fill in details and save',
      '吸奶': 'Enter left/right pumped amount, or time separately',
      '营养品': 'Select multiple supplements',
      '换尿布': 'Select wet/dirty status and save',
      '睡眠': 'Timer or manual start/end, auto-calc duration',
      '辅食': 'Enter food portion and save',
      '喝水': 'Slide to set water amount',
      '体温': 'Record baby temperature (°C)',
      '洗澡': 'Record bath time and duration'
    } : {
      母乳: '轻点左右一侧开始或暂停计时',
      配方奶: '补充完成后，保存本次记录',
      瓶喂母乳: '补充完成后，保存本次记录',
      吸奶: '分别填写左右吸奶量，也可单独计时',
      营养品: '可同时选择多种营养品',
      换尿布: '选择尿便情况后保存记录',
      睡眠: '可计时或手动填写起止时间，自动统计时长',
      辅食: '填写辅食份量后保存',
      喝水: '滑动选择本次喝水量',
      体温: '记录宝宝体温（℃）',
      洗澡: '记录洗澡时间与时长'
    };
    const displayType = typeMap[type] || type;
    const titleMap = lang === 'en' ? {
      '母乳': 'Record Breastfeeding',
      '配方奶': 'Record Bottle Feeding',
      '瓶喂母乳': 'Record Expressed Milk',
      '吸奶': 'Record Pumping',
      '营养品': 'Record Supplements',
      '睡眠': 'Record Sleep',
      '辅食': 'Record Solid Food',
      '喝水': 'Record Water',
      '换尿布': 'Record Diaper Change',
      '体温': 'Record Temperature',
      '洗澡': 'Record Bath Time'
    } : {
      '母乳': '记录母乳',
      '配方奶': '记录配方奶',
      '瓶喂母乳': '记录瓶喂母乳',
      '吸奶': '记录吸奶',
      '营养品': '记录营养品',
      '睡眠': '记录睡眠',
      '辅食': '记录辅食',
      '喝水': '记录喝水',
      '换尿布': '记录换尿布',
      '体温': '记录体温',
      '洗澡': '记录洗澡'
    };
    const recordTitle = titleMap[type] || ('记录' + type);
    this.clearTimers();
    this.setData({
      record: {
        ...this.data.record,
        visible: true,
        editIndex: idx,
        time: rec.time || '',
        type: rec.type,
        icon: icons[rec.type] || '🍼',
        iconImg: iconsImg[rec.type] || '',
        hint: hints[rec.type] || '',
        nursingL: rec.nursingL || 0, nursingR: rec.nursingR || 0, nursingActive: '',
        nursingStart: rec.nursingStart || '', nursingEnd: rec.nursingEnd || '', nursingLastSide: rec.nursingLastSide || '',
        pumpL: 0, pumpR: 0, pumpLeftAmt: rec.pumpLeftAmt || 0, pumpRightAmt: rec.pumpRightAmt || 0, pumpActive: '',
        pumpStart: rec.pumpStart || '', pumpEnd: rec.pumpEnd || '', pumpLastSide: rec.pumpLastSide || '',
        storage: rec.storage || 'fridge',
        milkOpen: rec.milkOpen || false,
        milkWarn: rec.milkWarn || false,
        milkType: rec.milkType || '配方奶',
        bottleStart: rec.bottleStart || '', bottleEnd: rec.bottleEnd || '',
        selectedSupps: (rec.supps || []).slice(),
        suppTime: rec.suppTime || '', suppRemindFreq: rec.suppRemindFreq || '', suppRemindTime: rec.suppRemindTime || '',
        diaperAmount: 1,
        diaperChoice: rec.diaperChoice || '嘘嘘',
        diaperSize: rec.diaperSize || this.defaultDiaperSize(),
        diaperStock: this.diaperStockBySize(rec.diaperSize || this.defaultDiaperSize()),
        peeColor: rec.peeColor || '黄色',
        stoolColor: rec.stoolColor || '棕色',
        stoolTexture: rec.stoolTexture || '软便',
        sleepSeconds: rec.sleepSeconds || 0, sleepRunning: !!rec.sleepRunning,
        sleepStart: rec.sleepStart || '', sleepStartTs: rec.sleepStartTs || 0, sleepEnd: rec.sleepEnd || '',
        water: rec.water || 60,
        simpleAmount: rec.simpleAmount || 1,
        temperature: rec.temperature || '',
        bathStart: rec.bathStart || '', bathEnd: rec.bathEnd || '', bathSeconds: rec.bathSeconds || 0,
        selectedFoods: (rec.foodNames || []).slice(),
        selectedFoodsText: (rec.foodNames || []).join('+ '),
        foodWeight: rec.foodWeight || 0,
        foodUnit: rec.foodUnit || 'g',
        foodUnitIdx: Math.max(0, this.data.foodUnits.indexOf(rec.foodUnit || 'g')),
        allergy: !!rec.allergy,
        foodAllergy: {},
        pendingAllergyFoods: []
      }
    });
    if (rec.type === '辅食') this.updateFoodAllergy();
    // 睡眠进行中：弹窗内继续计时并同步时间轴
    if (rec.type === '睡眠' && rec.sleepRunning) {
      this.clearSleepTimer();
      this.sleepTimer = setInterval(() => {
        const cur = Math.max(0, Math.floor((Date.now() - this._sleepStartTs(this.data.record)) / 1000));
        this.setData({ 'record.sleepSeconds': cur });
        const g = app.globalData;
        const ei = this.data.record.editIndex;
        if (ei >= 0 && g.records[ei]) {
          g.records[ei].sleepSeconds = cur;
          this.refreshSleepCard(ei, cur);
        }
      }, 1000);
    }
  },

  /* 删除当前正在编辑的记录 */
  deleteRecord() {
    if (!perm.canEdit('records', app.globalData.currentBabyId)) {
      wx.showToast({ title: '当前账号仅有查看权限，无法删除', icon: 'none' });
      return;
    }
    const idx = this.data.record.editIndex;
    if (idx < 0 || !app.globalData.records[idx]) {
      wx.showToast({ title: '记录不存在', icon: 'none' });
      return;
    }
    const rec = app.globalData.records[idx];
    const typeName = rec.type || '该条';
    wx.showModal({
      title: '删除记录',
      content: '确定删除这条「' + typeName + '」记录吗？',
      confirmColor: '#e25b4a',
      success: (res) => {
        if (!res.confirm) return;
        const cid = rec._cid;
        // editIndex本身就是全局records数组的下标，直接splice删除
        app.globalData.records.splice(idx, 1);
        // 同步从当前宝宝的本地分key存储里删掉这条记录，避免下次同步又从storage读回来
        const babyId = app.globalData.currentBabyId;
        if (babyId) {
          try {
            const babyKey = 'panda_feeding_baby_' + babyId;
            const babyData = wx.getStorageSync(babyKey) || {};
            if (Array.isArray(babyData.records)) {
              babyData.records = babyData.records.filter(r => r !== rec);
              wx.setStorageSync(babyKey, babyData);
            }
          } catch (e) {}
        }
        app.persist();
        if (cid) app.tombCloud('records', cid);
        try { require('../../utils/cloud-data.js').pushAll(true); } catch (e) {}
        this.clearTimers();
        this.setData({ 'record.visible': false });
        this.buildTimeline();
        this.rebuildAround(this._selDate);
        this.syncTabBar();
        wx.showToast({ title: '已删除', icon: 'none' });
      }
    });
  },

  /* ==================== 语音记录（微信同声传译插件识别） ==================== */
  /* 本地录音管理器（个人主体可用，无需插件） */
  initRecorder() {
    if (this.recorder) return this.recorder;
    this.recorder = wx.getRecorderManager();
    this.recorder.onStop((res) => {
      this.setData({ 'voiceState.recording': false });
      this.stopVoiceTimer();
      if (!res || !res.tempFilePath) return;
      // 上传云存储并调用云函数识别
      this.recognizeVoice(res.tempFilePath);
    });
    this.recorder.onError(() => {
      this.setData({ 'voiceState.recording': false });
      this.stopVoiceTimer();
      wx.showToast({ title: '录音失败，请检查麦克风权限', icon: 'none' });
    });
    return this.recorder;
  },

  openVoice() {
    this.setData({
      showVoice: true,
      voiceState: {
        recording: false, recognizing: false, seconds: 0, result: '',
        fallback: !(wx.cloud && wx.cloud.uploadFile), authDenied: false
      }
    });
    this.syncTabBar();
  },

  closeVoice() {
    if (this.data.voiceState.recording && this.recorder) this.recorder.stop();
    this.stopVoiceTimer();
    this.setData({ showVoice: false });
    this.syncTabBar();
  },

  startVoiceTimer() {
    if (this.voiceTimer) clearInterval(this.voiceTimer);
    this.voiceTimer = setInterval(() => {
      this.setData({ 'voiceState.seconds': this.data.voiceState.seconds + 1 });
    }, 1000);
  },

  stopVoiceTimer() {
    if (this.voiceTimer) { clearInterval(this.voiceTimer); this.voiceTimer = null; }
  },

  /* 开始录音：先弹授权页，授权成功后才开始录音识别进程 */
  startVoiceRecord() {
    const st = this.data.voiceState;
    if (st.recording || st.recognizing) return;
    const that = this;
    wx.authorize({
      scope: 'scope.record',
      success() { that.doVoiceRecord(); },
      fail() {
        that.setData({ 'voiceState.authDenied': true });
        wx.showToast({ title: '未授权麦克风，无法录音', icon: 'none' });
      }
    });
  },

  /* 授权通过后真正开始录音 */
  doVoiceRecord() {
    const st = this.data.voiceState;
    if (st.recording) return;
    this.setData({
      'voiceState.result': '', 'voiceState.recognizing': false, 'voiceState.seconds': 0,
      'voiceState.fallback': false, 'voiceState.authDenied': false
    });
    this.initRecorder().start({
      duration: 60000,
      format: 'mp3',          // mp3 全平台（iOS/Android/模拟器）稳定输出；wav 仅 Android 支持，iOS/模拟器会录出无法解码的文件
      sampleRate: 16000,
      encodeBitRate: 48000,
      numberOfChannels: 1
    });
    this.setData({ 'voiceState.recording': true, showVoice: true });
    this.startVoiceTimer();
  },

  /* 停止录音（松开即可完成） */
  stopVoiceRecord() {
    if (this.data.voiceState.recording && this.recorder) this.recorder.stop();
  },

  /* 按住说话：开始 */
  voiceHoldStart() {
    this.startVoiceRecord();
  },

  /* 按住说话：松开完成 */
  voiceHoldEnd() {
    this.stopVoiceRecord();
  },

  /* 语音录入按钮：按下启动长按判定（未满 400ms 松开 = 点击，不录音；按住才录、松开即停） */
  voiceTouchStart() {
    if (this._voicePressTimer) clearTimeout(this._voicePressTimer);
    this._voiceHolding = true;
    this._voiceHoldAt = 0;
    this._voicePressTimer = setTimeout(() => {
      this._voicePressTimer = null;
      // 长按达成：记录按住起点，走权限判定后开始录音
      this._voiceHoldAt = Date.now();
      this.quickVoiceHoldStart();
    }, 400);
  },
  voiceTouchEnd() {
    this._voiceHolding = false;
    if (this._voicePressTimer) {
      clearTimeout(this._voicePressTimer);
      this._voicePressTimer = null;
      // 点击（未满长按时长）：不录音
      return;
    }
    this.stopVoiceRecord();
  },

  /* 授权被拒：跳转设置开启麦克风 */
  openVoiceSetting() {
    wx.openSetting({
      success: (res) => {
        if (res.authSetting['scope.record']) this.startVoiceRecord();
        else wx.showToast({ title: '未开启麦克风权限', icon: 'none' });
      }
    });
  },

  /* 识别成功：智能解析并自动保存，跳转我的页喂养记录处 */
  autoSaveVoice() {
    const text = (this.data.voiceState.result || '').trim();
    if (!text) {
      wx.showToast({ title: '识别失败，请重试', icon: 'none' });
      this.setData({ 'voiceState.recognizing': false, 'voiceState.result': '', showVoice: false });
      this.syncTabBar();
      return;
    }
    const parsed = this.parseVoiceText(text);
    if (!parsed.type) {
      wx.showToast({ title: '识别失败，请重新录入', icon: 'none' });
      this.setData({ 'voiceState.recognizing': false, 'voiceState.result': '', showVoice: false });
      this.syncTabBar();
      return;
    }
    this.stopVoiceTimer();
    // 打开记录弹窗预填并直接保存（自动记录）
    this.openRecord(parsed.type, parsed.prefill);
    this.setData({ 'voiceState.recognizing': false, 'voiceState.result': '', showVoice: false });
    this.saveRecord();
    this.setData({ 'record.visible': false, showQuick: false, quickMode: false });
    this.syncTabBar();
    wx.showToast({ title: '已识别并保存「' + parsed.type + '」', icon: 'success' });
    this.loadRecords();
  },

  /* 点击兜底：开始 / 结束 */
  toggleVoiceRecord() {
    const st = this.data.voiceState;
    if (st.recording || st.recognizing) {
      this.stopVoiceRecord();
      return;
    }
    this.startVoiceRecord();
  },

  /* 上传录音到云存储，并调用云函数 voiceAsr 进行语音识别 */
  recognizeVoice(tempFilePath) {
    const cloud = wx.cloud;
    if (!cloud || !cloud.uploadFile) {
      this.setData({ 'voiceState.fallback': true });
      wx.showToast({ title: '未开通云开发，请手动输入内容', icon: 'none' });
      return;
    }
    this.setData({ 'voiceState.recognizing': true });
    const cloudPath = 'voice/' + Date.now() + '.mp3';
    cloud.uploadFile({
      cloudPath,
      filePath: tempFilePath,
      success: (up) => {
        if (!up || !up.fileID) {
          this.setData({ 'voiceState.recognizing': false, 'voiceState.fallback': true, showVoice: false });
          this.syncTabBar();
          wx.showToast({ title: '上传失败，请重试', icon: 'none' });
          return;
        }
        wx.cloud.callFunction({
          name: 'voiceAsr',
          data: { fileID: up.fileID },
          success: (r) => {
            this.setData({ 'voiceState.recognizing': false });
            const res = (r && r.result) || {};
            if (res.code === 0 && res.text) {
              this.setData({ 'voiceState.result': res.text });
              this.autoSaveVoice();
            } else if (res.code === -3) {
              this.setData({ 'voiceState.fallback': true, showVoice: false });
              this.syncTabBar();
              wx.showToast({ title: '语音识别未配置密钥，请查看README-后端部署.md第七节', icon: 'none', duration: 3000 });
            } else {
              this.setData({ 'voiceState.fallback': true, showVoice: false });
              this.syncTabBar();
              wx.showToast({ title: '识别失败，请重说或手动记录', icon: 'none' });
            }
          },
          fail: () => {
            this.setData({ 'voiceState.recognizing': false, 'voiceState.fallback': true, showVoice: false });
            this.syncTabBar();
            wx.showToast({ title: '识别失败，请重说或手动记录', icon: 'none' });
            wx.showToast({ title: '云函数调用失败，请确认已部署 voiceAsr', icon: 'none' });
          }
        });
      },
      fail: () => {
        this.setData({ 'voiceState.recognizing': false, 'voiceState.fallback': true, showVoice: false });
        this.syncTabBar();
        wx.showToast({ title: '录音上传失败，请重试', icon: 'none' });
      }
    });
  },

  onVoiceResult(e) {
    this.setData({ 'voiceState.result': e.detail.value });
  },

  saveVoice() {
    const text = (this.data.voiceState.result || '').trim();
    if (!text) {
      wx.showToast({ title: '请先说出或输入内容', icon: 'none' });
      return;
    }
    const now = this.nowTime();
    const g = app.globalData;
    const me2 = wx.getStorageSync('panda_user') || {};
    const by2 = (me2.logged && me2.openid) ? { openid: me2.openid, name: me2.nickname || '我', avatar: me2.avatar || '' } : null;
    const _vDate = this.selDateStr();
    const _vd = String(_vDate).split('-').map(Number);
    const _vt = String(now).split(':').map(Number);
    const _vNow = new Date();
    const _vTs = new Date(_vd[0], (_vd[1] || 1) - 1, _vd[2] || 1, _vt[0] || 0, _vt[1] || 0).getTime();
    g.records.push(Object.assign({ type: '语音记录', time: now, date: _vDate, ts: isFinite(_vTs) ? _vTs : Date.now(), tz: -_vNow.getTimezoneOffset(), note: text }, by2 ? { by: by2 } : {}));
    app.persist();
    this.stopVoiceTimer();
    this.buildTimeline();
    this.setData({ showVoice: false });
    this.syncTabBar();
    wx.showToast({ title: '语音记录已保存', icon: 'none' });
  },

  /* ==================== 语音识别结果智能解析 ==================== */
  parseVoiceText(text) {
    const t = (text || '').replace(/\s+/g, '');
    const p = { type: null, prefill: {} };
    const mins = (t.match(/(\d+)\s*(?:分钟|分)/) || [])[1];
    const ml = (t.match(/(\d+)\s*(?:ml|毫升)/i) || [])[1];
    const gram = (t.match(/(\d+)\s*(?:g|克)/i) || [])[1];
    const fen = (t.match(/(\d+)\s*份/) || [])[1];
    const left = (t.match(/左[^\d]*(\d+)/) || [])[1];
    const right = (t.match(/右[^\d]*(\d+)/) || [])[1];

    const rules = [
      {
        key: '母乳',
        re: /母乳|亲喂|喂奶/,
        fill() {
          if (left || right) {
            if (left) p.prefill.nursingL = Number(left);
            if (right) p.prefill.nursingR = Number(right);
          } else if (mins) {
            const l = Math.round(Number(mins) / 2);
            p.prefill.nursingL = l;
            p.prefill.nursingR = Number(mins) - l;
          }
        }
      },
      {
        key: '配方奶',
        re: /配方|奶粉|瓶喂/,
        fill() { if (ml) p.prefill.amount = Math.min(240, Number(ml)); }
      },
      {
        key: '吸奶',
        re: /吸奶|泵奶|吸乳|左边吸|右边吸|左吸|右吸/,
        fill() { if (left) p.prefill.pumpLeftAmt = Number(left); if (right) p.prefill.pumpRightAmt = Number(right); }
      },
      {
        key: '换尿布',
        re: /尿布|臭臭|嘘嘘|大便|小便|拉屎/,
        fill() {
          const hasPoop = /臭臭|大便|拉屎/.test(t);
          const hasPee = /嘘嘘|小便/.test(t);
          if (hasPoop && hasPee) p.prefill.diaperChoice = '嘘嘘+臭臭';
          else if (hasPoop) p.prefill.diaperChoice = '臭臭';
          else if (hasPee) p.prefill.diaperChoice = '嘘嘘';
        }
      },
      {
        key: '喝水',
        re: /喝水|喂水|饮水/,
        fill() { if (ml) p.prefill.water = Math.min(300, Number(ml)); }
      },
      {
        key: '营养品',
        re: /营养品|维生素|AD|DHA|钙片|鱼油|益生菌|乳糖酶/,
        fill() {
          const all = ['AD', 'DHA', '钙片', '鱼油', '乳糖酶', '益生菌'];
          p.prefill.selectedSupps = all.filter(s => t.indexOf(s) >= 0);
        }
      },
      {
        key: '睡眠',
        re: /睡眠|睡觉|睡了|睡着|午睡/,
        fill() {
          if (mins) {
            const end = new Date();
            const start = new Date(end.getTime() - Number(mins) * 60000);
            const pad2 = n => ('0' + n).slice(-2);
            p.prefill.sleepStart = pad2(start.getHours()) + ':' + pad2(start.getMinutes());
            p.prefill.sleepEnd = pad2(end.getHours()) + ':' + pad2(end.getMinutes());
            p.prefill.sleepSeconds = Number(mins) * 60;
          }
        }
      },
      {
        key: '辅食',
        re: /辅食|米粉|吃饭|喂食/,
        fill() {
          if (gram) p.prefill.simpleAmount = Number(gram);
          else if (fen) p.prefill.simpleAmount = Number(fen);
        }
      },
      {
        key: '体温',
        re: /体温|温度|发烧/,
        fill() {
          // 支持「38.5度」「38度5」「体温38.5」等常见说法
          let deg = null;
          const m1 = t.match(/(\d+(?:\.\d+)?)\s*(?:℃|°)/);
          const m2 = t.match(/(\d+)\s*度\s*(\d)?/);
          const m3 = t.match(/(\d+(?:\.\d+)?)/);
          if (m1) deg = Number(m1[1]);
          else if (m2) deg = m2[2] ? Number(m2[1]) + Number(m2[2]) / 10 : Number(m2[1]);
          else if (m3) deg = Number(m3[1]);
          if (deg && deg >= 30 && deg <= 45) p.prefill.temperature = Number(deg).toFixed(1);
        }
      },
      {
        key: '洗澡',
        re: /洗澡|洗浴|沐浴|泡澡/,
        fill() {
          if (mins) {
            const end = new Date();
            const start = new Date(end.getTime() - Number(mins) * 60000);
            const pad2 = n => ('0' + n).slice(-2);
            p.prefill.bathStart = pad2(start.getHours()) + ':' + pad2(start.getMinutes());
            p.prefill.bathEnd = pad2(end.getHours()) + ':' + pad2(end.getMinutes());
            p.prefill.bathSeconds = Number(mins) * 60;
          }
        }
      }
    ];

    for (let i = 0; i < rules.length; i++) {
      if (rules[i].re.test(t)) {
        p.type = rules[i].key;
        rules[i].fill();
        break;
      }
    }
    return p;
  },

  smartRecord() {
    const text = (this.data.voiceState.result || '').trim();
    if (!text) {
      wx.showToast({ title: '请先说出或输入内容', icon: 'none' });
      return;
    }
    const parsed = this.parseVoiceText(text);
    if (!parsed.type) {
      wx.showModal({
        title: '未能识别记录类型',
        content: '请尝试包含类型词，例如：母乳 15 分钟 / 喝了 120 毫升配方奶 / 换尿布 嘘嘘 / 宝宝睡了 40 分钟',
        showCancel: false,
        confirmText: '知道了'
      });
      return;
    }
    this.stopVoiceTimer();
    this.setData({ showVoice: false });
    this.openRecord(parsed.type, parsed.prefill);
    wx.showToast({ title: '已识别为「' + parsed.type + '」，已预填', icon: 'none' });
  },

  /* ==================== 宝宝切换 ==================== */
  refreshBabyView() {
    try {
      // 只在 globalData 空时才从 storage 读（避免用旧数据覆盖云端同步的新数据）
      if (!app.globalData.babies || !app.globalData.babies.length) {
        const d = wx.getStorageSync('panda_feeding_data');
        if (d && Array.isArray(d.babies)) {
          app.globalData.babies = d.babies;
          if (d.currentBabyId) app.globalData.currentBabyId = d.currentBabyId;
          const cur = d.babies.find(b => b.id === d.currentBabyId);
          if (cur) app.globalData.baby = cur;
        }
      }
    } catch (e) {}
    const baby = app.globalData.baby || {};
    // 下一次提醒：从所有提醒待办中取最临近的一项（维生素D / 营养品补充 / 疫苗应种）
    const g = app.globalData;
    const now = new Date();
    const cands = [];
    // ① 补充维生素D：下一次 10:30（已过则明天）
    const vd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 30, 0);
    if (now > vd) vd.setDate(vd.getDate() + 1);
    cands.push({ label: '补充维生素D', time: '10:30', minutes: Math.round((vd - now) / 60000) });
    // ② 营养品补充提醒：最近一次应补充日（记录日期 + 频率，推进到 >= 今天）
    const FREQ_DAYS = { '每日': 1, '每2天': 2, '每3天': 3, '每周': 7, '每两周': 14 };
    const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    (g.records || []).forEach(r => {
      if (r.type !== '营养品' || !r.suppRemindFreq || !FREQ_DAYS[r.suppRemindFreq]) return;
      const rd = new Date(r.date + 'T00:00:00');
      if (isNaN(rd.getTime())) return;
      const step = FREQ_DAYS[r.suppRemindFreq];
      const target = new Date(rd.getTime());
      while (target < today0) target.setDate(target.getDate() + step);
      const hm = String(r.suppRemindTime || '00:00').split(':');
      const at = new Date(target.getFullYear(), target.getMonth(), target.getDate(), Number(hm[0]) || 0, Number(hm[1]) || 0, 0);
      cands.push({
        label: '补充营养品：' + (r.supps || []).join('、'),
        time: (target.getMonth() + 1) + '/' + target.getDate() + (r.suppRemindTime ? ' ' + r.suppRemindTime : ''),
        minutes: Math.round((at - now) / 60000)
      });
    });
    // ③ 疫苗：最近待接种应种日（含已到期，按应种日期距现在最近）
    let nv = null;
    (g.vaccinePlan || []).forEach(v => {
      if (v.status === 'pending') {
        const e = v.doneDate || v.dueDate;
        if (!e) return;
        if (!nv || e < nv.dueDate) nv = { dueDate: e, name: (v.group || v.short || '疫苗') + (v.dose ? v.dose + '剂' : '') };
      }
    });
    if (nv) {
      const p = String(nv.dueDate).split('-');
      const due = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]), 0, 0, 0);
      cands.push({ label: nv.name + ' 应种', time: String(nv.dueDate).slice(5).replace('-', '/'), minutes: Math.round((due - now) / 60000) });
    }
    // ④ 纸尿裤库存不足：按尺码统计，同尺码总片数<30片时提醒
    const sizeStockMap = {};
    (g.stockItems || []).forEach(s => {
      const size = s.size || this.parseSize(s.name || '');
      if (!size || !/^(NB|S|M|L|XL|XXL|XXXL)$/i.test(size)) return;
      const upSize = size.toUpperCase();
      sizeStockMap[upSize] = (sizeStockMap[upSize] || 0) + (Number(s.count) || 0);
    });
    Object.keys(sizeStockMap).forEach(size => {
      const count = sizeStockMap[size];
      if (count > 0 && count < 30) {
        cands.push({
          label: size + '码纸尿裤库存不足（剩' + count + '片）',
          time: '立即补货',
          minutes: 0 // 立即提醒，排在最前面
        });
      }
    });
    cands.sort((a, b) => a.minutes - b.minutes);
    const top = cands[0];
    let nextReminder;
    if (top && top.minutes <= 30 * 24 * 60) {
      nextReminder = { hint: '下一次提醒', time: top.time, text: top.label };
    } else {
      nextReminder = { hint: '下一次提醒', time: '', text: '暂无待办提醒' };
    }
    // 宝宝列表：只要有真实宝宝（有 id 且有名字或生日）才显示黄色区域宝宝与切换按钮
    let babyList = (app.globalData.babies || []).filter(b => b && b.id && (b.name || b.birthday)).map(b => ({
      id: b.id,
      name: b.name || '未命名宝宝',
      avatar: b.avatar || '/images/brand-logo.png',
      birthday: b.birthday || '',
      ageText: this.calcAge(b.birthday) || ((this.data.lang === 'en') ? 'Birthday not set' : '待填写出生日期')
    }));
    // 宝宝头像已删除，统一使用默认 logo
    const avatarSrc = '/images/brand-logo.png';
    // 只传递需要的字段，避免 baby 对象包含循环引用
    const babyForData = baby ? {
      id: baby.id || '',
      name: baby.name || '',
      birthday: baby.birthday || '',
      gender: baby.gender || '',
      avatar: baby.avatar || '',
      relation: baby.relation || '',
      ownerOpenid: baby.ownerOpenid || '',
      babyNo: baby.babyNo || ''
    } : {};
    this.setData({
      baby: babyForData,
      babyAvatarSrc: avatarSrc,
      babyIsLogo: true,
      ageText: this.calcAge(baby.birthday),
      currentBabyId: app.globalData.currentBabyId,
      nextReminder,
      babyList
    });
    // 按真实记录重建时间轴（默认空，有记录才显示）
    this.buildTimeline();
  },

  onAvatarError(e) { console.log('[avatar error]', e.detail); },
  onAvatarLoad() { console.log('[avatar load ok] src=', this.data.babyAvatarSrc); },
  /* 黄色区域宝宝头像 → 编辑宝宝信息 */
  goBabyEditFromHome() {
    const id = app.globalData.currentBabyId;
    if (id) wx.navigateTo({ url: '/pages/baby-edit/baby-edit?id=' + id });
  },

  openBabySwitcher() {
    // 优先使用 globalData 中的最新数据（与我的宝贝页实时同步）
    // 只有当 globalData 中没有宝宝时，才从本地存储恢复
    if (!app.globalData.babies || !app.globalData.babies.length) {
      try {
        const d = wx.getStorageSync('panda_feeding_data');
        if (d && Array.isArray(d.babies)) app.globalData.babies = d.babies;
      } catch (e) {}
    }
    const myOpenid = (app.globalData.user && app.globalData.user.openid) || '';
    // 按创建时间从前到后排序（最早创建的排在前面）
    let babies = (app.globalData.babies || [])
      .filter(b => b && b.id);
    // 家庭状态判断：同时检查 globalData 和权限缓存，确保亲友端加入家庭后能正确显示共享宝宝
    let hasFamily = !!(app.globalData.myFamily && app.globalData.myFamily._id) ||
                    !!(app.globalData.myFamilies && app.globalData.myFamilies.length);
    if (!hasFamily) {
      try {
        const perm = require('../../utils/perm.js');
        const me = perm.getMyPerm();
        if (me && me.families && me.families.length) hasFamily = true;
      } catch (e) {}
    }
    const hasPending = !!app.globalData.pendingJoin;
    if (!hasFamily || hasPending) {
      babies = babies.filter(b => !b.ownerOpenid || b.ownerOpenid === myOpenid);
    }
    // 兜底：如果过滤后列表为空，但当前 globalData.baby 有值，确保它出现在列表中
    // （防止共享宝宝因权限时序问题被过滤后，抽屉页空列表 + 黄色区域消失的循环 bug）
    if (!babies.length && app.globalData.baby && app.globalData.baby.id) {
      babies = [app.globalData.baby];
    }
    // 确保当前选中的宝宝一定在列表中
    const curId = app.globalData.currentBabyId;
    if (curId && !babies.find(b => b.id === curId) && app.globalData.baby && app.globalData.baby.id === curId) {
      babies = [app.globalData.baby, ...babies];
    }
    babies = babies
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
      .map(b => ({
        id: b.id,
        name: b.name || '未命名宝宝',
        avatar: b.avatar || '/images/brand-logo.png',
        birthday: b.birthday || '',
        ageText: this.calcAge(b.birthday) || ((this.data.lang === 'en') ? 'Birthday not set' : '待填写出生日期'),
        isShared: !!(b.ownerOpenid && b.ownerOpenid !== myOpenid)
      }));
    this.setData({
      babyList: babies,
      currentBabyId: curId,
      babySwitchVisible: true
    });
    this.syncTabBar();
  },

  closeBabySwitcher() {
    this.setData({ babySwitchVisible: false });
    this.syncTabBar();
  },

  selectBaby(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    if (id === app.globalData.currentBabyId) {
      this.closeBabySwitcher();
      return;
    }
    app.switchBaby(id);
    console.log('[selectBaby] 切换后 records=', (app.globalData.records||[]).length, 'currentBabyId=', app.globalData.currentBabyId);
    this.closeBabySwitcher();
    this._selDate = new Date();
    this.rebuildAround(new Date());
    this.refreshBabyView();
    const name = app.globalData.baby.name || '宝宝';
    wx.showToast({ title: '已切换到「' + name + '」', icon: 'none' });
  },

  goAddBaby() {
    wx.navigateTo({
      url: '/pages/baby-edit/baby-edit?add=1',
      fail: (err) => { wx.showToast({ title: '跳转失败：' + ((err && err.errMsg) || '未知错误'), icon: 'none' }); }
    });
  },

  /* ==================== 跳转统计 ==================== */
  goStats() {
    wx.navigateTo({ url: '/subchart/pages/stats/stats' });
  },

  goMine() {
    this.openSettings();
  },


  onService() {
    wx.showToast({ title: '客服将在工作时间为你服务', icon: 'none' });
  },

  /* ===== 账号状态（读取登录用户） ===== */
  loadAccount() {
    // 只传递需要的字段，避免 user 对象包含循环引用
    const u = app.getUser() || {};
    this.setData({
      user: {
        logged: !!u.logged,
        nickname: u.nickname || '',
        avatar: u.avatar || '',
        phone: u.phone || '',
        openid: u.openid || ''
      }
    });
  },

  /* ==================== 合并自我的页：账号/扫码/导出 ==================== */
  onAccountTap() {
    const u = this.data.user;
    if (u && u.logged) {
      // 已登录 → 进入设置页
      this.goSettings();
    } else {
      // 未登录 → 直接弹出登录页（不进设置页）
      this.openLogin();
    }
  },

  /* 登录成功后一次性申请定位和麦克风权限，后续使用时不再重复弹窗 */
  requestPermissionsOnce() {
    // 申请定位权限（用于天气、附近相关功能）
    wx.getLocation({
      type: 'gcj02',
      success: () => {},
      fail: () => {}
    });
    // 申请麦克风权限（用于语音记录功能）
    wx.authorize({
      scope: 'scope.record',
      success: () => {},
      fail: () => {}
    });
  },

  toggleAgree() {
    this.setData({ agreePolicy: !this.data.agreePolicy });
  },
  openPrivacy() {
    wx.showModal({
      title: '隐私政策',
      content: '熊宝喂养是面向母婴家庭的宝宝喂养与成长记录工具。\n1. 我们仅收集你主动录入的宝宝档案、喂养记录、库存提醒等必要信息，用于为你提供记录、提醒、统计功能；\n2. 位置信息仅用于获取当地天气，麦克风仅用于语音转文字录入喂养记录，保存到相册权限仅用于将导出的成长周报保存到你的手机，以上权限均需你主动授权，可随时在设置中撤回；\n3. 多人协作功能下，你邀请的家庭成员仅可见你主动共享的宝宝相关喂养数据，我们不会向任何第三方共享你的个人信息；\n4. 所有喂养数据加密存储于云端，用于多设备同步和多人协作，你可以随时导出或删除全部数据。',
      showCancel: false,
      confirmText: '我知道了'
    });
  },
  openTerms() {
    wx.showModal({
      title: '用户协议',
      content: '欢迎使用熊宝喂养。\n1. 本小程序为免费工具类应用，帮助你记录宝宝的喂养、睡眠、辅食、疫苗、库存等日常数据，提供提醒和统计功能；\n2. 你录入的所有数据归你本人所有，多人协作时你可自行设置家庭成员的查看和编辑权限；\n3. 本小程序提供的喂养提醒、库存提醒、疫苗提醒仅为工具提示，不构成任何医疗建议，宝宝如有健康问题请及时咨询专业医护人员；\n4. 请妥善保管你的微信账号，因个人原因泄露账号导致的数据问题由你自行承担。',
      showCancel: false,
      confirmText: '我知道了'
    });
  },

  openLogin() {
    this.setData({ loginVisible: true, loginTab: 'wechat' });
  },
  closeLogin() {
    this.setData({ loginVisible: false });
    this.clearCountdown();
  },


  /* 微信一键登录（含超时兜底：云函数长时间无响应时停止 loading 并明确提示） */
  wechatLogin() {
    // 防止重复点击
    if (this._logging) return;
    if (!this.data.agreePolicy) {
      wx.showToast({ title: '请先勾选同意隐私政策和用户协议', icon: 'none' });
      return;
    }
    this._logging = true;
    const self = this;
    wx.showLoading({ title: '登录中…', mask: true });
    let settled = false;
    const done = () => { if (!settled) { settled = true; wx.hideLoading(); } };
    const failTip = (msg) => { done(); wx.showToast({ title: msg, icon: 'none' }); };
    const login = () => {
      if (!wx.cloud || !wx.cloud.callFunction) {
        this._logging = false;
        failTip('请先开通云开发并部署 loginUser 云函数');
        return;
      }
      // 12 秒超时：云函数无响应时停止 loading，避免“点了没反应”一直转圈
      const timer = setTimeout(() => {
        if (!settled) { this._logging = false; failTip('登录超时，请检查云函数 loginUser 是否已部署'); }
      }, 12000);
      const finish = () => clearTimeout(timer);
      wx.cloud.callFunction({
        name: 'loginUser',
        success: (r) => {
          done();
          finish();
          const res = (r && r.result) || {};
          if (res.code === 0 && res.openid) {
            const existing = app.getUser() || {};
            const cloudNick = (res.nickname || '').trim();
            const cloudAvatar = res.avatar || '';
            // 新用户（首次注册）：暂存 openid，保持未登录，强制设置昵称头像
            if (res.isNew) {
              app.saveUser({ openid: res.openid, logged: false, nickname: '', avatar: '' });
              // 只传递需要的字段，避免 user 对象包含循环引用
              const u = app.getUser() || {};
              this.setData({
                user: {
                  logged: !!u.logged,
                  nickname: u.nickname || '',
                  avatar: u.avatar || '',
                  phone: u.phone || '',
                  openid: u.openid || ''
                },
                loginVisible: false
              });
              this.fetchWechatProfile();
              finish();
              return;
            }
            // 老用户：直接登录
            if (res.openid) {
              const user = app.saveUser({
                openid: res.openid, logged: true,
                nickname: cloudNick || existing.nickname || '',
                avatar: cloudAvatar || existing.avatar || ''
              });
              // 只传递需要的字段，避免 user 对象包含循环引用
              this.setData({
                user: {
                  logged: !!user.logged,
                  nickname: user.nickname || '',
                  avatar: user.avatar || '',
                  phone: user.phone || '',
                  openid: user.openid || ''
                }
              });
              wx.showLoading({ title: '登录中...', mask: true });
              const cs = require('../../utils/cloud-sync.js');
              // 先全量拉云端业务数据（记录/宝宝/足迹/库存/疫苗），再恢复家庭权限
              app.syncCloudAfterLogin().then(() => {
                return cs.getMyFamily().then(() => cs.pull()).catch(() => {});
              }).then(() => {
                wx.hideLoading();
                this.setData({ loginVisible: false });
                this.loadAccount();
                this.refreshBabyView();
                this.buildTimeline();
                wx.showToast({ title: '登录成功', icon: 'success' });
                if (!cloudNick || !cloudAvatar) {
                  this.setData({
                    profileVisible: true,
                    nickname: cloudNick || '',
                    avatarUrl: cloudAvatar || ''
                  });
                }
              }).catch((e) => {
                console.error('[登录] 同步失败', e);
                wx.hideLoading();
                this.setData({ loginVisible: false });
                this.buildTimeline();
                wx.showToast({ title: '登录成功', icon: 'success' });
              });
              // 无宝宝：引导添加宝宝
              if (!((app.globalData && app.globalData.babies) || []).length) {
                setTimeout(() => {
                  this.setData({
                    guide: { visible: true, title: '添加宝宝', desc: '添加宝宝后即可开始记录喂养点滴', primary: '去添加', mode: 'baby' }
                  });
                }, 600);
              }
            } else {
              // 真正的新账号：暂存 openid，保持未登录，强制进入资料设置
              app.saveUser({ openid: res.openid, logged: false, nickname: '', avatar: '' });
              this.setData({ loginVisible: false });
              this.fetchWechatProfile();
            }
          } else {
            wx.showToast({ title: res.msg || '登录失败', icon: 'none' });
          }
        },
        fail: () => {
          finish();
          failTip('云函数调用失败，请确认已部署 loginUser');
        }
      });
    };
    wx.login({
      success: () => login(),
      fail: () => login()
    });
  },

  /* 新账号：尝试使用微信昵称/头像自动注册；不使用则进入设置（含无响应兜底） */
  fetchWechatProfile() {
    const self = this;
    let settled = false;
    const show = (avatar, nick) => {
      if (settled) return;
      settled = true;
      self.setData({ profileVisible: true, avatarUrl: avatar || '', nickname: nick || '' });
    };
    if (!wx.getUserProfile) {
      show('', '');
      return;
    }
    // 3 秒无响应兜底：新版基础库 getUserProfile 可能静默不回调，超时直接进入资料设置
    const timer = setTimeout(() => show('', ''), 3000);
    wx.getUserProfile({
      desc: '用于完善宝宝喂养记录的个人资料',
      success: (res) => {
        clearTimeout(timer);
        const info = (res && res.userInfo) || {};
        show(info.avatarUrl || '', ((info.nickName || '').trim()) || '');
      },
      fail: () => {
        clearTimeout(timer);
        show('', '');
      }
    });
  },

  /* 把账号资料同步到云端 users（自动注册/更新，供亲友显示真实头像与账户名） */
  syncUserToCloud(nickname, avatar, phone) {
    if (!wx.cloud || !wx.cloud.callFunction) return;
    const u = app.getUser();
    if (!u || !u.openid) return;
    wx.cloud.callFunction({
      name: 'loginUser',
      data: { nickname: nickname || '', avatar: avatar || '', phone: phone || '' },
      complete: () => {}
    });
  },

  /* 手机号：获取验证码 */

  /* 手机号验证码登录 */

  startCountdown(sec) {
    this.clearCountdown();
    this._cd = setInterval(() => {
      if (this.data.countdown <= 1) {
        this.clearCountdown();
        this.setData({ countdown: 0 });
        return;
      }
      this.setData({ countdown: this.data.countdown - 1 });
    }, 1000);
    this.setData({ countdown: sec });
  },
  clearCountdown() {
    if (this._cd) { clearInterval(this._cd); this._cd = null; }
  },

  /* 头像选择（chooseAvatar 临时文件 → 不裁切，直接使用 → base64 保存） */
  onAvatarChoose(e) {
    const url = e.detail.avatarUrl;
    if (!url) return;
    const fs = wx.getFileSystemManager();
    fs.readFile({
      filePath: url,
      encoding: 'base64',
      success: (r) => {
        this.setData({ avatarUrl: 'data:image/jpeg;base64,' + r.data });
      },
      fail: () => {
        // 降级：直接用临时路径（仅当前会话有效）
        this.setData({ avatarUrl: url });
      }
    });
  },
  onNickInput(e) {
    this.setData({ nickname: e.detail.value });
  },

  /* 保存资料 */
  saveProfile() {
    // 必须设置用户名与头像才能登录成功
    if (!this.data.nickname.trim()) {
      wx.showToast({ title: '请输入用户名', icon: 'none' });
      return;
    }
    if (!this.data.avatarUrl) {
      wx.showToast({ title: '请选择头像', icon: 'none' });
      return;
    }
    const nickname = this.data.nickname.trim();
    const avatar = this.data.avatarUrl;
    const user = app.saveUser({
      nickname: nickname,
      avatar: avatar,
      logged: true
    });
    this.syncUserToCloud(nickname, avatar, '');
    this.setData({ user: user, profileVisible: false });
    wx.showToast({ title: '资料已保存', icon: 'success' });
    // 首次登录成功且无宝宝：自动跳转添加宝宝（完成引导闭环）
    if (!((app.globalData && app.globalData.babies) || []).length) {
      setTimeout(() => {
        wx.navigateTo({ url: '/pages/baby-edit/baby-edit?add=1' });
      }, 600);
    }
  },

  guidePrimary() {
    const mode = this.data.guide.mode;
    this.setData({ 'guide.visible': false });
    if (mode === 'baby') wx.navigateTo({ url: '/pages/baby-edit/baby-edit?add=1' });
  },

  guideSkip() {
    this.setData({ 'guide.visible': false });
  },
  closeProfile() {
    // 关闭设置资料抽屉时，如果还没主动设置资料（包括旧的默认昵称），自动生成新规则的默认头像和用户名，完成登录
    const u = app.getUser() || {};
    const isOldDefaultNick = u.nickname && u.nickname.startsWith('宝妈');
    if (u.openid && (!u.logged || !u.nickname || isOldDefaultNick)) {
      const now = new Date();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const hh = String(now.getHours()).padStart(2, '0');
      const mi = String(now.getMinutes()).padStart(2, '0');
      const defaultNick = '小熊宝' + mm + dd + hh + mi;
      const defaultAvatar = '/images/brand-logo.png';
      const user = app.saveUser({ nickname: defaultNick, avatar: defaultAvatar, logged: true });
      this.syncUserToCloud(defaultNick, defaultAvatar, '');
      this.setData({
        profileVisible: false,
        user: { logged: true, nickname: defaultNick, avatar: defaultAvatar, openid: u.openid, phone: '' }
      });
      wx.showToast({ title: '登录成功', icon: 'success' });
      this.requestPermissionsOnce();
      this.loadAccount();
      this.refreshBabyView();
      this.buildTimeline();
    } else {
      this.setData({ profileVisible: false });
    }
  },

  /* 退出登录 */
  logout() {
    wx.showModal({
      title: '退出登录',
      content: '退出后本地记录将清空，云端数据已保留，重新登录即可恢复',
      success: async (res) => {
        if (!res.confirm) return;
        // 退出前先把本地未推送数据冲刷上云端，避免重登后数据丢失
        try {
          const cloudData = require('../../utils/cloud-data.js');
          await cloudData.flushPush();
        } catch (e) {}
        app.clearAllLocalData();
        const user = app.saveUser({ logged: false, phone: '', openid: '', nickname: '', avatar: '' });
        this.setData({ user: user });
        this.buildTimeline();
        wx.showToast({ title: '已退出登录', icon: 'none' });
      }
    });
  },

  /* 登录后添加宝宝 */
  onSettingsMenu(e) {
    const action = e.currentTarget.dataset.action;
    if (action === 'baby') {
      wx.navigateTo({ url: '/pages/my-babies/my-babies' });
    } else if (action === 'collab') {
      wx.navigateTo({ url: '/subchart/pages/collaboration/collaboration' });
    } else if (action === 'export') {
      this.openExport();
    } else if (action === 'service') {
      wx.showToast({ title: '客服将在工作时间为你服务', icon: 'none' });
    } else if (action === 'share') {
      wx.showToast({ title: '已唤起分享', icon: 'none' });
    } else if (action === 'privacy') {
      wx.navigateTo({ url: '/subchart/pages/privacy/privacy' });
    } else {
      wx.showToast({ title: '功能开发中', icon: 'none' });
    }
  },

  /* ==================== 扫码加入家庭（点击直接扫描 · 10 秒超时失败弹窗 · 主账户审核制） ==================== */
  goSettings() {
    wx.navigateTo({ url: '/pages/settings/settings' });
  },

  scan() {
    // 点击后直接开始扫描
    this.startScan();
  },

  startScan() {
    const that = this;
    if (this._scanTimer) { clearTimeout(this._scanTimer); this._scanTimer = null; }
    this.setData({ scanState: 'scanning' });
    // 10 秒内未识别 → 弹出扫描失败弹窗
    this._scanTimer = setTimeout(() => {
      that.setData({ showScan: true, scanState: 'fail' });
    }, 10000);
    wx.scanCode({
      onlyFromCamera: true,
      success(res) {
        if (that._scanTimer) { clearTimeout(that._scanTimer); that._scanTimer = null; }
        const text = (res.result || '').trim();
        let code = '';
        const mc = text.match(/[?&]code=([^&]+)/);
        const mi = text.match(/[?&]invite=([^&]+)/);
        if (mc) code = decodeURIComponent(mc[1]);
        else if (mi) code = decodeURIComponent(mi[1]);
        else code = text;
        code = (code || '').trim().toUpperCase();
        if (!code) {
          that.setData({ showScan: true, scanState: 'fail' });
          return;
        }
        // 扫描成功 → 加入确认页
        that.setData({ showScan: true, scanState: 'confirm', scanCode: code, scanResult: '' });
      },
      fail(err) {
        if (that._scanTimer) { clearTimeout(that._scanTimer); that._scanTimer = null; }
        if (err && err.errMsg && err.errMsg.indexOf('cancel') >= 0) {
          // 用户主动取消，不弹失败窗
          that.setData({ showScan: false });
          return;
        }
        that.setData({ showScan: true, scanState: 'fail' });
      }
    });
  },

  // 失败弹窗：重新识别
  retryScan() {
    this.setData({ showScan: false });
    this.startScan();
  },

  closeScan() {
    if (this._scanTimer) { clearTimeout(this._scanTimer); this._scanTimer = null; }
    this.setData({ showScan: false });
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

  // 扫码成功 → 点击加入家庭（提交申请，主账户审核）
  confirmJoin() {
    const that = this;
    const code = this.data.scanCode || '';
    if (!code) return;
    // 先检查是否登录
    const user = wx.getStorageSync('panda_user') || {};
    if (!user.logged || !user.openid) {
      wx.showModal({
        title: '提示',
        content: '请先登录账号后再加入家庭',
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
    // 直接提交申请（确认提示已在弹窗中显示）
    this.doJoinSubmit(code);
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
        wx.showToast({ title: '你已在该家庭中', icon: 'none' });
      } else {
        that.setData({ scanState: 'done', scanResult: r.name || '家庭' });
      }
      // 刷新家庭权限缓存 + 拉取云端数据（多家庭并存：创建者也可加入亲友家庭）
      cs.getMyFamily();
      cs.pull();
    }).catch(e => {
      that.setData({ scanState: 'fail' });
      wx.showToast({ title: e.message || '加入失败，请确认邀请码', icon: 'none' });
    });
  },

  /* ==================== 数据导出 ==================== */
  openExport() {
    const g = app.globalData;
    // 默认日期范围：近 30 天 ～ 今天
    const pad = n => (n < 10 ? '0' + n : '' + n);
    const fmt = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    const today = new Date();
    const start = new Date(today.getTime() - 29 * 24 * 3600 * 1000);
    this.setData({
      exportVisible: true,
      exportStart: fmt(start),
      exportEnd: fmt(today),
      'exportItems[0].count': (g.records || []).length,
      'exportItems[1].count': (g.babies || []).length,
      'exportItems[2].count': this.costItems().length,
      'exportItems[3].count': Object.keys((g.foodAllergyMap) || {}).length
    });
  },

  onExportStart(e) {
    const v = e.detail.value;
    const s = this.data.exportStart;
    this.setData({ exportStart: v });
    if (this.data.exportEnd && v > this.data.exportEnd) this.setData({ exportEnd: v });
    return s;
  },
  onExportEnd(e) {
    const v = e.detail.value;
    this.setData({ exportEnd: v });
    if (this.data.exportStart && v < this.data.exportStart) this.setData({ exportStart: v });
    return v;
  },

  /* 判断记录日期是否在导出范围内（未设置范围则全部导出） */
  inExportRange(dateStr) {
    const s = this.data.exportStart;
    const e = this.data.exportEnd;
    if (s && dateStr < s) return false;
    if (e && dateStr > e) return false;
    return true;
  },

  /* 每日喂养小结统计（与喂养统计页口径一致） */
  dailyStats(date, recs) {
    let feeds = 0, milk = 0, bmilk = 0, pee = 0, poop = 0, sleepMin = 0;
    recs.forEach(r => {
      if (!r || r.date !== date) return;
      if (r.type === '母乳') feeds++;
      else if (r.type === '配方奶') { feeds++; milk += Number(r.amount) || 0; }
      else if (r.type === '瓶喂母乳') { feeds++; bmilk += Number(r.amount) || 0; }
      else if (r.type === '换尿布') {
        const c = r.diaperChoice || '';
        if (c.indexOf('嘘嘘') >= 0) pee++;
        if (c.indexOf('臭臭') >= 0) poop++;
      } else if (r.type === '睡眠') {
        sleepMin += Math.round((Number(r.sleepSeconds) || 0) / 60);
      }
    });
    return { feeds, milk, bmilk, pee, poop, sleepMin };
  },


  /* 喂养台成本统计：同品种（名称+规格）合并为一行，价格为购入总价合计，不受日期限制 */
  costSummary() {
    const items = this.costItems();
    const map = {};
    items.forEach(s => {
      const sizeText = (s.size && s.size !== '通用') ? (s.size + '码') : '';
      const key = (s.name || '未命名') + '|' + sizeText;
      if (!map[key]) map[key] = { name: s.name || '未命名', sizeText: sizeText, count: 0, unit: s.unit || '', price: 0 };
      map[key].count += Number(s.count) || 0;
      map[key].price += Number(s.price) || 0;
    });
    return Object.keys(map).map(k => map[k]);
  },

  /* 范围内全部有记录的日期（升序） */
  exportDates(recs) {
    const set = {};
    recs.forEach(r => { if (r && r.date) set[r.date] = 1; });
    return Object.keys(set).filter(d => this.inExportRange(d)).sort();
  },

  closeExport() {
    this.setData({ exportVisible: false });
  },

  toggleExportItem(e) {
    const key = e.currentTarget.dataset.key;
    const items = this.data.exportItems.map(i => i.key === key ? Object.assign({}, i, { checked: !i.checked }) : i);
    this.setData({ exportItems: items });
  },

  /* 喂养台成本统计：库存物品（含购入价格） */
  costItems() {
    const g = app.globalData;
    return (g.stockItems || []).filter(s => s && s.price);
  },

  costLine() {
    const items = this.costSummary();
    const lines = [];
    if (!items.length) {
      lines.push('【喂养台成本统计】暂无带购入价格的库存物品');
      lines.push('  提示：在首页「库存管理」录入物品时可填写购入价格');
      return lines;
    }
    lines.push('【喂养台成本统计】共 ' + items.length + ' 项（价格为购入总价，同品种已合并）');
    let total = 0;
    items.forEach(s => {
      total += s.price;
      lines.push('  · ' + s.name + (s.sizeText ? '（' + s.sizeText + '）' : '') + ' × ' + s.count + ' ' + (s.unit || '') + '  购入价 ¥' + (Math.round(s.price * 100) / 100));
    });
    lines.push('  合计：¥' + (Math.round(total * 100) / 100));
    return lines;
  },

  /* 构建导出内容（文本 + 每日统计表格混合结构） */
  buildExportContent() {
    const sel = this.data.exportItems.filter(i => i.checked);
    if (!sel.length) {
      wx.showToast({ title: '请至少选择一项数据', icon: 'none' });
      return null;
    }
    const g = app.globalData;
    const pad = n => (n < 10 ? '0' + n : '' + n);
    const now = new Date();
    const content = [];
    content.push({ kind: 'text', text: '导出时间：' + now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes()) });
    content.push({ kind: 'text', text: '当前宝宝：' + ((g.baby && g.baby.name) || '未命名') });
    if (this.data.exportStart || this.data.exportEnd) {
      content.push({ kind: 'text', text: '导出范围：' + (this.data.exportStart || '最早') + ' 至 ' + (this.data.exportEnd || '最新') });
    }
    content.push({ kind: 'blank' });

    if (sel.some(i => i.key === 'records')) {
      const recs = g.records || [];
      const dates = this.exportDates(recs);
      content.push({ kind: 'section', text: '【喂养记录 · 每日小结】共 ' + dates.length + ' 天' });
      if (dates.length) {
        content.push({
          kind: 'table',
          head: ['日期', '喂奶次数', '奶粉量(ml)', '母乳量(ml)', '小便', '大便', '睡眠(分钟)'],
          rows: dates.map(d => {
            const s = this.dailyStats(d, recs);
            return [d, s.feeds, s.milk, s.bmilk, s.pee, s.poop, s.sleepMin];
          })
        });
      } else {
        content.push({ kind: 'text', text: '（所选范围内暂无喂养记录）' });
      }
      content.push({ kind: 'blank' });
    }
    if (sel.some(i => i.key === 'babies')) {
      const babies = g.babies || [];
      content.push({ kind: 'section', text: '【宝宝成长档案】共 ' + babies.length + ' 位宝宝' });
      if (babies.length) {
        babies.forEach(b => {
          content.push({ kind: 'text', text: '  · ' + (b.name || '未命名') + (b.gender ? '（' + b.gender + '）' : '') });
          if (b.birthday) content.push({ kind: 'text', text: '    出生日期：' + b.birthday });
          if (b.relation) content.push({ kind: 'text', text: '    关系：' + b.relation });
          if (b.delivery) content.push({ kind: 'text', text: '    出生方式：' + b.delivery });
          if (b.blood) content.push({ kind: 'text', text: '    血型：' + b.blood });
          if (b.weight) content.push({ kind: 'text', text: '    出生体重：' + b.weight + 'kg' });
          if (b.height) content.push({ kind: 'text', text: '    出生身高：' + b.height + 'cm' });
        });
      } else {
        content.push({ kind: 'text', text: '（暂无宝宝档案）' });
      }
      content.push({ kind: 'blank' });
    }
    if (sel.some(i => i.key === 'cost')) {
      content.push({ kind: 'section', text: '【喂养台成本统计】' });
      this.costLine().forEach(l => content.push({ kind: 'text', text: l }));
      content.push({ kind: 'blank' });
    }
    if (sel.some(i => i.key === 'allergy')) {
      const recs = g.records || [];
      const af = [], sf = [];
      let ac = 0, sc = 0;
      recs.forEach(r => {
        if (!r || r.type !== '辅食') return;
        const names = r.foodNames || [];
        if (r.allergy) { ac++; names.forEach(f => { if (f && af.indexOf(f) < 0) af.push(f); }); }
        else if (r.allergy === false) { sc++; names.forEach(f => { if (f && sf.indexOf(f) < 0) sf.push(f); }); }
      });
      content.push({ kind: 'section', text: '【过敏统计手册】过敏 ' + ac + ' 次 / 不过敏 ' + sc + ' 次' });
      content.push({ kind: 'text', text: '已记录过敏食物：' + (af.length ? af.join('、') : '暂无') });
      content.push({ kind: 'text', text: '已记录不过敏食物：' + (sf.length ? sf.join('、') : '暂无') });
      content.push({ kind: 'blank' });
    }
    return content;
  },

  /* 喂养记录表格「详情」列 */
  recordDetail(r) {
    switch (r.type) {
      case '母乳': return '亲喂 左 ' + this.minutes(r.nursingL || 0) + ' / 右 ' + this.minutes(r.nursingR || 0) + ' / 共 ' + this.minutes(r.total || (r.nursingL || 0) + (r.nursingR || 0));
      case '配方奶': return (r.amount || 0) + 'ml';
      case '瓶喂母乳': return (r.amount || 0) + 'ml';
      case '吸奶': return '左 ' + (r.pumpLeftAmt || 0) + 'ml / 右 ' + (r.pumpRightAmt || 0) + 'ml / 共 ' + (r.pumpTotal || 0) + 'ml';
      case '换尿布': return (r.diaperChoice || '') + (r.diaperSize ? ' ' + r.diaperSize + '码' : '') + (r.peeColor ? ' 尿' + r.peeColor : '') + (r.stoolColor ? ' 便' + r.stoolColor : '');
      case '喝水': return (r.water || 0) + 'ml';
      case '睡眠': return (r.sleepStart || '') + ' 至 ' + (r.sleepEnd || '') + ' 共 ' + Math.round((r.sleepSeconds || 0) / 60) + ' 分钟';
      case '辅食': return (r.simpleAmount || 0) + 'g' + (r.food ? ' ' + r.food : '');
      case '营养品': return (r.supps || []).join('、') || '';
      case '语音记录': return r.note || '';
      default: return r.note || r.detail || '';
    }
  },

  /* 选择导出格式 */
  doExport() {
    if (!this.buildExportContent()) return;
    wx.showActionSheet({
      itemList: ['保存为图片（PNG）', '保存为 PDF 文档', '导出 Excel 表格'],
      success: (res) => {
        if (res.tapIndex === 0) this.exportImage();
        else if (res.tapIndex === 1) this.exportPdf();
        else this.exportExcel();
      }
    });
  },

  /* 导出 Excel 表格：优先走云函数 exportXlsx 生成 xlsx，未部署时回退本地 CSV */
  exportExcel() {
    const sel = this.data.exportItems.filter(i => i.checked);
    const g = app.globalData;
    const sheets = [];
    if (sel.some(i => i.key === 'records')) {
      const recs = g.records || [];
      const dates = this.exportDates(recs);
      sheets.push({
        name: '喂养记录-每日小结',
        head: ['日期', '喂奶次数', '奶粉量(ml)', '母乳量(ml)', '小便', '大便', '睡眠(分钟)'],
        rows: dates.map(d => {
          const s = this.dailyStats(d, recs);
          return [d, s.feeds, s.milk, s.bmilk, s.pee, s.poop, s.sleepMin];
        })
      });
    }
    if (sel.some(i => i.key === 'babies')) {
      sheets.push({
        name: '宝宝成长档案',
        head: ['宝宝', '性别', '出生日期', '关系', '出生方式', '血型', '出生体重(kg)', '出生身高(cm)'],
        rows: (g.babies || []).map(b => [b.name || '', b.gender || '', b.birthday || '', b.relation || '', b.delivery || '', b.blood || '', b.weight || '', b.height || ''])
      });
    }
    if (sel.some(i => i.key === 'cost')) {
      sheets.push({
        name: '喂养台成本统计',
        head: ['商品', '规格', '数量', '购入总价(¥)'],
        rows: this.costSummary().map(s => [s.name, s.sizeText, s.count + (s.unit || ''), s.price])
      });
    }
    if (sel.some(i => i.key === 'allergy')) {
      const af = [], sf = [];
      (g.records || []).forEach(r => {
        if (!r || r.type !== '辅食') return;
        const names = r.foodNames || [];
        if (r.allergy) names.forEach(f => { if (f && af.indexOf(f) < 0) af.push(f); });
        else if (r.allergy === false) names.forEach(f => { if (f && sf.indexOf(f) < 0) sf.push(f); });
      });
      sheets.push({
        name: '过敏统计手册',
        head: ['过敏食物', '不过敏食物'],
        rows: [[af.join('、') || '暂无', sf.join('、') || '暂无']]
      });
    }
    if (!sheets.length) {
      wx.showToast({ title: '没有可导出的数据', icon: 'none' });
      return;
    }
    if (!(wx.cloud && wx.cloud.callFunction)) {
      this.exportCsvLocal(sheets);
      return;
    }
    wx.showLoading({ title: '生成中...' });
    wx.cloud.callFunction({
      name: 'exportXlsx',
      data: { sheets },
      success: (r) => {
        wx.hideLoading();
        const res = (r && r.result) || {};
        if (res.code === 0 && res.url) {
          this.downloadAndOpen(res.url);
        } else {
          this.exportCsvLocal(sheets);
        }
      },
      fail: () => {
        wx.hideLoading();
        this.exportCsvLocal(sheets);
      }
    });
  },

  /* 云函数未部署时的回退：本地生成 CSV 文件（Excel 可直接打开） */
  exportCsvLocal(sheets) {
    const rows = [];
    sheets.forEach(sh => {
      rows.push(sh.name);
      rows.push((sh.head || []).join(','));
      (sh.rows || []).forEach(r => rows.push(r.map(cell => '"' + String(cell == null ? '' : cell).replace(/"/g, '""') + '"').join(',')));
      rows.push('');
    });
    const csv = '\ufeff' + rows.join('\r\n'); // BOM 保证中文不乱码
    const now = new Date();
    const pad = n => (n < 10 ? '0' + n : '' + n);
    const filePath = wx.env.USER_DATA_PATH + '/熊宝喂养导出_' + now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate()) + '_' + pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds()) + '.csv';
    wx.getFileSystemManager().writeFile({
      filePath,
      data: csv,
      encoding: 'utf8',
      success: () => {
        wx.showModal({
          title: 'Excel 已导出',
          content: '已生成表格文件（CSV 格式，可用 Excel/WPS 直接打开）：' + filePath + '\n如需转发或打开，请使用下方按钮。',
          confirmText: '转发文件',
          cancelText: '知道了',
          success: (res) => {
            if (res.confirm) wx.shareFileMessage({ filePath, fileName: '熊宝喂养导出.xlsx' });
          }
        });
      },
      fail: () => wx.showToast({ title: '导出失败，请重试', icon: 'none' })
    });
  },

  /* 下载云函数生成的 xlsx 并打开预览 */
  downloadAndOpen(url) {
    wx.downloadFile({
      url,
      success: (res) => {
        if (res.statusCode !== 200) {
          wx.showToast({ title: '下载失败，请重试', icon: 'none' });
          return;
        }
        wx.openDocument({
          filePath: res.tempFilePath,
          fileType: 'xlsx',
          showMenu: true,
          fail: () => wx.showToast({ title: '打开失败', icon: 'none' })
        });
      },
      fail: () => wx.showToast({ title: '下载失败，请重试', icon: 'none' })
    });
  },

  /* 预览：生成内容长图并弹窗展示 */
  previewExport() {
    const content = this.buildExportContent();
    if (!content) return;
    this.renderExportImage(content, (img) => {
      // 分两步关闭导出选项弹窗再打开预览，保证 dialog 计数下 tabBar 保持隐藏
      this.setData({ exportVisible: false });
      this.setData({ previewImg: img, exportPreviewVisible: true });
    });
  },

  closePreview() {
    this.setData({ exportPreviewVisible: false });
  },

  renderExportImage(content, cb) {
    if (this.data.exporting) return;
    this.setData({ exporting: true });
    wx.showLoading({ title: '正在生成…', mask: true });
    // 先异步获取小程序码（getMiniQr 云函数），拿到后加大底部预留高度
    this.fetchQr((qrImg) => {
      const headH = 210;
      const footH = qrImg ? 320 : 120;
      let H = headH + this.contentHeight(content) + footH;
      H = Math.min(H, 4000);
      this.setData({ exportCanvasH: H });
      // 表格块 → 自绘表格（drawTable），预留 tableImgs 通道
      const tables = [];
      content.forEach((it, i) => {
        if (it.kind === 'table' && (it.rows || []).length) tables.push({ i: i, it: it });
      });
      const renderAll = (tableImgs) => {
        setTimeout(() => {
          const ctx = wx.createCanvasContext('exportCanvas', this);
          this.drawExportCanvas(ctx, content, H, tableImgs, qrImg);
          ctx.draw(false, () => {
            wx.canvasToTempFilePath({
              canvasId: 'exportCanvas',
              fileType: 'png',
              success: (res) => {
                wx.hideLoading();
                this.setData({ exporting: false });
                cb && cb(res.tempFilePath);
              },
              fail: () => {
                wx.hideLoading();
                this.setData({ exporting: false });
                wx.showToast({ title: '生成失败，请重试', icon: 'none' });
              }
            }, this);
          });
        }, 300);
      };
      const loop = (idx, imgs) => {
        if (idx >= tables.length) { renderAll(imgs); return; }
        this.renderTableImg(tables[idx].it, (img) => {
          if (img) imgs[tables[idx].i] = img;
          loop(idx + 1, imgs);
        });
      };
      loop(0, {});
    });
  },

  /* 获取小程序码：调用 getMiniQr 云函数（未部署/失败时回退 null，不影响导出） */
  fetchQr(cb) {
    if (!(wx.cloud && wx.cloud.callFunction)) { cb && cb(null); return; }
    wx.cloud.callFunction({
      name: 'getMiniQr',
      data: { scene: 'export', page: 'pages/index/index' },
      success: (r) => {
        const res = (r && r.result) || {};
        if (res.code === 0 && res.base64) {
          const filePath = wx.env.USER_DATA_PATH + '/mini-qr-export.png';
          wx.getFileSystemManager().writeFile({
            filePath,
            data: res.base64,
            encoding: 'base64',
            success: () => cb && cb(filePath),
            fail: () => cb && cb(null)
          });
        } else {
          cb && cb(null);
        }
      },
      fail: () => cb && cb(null)
    });
  },

  /* 导出表格：直接走 drawExportCanvas 内的 drawTable 自绘（不依赖 ECharts） */
  renderTableImg(table, cb) {
    cb && cb(null);
  },

  /* ECharts 表格 option（固定列宽，表头冻结） */
  buildExportTableOption(table, cols, W, rowH, headH) {
    const head = table.head || [];
    const rows = table.rows || [];
    const dataHead = head.map((h) => [h, '_head']);
    const dataRows = [];
    rows.forEach((_, ri) => {
      head.forEach((h) => dataRows.push([h, String(ri)]));
    });
    return {
      backgroundColor: 'transparent',
      animation: false,
      grid: { left: 0, right: 0, top: headH, bottom: 0 },
      xAxis: { type: 'category', data: head, show: false, boundaryGap: true },
      yAxis: [
        { type: 'category', data: rows.map((_, i) => String(i)), show: false },
        { type: 'category', data: ['_head'], position: 'top', show: false }
      ],
      series: [
        { type: 'custom', yAxisIndex: 1, data: dataHead, renderItem: (params, api) => this.exportTableHeadItem(params, api, head, cols, headH) },
        { type: 'custom', yAxisIndex: 0, data: dataRows, renderItem: (params, api) => this.exportTableRowItem(params, api, rows, head, cols, rowH) }
      ]
    };
  },

  /* 表头单元格（固定列宽手动定位） */
  exportTableHeadItem(params, api, head, cols, headH) {
    const ci = params.dataIndex % head.length;
    const x = this.colOffset(cols, ci);
    const w = cols[ci];
    const children = [];
    if (ci === 0) {
      children.push({ type: 'rect', shape: { x: 0, y: 0, width: this.colOffset(cols, head.length), height: headH }, style: { fill: '#ffd95a' } });
    }
    children.push(this.exportTableText(x + w / 2, headH / 2, head[ci], { align: 'center', fill: '#29281f', font: 'bold 22px sans-serif' }));
    return { type: 'group', children: children };
  },

  /* 数据单元格（固定列宽手动定位，详情列可完整换行截断） */
  exportTableRowItem(params, api, rows, head, cols, rowH) {
    const di = params.dataIndex;
    const ci = di % head.length;
    const ri = Math.floor(di / head.length);
    const row = rows[ri];
    if (!row) return { type: 'group', children: [] };
    const x = this.colOffset(cols, ci);
    const w = cols[ci];
    const y0 = ri * rowH;
    const children = [];
    if (ci === 0) {
      children.push({ type: 'rect', shape: { x: 0, y: y0, width: this.colOffset(cols, head.length), height: rowH }, style: { fill: ri % 2 ? '#fbf6e8' : '#fffdf7', stroke: '#e3dcc4', lineWidth: 1 } });
    }
    const txt = String(row[ci] == null ? '' : row[ci]);
    const maxChars = Math.max(1, Math.floor((w - 14) / 20));
    const text = txt.length > maxChars ? txt.slice(0, maxChars - 1) + '…' : txt;
    children.push(this.exportTableText(x + 10, y0 + rowH / 2, text, { align: 'left', fill: '#29281f', fontSize: 20 }));
    return { type: 'group', children: children };
  },

  /* 列 x 偏移累加 */
  colOffset(cols, c) {
    let x = 0;
    for (let i = 0; i < c; i++) x += cols[i];
    return x;
  },

  /* ECharts custom text 元素 */
  exportTableText(x, y, text, opt) {
    const el = {
      type: 'text',
      style: {
        x: x, y: y, text: text,
        align: opt.align || 'center',
        verticalAlign: 'middle',
        fill: opt.fill || '#29281f',
        fontSize: opt.fontSize,
        font: opt.font
      }
    };
    return el;
  },

  /* 导出为图片：保存到相册 */
  exportImage() {
    const content = this.buildExportContent();
    if (!content) return;
    this.renderExportImage(content, (img) => {
      wx.saveImageToPhotosAlbum({
        filePath: img,
        success: () => {
          this.setData({ exportVisible: false });
          wx.showToast({ title: '已保存为图片', icon: 'none' });
        },
        fail: (err) => {
          if (err && err.errMsg && err.errMsg.indexOf('auth') >= 0) {
            wx.showModal({
              title: '需要相册权限',
              content: '请在设置中允许「保存到相册」，即可保存导出图片',
              confirmText: '去设置',
              success: (r) => { if (r.confirm) wx.openSetting(); }
            });
          } else {
            wx.showToast({ title: '保存失败，请重试', icon: 'none' });
          }
        }
      });
    });
  },

  /* 导出为 PDF */
  exportPdf() {
    const content = this.buildExportContent();
    if (!content) return;
    this.renderExportImage(content, (img) => {
      this.imageToPdf(img);
    });
  },

  imageToPdf(imgPath) {
    const ctx = wx.createCanvasContext('exportCanvas', this);
    // 读取预览图转 JPEG 尺寸信息
    wx.getImageInfo({
      src: imgPath,
      success: (info) => {
        const W = info.width;
        const H = info.height;
        // 用离屏 canvas 转 JPEG
        const jctx = wx.createCanvasContext('pdfCanvas', this);
        jctx.drawImage(imgPath, 0, 0, W, H);
        jctx.draw(false, () => {
          wx.canvasToTempFilePath({
            canvasId: 'pdfCanvas',
            fileType: 'jpg',
            quality: 0.9,
            success: (res) => {
              wx.getFileSystemManager().readFile({
                filePath: res.tempFilePath,
                success: (rd) => {
                  const pdf = this.buildPdf(rd.data, W, H);
                  const pad = n => (n < 10 ? '0' + n : '' + n);
                  const now = new Date();
                  const filePath = wx.env.USER_DATA_PATH + '/熊宝喂养导出_' + now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate()) + '_' + pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds()) + '.pdf';
                  wx.getFileSystemManager().writeFile({
                    filePath,
                    data: pdf,
                    success: () => {
                      this.setData({ exportVisible: false });
                      wx.openDocument({
                        filePath,
                        fileType: 'pdf',
                        showMenu: true,
                        success: () => wx.showToast({ title: '已生成 PDF 文件', icon: 'none' }),
                        fail: () => wx.showToast({ title: 'PDF 已生成，可打开查看', icon: 'none' })
                      });
                    },
                    fail: () => wx.showToast({ title: 'PDF 生成失败', icon: 'none' })
                  });
                },
                fail: () => wx.showToast({ title: '读取图片失败', icon: 'none' })
              });
            },
            fail: () => wx.showToast({ title: 'PDF 生成失败', icon: 'none' })
          }, this);
        });
      },
      fail: () => wx.showToast({ title: 'PDF 生成失败', icon: 'none' })
    });
  },

  /* 手写生成单页 PDF（内嵌 JPEG 图片） */
  buildPdf(jpegData, imgW, imgH) {
    const pageW = 595.28;
    const pageH = 841.89;
    const scale = Math.min(pageW / imgW, pageH / imgH);
    const drawW = (imgW * scale).toFixed(2);
    const drawH = (imgH * scale).toFixed(2);
    const content = 'q\n' + drawW + ' 0 0 ' + drawH + ' 0 0 cm\n/Im0 Do\nQ\n';
    const ascii = (s) => {
      const a = new Uint8Array(s.length);
      for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i) & 0xff;
      return a;
    };
    const obj3 = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + pageW + ' ' + pageH + '] /Resources << /XObject << /Im0 4 0 R >> /ProcSet [/PDF /ImageC] >> /Contents 5 0 R >>';
    const imgLen = jpegData.byteLength || jpegData.length;
    const contentLen = ascii(content).length;
    const obj4Body = '<< /Type /XObject /Subtype /Image /Width ' + imgW + ' /Height ' + imgH + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + imgLen + ' >>\nstream\n';
    const obj5Body = '<< /Length ' + contentLen + ' >>\nstream\n';
    const chunks = [];
    const offsets = [];
    const pushStr = (s) => { const b = ascii(s); chunks.push(b); return b.length; };
    const pushBytes = (b) => {
      const arr = b instanceof ArrayBuffer ? new Uint8Array(b) : b;
      chunks.push(arr);
      return arr.length;
    };

    let offset = 0;
    // header
    offset += pushStr('%PDF-1.4\n');
    const objOffsets = [0, 0, 0, 0, 0, 0];
    const emitObj = (num, body, isStream) => {
      objOffsets[num] = offset;
      offset += pushStr(num + ' 0 obj\n');
      offset += pushStr(body);
      if (isStream) {
        offset += pushBytes(jpegData);
        offset += pushStr('\nendstream\n');
      }
      offset += pushStr('endobj\n');
    };
    emitObj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    emitObj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    emitObj(3, obj3);
    emitObj(4, obj4Body, true);
    emitObj(5, obj5Body);
    offset += pushBytes(ascii(content));
    offset += pushStr('\nendstream\nendobj\n');

    // xref
    const xrefOffset = offset;
    let xref = 'xref\n0 6\n0000000000 65535 f \n';
    for (let i = 1; i <= 5; i++) {
      xref += ('0000000000' + objOffsets[i]).slice(-10) + ' 00000 n \n';
    }
    xref += 'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n' + xrefOffset + '\n%%EOF\n';
    offset += pushStr(xref);

    const total = new Uint8Array(offset);
    let p = 0;
    chunks.forEach(c => { total.set(c, p); p += c.length; });
    return total.buffer;
  },

  /* 绘制导出长图 */
  drawExportCanvas(ctx, content, H, tableImgs, qrImg) {
    const W = 750;
    const pad = 50;
    ctx.setFillStyle('#fffaf0');
    ctx.fillRect(0, 0, W, H);
    // 顶部品牌区：品牌 icon（不裁切）+ 熊宝喂养（黑灰大字）
    ctx.setFillStyle('#ffd95a');
    ctx.fillRect(0, 0, W, 160);
    ctx.setFillStyle('#29281f');
    ctx.setFontSize(44);
    ctx.setTextAlign('center');
    const brandTitle = '熊宝喂养';
    const logoSize = 60;
    const gap = 18;
    const titleW = brandTitle.length * 44;
    const totalW = logoSize + gap + titleW;
    const startX = (W - totalW) / 2;
    // 品牌 icon 白色圆角底
    const lpad = 8;
    const bx = startX - lpad;
    const by = 80 - logoSize + 8 - lpad;
    const bs = logoSize + lpad * 2;
    const r = 14;
    ctx.beginPath();
    ctx.moveTo(bx + r, by);
    ctx.arcTo(bx + bs, by, bx + bs, by + bs, r);
    ctx.arcTo(bx + bs, by + bs, bx, by + bs, r);
    ctx.arcTo(bx, by + bs, bx, by, r);
    ctx.arcTo(bx, by, bx + bs, by, r);
    ctx.closePath();
    ctx.setFillStyle('#ffffff');
    ctx.fill();
    try {
      ctx.drawImage('/images/brand-logo.png', startX, 80 - logoSize + 8, logoSize, logoSize);
    } catch (e) {}
    ctx.fillText(brandTitle, startX + logoSize + gap + titleW / 2, 84);
    ctx.setFillStyle('#765d18');
    ctx.setFontSize(24);
    // 内容
    let y = 210;
    const lineH = 40;
    for (let i = 0; i < content.length; i++) {
      if (y > H - 60) break;
      const it = content[i];
      if (it.kind === 'blank') { y += 16; continue; }
      if (it.kind === 'table') {
        const ti = tableImgs && tableImgs[i];
        const tableW = 650;
        const tableH = 46 + (it.rows || []).length * 46;
        if (ti) {
          try { ctx.drawImage(ti, pad, y, tableW, tableH); } catch (e) {}
          y += tableH;
        } else {
          y = this.drawTable(ctx, it, W, pad, y, H);
        }
        continue;
      }
      const isSection = it.kind === 'section';
      const isTitle = it.kind === 'title';
      ctx.setFillStyle(isSection ? '#b97b05' : '#29281f');
      ctx.setFontSize(isTitle ? 32 : isSection ? 26 : 22);
      ctx.setTextAlign('left');
      const maxW = W - pad * 2;
      const cw = isTitle ? 32 : isSection ? 26 : 22;
      const perLine = Math.floor(maxW / cw);
      const text = it.text || '';
      let cur = '';
      let n = 0;
      for (let c = 0; c < text.length; c++) {
        cur += text[c];
        n++;
        if (n >= perLine) {
          ctx.fillText(cur, pad, y);
          y += lineH;
          cur = '';
          n = 0;
          if (y > H - 60) break;
        }
      }
      if (cur) { ctx.fillText(cur, pad, y); y += lineH; }
    }
    // 底部（含小程序码）
    if (qrImg) {
      const qs = 170;
      const qx = W - pad - qs;
      const qy = H - 250;
      // 白色圆角底
      const bs2 = qs + 24;
      ctx.setFillStyle('#ffffff');
      ctx.beginPath();
      ctx.moveTo(qx - 12 + 16, qy - 12);
      ctx.arcTo(qx - 12 + bs2, qy - 12, qx - 12 + bs2, qy - 12 + bs2, 16);
      ctx.arcTo(qx - 12 + bs2, qy - 12 + bs2, qx - 12, qy - 12 + bs2, 16);
      ctx.arcTo(qx - 12, qy - 12 + bs2, qx - 12, qy - 12, 16);
      ctx.arcTo(qx - 12, qy - 12, qx - 12 + bs2, qy - 12, 16);
      ctx.closePath();
      ctx.fill();
      try { ctx.drawImage(qrImg, qx, qy, qs, qs); } catch (e) {}
      ctx.setFillStyle('#b9b2a0');
      ctx.setFontSize(20);
      ctx.setTextAlign('center');
      ctx.fillText('长按识别小程序码', qx + qs / 2, H - 30);
      ctx.fillText('由「熊宝喂养」小程序生成', (pad + qx - 20) / 2, H - 40);
    } else {
      ctx.setFillStyle('#b9b2a0');
      ctx.setFontSize(20);
      ctx.setTextAlign('center');
      ctx.fillText('由「熊宝喂养」小程序生成', W / 2, H - 40);
    }
  },

  /* 绘制表格块（表头 + 数据行 + 网格线） */
  drawTable(ctx, table, W, pad, yTop, H) {
    // 列宽按内容类型分配：日期/时间数字列、类型/详情中文列，详情列多行换行不截断
    const cols = [145, 85, 130, 200, 90];
    const headH = 46;
    const tableW = cols.reduce((a, b) => a + b, 0);
    let y = yTop;
    const wrapText = (txt, maxChars) => {
      const lines = [];
      let cur = '';
      for (let i = 0; i < txt.length; i++) {
        cur += txt[i];
        if (cur.length >= maxChars) { lines.push(cur); cur = ''; }
      }
      if (cur) lines.push(cur);
      return lines.length ? lines : [''];
    };
    // 表头
    ctx.setFillStyle('#ffd95a');
    ctx.fillRect(pad, y, tableW, headH);
    ctx.setFillStyle('#29281f');
    ctx.setFontSize(22);
    ctx.setTextAlign('left');
    let x = pad;
    for (let c = 0; c < table.head.length; c++) {
      ctx.fillText(table.head[c], x + 12, y + 31);
      x += cols[c];
    }
    y += headH;
    // 数据行（详情列多行，行高动态）
    ctx.setStrokeStyle('#e3dcc4');
    ctx.setLineWidth(1);
    for (let r = 0; r < table.rows.length; r++) {
      const row = table.rows[r] || [];
      const detail = String(row[3] == null ? '' : row[3]);
      const detailLines = wrapText(detail, Math.max(1, Math.floor((cols[3] - 18) / 20)));
      const rowH = Math.max(46, detailLines.length * 32);
      if (y + rowH > H - 60) break;
      ctx.setFillStyle(r % 2 === 0 ? '#fffdf7' : '#fbf6e8');
      ctx.fillRect(pad, y, tableW, rowH);
      ctx.setFontSize(20);
      x = pad;
      for (let c = 0; c < cols.length; c++) {
        if (c === 3) {
          ctx.setFillStyle('#29281f');
          detailLines.forEach((ln, li) => ctx.fillText(ln, x + 10, y + 24 + li * 32));
        } else {
          let txt = String(row[c] == null ? '' : row[c]);
          // 含中文按全角 20px，纯数字/时间按半角 12px 估算
          const cw = /[\u4e00-\u9fa5]/.test(txt) ? 20 : 12;
          const maxChars = Math.max(1, Math.floor((cols[c] - 18) / cw));
          if (txt.length > maxChars) txt = txt.slice(0, maxChars - 1) + '…';
          ctx.setFillStyle('#29281f');
          ctx.fillText(txt, x + 10, y + (rowH + 22) / 2);
        }
        x += cols[c];
      }
      // 横向网格线
      ctx.beginPath(); ctx.moveTo(pad, y + rowH); ctx.lineTo(pad + tableW, y + rowH); ctx.stroke();
      // 纵向网格线
      let vx = pad;
      for (let c = 0; c <= cols.length; c++) {
        ctx.beginPath(); ctx.moveTo(vx, yTop); ctx.lineTo(vx, y + rowH); ctx.stroke();
        vx += cols[c];
      }
      y += rowH;
    }
    return y;
  },

  /* 估算导出内容总高度 */
  contentHeight(content) {
    let h = 0;
    content.forEach(it => {
      if (it.kind === 'table') {
        // 与 drawTable 的列宽/换行逻辑保持一致：详情列 200，20px 字号
        const rows = it.rows || [];
        let th = 46;
        rows.forEach(row => {
          const detail = String((row && row[3]) == null ? '' : row[3]);
          const per = Math.max(1, Math.floor((200 - 18) / 20));
          const lines = Math.max(1, Math.ceil(detail.length / per));
          th += Math.max(46, lines * 32);
        });
        h += th;
      } else if (it.kind === 'blank') h += 16;
      else h += 40;
    });
    return h;
  },

  fmtRecord(r) {
    const t = (r.date ? r.date + ' ' : '') + (r.time || '');
    const ts = '[' + t + '] ';
    switch (r.type) {
      case '母乳': return ts + '亲喂：左 ' + this.minutes(r.nursingL || 0) + ' / 右 ' + this.minutes(r.nursingR || 0) + ' / 共 ' + this.minutes(r.total || (r.nursingL || 0) + (r.nursingR || 0));
      case '配方奶': return ts + '配方奶：' + (r.amount || 0) + 'ml';
      case '瓶喂母乳': return ts + '瓶喂母乳：' + (r.amount || 0) + 'ml';
      case '吸奶': return ts + '吸奶：左 ' + (r.pumpLeftAmt || 0) + 'ml / 右 ' + (r.pumpRightAmt || 0) + 'ml / 共 ' + (r.pumpTotal || 0) + 'ml';
      case '换尿布': return ts + '换尿布：' + (r.diaperChoice || '') + (r.peeColor ? '，尿液' + r.peeColor : '') + (r.stoolColor ? '，便便' + r.stoolColor + (r.stoolTexture ? '·' + r.stoolTexture : '') : '');
      case '喝水': return ts + '喝水：' + (r.water || 0) + 'ml';
      case '辅食': return ts + '辅食：' + (r.simpleAmount || '');
      case '睡眠': return ts + '睡眠：' + (r.sleepStart ? r.sleepStart : '') + ' 至 ' + (r.sleepEnd || '') + '，共 ' + Math.round((r.sleepSeconds || 0) / 60) + ' 分钟';
      case '营养品': return ts + '营养品：' + ((r.supps || []).join('、') || '');
      case '语音记录': return ts + '语音记录：' + (r.note || '');
      default: return ts + (r.type || '记录');
    }
  },



});
