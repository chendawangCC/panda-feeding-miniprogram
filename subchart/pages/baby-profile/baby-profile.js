const app = getApp();
const echarts = require('../../components/ec-canvas/echarts.js');
const { diffDays } = require('../../../utils/vaccine-data.js');

/* WHO 儿童生长标准参考曲线（0-24 月龄，每项为 [-2SD, 中位数, +2SD]）
   数据来源：WHO Child Growth Standards (z-scores, Birth to 2 years) */
const WHO_STD = {
  boy: {
    height: [
      [46.1, 49.9, 53.7], [50.8, 54.7, 58.6], [54.4, 58.4, 62.4], [57.3, 61.4, 65.5], [59.7, 63.9, 68.0],
      [61.7, 65.9, 70.1], [63.3, 67.6, 71.9], [64.8, 69.2, 73.5], [66.2, 70.6, 75.0], [67.5, 72.0, 76.5],
      [68.7, 73.3, 77.9], [69.9, 74.5, 79.2], [71.0, 75.7, 80.5], [72.1, 76.9, 81.8], [73.1, 78.0, 83.0],
      [74.1, 79.1, 84.2], [75.0, 80.2, 85.4], [76.0, 81.2, 86.5], [76.9, 82.3, 87.7], [77.7, 83.2, 88.8],
      [78.6, 84.2, 89.8], [79.4, 85.1, 90.9], [80.2, 86.0, 91.9], [81.0, 86.9, 92.9], [81.7, 87.8, 93.9]
    ],
    weight: [
      [2.5, 3.3, 4.4], [3.4, 4.5, 5.8], [4.3, 5.6, 7.1], [5.0, 6.4, 8.0], [5.6, 7.0, 8.7],
      [6.0, 7.5, 9.3], [6.4, 7.9, 9.8], [6.7, 8.3, 10.3], [6.9, 8.6, 10.7], [7.1, 8.9, 11.0],
      [7.4, 9.2, 11.4], [7.6, 9.4, 11.7], [7.7, 9.6, 12.0], [7.9, 9.9, 12.3], [8.1, 10.1, 12.6],
      [8.3, 10.3, 12.8], [8.4, 10.5, 13.1], [8.6, 10.7, 13.4], [8.8, 10.9, 13.7], [8.9, 11.1, 13.9],
      [9.1, 11.3, 14.2], [9.2, 11.5, 14.5], [9.4, 11.8, 14.7], [9.5, 12.0, 15.0], [9.7, 12.2, 15.3]
    ],
    head: [
      [31.9, 34.5, 37.0], [34.9, 37.3, 39.6], [36.8, 39.1, 41.5], [38.1, 40.5, 42.9], [39.2, 41.6, 44.0],
      [40.1, 42.6, 45.0], [40.9, 43.3, 45.8], [41.5, 44.0, 46.4], [42.0, 44.5, 47.0], [42.5, 45.0, 47.5],
      [42.9, 45.4, 47.9], [43.2, 45.8, 48.3], [43.5, 46.1, 48.6], [43.8, 46.3, 48.9], [44.0, 46.6, 49.2],
      [44.2, 46.8, 49.4], [44.4, 47.0, 49.6], [44.6, 47.2, 49.8], [44.7, 47.4, 50.0], [44.9, 47.5, 50.2],
      [45.0, 47.7, 50.4], [45.2, 47.8, 50.5], [45.3, 48.0, 50.7], [45.4, 48.1, 50.8], [45.5, 48.3, 51.0]
    ]
  },
  girl: {
    height: [
      [45.4, 49.1, 52.9], [49.8, 53.7, 57.6], [53.0, 57.1, 61.1], [55.6, 59.8, 64.0], [57.8, 62.1, 66.4],
      [59.6, 64.0, 68.6], [61.2, 65.7, 70.3], [62.7, 67.3, 71.9], [64.0, 68.7, 73.5], [65.3, 70.1, 75.0],
      [66.5, 71.5, 76.4], [67.7, 72.8, 77.8], [68.9, 74.0, 79.2], [70.0, 75.2, 80.5], [71.0, 76.4, 81.7],
      [72.0, 77.5, 83.0], [73.0, 78.6, 84.2], [74.0, 79.7, 85.4], [74.9, 80.7, 86.5], [75.8, 81.7, 87.6],
      [76.7, 82.7, 88.7], [77.5, 83.7, 89.8], [78.4, 84.6, 90.8], [79.2, 85.5, 91.9], [80.0, 86.4, 92.9]
    ],
    weight: [
      [2.4, 3.2, 4.2], [3.2, 4.2, 5.5], [3.9, 5.1, 6.6], [4.5, 5.8, 7.5], [5.0, 6.4, 8.2],
      [5.4, 6.9, 8.8], [5.7, 7.3, 9.3], [6.0, 7.6, 9.8], [6.3, 7.9, 10.2], [6.5, 8.2, 10.5],
      [6.7, 8.5, 10.9], [6.9, 8.7, 11.2], [7.0, 8.9, 11.5], [7.2, 9.2, 11.8], [7.4, 9.4, 12.1],
      [7.6, 9.6, 12.4], [7.7, 9.8, 12.6], [7.9, 10.0, 12.9], [8.1, 10.2, 13.2], [8.2, 10.4, 13.5],
      [8.4, 10.6, 13.7], [8.6, 10.9, 14.0], [8.7, 11.1, 14.3], [8.9, 11.3, 14.6], [9.0, 11.5, 14.8]
    ],
    head: [
      [31.5, 33.9, 36.2], [34.2, 36.5, 38.9], [35.8, 38.3, 40.7], [37.1, 39.5, 42.0], [38.1, 40.6, 43.1],
      [38.9, 41.5, 44.0], [39.6, 42.2, 44.8], [40.2, 42.8, 45.5], [40.7, 43.4, 46.0], [41.2, 43.8, 46.5],
      [41.5, 44.2, 46.9], [41.9, 44.6, 47.3], [42.2, 44.9, 47.6], [42.4, 45.2, 47.9], [42.7, 45.4, 48.2],
      [42.9, 45.7, 48.4], [43.1, 45.9, 48.6], [43.3, 46.1, 48.8], [43.5, 46.2, 49.0], [43.6, 46.4, 49.2],
      [43.8, 46.6, 49.4], [44.0, 46.7, 49.5], [44.1, 46.9, 49.7], [44.3, 47.0, 49.8], [44.4, 47.2, 50.0]
    ]
  }
};

const CURVE_TABS = [
  { key: 'height', label: '身高', labelEn: 'Height', unit: 'cm', color: '#e2a93a' },
  { key: 'weight', label: '体重', labelEn: 'Weight', unit: 'kg', color: '#a0812f' },
  { key: 'head', label: '头围', labelEn: 'Head', unit: 'cm', color: '#b97b05' }
];

/* 疫苗名称英文（英文界面用国际通用缩写，中文仍为全称） */
const VACCINE_EN = {
  '乙肝疫苗': 'Hepatitis B', '卡介苗': 'BCG', '脊灰疫苗': 'Polio', '百白破疫苗': 'DTaP',
  '白破疫苗': 'DT', '麻腮风疫苗': 'MMR', '乙脑减毒活疫苗': 'JE (live)', 'A群流脑疫苗': 'MenA',
  'A+C群流脑疫苗': 'MenAC', '甲肝减毒活疫苗': 'HepA (live)', '13价肺炎球菌结合疫苗': 'PCV13',
  '五价轮状病毒疫苗': 'RV5', '五联疫苗': 'Pentavalent', 'Hib疫苗': 'Hib',
  'EV71手足口疫苗': 'EV71', '水痘疫苗': 'Varicella', '流感疫苗': 'Influenza'
};
/* 接种时间说明英文 */
const VAX_NOTE_EN = {
  '出生后尽早接种': 'As early as possible after birth',
  '出生后24小时内': 'Within 24 hours of birth',
  '1月龄': '1 month', '2月龄': '2 months', '3月龄': '3 months', '4月龄': '4 months',
  '5月龄': '5 months', '6月龄': '6 months', '8月龄': '8 months', '9月龄': '9 months',
  '12月龄': '12 months', '18月龄': '18 months',
  '2月龄（可6周龄起）': '2 months (from 6 weeks)',
  '间隔1个月': '1 month apart', '间隔4-10周': '4-10 weeks apart',
  '12-15月龄加强': 'Booster at 12-15 months', '18月龄加强': 'Booster at 18 months',
  '首次接种第2剂（间隔≥1月）': '2nd dose, at least 1 month apart',
  '32周龄内完成3剂': 'Complete 3 doses by 32 weeks',
  '6-12周龄首剂': 'First dose at 6-12 weeks',
  '6月龄起 · 每年接种': 'From 6 months, annually',
  '6月龄起': 'From 6 months',
  '2岁': '2 years', '3岁': '3 years', '4岁': '4 years', '6岁': '6 years'
};

/* 指定日期的实际年龄：不足 1 个月显示天数，满月显示 X个月Y天 */
function calcAgeAt(birthday, dateStr, lang) {
  if (!birthday || !dateStr) return '';
  const bp = String(birthday).split('-').map(Number);
  const dp = String(dateStr).split('-').map(Number);
  if (bp.length !== 3 || dp.length !== 3 || bp.some(n => !isFinite(n)) || dp.some(n => !isFinite(n))) return '';
  const b = new Date(bp[0], bp[1] - 1, bp[2]);
  const d = new Date(dp[0], dp[1] - 1, dp[2]);
  if (isNaN(b.getTime()) || isNaN(d.getTime())) return '';
  if (d < b) return lang === 'en' ? '0 days' : '0天';
  let months = (d.getFullYear() - b.getFullYear()) * 12 + (d.getMonth() - b.getMonth());
  // 目标月份不存在同一天（如 1/31 -> 2 月）时，按目标月最后一天计算
  const clampMonth = (n) => {
    const y = b.getFullYear();
    const m = b.getMonth() + n;
    const last = new Date(y, m + 1, 0).getDate();
    return new Date(y, m, Math.min(b.getDate(), last));
  };
  if (clampMonth(months) > d) months -= 1;
  if (months < 0) months = 0;
  const anchorDate = clampMonth(months);
  const days = Math.max(0, Math.round((d.getTime() - anchorDate.getTime()) / 86400000));
  if (months <= 0) {
    return lang === 'en' ? days + (days === 1 ? ' day' : ' days') : days + '天';
  }
  if (days === 0) {
    return lang === 'en' ? months + (months === 1 ? ' month' : ' months') : months + '个月';
  }
  return lang === 'en'
    ? months + (months === 1 ? ' month ' : ' months ') + days + (days === 1 ? ' day' : ' days')
    : months + '个月' + days + '天';
}

/* 月龄：X 月 Y 天 */
function calcAge(birthday, lang) {
  if (!birthday) return '';
  const parts = String(birthday).split('-').map(Number);
  if (parts.length !== 3) return '';
  const b = new Date(parts[0], parts[1] - 1, parts[2]);
  const now = new Date();
  if (now < b) return '';
  let months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
  let days = now.getDate() - b.getDate();
  if (days < 0) {
    months -= 1;
    const last = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    days += last;
  }
  if (lang === 'en') {
    if (months <= 0) return days + (days > 1 ? ' days' : ' day');
    return months + (months > 1 ? ' months ' : ' month ') + days + (days > 1 ? ' days' : ' day');
  }
  return months + ' 月 ' + days + ' 天';
}

Page({

  onShareAppMessage() {
    return {
        imageUrl: '/images/share-cover.png', title: this._t('熊宝喂养 · 我的宝贝档案', 'Panda Feeding · My Baby Profile'), path: 'pages/baby-profile/baby-profile' };
  },
  onShareTimeline() {
    return { title: this._t('熊宝喂养 · 我的宝贝档案', 'Panda Feeding · My Baby Profile') };
  },
  data: {
    lang: 'zh',
    safeTop: (app.globalData && app.globalData.safeTop) || 88,
    baby: {},
    ageText: '',
    babySwitchVisible: false,
    babyList: [],
    currentBabyId: '',
    latest: { height: 0, weight: 0, head: 0 },
    deltaText: '',
    curve: [],
    curveTabs: CURVE_TABS,
    curveMode: 'height',
    curveNote: '',
    // ECharts 生长曲线（懒加载，onReady 主动 init）
    curveEc: { lazyLoad: true },
    echarts: echarts,
    vaccineFilter: 'all',
    vaccineFilters: [
      { key: 'all', label: '全部' },
      { key: 'free', label: '免费' },
      { key: 'paid', label: '自费' }
    ],
    vaccineRaw: [],
    vaccinePlan: [],
    vaccineStats: { total: 0, done: 0, pending: 0, skip: 0 },
    showVaccineDatePicker: false,
    vaccineDoneDateTarget: null,
    vaccineNext: null,
    showMeasureDatePicker: false
  },

  /* 是否英文界面 */
  _en() {
    return (wx.getStorageSync('lang') || this.data.lang || 'zh') === 'en';
  },
  _t(zh, en) { return this._en() ? en : zh; },

  /* 当前语言下的曲线 tab / 疫苗筛选 */
  curveTabsOf(en) {
    return CURVE_TABS.map(t => ({ key: t.key, label: en ? t.labelEn : t.label, unit: t.unit, color: t.color }));
  },
  vaccineFiltersOf(en) {
    return en
      ? [{ key: 'all', label: 'All' }, { key: 'free', label: 'Free' }, { key: 'paid', label: 'Paid' }]
      : [{ key: 'all', label: '全部' }, { key: 'free', label: '免费' }, { key: 'paid', label: '自费' }];
  },
  vaxGroup(v, en) { return en ? (VACCINE_EN[v.group] || v.short || v.group) : v.group; },
  vaxDose(v, en) {
    if (!en) return v.dose || '';
    const n = String(v.dose || '').replace(/[^0-9]/g, '');
    return n ? 'Dose ' + n : (v.dose || '');
  },
  vaxNote(v, en) {
    if (!en) return v.note || '';
    return VAX_NOTE_EN[v.note] || v.note || '';
  },

  onShow() {
    const en = (wx.getStorageSync('lang') || 'zh') === 'en';
    this.setData({
      lang: en ? 'en' : 'zh',
      curveTabs: this.curveTabsOf(en),
      vaccineFilters: this.vaccineFiltersOf(en)
    });
    // 宝宝成长档案：需登录后使用（无宝宝时页面内显示去添加宝宝）
    if (!app.requireLogin()) {
      setTimeout(() => wx.navigateBack({ fail: () => {} }), 400);
      return;
    }
    this.refresh();
    // 云端拉取完成后（家庭共享宝宝/成员新数据）刷新
    app.onPullDone(() => { this.refresh(); });
  },

  /* ec-canvas 就绪后初始化 ECharts 生长曲线 */
  onReady() {
    setTimeout(() => {
      this.initCurveWithRetry(0);
      // 从提醒入口带 focus=vaccine 进来时，滚动定位到疫苗模块
      if (this._focus === 'vaccine') {
        wx.createSelectorQuery().in(this).select('#vaccine-section')
          .boundingClientRect(rect => {
            if (rect) wx.pageScrollTo({ scrollTop: Math.max(0, rect.top - 20), duration: 200 });
          }).exec();
      }
    }, 100);
  },

  onLoad(options) {
    // 从疫苗提醒等入口跳转过来时，滚动定位到疫苗模块
    this._focus = options && options.focus;
  },

  /* ec-canvas 组件可能晚于 onReady 就绪：最多重试 5 次，避免曲线空白 */
  initCurveWithRetry(tryCount) {
    const comp = this.selectComponent('#curveEc');
    if (comp && comp.init) {
      comp.init((canvas, width, height, dpr) => this.initCurveChart(canvas, width, height, dpr));
      return;
    }
    if (tryCount < 5) {
      setTimeout(() => this.initCurveWithRetry(tryCount + 1), 200);
    }
  },

  onUnload() {
    if (this._curveChart) {
      try { this._curveChart.dispose(); } catch (e) {}
      this._curveChart = null;
    }
  },

  refresh() {
    const user = app.getUser();
    // 未登录：清空所有宝宝数据
    if (!user.logged) {
      app.globalData.babies = [];
      app.globalData.baby = null;
      app.globalData.currentBabyId = '';
      this.setData({ baby: {}, measures: [], vaccines: [] });
      return;
    }
    // 已登录：优先使用 globalData 中的最新数据（切换宝宝后已更新）
    // 只有当 globalData 中没有宝宝时，才从本地存储恢复
    if (!app.globalData.baby || !app.globalData.baby.id) {
      try {
        const d = wx.getStorageSync('panda_feeding_data');
        if (d && Array.isArray(d.babies)) {
          app.globalData.babies = d.babies;
          if (d.currentBabyId) app.globalData.currentBabyId = d.currentBabyId;
          const cur = d.babies.find(b => b.id === d.currentBabyId);
          if (cur) app.globalData.baby = cur;
        }
      } catch (e) {}
    }
    const g = app.globalData;
    const baby = (g.babies || []).find(b => b.id === g.currentBabyId) || g.baby || {};
    const measures = (g.measures || []).slice().sort((a, b) => {
      const ka = String(a.date || '') + ' ' + String(a.time || '');
      const kb = String(b.date || '') + ' ' + String(b.time || '');
      return ka < kb ? -1 : (ka > kb ? 1 : 0);
    });
    const latest = measures.length ? measures[measures.length - 1] : null;
    const prev = measures.length > 1 ? measures[measures.length - 2] : null;
    const en = (wx.getStorageSync('lang') || this.data.lang || 'zh') === 'en';
    let deltaText = '';
    if (latest) {
      if (prev) {
        // 只有两次都填写的指标才能算差值，避免缺项被当成 0
        const goal = [
          { key: 'height', zh: '身高', en: 'Height', unit: 'cm' },
          { key: 'weight', zh: '体重', en: 'Weight', unit: 'kg' },
          { key: 'head', zh: '头围', en: 'Head', unit: 'cm' }
        ].find(x => Number(latest[x.key]) > 0 && Number(prev[x.key]) > 0);
        if (goal) {
          const d = Number(latest[goal.key]) - Number(prev[goal.key]);
          const av = Math.abs(d).toFixed(1);
          if (Math.abs(d) < 0.05) {
            deltaText = en ? (goal.en + ' unchanged vs last record') : (goal.zh + '与上次持平');
          } else {
            deltaText = en
              ? (goal.en + ' ' + (d > 0 ? '+' : '-') + av + ' ' + goal.unit + ' vs last record')
              : (goal.zh + '较上次' + (d > 0 ? '增加 ' : '减少 ') + av + goal.unit);
          }
        } else {
          deltaText = en ? 'Measurement saved' : '已记录本次测量';
        }
      } else {
        deltaText = en ? "Baby's very first measurement" : '这是宝宝的第一次测量';
      }
    } else {
      deltaText = en ? 'Tap + at the top right to record the first measurement' : '点击右上角「＋」记录第一次测量';
    }
    // 宝宝头像已删除，统一使用默认 logo
    const avatarSrc = '/images/brand-logo.png';
    const myOpenid = (app.globalData.user && app.globalData.user.openid) || '';
    const isShared = !!(baby.ownerOpenid && baby.ownerOpenid !== myOpenid);
    this.setData({
      lang: en ? 'en' : 'zh',
      curveTabs: this.curveTabsOf(en),
      vaccineFilters: this.vaccineFiltersOf(en),
      baby,
      babyAvatarSrc: avatarSrc,
      hasBaby: !!(baby && baby.id && (baby.name || baby.birthday)),
      isShared,
      ageText: calcAge(baby.birthday, en ? 'en' : 'zh'),
      latest: {
        height: latest && Number(latest.height) > 0 ? latest.height : '--',
        weight: latest && Number(latest.weight) > 0 ? latest.weight : '--',
        head: latest && Number(latest.head) > 0 ? latest.head : '--'
      },
      measureList: measures.slice().reverse().map((m, i) => ({
        idx: measures.length - 1 - i,
        key: m._cid || m._u || (String(m.date || '') + '-' + String(m.time || '')),
        date: m.date, time: m.time || '', height: m.height, weight: m.weight, head: m.head
      })),
      deltaText,
      curve: this.buildCurve(measures, baby.birthday),
      curveNote: this.curveNoteText(baby.gender, this.data.curveMode),
      vaccineRaw: this.buildVaccineRaw(),
      vaccinePlan: this.filterVaccine(this.buildVaccineRaw(), this.data.vaccineFilter),
      vaccineStats: this.vaccineStats(this.buildVaccineRaw()),
      vaccineNext: this.buildVaccineNext()
    }, () => this.drawCurve());
  },

  /* 切换曲线指标：身高 / 体重 / 头围 */
  switchCurve(e) {
    const mode = e.currentTarget.dataset.mode;
    if (mode === this.data.curveMode) return;
    this._curveView = { scale: 1, tx: 0, ty: 0 }; // 切换指标时重置缩放/平移
    this._curveSelected = null; // 清除选中查看
    const g = app.globalData;
    const measures = (g.measures || []).slice();
    // 亲友切换到的共享宝宝可能不是 g.baby，优先按 currentBabyId 取当前宝宝
    const cur = (g.babies || []).find(b => b.id === g.currentBabyId) || g.baby || {};
    this.setData({
      curveMode: mode,
      curve: this.buildCurveFor(measures, cur.birthday, mode),
      curveNote: this.curveNoteText(cur.gender, mode)
    }, () => this.drawCurve());
  },

  /* 按指定指标构建曲线点（避免依赖 this.data.curveMode 的时序问题） */
  buildCurveFor(measures, birthday, mode) {
    return (measures || []).map(m => ({
      month: this.monthAge(birthday, m.date),
      value: Number(m[mode]) || 0,
      date: m.date
    })).filter(p => p.value > 0).sort((a, b) => (a.date < b.date ? -1 : 1));
  },

  curveNoteText(gender, mode) {
    const tab = CURVE_TABS.find(t => t.key === mode) || CURVE_TABS[0];
    if (this._en()) {
      return 'WHO ' + (gender === '女宝宝' ? 'girls' : 'boys') + ' ' + String(tab.labelEn).toLowerCase() + ' reference · dashed lines mark ±2SD';
    }
    return 'WHO ' + (gender === '女宝宝' ? '女童' : '男童') + tab.label + '参考曲线 · 灰色虚线为正常范围上下限（±2SD）';
  },

  /* 生长曲线：按当前指标生成点（月龄 + 测量值） */
  buildCurve(measures, birthday) {
    return this.buildCurveFor(measures, birthday, this.data.curveMode);
  },

  monthAge(birthday, dateStr) {
    if (!birthday) return 0;
    const b = new Date(String(birthday).replace(/-/g, '/'));
    const d = new Date(String(dateStr).replace(/-/g, '/'));
    if (isNaN(b.getTime()) || isNaN(d.getTime())) return 0;
    const days = (d.getTime() - b.getTime()) / 86400000;
    return Math.max(0, Math.round((days / 30.4375) * 100) / 100);
  },

  /* 生长曲线（ECharts）：横轴月龄(0~24+)，纵轴当前指标，灰色 WHO ±2SD 虚线 + 中位数线，宝宝数据彩色叠加
     双指缩放/拖动由 ECharts dataZoom(inside) 原生处理：最小缩回原始 1 倍（maxSpan=100），
     放大时横竖轴刻度/单位自动细化，曲线始终限制在横竖轴内不重叠；点击数据点十字线查看月龄与数值 */
  buildCurveOption() {
    const en = this._en();
    const curve = this.data.curve || [];
    const mode = this.data.curveMode;
    const tabDef = CURVE_TABS.find(t => t.key === mode) || CURVE_TABS[0];
    const tab = { key: tabDef.key, label: en ? tabDef.labelEn : tabDef.label, unit: tabDef.unit, color: tabDef.color };
    const gender = (this.data.baby.gender === '女宝宝') ? 'girl' : 'boy';
    const who = (WHO_STD[gender] || WHO_STD.boy)[mode] || WHO_STD.boy.height;
    let xMax = 24;
    curve.forEach(p => { if (p.month > xMax) xMax = p.month; });
    xMax = Math.max(1, xMax);
    const months = [];
    for (let m = 0; m <= xMax; m++) months.push(m);
    const row = (m) => (who[m] ? who[m] : null);
    const whoMin = months.map(m => (row(m) ? row(m)[0] : null));
    const whoMed = months.map(m => (row(m) ? row(m)[1] : null));
    const whoMax = months.map(m => (row(m) ? row(m)[2] : null));
    const xy = (arr) => months.map((m, i) => [m, arr[i]]);
    const pts = curve.map(p => [p.month, p.value]);
    const color = tab.color;
    return {
      backgroundColor: 'transparent',
      grid: { left: 66, right: 26, top: 36, bottom: 46 },
      tooltip: {
        trigger: 'axis',
        confine: true,
        backgroundColor: 'rgba(41,40,31,0.92)',
        textStyle: { color: '#fff', fontSize: 11 },
        axisPointer: {
          type: 'cross',
          lineStyle: { color: '#c9c2a8', type: 'dashed' },
          label: { backgroundColor: '#b97b05', color: '#fff', fontSize: 10 }
        },
        formatter: (params) => {
          if (!params || !params.length) return '';
          const axis = params[0].axisValue;
          const axisNum = Number(axis);
          const pt = curve.find(p => isFinite(axisNum) && Math.abs(p.month - axisNum) < 0.02);
          const ageTxt = (pt && pt.date && this.data.baby && this.data.baby.birthday)
            ? calcAgeAt(this.data.baby.birthday, pt.date, en ? 'en' : 'zh')
            : '';
          const moTxt = isFinite(axisNum) ? String(Math.round(axisNum * 10) / 10) : '--';
          const lines = [en ? ('Age: ' + (ageTxt || (moTxt + ' mo'))) : ('月龄：' + (ageTxt || (moTxt + ' 个月')))];
          const baby = params.find(p => p.seriesName && (en ? p.seriesName.indexOf('Baby') === 0 : p.seriesName.indexOf('宝宝') === 0));
          if (baby && baby.value !== null && baby.value !== undefined) {
            const v = Array.isArray(baby.value) ? baby.value[1] : baby.value;
            lines.push(en ? (baby.seriesName + ': ' + v + tab.unit) : (baby.seriesName + '：' + v + tab.unit));
          }
          if (pt && pt.date) lines.push(en ? ('Measured on: ' + pt.date) : ('测量日期：' + pt.date));
          return lines.join('\n');
        }
      },
      dataZoom: [{
        type: 'inside',
        xAxisIndex: 0,
        minSpan: 8,   // 最大放大约 12 倍
        maxSpan: 100  // 最小缩回原始 1 倍（全貌）
      }],
      xAxis: {
        type: 'value',
        min: 0,
        max: xMax,
        name: en ? 'Age (mo)' : '月龄',
        nameLocation: 'middle',
        nameGap: 34,
        nameTextStyle: { color: '#8f896d', fontSize: 11 },
        axisLine: { lineStyle: { color: '#d8d0b8' } },
        axisTick: { lineStyle: { color: '#d8d0b8' } },
        axisLabel: { color: '#8f896d', fontSize: 10, formatter: (v) => (en ? v + 'mo' : v + '月') },
        splitLine: { show: false }
      },
      yAxis: {
        type: 'value',
        scale: true,
        name: tab.unit,
        nameLocation: 'end',
        nameTextStyle: { color: '#8f896d', fontSize: 11 },
        axisLine: { show: true, lineStyle: { color: '#d8d0b8' } },
        axisTick: { lineStyle: { color: '#d8d0b8' } },
        axisLabel: { color: '#8f896d', fontSize: 10, formatter: (v) => v + tab.unit },
        splitLine: { lineStyle: { color: '#f0ead9', type: 'dashed' } }
      },
      series: [
        // 灰带底线 = WHO -2SD（灰色虚线，也是 stack 基准线）
        {
          name: 'WHO -2SD', type: 'line', data: xy(whoMin),
          symbol: 'none',
          lineStyle: { color: '#d8d0b8', width: 1.5, type: 'dashed' },
          silent: true, tooltip: { show: false }
        },
        {
          name: en ? 'WHO median' : 'WHO中位数', type: 'line', data: xy(whoMed),
          symbol: 'none', lineStyle: { color: '#c9c2a8', type: 'dashed', width: 1.5 }, silent: true, tooltip: { show: false }
        },
        // WHO +2SD 上限灰色虚线（不参与 stack，画在真实 +2SD 位置）
        {
          name: 'WHO +2SD', type: 'line', data: xy(whoMax),
          symbol: 'none', lineStyle: { color: '#d8d0b8', width: 1.5, type: 'dashed' },
          silent: true, tooltip: { show: false }
        },
        {
          name: (en ? 'Baby ' : '宝宝') + tab.label, type: 'line', data: pts,
          symbol: 'circle', symbolSize: 9, connectNulls: true, z: 6,
          lineStyle: { color: color, width: 3 },
          itemStyle: { color: color }
        }
      ]
    };
  },

  /* ECharts 初始化（ec-canvas 回调） */
  initCurveChart(canvas, width, height, dpr) {
    const chart = echarts.init(canvas, null, { width, height, devicePixelRatio: dpr });
    canvas.setChart && canvas.setChart(chart);
    chart.setOption(this.buildCurveOption());
    this._curveChart = chart;
    return chart;
  },

  /* 数据/指标变化后刷新曲线（ECharts setOption 增量更新） */
  drawCurve() {
    if (this._curveChart && this._curveChart.setOption) {
      this._curveChart.setOption(this.buildCurveOption(), true);
    }
  },


  /* 疫苗：剩余天数按真实日期动态计算 */
  /* ==================== 疫苗记录与提醒（完整表格内嵌） ==================== */
  buildVaccineRaw() {
    const g = app.globalData;
    const today = this.todayStr();
    return (g.vaccinePlan || []).map((v) => {
      const eff = v.doneDate || v.dueDate;
      const due = diffDays(today, eff);
      let state = 'future';
      if (v.status === 'done') state = 'done';
      else if (due < 0) state = 'past';
      else if (due === 0) state = 'today';
      const en = this._en();
      return Object.assign({}, v, {
        state, due,
        groupText: this.vaxGroup(v, en),
        doseText: this.vaxDose(v, en),
        noteText: this.vaxNote(v, en),
        typeText: en ? (v.type === '免费' ? 'Free' : 'Paid') : v.type
      });
    }).sort((a, b) => (a.due - b.due) || (String(a.dueDate) < String(b.dueDate) ? -1 : 1));
  },

  filterVaccine(raw, f) {
    if (f === 'all') return raw;
    return raw.filter(v => (f === 'free' ? v.type === '免费' : v.type === '自费'));
  },

  vaccineStats(raw) {
    const total = raw.length;
    const done = raw.filter(v => v.status === 'done').length;
    const skip = raw.filter(v => v.status === 'skip').length;
    return { total, done, pending: total - done - skip, skip };
  },

  /* 下次接种提醒：取距离最近的一剂待接种疫苗（已过日期的忽略） */
  buildVaccineNext() {
    const raw = this.buildVaccineRaw();
    const future = raw.filter(v => v.status === 'pending' && v.due >= 0);
    if (!future.length) return null;
    const nearest = future.reduce((a, b) => (a.due < b.due ? a : b));
    const en = this._en();
    return {
      title: this.vaxGroup(nearest, en) + ' ' + this.vaxDose(nearest, en),
      dueDate: nearest.doneDate || nearest.dueDate,
      daysText: nearest.due === 0 ? (en ? 'Due today' : '今日应种') : (en ? ('In ' + nearest.due + ' days') : ('还有 ' + nearest.due + ' 天')),
      over: false
    };
  },

  switchVaccineFilter(e) {
    const f = e.currentTarget.dataset.key;
    this.setData({ vaccineFilter: f, vaccinePlan: this.filterVaccine(this.data.vaccineRaw, f) });
  },

  /* 点击点选框：待接种 → 弹日期选择器；已接种 → 确认撤销 */
  onToggleVaccine(e) {
    const idx = e.currentTarget.dataset.index;
    const row = this.data.vaccinePlan && this.data.vaccinePlan[idx];
    if (!row) return;
    if (row.status === 'done') {
      wx.showModal({
        title: this._t('撤销接种', 'Undo Vaccination'),
        content: this._t('将「' + row.groupText + ' ' + row.doseText + '」恢复为待接种？', 'Set "' + row.groupText + ' ' + row.doseText + '" back to pending?'),
        success: (r) => {
          if (!r.confirm) return;
          const v = (app.globalData.vaccinePlan || []).find(x => x.id === row.id);
          if (!v) return;
          v.status = 'pending';
          v.doneDate = '';
          app.persist();
          this.refresh();
        }
      });
    } else {
      this.setData({ showVaccineDatePicker: true, vaccineDoneDateTarget: { id: row.id, date: row.dueDate || this.todayStr(), mode: 'done' } });
    }
  },

  /* 点击应种日期：修改 dueDate */
  onTapVaccineDue(e) {
    const idx = e.currentTarget.dataset.index;
    const row = this.data.vaccinePlan && this.data.vaccinePlan[idx];
    if (!row) return;
    this.setData({ showVaccineDatePicker: true, vaccineDoneDateTarget: { id: row.id, date: row.dueDate || this.todayStr(), mode: 'due' } });
  },

  /* 长按：移除该疫苗（不接种） */
  onLongPressVaccine(e) {
    const idx = e.currentTarget.dataset.index;
    const row = this.data.vaccinePlan && this.data.vaccinePlan[idx];
    if (!row) return;
    wx.showModal({
      title: this._t('移除疫苗', 'Remove Vaccine'),
      content: this._t('从接种计划中移除「' + row.groupText + ' ' + row.doseText + '」？（不接种）', 'Remove "' + row.groupText + ' ' + row.doseText + '" from the schedule? (not vaccinated)'),
      success: (r) => {
        if (!r.confirm) return;
        const list = app.globalData.vaccinePlan || [];
        const i = list.findIndex(x => x.id === row.id);
        if (i >= 0) list.splice(i, 1);
        app.persist();
        this.refresh();
        wx.showToast({ title: this._t('已移除', 'Removed'), icon: 'none' });
      }
    });
  },

  closeVaccineDatePicker() {
    this.setData({ showVaccineDatePicker: false });
  },
  onVaccineDateChange(e) {
    const t = this.data.vaccineDoneDateTarget;
    const id = t && t.id;
    const v = (app.globalData.vaccinePlan || []).find(x => x.id === id);
    this.setData({ showVaccineDatePicker: false, vaccineDoneDateTarget: null });
    if (!v) return;
    if (t.mode === 'due') {
      v.dueDate = e.detail.value;
      app.persist();
      this.refresh();
      wx.showToast({ title: this._t('应种日期已更新', 'Due date updated'), icon: 'none' });
    } else {
      v.status = 'done';
      v.doneDate = e.detail.value;
      app.persist();
      this.refresh();
      wx.showToast({ title: this._t('已标记接种', 'Marked as vaccinated'), icon: 'none' });
    }
  },

  todayStr() {
    const d = new Date();
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
  },

  /* 没有宝宝 → 去我的宝宝添加 */
  goMyBabies() {
    wx.navigateTo({ url: '/pages/my-babies/my-babies' });
  },

  /* ==================== 切换宝宝抽屉（当前页面弹出） ==================== */
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
    let babies = (app.globalData.babies || []).slice();
    // 家庭状态判断：同时检查 myFamily、myFamilies 和权限缓存，确保亲友端加入家庭后能正确显示共享宝宝
    let hasFamily = !!(app.globalData.myFamily && app.globalData.myFamily._id) ||
                    !!(app.globalData.myFamilies && app.globalData.myFamilies.length);
    if (!hasFamily) {
      try {
        const perm = require('../../../utils/perm.js');
        const me = perm.getMyPerm();
        if (me && me.families && me.families.length) hasFamily = true;
      } catch (e) {}
    }
    const hasPending = !!app.globalData.pendingJoin;
    if (!hasFamily || hasPending) {
      babies = babies.filter(b => !b.ownerOpenid || b.ownerOpenid === myOpenid);
    }
    // 兜底：如果过滤后列表为空，但当前 globalData.baby 有值，确保它出现在列表中
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
        name: b.name || this._t('未命名宝宝', 'Unnamed baby'),
        birthday: b.birthday || '',
        ageText: calcAge(b.birthday, this._en() ? 'en' : 'zh') || this._t('待填写出生日期', 'Birthday not set'),
        isShared: !!(b.ownerOpenid && b.ownerOpenid !== myOpenid)
      }));
    this.setData({
      babyList: babies,
      currentBabyId: curId,
      babySwitchVisible: true
    });
  },
  _oldOpenBabySwitcher() {
    try {
      const d = wx.getStorageSync('panda_feeding_data');
      if (d && Array.isArray(d.babies)) app.globalData.babies = d.babies;
    } catch (e) {}
    const myOpenid = (app.globalData.user && app.globalData.user.openid) || '';
    let babies = (app.globalData.babies || []).map(b => ({
      id: b.id,
      name: b.name || '未命名宝宝',
      avatar: b.avatar || '/images/brand-logo.png',
      birthday: b.birthday || '',
      ageText: calcAge(b.birthday) || '待填写出生日期',
      isShared: !!(b.ownerOpenid && b.ownerOpenid !== myOpenid)
    }));
    // 宝宝头像已删除，抽屉统一显示默认 logo（无需云端转临时URL）
    this.setData({
      babyList: babies,
      currentBabyId: app.globalData.currentBabyId,
      babySwitchVisible: true
    });
  },

  closeBabySwitcher() {
    this.setData({ babySwitchVisible: false }, () => {
      setTimeout(() => this.redrawCurve(), 60);
    });
  },
  /* 画布从 hidden 恢复或容器尺寸变化后重绘，避免曲线空白 */
  redrawCurve() {
    if (!this._curveChart) return;
    try {
      this._curveChart.resize();
      this._curveChart.setOption(this.buildCurveOption(), true);
    } catch (e) {}
  },

  selectBaby(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    if (id === app.globalData.currentBabyId) {
      this.closeBabySwitcher();
      return;
    }
    app.switchBaby(id);
    this.closeBabySwitcher();
    this.refresh();
    const name = app.globalData.baby.name || '宝宝';
    wx.showToast({ title: this._t('已切换到「' + name + '」', 'Switched to ' + name), icon: 'none' });
  },

  goAddBaby() {
    wx.navigateTo({ url: '/pages/baby-edit/baby-edit?add=1' });
  },


  editBaby() {
    const id = app.globalData.currentBabyId;
    if (!id) {
      wx.showToast({ title: this._t('请先添加宝宝', 'Please add a baby first'), icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/pages/baby-edit/baby-edit?id=' + id });
  },

  goBack() {
    wx.navigateBack();
  },

  /* 编辑/查看某条测量记录（独立页面编辑模式） */
  openMeasureEdit(e) {
    const ds = e.currentTarget.dataset || {};
    const key = ds.key ? String(ds.key) : '';
    // 用稳定 key 定位记录：列表按日期排序，不能把显示序号直接当成存储下标
    wx.navigateTo({ url: '/pages/measure-add/measure-add?key=' + encodeURIComponent(key) + '&idx=' + (ds.idx === undefined ? -1 : ds.idx) });
  },

  /* ==================== 添加测量（独立页面） ==================== */
  addMeasure() {
    const id = app.globalData.currentBabyId;
    if (!id) {
      wx.showToast({ title: this._t('请先添加宝宝', 'Please add a baby first'), icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/pages/measure-add/measure-add' });
  },

});
