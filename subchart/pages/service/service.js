const app = getApp();

const FAQS = [
  { q: '如何添加宝宝？', a: '进入「我的」→ 我的宝贝 → 新建档案，填写宝宝小名、头像、性别、出生日期等信息即可。新用户登录后也会引导添加宝宝，添加完成后才能开始记录。' },
  { q: '喂养记录如何保存与修改？', a: '点击底部「+」可打开快速记录抽屉，选择记录类型填写详情后保存；记录页时间轴上的每条记录点击即可进入编辑页，可修改或删除。' },
  { q: '数据会丢失吗？支持多设备同步吗？', a: '数据默认保存在本机，并支持微信云开发云端同步（需部署 cloudData 云函数）。同一微信账号在不同设备登录后会自动拉取合并数据；家人可通过「多人协作与分享」加入同一家庭共同查看与记录。' },
  { q: '如何导出数据？', a: '进入「我的」→ 数据导出，可选择喂养记录、宝宝档案等导出为图片或 PDF；喂养记录支持导出 Excel 表格。导出前可预览。' },
  { q: '疫苗提醒是怎么来的？', a: '宝宝成长档案中的疫苗记录会按国内接种程序，根据宝宝出生日期自动生成应种计划；到应种日期前 2 天会出现在今日提醒中。接种后可勾选已接种或修改日期。' },
  { q: '母乳储存时间怎么算的？', a: '按国标储存方法：常温（25℃）4 小时、冷藏（4℃）48 小时、冷冻（-18℃）3 个月。吸奶记录后自动计算到期时间，到期前会在保质期提醒中提示丢弃。' },
  { q: '语音录入识别失败怎么办？', a: '语音识别依赖「微信同声传译」云函数（voiceAsr），需部署后可用。识别失败时会提示，可改用文字或手动记录；网络不佳时也会失败，请稍后重试。' },
  { q: '天气温度怎么来的？', a: '天气由和风天气 API 提供，需要你授权位置信息用于定位所在城市（也可手动设置城市）。天气数据 30 分钟内有效，自动刷新。' },
  { q: '如何开启提醒推送？', a: '「我的」→ 账号设置 → 权限与隐私 → 开启微信订阅消息推送（需在小程序后台配置订阅消息模板）。站内提醒（今日提醒弹窗、日历红点）可在权限与隐私中按类型开关。' },
  { q: '账号如何退出或切换？', a: '「我的」→ 账号设置 → 切换用户，可选择退出登录或切换微信账号。退出后本地数据保留，登录后自动同步。' }
];

Page({
  data: {
    safeTop: (app.globalData && app.globalData.safeTop) || 88,
    faqs: FAQS.map(f => Object.assign({}, f, { open: false })),
    fbTypes: ['功能建议', '问题反馈', '内容纠错', '其他'],
    fbTypeIdx: 0,
    fbText: '',
    fbContact: ''
  },

  toggleFaq(e) {
    const i = e.currentTarget.dataset.index;
    this.setData({ ['faqs[' + i + '].open']: !this.data.faqs[i].open });
  },

  onFbType(e) {
    this.setData({ fbTypeIdx: Number(e.detail.value) });
  },
  onFbInput(e) {
    this.setData({ fbText: e.detail.value });
  },
  onFbContact(e) {
    this.setData({ fbContact: e.detail.value });
  },

  /* 意见反馈：保存到本地反馈箱（可在设置页查看），并提示已收到 */
  submitFeedback() {
    const text = (this.data.fbText || '').trim();
    if (!text) {
      wx.showToast({ title: '请填写反馈内容', icon: 'none' });
      return;
    }
    const fb = {
      id: 'fb_' + Date.now(),
      type: this.data.fbTypes[this.data.fbTypeIdx],
      text: text,
      contact: (this.data.fbContact || '').trim(),
      time: new Date().toLocaleString('zh-CN'),
      createdAt: Date.now()
    };
    let list = [];
    try { list = wx.getStorageSync('panda_feedback') || []; } catch (e) {}
    list.unshift(fb);
    try { wx.setStorageSync('panda_feedback', list.slice(0, 100)); } catch (e) {}
    this.setData({ fbText: '', fbContact: '', fbTypeIdx: 0 });
    wx.showModal({
      title: '反馈已收到',
      content: '感谢你的反馈，我们会认真阅读并持续改进。如需跟进，请留意联系方式。',
      showCancel: false,
      confirmText: '好的'
    });
  },

  goBack() {
    wx.navigateBack();
  }
});
