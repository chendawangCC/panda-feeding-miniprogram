const app = getApp();

Page({

  onShareAppMessage() {
    return {
        imageUrl: '/images/share-cover.png', title: '熊宝喂养 · 家庭成员管理', path: 'pages/family-editor/family-editor' };
  },
  onShareTimeline() {
    return { title: '熊宝喂养 · 家庭成员管理' };
  },
  data: {
    safeTop: (app.globalData && app.globalData.safeTop) || 88,
    index: 0,
    member: {
      name: '',
      relation: '爸爸',
      avatar: '👨',
      invite: true,
      record: true,
      share: false,
      feeding: '可编辑'
    },
    relations: ['爸爸', '妈妈', '奶奶', '姥姥', '爷爷', '其他亲友'],
    feedingOptions: ['可查看', '可编辑'],
    babyName: ''
  },

  onShow() {
    this.setData({ babyName: (app.globalData.baby || {}).name || '' });
  },

  onLoad(options) {
    const index = Number(options.index || 0);
    const member = app.globalData.familyMembers[index];
    if (member) {
      this.setData({ index, member: { ...member } });
    }
  },

  goBack() {
    wx.navigateBack();
  },

  onRelation(e) {
    this.setData({ 'member.relation': this.data.relations[Number(e.detail.value)] });
  },

  onFeeding(e) {
    this.setData({ 'member.feeding': this.data.feedingOptions[Number(e.detail.value)] });
  },

  onToggle(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ ['member.' + field]: e.detail.value });
  },

  save() {
    const list = app.globalData.familyMembers.slice();
    list[this.data.index] = { ...this.data.member };
    app.globalData.familyMembers = list;
    app.persist();
    wx.showToast({ title: '亲友设置已保存', icon: 'none' });
    setTimeout(() => wx.navigateBack(), 600);
  },

  inviteWechat() {
    wx.showToast({ title: '已唤起微信邀请', icon: 'none' });
  },

  remove() {
    wx.showModal({
      title: '移除亲友',
      content: '确定移除' + this.data.member.name + '吗？',
      confirmColor: '#c14c2e',
      success: (res) => {
        if (res.confirm) {
          const list = app.globalData.familyMembers.slice();
          list.splice(this.data.index, 1);
          app.globalData.familyMembers = list;
          app.persist();
          wx.showToast({ title: '已移除该亲友', icon: 'none' });
          setTimeout(() => wx.navigateBack(), 600);
        }
      }
    });
  }
});
