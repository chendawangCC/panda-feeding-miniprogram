const app = getApp();

const FEED_TYPES = ['母乳', '配方奶', '吸奶'];

const FILTER_STYLE = {
  '吸奶': { bg: '#fff1df', color: '#a96017' },
  '母乳亲喂': { bg: '#fff3bd', color: '#896600' },
  '瓶喂奶粉': { bg: '#e7f0ff', color: '#6f8ee0' },
  '瓶喂母乳': { bg: '#ffe3f0', color: '#bc4d7c' },
  '睡觉': { bg: '#fff2b9', color: '#6f8ee0' },
  '嘘嘘': { bg: '#e7f0ff', color: '#b97b05' },
  '臭臭': { bg: '#f9ead2', color: '#a76a1b' },
  '嘘嘘+臭臭': { bg: '#e7f0ff', color: '#7eb7ee' },
  '吃辅食': { bg: '#ffe7d5', color: '#bf6335' },
  '营养补剂': { bg: '#e7f0ff', color: '#8c79d8' },
  '喝水': { bg: '#e7f0ff', color: '#6f8ee0' }
};

const LEGEND = [
  { name: '吸奶', color: '#f2ad65' },
  { name: '母乳亲喂', color: '#ffd95a' },
  { name: '瓶喂奶粉', color: '#7eb7ee' },
  { name: '瓶喂母乳', color: '#e77fa8' },
  { name: '睡觉', color: '#8c79d8' },
  { name: '嘘嘘', color: '#45c2b6' },
  { name: '臭臭', color: '#c99a54' },
  { name: '嘘嘘+臭臭', color: '#3aa79b' },
  { name: '吃辅食', color: '#ef9a65' },
  { name: '营养补剂', color: '#45c2b6' },
  { name: '喝水', color: '#6f8ee0' },
  { name: '体温', color: '#f08a5d' },
  { name: '洗澡', color: '#7eb7ee' }
];

const FILTER_NAMES = ['全部', '吸奶', '母乳亲喂', '瓶喂奶粉', '瓶喂母乳', '睡觉', '嘘嘘', '臭臭', '嘘嘘+臭臭', '吃辅食', '营养补剂', '喝水', '体温', '洗澡'];

/* 英文显示名（数据层仍使用中文 key，仅在展示时映射） */
const EN_LABEL = {
  '全部': 'All', '吸奶': 'Pumping', '母乳亲喂': 'Nursing', '瓶喂奶粉': 'Formula Bottle',
  '瓶喂母乳': 'Bottle Breastmilk', '睡觉': 'Sleep', '嘘嘘': 'Wet', '臭臭': 'Dirty',
  '嘘嘘+臭臭': 'Wet + Dirty', '吃辅食': 'Solids', '营养补剂': 'Supplements',
  '喝水': 'Water', '体温': 'Temperature', '洗澡': 'Bath',
  '亲喂': 'Nursing', '配方奶': 'Formula', '母乳': 'Breast milk'
};

/* ==================== 喂养参考表（国标 · 按月龄自动匹配） ====================
   依据《中国居民膳食指南（2022）》及《7—24 月龄婴幼儿喂养指南》整理 */
const FEED_STAGES = [
  {
    min: 0, max: 1, label: '0—1 月 · 新生儿期',
    rows: [
      { item: '母乳', freq: '按需', qty: '8—12 次/日' },
      { item: '配方奶', freq: '按需', qty: '单次 30—90ml' },
      { item: '每日奶量', freq: '—', qty: '约 100—150ml/kg' },
      { item: '维生素D', freq: '每日', qty: '400IU' }
    ],
    note: '按需喂养、随饿随喂；每天尿湿 ≥6 片提示奶量充足。出生后尽早补充维生素D。'
  },
  {
    min: 1, max: 3, label: '1—3 月 · 快速生长期',
    rows: [
      { item: '母乳', freq: '按需', qty: '约 8 次/日' },
      { item: '配方奶', freq: '5—7 次/日', qty: '单次 90—150ml' },
      { item: '每日奶量', freq: '—', qty: '约 150ml/kg' },
      { item: '维生素D', freq: '每日', qty: '400IU' }
    ],
    note: '建立昼夜节律，夜间可逐渐拉长喂奶间隔；按需不等于频繁哭闹即喂，先排查饥饿信号。'
  },
  {
    min: 3, max: 6, label: '4—6 月 · 奶量高峰期',
    rows: [
      { item: '母乳', freq: '按需', qty: '6—8 次/日' },
      { item: '配方奶', freq: '4—5 次/日', qty: '单次 150—180ml' },
      { item: '每日奶量', freq: '—', qty: '约 800—1000ml' },
      { item: '维生素D', freq: '每日', qty: '400IU' }
    ],
    note: '宝宝体内铁储备开始消耗，可关注含铁辅食的引入时机；未到添加辅食信号前仍以奶为主。'
  },
  {
    min: 6, max: 8, label: '6—8 月 · 辅食初探',
    rows: [
      { item: '母乳/配方奶', freq: '4—5 次/日', qty: '600—800ml/日' },
      { item: '辅食', freq: '1—2 次/日', qty: '高铁米粉→菜泥→肉泥' },
      { item: '维生素D', freq: '每日', qty: '400IU' },
      { item: '铁', freq: '每日', qty: '强化铁辅食优先' }
    ],
    note: '满 6 月龄起添加辅食，第一口高铁米粉；每次只加一种新食物、观察 3 天；1 岁内不加盐和糖。'
  },
  {
    min: 8, max: 10, label: '8—10 月 · 辅食巩固',
    rows: [
      { item: '母乳/配方奶', freq: '3—4 次/日', qty: '600ml/日左右' },
      { item: '辅食', freq: '2—3 次/日', qty: '稠糊→碎末→指状' },
      { item: '维生素D', freq: '每日', qty: '400IU' },
      { item: '铁', freq: '每周 2—3 次', qty: '肝泥/红肉泥' }
    ],
    note: '练习手抓食物与咀嚼，食物由稠糊过渡到碎末、指状；保证富铁食物摄入。'
  },
  {
    min: 10, max: 12, label: '10—12 月 · 辅食多样化',
    rows: [
      { item: '母乳/配方奶', freq: '3 次/日', qty: '600ml/日左右' },
      { item: '辅食', freq: '3 次/日 + 1 点心', qty: '接近家庭淡味餐' },
      { item: '维生素D', freq: '每日', qty: '400IU' },
      { item: '食物多样', freq: '每日', qty: '谷物/蔬果/肉蛋鱼' }
    ],
    note: '逐步过渡到三餐两点的家庭化饮食；全天奶量不宜过多（≤800ml），避免影响辅食摄入。'
  },
  {
    min: 12, max: 24, label: '12—24 月 · 幼儿期',
    rows: [
      { item: '母乳/奶类', freq: '2—3 次/日', qty: '约 500ml/日' },
      { item: '正餐', freq: '3 餐 + 2 点心', qty: '家庭化淡味餐' },
      { item: '维生素D', freq: '每日', qty: '400IU' },
      { item: '盐', freq: '每日', qty: '1—3 岁 <2g' }
    ],
    note: '三餐两点、均衡多样，培养自主进食；1 岁后可喝全脂鲜奶；少油少盐，不喝含糖饮料。'
  },
  {
    min: 24, max: 999, label: '24 月以上 · 学龄前',
    rows: [
      { item: '奶类', freq: '每日', qty: '300—500ml' },
      { item: '正餐', freq: '三餐两点', qty: '均衡膳食' },
      { item: '零食', freq: '适量', qty: '以水果/奶制品为主' },
      { item: '盐', freq: '每日', qty: '<2g' }
    ],
    note: '参照《中国居民膳食指南》学龄前儿童建议，保证钙、铁、锌摄入；如有个性化喂养需求请咨询儿保。'
  }
];

/* 每日小结设置项 */
const SUMMARY_OPT_KEYS = ['feeds', 'milkPowder', 'milkBreast', 'pee', 'poop', 'sleep', 'memo'];
const SUMMARY_LABEL_ZH = {
  feeds: '今日喂奶次数', milkPowder: '总奶粉量', milkBreast: '总瓶喂母乳量',
  pee: '小便次数', poop: '大便次数', sleep: '总睡眠时长', memo: '今日小记'
};
const SUMMARY_LABEL_EN = {
  feeds: "Today's Feeds", milkPowder: 'Total Formula', milkBreast: 'Total Expressed Milk',
  pee: 'Wet Diapers', poop: 'Dirty Diapers', sleep: 'Total Sleep', memo: "Today's Note"
};

/* 喂养参考表 · 英文版（与 FEED_STAGES 顺序一致） */
const FEED_STAGES_EN = [
  {
    label: '0–1 month · Newborn',
    rows: [
      { item: 'Breast milk', freq: 'On demand', qty: '8–12 feeds/day' },
      { item: 'Formula', freq: 'On demand', qty: '30–90 ml per feed' },
      { item: 'Daily milk intake', freq: '—', qty: 'about 100–150 ml/kg' },
      { item: 'Vitamin D', freq: 'Daily', qty: '400 IU' }
    ],
    note: 'Feed on demand. At least 6 wet diapers a day suggests enough intake. Start vitamin D soon after birth.'
  },
  {
    label: '1–3 months · Rapid growth',
    rows: [
      { item: 'Breast milk', freq: 'On demand', qty: 'about 8 feeds/day' },
      { item: 'Formula', freq: '5–7 feeds/day', qty: '90–150 ml per feed' },
      { item: 'Daily milk intake', freq: '—', qty: 'about 150 ml/kg' },
      { item: 'Vitamin D', freq: 'Daily', qty: '400 IU' }
    ],
    note: 'Build a day-night rhythm and gradually lengthen night intervals. On demand does not mean feeding at every cry — check hunger cues first.'
  },
  {
    label: '4–6 months · Peak milk intake',
    rows: [
      { item: 'Breast milk', freq: 'On demand', qty: '6–8 feeds/day' },
      { item: 'Formula', freq: '4–5 feeds/day', qty: '150–180 ml per feed' },
      { item: 'Daily milk intake', freq: '—', qty: 'about 800–1000 ml' },
      { item: 'Vitamin D', freq: 'Daily', qty: '400 IU' }
    ],
    note: 'Iron stores start to run low; watch for the right time to introduce iron-rich solids. Until readiness signs appear, milk stays the main food.'
  },
  {
    label: '6–8 months · First solids',
    rows: [
      { item: 'Breast milk / Formula', freq: '4–5 feeds/day', qty: '600–800 ml/day' },
      { item: 'Solids', freq: '1–2 times/day', qty: 'Iron-fortified cereal → veg purée → meat purée' },
      { item: 'Vitamin D', freq: 'Daily', qty: '400 IU' },
      { item: 'Iron', freq: 'Daily', qty: 'Iron-fortified solids first' }
    ],
    note: 'Start solids at 6 months with iron-fortified cereal. One new food at a time, observe for 3 days. No salt or sugar before 1 year.'
  },
  {
    label: '8–10 months · Building solids',
    rows: [
      { item: 'Breast milk / Formula', freq: '3–4 feeds/day', qty: 'about 600 ml/day' },
      { item: 'Solids', freq: '2–3 times/day', qty: 'Thick purée → minced → finger food' },
      { item: 'Vitamin D', freq: 'Daily', qty: '400 IU' },
      { item: 'Iron', freq: '2–3 times/week', qty: 'Liver or red meat purée' }
    ],
    note: 'Practise finger foods and chewing; move from thick purée to minced and finger foods. Keep iron-rich foods in the daily menu.'
  },
  {
    label: '10–12 months · Varied solids',
    rows: [
      { item: 'Breast milk / Formula', freq: '3 feeds/day', qty: 'about 600 ml/day' },
      { item: 'Solids', freq: '3 meals + 1 snack', qty: 'Close to lightly seasoned family food' },
      { item: 'Vitamin D', freq: 'Daily', qty: '400 IU' },
      { item: 'Food variety', freq: 'Daily', qty: 'Grains, veg, fruit, meat, eggs, fish' }
    ],
    note: 'Move towards three meals and two snacks. Keep total milk at or below 800 ml so it does not crowd out solids.'
  },
  {
    label: '12–24 months · Toddler',
    rows: [
      { item: 'Breast milk / Dairy', freq: '2–3 times/day', qty: 'about 500 ml/day' },
      { item: 'Meals', freq: '3 meals + 2 snacks', qty: 'Lightly seasoned family food' },
      { item: 'Vitamin D', freq: 'Daily', qty: '400 IU' },
      { item: 'Salt', freq: 'Daily', qty: 'Under 2 g (ages 1–3)' }
    ],
    note: 'Three meals and two snacks with variety; encourage self-feeding. Whole milk is fine after 1 year. Less oil and salt, no sugary drinks.'
  },
  {
    label: '24 months+ · Preschooler',
    rows: [
      { item: 'Dairy', freq: 'Daily', qty: '300–500 ml' },
      { item: 'Meals', freq: '3 meals + 2 snacks', qty: 'Balanced diet' },
      { item: 'Snacks', freq: 'Moderate', qty: 'Mostly fruit and dairy' },
      { item: 'Salt', freq: 'Daily', qty: 'Under 2 g' }
    ],
    note: 'Based on the Chinese Dietary Guidelines for preschoolers; ensure calcium, iron and zinc. For special feeding needs, consult a paediatrician.'
  }
];

Page({

  /* 当前语言 */
  _en() {
    return (wx.getStorageSync('lang') || this.data.lang || 'zh') === 'en';
  },

  onShareAppMessage() {
    return {
        imageUrl: '/images/share-cover.png',
        title: this._en() ? 'Panda Feeding · Feeding Stats' : '熊宝喂养 · 宝宝喂养统计分析',
        path: 'pages/stats/stats' };
  },
  onShareTimeline() {
    return { title: this._en() ? 'Panda Feeding · Feeding Stats' : '熊宝喂养 · 宝宝喂养统计分析' };
  },
  data: {
    lang: 'zh',
    todayLabel: '今天',
    summaryOptRows: [],
    safeTop: (app.globalData && app.globalData.safeTop) || 88,
    cards: [],
    week: [],
    chartMode: 0,
    chartTitle: '近期',
    chartSub: '瓶喂奶量 · 单位 ml',
    feedDays: [],
    feedUnit: 'ml',
    feedColor: '#7eb7ee',
    filters: FILTER_NAMES.map((name, i) => ({
      name,
      active: i === 0,
      // 全部按钮：默认品牌黄 #FFD956，选中（点击全部）时变黑灰；选择其他多选时自动取消选中恢复品牌黄
      bg: i === 0 ? '#FFD956' : (FILTER_STYLE[name] ? FILTER_STYLE[name].bg : '#fff1df'),
      color: i === 0 ? '#5c4a10' : (FILTER_STYLE[name] ? FILTER_STYLE[name].color : '#a96017')
    })),
    showAll: true,
    selectedTypes: [],
    tlDetail: { visible: false, title: '', desc: '' },
    days: [],
    hours: ['24', '23', '22', '21', '20', '19', '18', '17', '16', '15', '14', '13', '12', '11', '10', '09', '08', '07', '06', '05', '04', '03', '02', '01'],
    bars: [],
    hourUnit: 25,          // 每小时高度（rpx），默认按容器高度铺满 24 小时
    tlH: 600,              // 时间轴可视高度（= 24 * hourUnit，最大 620）
    tlScrollY: false,      // 24 小时未放大时不需要滚动
    babyName: '',
    legend: LEGEND,
    // 每日喂养小结：勾选项 + 数据 + 设置/小记弹窗
    summaryOpts: { feeds: true, milkPowder: false, milkBreast: false, pee: false, poop: false, sleep: true, memo: false },
    summaryItems: [],
    summarySettingsVisible: false,
    memoEditVisible: false,
    memoText: '',
    showReference: false,
    feedStage: { label: '', rows: [], note: '', monthText: '' }
  },

  onShow() {
    // 以 storage 为权威：无宝宝时只显示「成长记录」，有宝宝显示「xx的成长记录」
    let babyName = '';
    try {
      const d = wx.getStorageSync('panda_feeding_data');
      const babies = (d && d.babies) || [];
      const curId = (d && d.currentBabyId) || '';
      const cur = babies.find(b => b.id === curId);
      if (cur) {
        app.globalData.babies = babies;
        app.globalData.currentBabyId = curId;
        app.globalData.baby = cur;
        babyName = cur.name || '';
      } else {
        babyName = '';
      }
    } catch (e) {}
    const en = this._en();
    const mode = this.data.chartMode || 0;
    this.setData({
      babyName,
      chartSub: en
        ? (mode === 0 ? 'Bottle amount · unit ml' : 'Nursing duration · unit min')
        : (mode === 0 ? '瓶喂奶量 · 单位 ml' : '亲喂时长 · 单位 分钟'),
      lang: en ? 'en' : 'zh',
      todayLabel: en ? 'Today' : '今天',
      legend: LEGEND.map(l => Object.assign({}, l, { name: en ? (EN_LABEL[l.name] || l.name) : l.name })),
      filters: this.data.filters.map(f => Object.assign({}, f, { label: en ? (EN_LABEL[f.name] || f.name) : f.name })),
      summaryOptRows: SUMMARY_OPT_KEYS.map(k => ({
        key: k,
        label: en ? SUMMARY_LABEL_EN[k] : SUMMARY_LABEL_ZH[k]
      }))
    });
    this.buildStats();
    this.buildDailySummary();
  },

  /* ==================== 真实数据统计 ==================== */
  buildStats() {
    const records = app.globalData.records || [];
    const today = new Date();
    const todayKey = this.fmtDate(today);

    // 近 7 天每日统计（今天在最后）
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
      days.push({
        key: this.fmtDate(d),
        short: (d.getMonth() + 1) + '/' + d.getDate(),
        label: this.dayLabel(d),
        isToday: i === 0,
        feeds: 0,
        milk: 0,
        nursingMin: 0
      });
    }
    records.forEach(r => {
      if (!r || !r.date) return;
      const di = days.findIndex(x => x.key === r.date);
      if (di < 0) return;
      if (FEED_TYPES.indexOf(r.type) >= 0) days[di].feeds++;
      if (r.type === '配方奶') days[di].milk += r.amount || 0;
      if (r.type === '吸奶') days[di].milk += r.pumpTotal || ((r.pumpLeftAmt || 0) + (r.pumpRightAmt || 0));
      if (r.type === '母乳') days[di].nursingMin += Math.round((r.total || 0) / 60);
    });
    this._days = days;

    const todayDay = days[6];
    const yestDay = days[5];
    const diff = todayDay.milk - yestDay.milk;

    const fc = this.buildFeedChart(this.data.chartMode);
    this.setData({
      cards: [],
      feedDays: fc.days,
      feedUnit: fc.unit,
      feedColor: fc.color,
      days: days.map(d => ({ label: d.isToday ? (this._en() ? 'Today' : '今天') : d.short, isToday: d.isToday })),
      bars: this.buildBars(days, records)
    });
  },

  /* 近期喂养图：mode 0=瓶喂奶量，1=亲喂时长；每次记录一个数据块，横轴日期可滑动 */
  /* ==================== 每日喂养小结（可勾选显示项，真实统计） ==================== */
  loadSummaryOpts() {
    try {
      const o = wx.getStorageSync('panda_summary_opts');
      if (o && typeof o === 'object') return Object.assign({ feeds: true, milkPowder: false, milkBreast: false, pee: false, poop: false, sleep: true, memo: false }, o);
    } catch (e) {}
    return { feeds: true, milkPowder: false, milkBreast: false, pee: false, poop: false, sleep: true, memo: false };
  },
  buildDailySummary() {
    const opts = this.loadSummaryOpts();
    const today = new Date();
    const ymd = this.fmtDate(today);   // 带前导零 YYYY-MM-DD，与记录 r.date 完全一致（此前无前导零导致永远匹配不上）
    const records = app.globalData.records || [];
    let feeds = 0, milkPowder = 0, milkBreast = 0, pee = 0, poop = 0, sleepMin = 0;
    records.forEach(r => {
      if (!r || r.date !== ymd) return;
      // 喂奶次数 = 当天时间轴 亲喂 + 瓶喂母乳 + 瓶喂奶粉 总次数
      if (r.type === '母乳' || r.type === '配方奶' || r.type === '瓶喂母乳') feeds++;
      if (r.type === '配方奶' || r.type === '瓶喂母乳') {
        if (r.milkType === '瓶喂母乳' || r.type === '瓶喂母乳') milkBreast += r.amount || 0;   // 总瓶喂母乳量 = 全部瓶喂母乳的瓶喂量（不含吸奶）
        else milkPowder += r.amount || 0;                                                      // 总奶粉量 = 全部瓶喂奶粉的瓶喂量
      }
      if (r.type === '换尿布') {
        const c = r.diaperChoice || '';
        if (c.indexOf('嘘嘘') >= 0) pee++;
        if (c.indexOf('臭臭') >= 0) poop++;
      }
      // 总睡眠时长 = 当天时间轴所有睡眠记录时长（秒）转分钟求和
      if (r.type === '睡眠') sleepMin += (r.sleepSeconds || 0) / 60;
    });
    const sleepH = Math.floor(sleepMin / 60);
    const sleepM = sleepMin % 60;
    // 今日小记使用本地存储（不再使用 footprints）
    const memoList = wx.getStorageSync('panda_daily_memos') || [];
    const memo = memoList.find(x => x.type === 'memo' && (x.date === noPad(today) || x.date === ymd));
    const items = [];
    const en = this._en();
    const L = en ? SUMMARY_LABEL_EN : SUMMARY_LABEL_ZH;
    const push = (key, value, unit) => {
      if (opts[key]) items.push({ key, label: L[key], value: String(value), unit });
    };
    push('feeds', feeds, en ? 'times' : '次');
    push('milkPowder', milkPowder, 'ml');
    push('milkBreast', milkBreast, 'ml');
    push('pee', pee, en ? 'times' : '次');
    push('poop', poop, en ? 'times' : '次');
    push('sleep', (sleepH > 0 ? (en ? sleepH + 'h ' : sleepH + '小时') : '') + sleepM + (en ? 'm' : '分'), '');
    this.setData({
      summaryOpts: opts,
      summaryItems: items,
      memoText: memo ? (memo.text || '') : ''
    });
  },
  /* 设置勾选 */
  toggleSummarySettings() {
    this.setData({ summarySettingsVisible: !this.data.summarySettingsVisible });
  },
  closeSummarySettings() {
    this.setData({ summarySettingsVisible: false });
  },
  onSummaryOptToggle(e) {
    const key = e.currentTarget.dataset.key;
    const opts = Object.assign({}, this.data.summaryOpts);
    opts[key] = !opts[key];
    wx.setStorageSync('panda_summary_opts', opts);
    this.setData({ summaryOpts: opts });
    this.buildDailySummary();
  },
  /* 今日小记编辑 */
  openMemoEdit() {
    this.setData({ memoEditVisible: true });
  },
  closeMemoEdit() {
    this.setData({ memoEditVisible: false });
  },
  onMemoEditInput(e) {
    this.setData({ memoText: e.detail.value });
  },
  saveMemoEdit() {
    const text = (this.data.memoText || '').trim();
    if (!text) {
      wx.showToast({ title: this._en() ? 'Write something first' : '写点什么再保存吧', icon: 'none' });
      return;
    }
    const now = new Date();
    // 今日小记使用本地存储（不再使用 footprints）
    const memoList = wx.getStorageSync('panda_daily_memos') || [];
    memoList.push({ id: 'memo' + Date.now(), type: 'memo', text, date: ymd, time, createdAt: Date.now() });
    wx.setStorageSync('panda_daily_memos', memoList);
    this.setData({ memoEditVisible: false });
    this.buildDailySummary();
    wx.showToast({ title: this._en() ? 'Note saved' : '今日小记已保存', icon: 'success' });
  },

  buildFeedChart(mode) {
    const records = app.globalData.records || [];
    const today = new Date();
    const N = 7; // 近期 7 天（近一周）
    const days = [];
    for (let i = N - 1; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
      days.push({
        key: this.fmtDate(d),
        label: (d.getMonth() + 1) + '/' + d.getDate(),
        isToday: i === 0,
        blocks: []
      });
    }
    const isBottle = mode === 0;
    records.forEach(r => {
      if (!r || !r.date) return;
      const di = days.findIndex(x => x.key === r.date);
      if (di < 0) return;
      if (isBottle) {
        if (r.type !== '配方奶' && r.type !== '瓶喂母乳') return;
        const v = r.amount || 0;
        if (v <= 0) return;
        days[di].blocks.push({ v, time: r.time });
      } else {
        if (r.type !== '母乳') return;
        // 与喂养时间轴亲喂同源：总时长=total，旧数据缺 total 时用左右侧之和兜底；精确到 0.1 分钟
        const secs = (r.total || 0) || ((r.nursingL || 0) + (r.nursingR || 0));
        const v = Math.round(secs / 60 * 10) / 10;
        if (v <= 0) return;
        days[di].blocks.push({ v, time: r.time });
      }
    });
    days.forEach(d => d.blocks.sort((a, b) => (a.time || '').localeCompare(b.time || '')));
    let max = 1;
    days.forEach(d => d.blocks.forEach(b => { if (b.v > max) max = b.v; }));
    const H = 180;
    days.forEach(d => d.blocks.forEach(b => { b.h = Math.max(8, Math.round(b.v / max * H)); }));
    return {
      days,
      unit: isBottle ? 'ml' : (this._en() ? 'min' : '分钟'),
      color: isBottle ? '#7eb7ee' : '#ffd95a'
    };
  },

  onChartMode(e) {
    const mode = Number(e.currentTarget.dataset.mode);
    if (mode === this.data.chartMode) return;
    const subs = this._en()
      ? ['Bottle amount · unit ml', 'Nursing duration · unit min']
      : ['瓶喂奶量 · 单位 ml', '亲喂时长 · 单位 分钟'];
    const fc = this.buildFeedChart(mode);
    this.setData({
      chartMode: mode,
      chartSub: subs[mode],
      feedDays: fc.days,
      feedUnit: fc.unit,
      feedColor: fc.color
    });
  },

  buildBars(days, records) {
    const bars = [];
    records.forEach(r => {
      if (!r || !r.date || !r.time) return;
      const di = days.findIndex(x => x.key === r.date);
      if (di < 0) return;
      const meta = this.typeMeta(r);
      if (!meta) return;
      // 时间段记录 → 色块；仅时间点记录 → 圆点
      const seg = this.recordSegment(r);
      const slot = 100 / Math.max(1, days.length)
      const barW = 8
      bars.push({
        left: Math.round((di * slot + (slot - barW) / 2) * 10) / 10,
        w: barW,
        color: meta.color,
        type: meta.name,
        title: r.date + ' ' + r.time + ' ' + (this._en() ? (EN_LABEL[meta.name] || meta.name) : meta.name),
        detail: this.recordDetail(r),
        show: true,
        isPoint: !seg,
        time: r.time,
        startMin: seg ? seg.start : 0,
        hMin: seg ? seg.min : 0
      });
    });
    this.applyBarLayout(bars, this.data.hourUnit);
    return bars;
  },

  /* 记录时间段：睡眠/亲喂/吸奶/洗澡有起止 → 色块；其他仅时间点 → 圆点 */
  recordSegment(r) {
    const toM = (t) => {
      const p = String(t || '').split(':');
      if (p.length < 2 || p[0] === '' || isNaN(Number(p[0]))) return null;
      return (Number(p[0]) || 0) * 60 + (Number(p[1]) || 0);
    };
    let s = null, e = null;
    if (r.type === '睡眠') { s = toM(r.sleepStart); e = toM(r.sleepEnd); }
    else if (r.type === '母乳') { s = toM(r.nursingStart); e = toM(r.nursingEnd); }
    else if (r.type === '吸奶') { s = toM(r.pumpStart); e = toM(r.pumpEnd); }
    else if (r.type === '洗澡') { s = toM(r.bathStart); e = toM(r.bathEnd); }
    if (s === null || e === null || s === e) return null;
    let min = e - s;
    if (min < 0) min += 1440; // 跨天
    if (min <= 0) return null;
    return { start: s, min };
  },

  /* 竖轴拉伸：按 hourUnit（每小时rpx）计算圆角时间块位置，横向不缩放 */
  applyBarLayout(bars, unit) {
    const u = unit || this.data.hourUnit || 25;
    bars.forEach(b => {
      if (b.isPoint) {
        // 单点记录也做成圆角时间块（固定高度，居中于该时间刻度）
        const m = this.toMinutes(b.time);
        b.hRpx = 26;
        b.bottomRpx = Math.round(m / 60 * u + u / 2 - 13);
      } else {
        b.bottomRpx = Math.round(b.startMin / 60 * u + u / 2);
        b.hRpx = Math.max(14, Math.round(b.hMin / 60 * u));
      }
      b.circle = false;
    });
  },

  /* 统一设置每小时高度：默认铺满 24 小时不滚动，放大后超出 620rpx 才可上下滚动 */
  setHourUnit(unit) {
    const FIT_H = 620;
    const fitUnit = Math.floor(FIT_H / 24);
    const u = Math.max(fitUnit, Math.min(320, Math.round(unit)));
    const total = 24 * u;
    const bars = this.data.bars.map(b => Object.assign({}, b));
    this.applyBarLayout(bars, u);
    this.setData({
      hourUnit: u,
      bars,
      tlH: Math.min(FIT_H, total),
      tlScrollY: total > FIT_H
    });
  },

  /* 竖轴拉伸：放大/缩小（15~130 rpx/小时），横轴不可拉伸 */
  zoomIn() {
    this.setHourUnit((this.data.hourUnit || 25) + 16);
  },
  zoomOut() {
    this.setHourUnit((this.data.hourUnit || 25) - 16);
  },

  /* 双指捏合拉伸竖轴（15~130 rpx/小时），替代原 −/+ 按钮 */
  onTlTouchStart(e) {
    if (e.touches && e.touches.length === 2) {
      this._pinchDist = this.pinchDist(e.touches);
      this._pinchUnit = this.data.hourUnit || 25;
    }
  },
  onTlTouchMove(e) {
    if (e.touches && e.touches.length === 2) {
      const d = this.pinchDist(e.touches);
      if (this._pinchDist && d > 0) {
        const ratio = d / this._pinchDist;
        const u = Math.round(this._pinchUnit * ratio);
        if (u !== this.data.hourUnit) this.setHourUnit(u);
      }
    }
  },
  onTlTouchEnd() {
    this._pinchDist = null;
    this._pinchUnit = null;
  },
  pinchDist(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  },

  typeMeta(r) {
    if (r.type === '母乳') return { name: '亲喂', color: '#ffd95a' };
    if (r.type === '配方奶') return { name: '瓶喂奶粉', color: '#7eb7ee' };
    if (r.type === '吸奶') return { name: '吸奶', color: '#f2ad65' };
    if (r.type === '睡眠') return { name: '睡觉', color: '#8c79d8' };
    if (r.type === '辅食') return { name: '吃辅食', color: '#ef9a65' };
    if (r.type === '营养品') return { name: '营养补剂', color: '#45c2b6' };
    if (r.type === '喝水') return { name: '喝水', color: '#6f8ee0' };
    if (r.type === '体温') return { name: '体温', color: '#f08a5d' };
    if (r.type === '洗澡') return { name: '洗澡', color: '#7eb7ee' };
    if (r.type === '换尿布') {
      const c = r.diaperChoice || '嘘嘘';
      if (c === '嘘嘘+臭臭') return { name: '嘘嘘+臭臭', color: '#3aa79b' };
      if (c === '臭臭') return { name: '臭臭', color: '#c99a54' };
      return { name: '嘘嘘', color: '#45c2b6' };
    }
    return null;
  },

  /* ==================== 工具函数 ==================== */
  fmtDate(d) {
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  },

  dayLabel(d) {
    const weeks = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return weeks[d.getDay()];
  },

  toMinutes(t) {
    const p = String(t || '00:00').split(':').map(Number);
    return (p[0] || 0) * 60 + (p[1] || 0);
  },

  fmtMin(min) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h > 0 ? (h + ' 时' + (m ? ' ' + m + ' 分' : '')) : (m + ' 分');
  },

  goBack() {
    wx.navigateBack();
  },

  onFilter(e) {
    const name = e.currentTarget.dataset.name;
    let showAll = this.data.showAll;
    const sel = (this.data.selectedTypes || []).slice();
    if (name === '全部') {
      // 全部：取消所有类型选中，显示全部喂养块
      showAll = true;
      sel.length = 0;
    } else {
      const idx = sel.indexOf(name);
      if (idx >= 0) sel.splice(idx, 1);   // 再次点击取消仅显示该类型
      else sel.push(name);                // 多选：可同时选中多个类型
      showAll = sel.length === 0;
    }
    const filters = this.data.filters.map(f => {
      // 点击「全部」：只有全部按钮选中(黑灰)，其他按钮保持本来的浅色
      const on = name === '全部' ? (f.name === '全部' ? showAll : false) : sel.indexOf(f.name) >= 0;
      return Object.assign({}, f, { active: on });
    });
    this.setData({
      showAll,
      selectedTypes: sel,
      filters,
      bars: this.data.bars.map(b => Object.assign({}, b, {
        show: showAll || sel.indexOf(b.type) >= 0
      }))
    });
  },

  /* 点击喂养块：查看该条记录详情（与喂养时间轴记录内容一致） */
  onBarTap(e) {
    const b = this.data.bars[e.currentTarget.dataset.index];
    if (!b) return;
    this.setData({ tlDetail: { visible: true, title: b.title, desc: b.detail || '' } });
  },

  closeTlDetail() {
    this.setData({ 'tlDetail.visible': false });
  },

  noop() {},

  /* 记录详情（与我的-喂养记录时间轴保持一致） */
  recordDetail(r) {
    if (!r) return '';
    const en = this._en();
    switch (r.type) {
      case '母乳':
        return en
          ? 'Left ' + (r.nursingL || 0) + ' ml / Right ' + (r.nursingR || 0) + ' ml / Total ' + (r.total || 0) + ' ml'
          : '左 ' + (r.nursingL || 0) + 'ml / 右 ' + (r.nursingR || 0) + 'ml / 共 ' + (r.total || 0) + 'ml';
      case '配方奶': return (r.amount || 0) + 'ml';
      case '瓶喂母乳': return (r.amount || 0) + 'ml';
      case '吸奶':
        return en
          ? 'Left ' + (r.pumpLeftAmt || 0) + ' ml / Right ' + (r.pumpRightAmt || 0) + ' ml / Total ' + (r.pumpTotal || 0) + ' ml'
          : '左 ' + (r.pumpLeftAmt || 0) + 'ml / 右 ' + (r.pumpRightAmt || 0) + 'ml / 共 ' + (r.pumpTotal || 0) + 'ml';
      case '换尿布': {
        if (!en) {
          return (r.diaperChoice || '') + (r.diaperSize ? ' ' + r.diaperSize + '码' : '') + (r.peeColor ? ' 尿' + r.peeColor : '') + (r.stoolColor ? ' 便' + r.stoolColor : '');
        }
        const choice = EN_LABEL[r.diaperChoice] || (r.diaperChoice === '嘘嘘+臭臭' ? 'Wet + Dirty' : (r.diaperChoice || 'Dirty'));
        return choice + (r.diaperSize ? ' · size ' + r.diaperSize : '') + (r.peeColor ? ' · urine ' + r.peeColor : '') + (r.stoolColor ? ' · stool ' + r.stoolColor : '');
      }
      case '喝水': return (r.water || 0) + 'ml';
      case '睡眠':
        return en
          ? (r.sleepStart || '') + ' to ' + (r.sleepEnd || '') + ', ' + Math.round((r.sleepSeconds || 0) / 60) + ' min'
          : (r.sleepStart || '') + ' 至 ' + (r.sleepEnd || '') + ' 共 ' + Math.round((r.sleepSeconds || 0) / 60) + ' 分钟';
      case '辅食': return (r.simpleAmount || 0) + 'g' + (r.food ? ' ' + r.food : '');
      case '营养品': return (r.supps || []).join(en ? ', ' : '、') || '';
      case '语音记录': return r.note || '';
      default: return r.note || r.detail || '';
    }
  },

  genReport() {
    wx.navigateTo({ url: '/subchart/pages/weekly/weekly' });
  },

  toggleReference() {
    const show = !this.data.showReference;
    if (show) {
      this.setData({ showReference: true, feedStage: this.getFeedStage() });
    } else {
      this.setData({ showReference: false });
    }
  },

  /* 当前宝宝月龄（整月） */
  monthAge() {
    const baby = app.globalData.baby || {};
    const birthday = baby.birthday;
    if (!birthday) return -1;
    const b = String(birthday).split('-').map(Number);
    if (b.length < 2) return -1;
    const now = new Date();
    return Math.max(0, (now.getFullYear() - b[0]) * 12 + (now.getMonth() + 1 - b[1]));
  },

  /* 按宝宝月龄自动匹配国标喂养推荐档位 */
  getFeedStage() {
    const ma = this.monthAge();
    const en = this._en();
    let idx = FEED_STAGES.length - 1;
    for (let i = 0; i < FEED_STAGES.length; i++) {
      if (ma >= FEED_STAGES[i].min && ma < FEED_STAGES[i].max) { idx = i; break; }
    }
    const monthText = ma < 0 ? (en ? 'No birthday set yet' : '尚未设置宝宝生日')
      : ma < 1 ? (en ? 'Under 1 month old' : '1 个月内')
      : (en ? ma + ' months old' : ma + ' 个月');
    if (en) {
      const st = FEED_STAGES_EN[idx] || FEED_STAGES_EN[FEED_STAGES_EN.length - 1];
      return { label: st.label, rows: st.rows, note: st.note, monthText };
    }
    const stage = FEED_STAGES[idx] || FEED_STAGES[FEED_STAGES.length - 1];
    return { ...stage, monthText };
  }
});
