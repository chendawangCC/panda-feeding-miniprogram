const app = getApp();

Page({

  onShareAppMessage() {
    return {
        imageUrl: '/images/share-cover.png', title: this._t('熊宝喂养 · 育儿百科全书', 'Panda Feeding · Parenting Encyclopedia'), path: 'pages/encyclopedia/encyclopedia' };
  },
  onShareTimeline() {
    return { title: this._t('熊宝喂养 · 育儿百科全书', 'Panda Feeding · Parenting Encyclopedia') };
  },
  data: {
    lang: 'zh',
    safeTop: (app.globalData && app.globalData.safeTop) || 88,
    tabs: [
      { key: 'baby', label: '宝宝', labelEn: 'Baby' },
      { key: 'mom', label: '妈妈', labelEn: 'Mom' }
    ],
    activeTab: 'baby',
    items: [],
    today: { key: '', title: '' },
    babyItems: [
      { key: 'baby_0to1', img: '/subchart/images/ency/ency-baby-0to1.jpg', title: '0—1 岁育儿', titleEn: '0-1 Year Care', desc: '月龄里程碑与日常照护', descEn: 'Milestones & daily care by month' },
      { key: 'baby_food', img: '/subchart/images/ency/ency-baby-food.jpg', title: '辅食添加', titleEn: 'Starting Solids', desc: '信号、顺序与过敏观察', descEn: 'Readiness signs, order & allergy watch' },
      { key: 'baby_growth', img: '/subchart/images/ency/ency-baby-growth.jpg', title: '生长发育指南', titleEn: 'Growth & Development', desc: '翻身、坐立、互动能力', descEn: 'Rolling, sitting up, interaction skills' },
      { key: 'baby_can', img: '/subchart/images/ency/ency-baby-can.jpg', title: '能不能做', titleEn: 'Is It OK?', desc: '睡姿、出行与用品问答', descEn: 'Sleep position, travel & gear questions' },
      { key: 'baby_edu', img: '/subchart/images/ency/ency-baby-edu.jpg', title: '宝宝早教', titleEn: 'Early Learning', desc: '越学越聪明', descEn: 'Learn a little more every day' },
      { key: 'baby_premature', img: '/subchart/images/ency/ency-baby-premature.jpg', title: '早产儿护理', titleEn: 'Preemie Care', desc: '小心呵护，快快成长', descEn: 'Gentle care for steady growth' },
      { key: 'baby_hand', img: '/subchart/images/ency/ency-baby-hand.jpg', title: '宝宝吃手', titleEn: 'Hand-sucking', desc: '坏习惯怎么戒掉？', descEn: 'How to break the habit gently' },
      { key: 'baby_head', img: '/subchart/images/ency/ency-baby-head.jpg', title: '宝宝头型', titleEn: 'Head Shape', desc: '怎么睡头型，好头型影响', descEn: 'Sleep positions and head shape' }
    ],
    momItems: [
      { key: 'mom_recover', img: '/subchart/images/ency/ency-mom-recover.jpg', title: '产后恢复', titleEn: 'Postpartum Recovery', desc: '盆底、核心的运动恢复', descEn: 'Pelvic floor & core workouts' },
      { key: 'mom_yuezi', img: '/subchart/images/ency/ency-mom-yuezi.jpg', title: '坐月子', titleEn: 'Confinement Month', desc: '休息、清洁与情绪照护', descEn: 'Rest, hygiene and emotional care' },
      { key: 'mom_eat', img: '/subchart/images/ency/ency-mom-eat.jpg', title: '能不能吃', titleEn: 'What Can I Eat?', desc: '食物选择与营养搭配', descEn: 'Food choices & balanced nutrition' },
      { key: 'mom_bag', img: '/subchart/images/ency/ency-mom-bag.jpg', title: '待产包', titleEn: 'Hospital Bag', desc: '住院、宝宝与出院清单', descEn: 'Admission, baby and discharge list' },
      { key: 'mom_chankang', img: '/subchart/images/ency/ency-mom-chankang.jpg', title: '产康的选择', titleEn: 'Choosing Postpartum Care', desc: '越学越聪明', descEn: 'Learn a little more every day' },
      { key: 'mom_wash', img: '/subchart/images/ency/ency-mom-wash.jpg', title: '能不能洗头', titleEn: 'Can I Wash My Hair?', desc: '小心呵护，快快成长', descEn: 'Gentle care for steady recovery' },
      { key: 'mom_upgrade', img: '/subchart/images/ency/ency-mom-upgrade.jpg', title: '产后提升', titleEn: 'Postpartum Upgrade', desc: '坏习惯怎么戒掉？', descEn: 'How to build better habits' },
      { key: 'mom_depress', img: '/subchart/images/ency/ency-mom-depress.jpg', title: '产后抑郁', titleEn: 'Postpartum Blues', desc: '怎么睡头型，好头型影响', descEn: 'Sleep, head shape and mood' }
    ]
  },

  _en() {
    return (wx.getStorageSync('lang') || this.data.lang || 'zh') === 'en';
  },
  _t(zh, enTxt) { return this._en() ? enTxt : zh; },

  /* 按当前语言输出卡片文案（底层 key/图片不变） */
  _itemsOf(key, en) {
    const src = key === 'mom' ? this.data.momItems : this.data.babyItems;
    return src.map(it => ({
      key: it.key,
      img: it.img,
      title: en ? (it.titleEn || it.title) : it.title,
      desc: en ? (it.descEn || it.desc) : it.desc
    }));
  },

  onLoad() {
    const en = (wx.getStorageSync('lang') || 'zh') === 'en';
    this.setData({
      lang: en ? 'en' : 'zh',
      tabs: this.data.tabs.map(t => ({ key: t.key, label: en ? t.labelEn : t.label }))
    });
    this.switchTab({ currentTarget: { dataset: { key: 'baby' } } });
  },

  switchTab(e) {
    const key = e.currentTarget.dataset.key;
    const en = this._en();
    const items = this._itemsOf(key, en);
    const today = key === 'mom'
      ? { key: 'mom_recover', title: en ? 'Diastasis Recti Recovery' : '今日推荐：产后腹直肌分离恢复' }
      : { key: 'baby_food', title: en ? 'First Week of Solids' : '今日推荐：辅食第一周' };
    this.setData({ activeTab: key, items, today });
  },

  openArticle(e) {
    const key = e.currentTarget.dataset.key;
    if (!key) return;
    wx.navigateTo({ url: '/subchart/pages/encyclopedia-detail/encyclopedia-detail?key=' + key });
  },

  openToday() {
    const key = this.data.today.key;
    if (!key) return;
    wx.navigateTo({ url: '/subchart/pages/encyclopedia-detail/encyclopedia-detail?key=' + key });
  },

  goBack() {
    wx.navigateBack();
  }
});
