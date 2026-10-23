const app = getApp();

Component({
  data: {
    selected: 0,
    hidden: false,
    homeLabel: '首页',
    meLabel: '我的'
  },
  lifetimes: {
    attached() {
      const lang = wx.getStorageSync('lang') || 'zh';
      this.setData({
        homeLabel: lang === 'en' ? 'Home' : '首页',
        meLabel: lang === 'en' ? 'Me' : '我的'
      });
    }
  },
  methods: {
    switchTab(e) {
      const path = e.currentTarget.dataset.path;
      wx.switchTab({ url: path });
    },
    onAdd() {
      // 检查登录状态
      const user = app.getUser();
      if (!user.logged) {
        wx.showModal({
          title: '提示',
          content: '请先登录账号',
          showCancel: false,
          success: () => {
            app.globalData.pendingLogin = true;
            wx.switchTab({ url: '/pages/plan/plan' });
          }
        });
        return;
      }
      // 检查是否有宝宝
      if (!app.globalData.babies || !app.globalData.babies.length) {
        wx.showModal({
          title: '提示',
          content: '请先添加宝宝',
          showCancel: false,
          success: () => {
            wx.navigateTo({ url: '/pages/my-babies/my-babies' });
          }
        });
        return;
      }
      // 中央大号 +：单击 → 弹出快速记录抽屉（米黄背景）；未在记录页时先跳转
      const pages = getCurrentPages();
      const cur = pages[pages.length - 1];
      const isPlan = cur && cur.route === 'pages/plan/plan';
      if (isPlan) {
        if (cur && typeof cur.openQuick === 'function') cur.openQuick();
      } else {
        app.globalData.pendingQuickAdd = true;
        wx.switchTab({ url: '/pages/plan/plan' });
      }
    },
    onAddLong() {
      // 长按 +：进入语音录入（语音记录面板）；点击无效，仅长按触发
      app.globalData.pendingVoice = true;
      wx.switchTab({ url: '/pages/plan/plan' });
    }
  }
});
