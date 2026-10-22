// 抽屉/弹窗显隐与 tabBar 联动：页面级计数（任一弹层打开 → 立即隐藏 tabBar；全部关闭 → 立即恢复，无延迟无动画）
// 使用页面实例上的 _ovl 计数，避免多个页面共享全局计数相互干扰

Component({
  options: { multipleSlots: true },
  properties: {
    visible: { type: Boolean, value: false },
    title: { type: String, value: '' },
    kicker: { type: String, value: '' },
    // position: 'bottom' 底部抽屉 | 'center' 居中卡片
    position: { type: String, value: 'bottom' },
    // noHandle: 隐藏顶部拖拽把手
    noHandle: { type: Boolean, value: false },
    // bg: 自定义抽屉背景色（默认 #fffdf7 米白）
    bg: { type: String, value: '' },
    // noClose: 隐藏右上角关闭按钮（配合 maskClosable=false 不可手动关闭）
    noClose: { type: Boolean, value: false },
    // maskClosable: 点击遮罩是否关闭（默认可关）
    maskClosable: { type: Boolean, value: true },
    // noSafe: 底部抽屉不加安全区 padding（贴底显示）
    noSafe: { type: Boolean, value: false },
    // keepTab: 保持 tabBar 显示（引导类弹窗不参与隐藏 tabBar 计数）
    keepTab: { type: Boolean, value: false }
  },
  observers: {
    visible(v) {
      const cur = this.currentPage();
      if (!cur) return;
      if (this.data.keepTab) return;
      cur._ovl = cur._ovl || 0;
      cur._ovl = v ? cur._ovl + 1 : Math.max(0, cur._ovl - 1);
      const tab = cur.getTabBar ? cur.getTabBar() : null;
      if (tab && tab.setData) tab.setData({ hidden: (cur._ovl || 0) > 0 });
      // 页面若有统一的 syncTabBar（综合非 dialog 弹层状态），交给它
      if (cur.syncTabBar && cur._ovlSync !== false) {
        try { cur.syncTabBar(); } catch (e) {}
      }
    }
  },
  methods: {
    noop() {},
    currentPage() {
      try {
        const pages = getCurrentPages();
        return pages && pages[pages.length - 1];
      } catch (e) { return null; }
    },
    onClose() {
      this.triggerEvent('close');
    }
  }
});
