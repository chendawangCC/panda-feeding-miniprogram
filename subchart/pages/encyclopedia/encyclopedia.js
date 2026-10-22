const app = getApp();

Page({

  onShareAppMessage() {
    return {
        imageUrl: '/images/share-cover.png', title: '熊宝喂养 · 育儿百科全书', path: 'pages/encyclopedia/encyclopedia' };
  },
  onShareTimeline() {
    return { title: '熊宝喂养 · 育儿百科全书' };
  },
  data: {
    safeTop: (app.globalData && app.globalData.safeTop) || 88,
    tabs: [
      { key: 'baby', label: '宝宝' },
      { key: 'mom', label: '妈妈' }
    ],
    activeTab: 'baby',
    items: [],
    today: { key: '', title: '' },
    babyItems: [
      { key: 'baby_0to1', img: '/subchart/images/ency/ency-baby-0to1.jpg', title: '0—1 岁育儿', desc: '月龄里程碑与日常照护' },
      { key: 'baby_food', img: '/subchart/images/ency/ency-baby-food.jpg', title: '辅食添加', desc: '信号、顺序与过敏观察' },
      { key: 'baby_growth', img: '/subchart/images/ency/ency-baby-growth.jpg', title: '生长发育指南', desc: '翻身、坐立、互动能力' },
      { key: 'baby_can', img: '/subchart/images/ency/ency-baby-can.jpg', title: '能不能做', desc: '睡姿、出行与用品问答' },
      { key: 'baby_edu', img: '/subchart/images/ency/ency-baby-edu.jpg', title: '宝宝早教', desc: '越学越聪明' },
      { key: 'baby_premature', img: '/subchart/images/ency/ency-baby-premature.jpg', title: '早产儿护理', desc: '小心呵护，快快成长' },
      { key: 'baby_hand', img: '/subchart/images/ency/ency-baby-hand.jpg', title: '宝宝吃手', desc: '坏习惯怎么戒掉？' },
      { key: 'baby_head', img: '/subchart/images/ency/ency-baby-head.jpg', title: '宝宝头型', desc: '怎么睡头型，好头型影响' }
    ],
    momItems: [
      { key: 'mom_recover', img: '/subchart/images/ency/ency-mom-recover.jpg', title: '产后恢复', desc: '盆底、核心的运动恢复' },
      { key: 'mom_yuezi', img: '/subchart/images/ency/ency-mom-yuezi.jpg', title: '坐月子', desc: '休息、清洁与情绪照护' },
      { key: 'mom_eat', img: '/subchart/images/ency/ency-mom-eat.jpg', title: '能不能吃', desc: '食物选择与营养搭配' },
      { key: 'mom_bag', img: '/subchart/images/ency/ency-mom-bag.jpg', title: '待产包', desc: '住院、宝宝与出院清单' },
      { key: 'mom_chankang', img: '/subchart/images/ency/ency-mom-chankang.jpg', title: '产康的选择', desc: '越学越聪明' },
      { key: 'mom_wash', img: '/subchart/images/ency/ency-mom-wash.jpg', title: '能不能洗头', desc: '小心呵护，快快成长' },
      { key: 'mom_upgrade', img: '/subchart/images/ency/ency-mom-upgrade.jpg', title: '产后提升', desc: '坏习惯怎么戒掉？' },
      { key: 'mom_depress', img: '/subchart/images/ency/ency-mom-depress.jpg', title: '产后抑郁', desc: '怎么睡头型，好头型影响' }
    ]
  },

  onLoad() {
    this.switchTab({ currentTarget: { dataset: { key: 'baby' } } });
  },

  switchTab(e) {
    const key = e.currentTarget.dataset.key;
    const items = key === 'mom' ? this.data.momItems : this.data.babyItems;
    const today = key === 'mom'
      ? { key: 'mom_recover', title: '今日推荐：产后腹直肌分离恢复' }
      : { key: 'baby_food', title: '今日推荐：辅食第一周' };
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
