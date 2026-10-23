const app = getApp();

Page({

  onShareAppMessage() {
    return {
        imageUrl: '/images/share-cover.png', title: '熊宝喂养 · 我的宝贝', path: 'pages/my-babies/my-babies' };
  },
  onShareTimeline() {
    return { title: '熊宝喂养 · 我的宝贝' };
  },
  data: {
    lang: 'zh',
    genderMap: { '男宝宝': 'Boy', '女宝宝': 'Girl', '暂不填写': 'Not now' },
    safeTop: (app.globalData && app.globalData.safeTop) || 88,
    babies: [],
    currentBabyId: ''
  },

  onShow() {
    // 先显示本地数据，快速响应
    this.refresh();
    // 后台再刷新云端数据
    const cs = require('../../utils/cloud-sync.js');
    if (!cs.cloudReady()) return;
    cs.getMyFamily().then(() => {
      return cs.pull();
    }).then(() => {
      // 检查待审核状态
      try {
        const myOpenid = (app.globalData.user || {}).openid || '';
        const fams = app.globalData.myFamilies || [];
        let pendingJoin = null;
        for (const fam of fams) {
          if (fam.ownerOpenid !== myOpenid) {
            const me = (fam.pendingApplications || []).find(m => m && m.openid === myOpenid);
            if (me && (me.status || 'pending') !== 'rejected') {
              pendingJoin = { familyId: fam._id, familyName: fam.name, status: 'pending' };
              break;
            }
          }
        }
        app.globalData.pendingJoin = pendingJoin;
        if (pendingJoin) {
          app.globalData.myFamily = null;
        }
      } catch (e) {}
      this.refresh();
      // 切换到第一个可见宝宝（如果当前宝宝被移除）
      if (app.globalData.babies && app.globalData.babies.length) {
        const cur = app.globalData.babies.find(b => b.id === app.globalData.currentBabyId);
        if (!cur) {
          app.switchBaby(app.globalData.babies[0].id);
          this.refresh();
        }
      }
    }).catch(() => {});
  },

  refresh() {
    const lang = wx.getStorageSync('lang') || 'zh';
    this.setData({ lang: lang });
    const user = app.getUser();
    // 未登录状态：清空所有宝宝信息
    if (!user.logged) {
      app.globalData.babies = [];
      app.globalData.baby = null;
      app.globalData.currentBabyId = '';
      this.setData({ babies: [], currentBabyId: '' });
      return;
    }
    // 已登录：优先使用 globalData 中的最新数据（云端 pull 后已包含共享宝宝）
    // 只有当 globalData 中没有宝宝时，才从本地存储恢复（避免本地存储覆盖云端共享宝宝）
    // 注意：删除宝宝后不要从本地存储恢复（云端已删，本地也应该清空）
    if (!app.globalData.babies || !app.globalData.babies.length) {
      // 检查是否刚删除过宝宝（如果云端 pull 后还是空的，就不要从本地恢复）
      // 直接使用空列表，等下次登录或 pull 再同步
      app.globalData.babies = [];
      app.globalData.currentBabyId = '';
      app.globalData.baby = null;
    }
    const myOpenid = (app.globalData.user || {}).openid || '';
    // 按创建时间从前到后排序（最早创建的排在前面）
    let sortedBabies = (app.globalData.babies || []).slice().sort((a, b) => {
      const aTime = a.createdAt || 0;
      const bTime = b.createdAt || 0;
      return aTime - bTime;
    });
    // 家庭状态判断：同时检查 myFamily、myFamilies 和权限缓存，确保亲友端加入家庭后能正确显示共享宝宝
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
      sortedBabies = sortedBabies.filter(b => !b.ownerOpenid || b.ownerOpenid === myOpenid);
    }
    // 兜底：如果过滤后列表为空，但当前 globalData.baby 有值，确保它出现在列表中
    if (!sortedBabies.length && app.globalData.baby && app.globalData.baby.id) {
      sortedBabies = [app.globalData.baby];
    }
    // 判断是否是亲友（已加入家庭但不是创建者）
    // 同时检查 myFamily 和 myFamilies，确保兼容不同数据结构
    const myFam = app.globalData.myFamily;
    const myFams = app.globalData.myFamilies || [];
    // 查找当前用户加入的家庭（ownerOpenid 不是自己的家庭）
    let joinedFam = null;
    if (myFam && myFam.ownerOpenid && myFam.ownerOpenid !== myOpenid) {
      joinedFam = myFam;
    } else {
      joinedFam = myFams.find(f => f && f.ownerOpenid && f.ownerOpenid !== myOpenid);
    }
    const isFamilyMember = !!joinedFam;
    // 检查是否有共享宝宝
    const hasSharedBaby = sortedBabies.some(b => b.ownerOpenid && b.ownerOpenid !== myOpenid);
    this.setData({
      babies: sortedBabies.map(b => ({
        ...b,
        avatar: (b.avatar && b.avatar.indexOf('cloud://') === 0) ? '/images/brand-logo.png' : (b.avatar || '/images/brand-logo.png'),
        isShared: !!(b.ownerOpenid && b.ownerOpenid !== myOpenid)
      })),
      currentBabyId: app.globalData.currentBabyId,
      isFamilyMember: isFamilyMember,
      hasSharedBaby: hasSharedBaby
    });
    // 若当前宝宝被移除，则回退到第一个
    if (app.globalData.babies && app.globalData.babies.length) {
      const cur = app.globalData.babies.find(b => b.id === app.globalData.currentBabyId);
      if (!cur) {
        app.switchBaby(app.globalData.babies[0].id);
        this.setData({ babies: app.globalData.babies || [], currentBabyId: app.globalData.currentBabyId });
      }
    }
  },

  goBack() {
    wx.navigateBack();
  },

  addBaby() {
    wx.navigateTo({ url: '/pages/baby-edit/baby-edit?add=1' });
  },

  switchBaby(e) {
    const id = e.currentTarget.dataset.id;
    if (!id || id === app.globalData.currentBabyId) return;
    app.switchBaby(id);
    this.refresh();
    wx.showToast({ title: '已切换到「' + (app.globalData.baby.name || '') + '」', icon: 'none' });
  },

  editBaby(e) {
    wx.navigateTo({ url: '/pages/baby-edit/baby-edit?id=' + e.currentTarget.dataset.id });
  },

  removeBaby(e) {
    const id = e.currentTarget.dataset.id;
    const b = (app.globalData.babies || []).find(x => x.id === id);
    const en = this.data.lang === 'en';
    const name = (b && b.name) || (en ? 'this baby' : '该宝宝');
    wx.showModal({
      title: en ? 'Remove Baby' : '移除宝宝',
      content: en ? ('Remove "' + name + '"? All records of this baby will be deleted permanently.') : ('确定移除「' + name + '」吗？该宝宝的记录等数据将一并删除，且无法恢复。'),
      confirmText: en ? 'Remove' : '移除',
      cancelText: en ? 'Cancel' : '取消',
      confirmColor: '#d9534f',
      success: (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: en ? 'Deleting...' : '正在删除...', mask: true });
        app.removeBaby(id).then(ok => {
          wx.hideLoading();
          if (!ok) return;
          this.refresh();
          wx.showToast({ title: en ? 'Removed' : '已移除', icon: 'none' });
        }).catch(() => { wx.hideLoading(); });
      }
    });
  }
});
