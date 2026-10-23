const app = getApp();

const FAQS = [
  { q: '如何添加宝宝？', qEn: 'How do I add a baby?', a: '进入「我的」→ 我的宝贝 → 新建档案，填写宝宝小名、头像、性别、出生日期等信息即可。新用户登录后也会引导添加宝宝，添加完成后才能开始记录。', aEn: 'Go to Me > My Baby > New Profile and fill in the nickname, avatar, gender and birthday. New users are guided to add a baby after signing in; recording starts once it is added.' },
  { q: '喂养记录如何保存与修改？', qEn: 'How are feeding records saved and edited?', a: '点击底部「+」可打开快速记录抽屉，选择记录类型填写详情后保存；记录页时间轴上的每条记录点击即可进入编辑页，可修改或删除。', aEn: 'Tap + at the bottom to open the quick-record sheet, pick a type, fill in the details and save. On the timeline, tap any record to open the edit page where you can change or delete it.' },
  { q: '数据会丢失吗？支持多设备同步吗？', qEn: 'Will data be lost? Does it sync across devices?', a: '数据默认保存在本机，并支持微信云开发云端同步（需部署 cloudData 云函数）。同一微信账号在不同设备登录后会自动拉取合并数据；家人可通过「多人协作与分享」加入同一家庭共同查看与记录。', aEn: 'Data is stored on the device by default, with WeChat Cloud sync support (cloudData cloud function must be deployed). The same WeChat account pulls and merges data on other devices. Family members can join the same family via Collaboration & Sharing.' },
  { q: '如何导出数据？', qEn: 'How do I export data?', a: '进入「我的」→ 数据导出，可选择喂养记录、宝宝档案等导出为图片或 PDF；喂养记录支持导出 Excel 表格。导出前可预览。', aEn: 'Go to Me > Export Data and choose feeding records or baby profiles as images or PDF; feeding records can also be exported as an Excel sheet. You can preview before exporting.' },
  { q: '疫苗提醒是怎么来的？', qEn: 'Where do vaccine reminders come from?', a: '宝宝成长档案中的疫苗记录会按国内接种程序，根据宝宝出生日期自动生成应种计划；到应种日期前 2 天会出现在今日提醒中。接种后可勾选已接种或修改日期。', aEn: "Vaccination records in the baby profile generate a schedule from the birthday following the national immunization program. Entries appear in today's reminders 2 days before the due date. After vaccination you can tick it off or change the date." },
  { q: '母乳储存时间怎么算的？', qEn: 'How is breast milk storage time calculated?', a: '按国标储存方法：常温（25℃）4 小时、冷藏（4℃）48 小时、冷冻（-18℃）3 个月。吸奶记录后自动计算到期时间，到期前会在保质期提醒中提示丢弃。', aEn: 'Based on national standards: room temperature (25°C) 4 hours, fridge (4°C) 48 hours, freezer (-18°C) 3 months. Expiry is calculated automatically after a pumping record and shows in storage alerts.' },
  { q: '语音录入识别失败怎么办？', qEn: 'What if voice input fails to recognise?', a: '语音识别依赖「微信同声传译」云函数（voiceAsr），需部署后可用。识别失败时会提示，可改用文字或手动记录；网络不佳时也会失败，请稍后重试。', aEn: 'Voice recognition depends on the WeChat simultaneous interpretation cloud function (voiceAsr), which must be deployed. When it fails you can record with text or manually. Poor network can also cause failures, so try again later.' },
  { q: '天气温度怎么来的？', qEn: 'Where does the weather come from?', a: '天气由和风天气 API 提供，需要你授权位置信息用于定位所在城市（也可手动设置城市）。天气数据 30 分钟内有效，自动刷新。', aEn: 'Weather comes from the QWeather API and needs location permission to detect your city (or set it manually). Data stays valid for 30 minutes and refreshes automatically.' },
  { q: '如何开启提醒推送？', qEn: 'How do I enable reminder push?', a: '「我的」→ 账号设置 → 权限与隐私 → 开启微信订阅消息推送（需在小程序后台配置订阅消息模板）。站内提醒（今日提醒弹窗、日历红点）可在权限与隐私中按类型开关。', aEn: "Me > Account Settings > Permissions & Privacy > enable WeChat subscription messages (templates must be configured in the mini program console). In-app reminders (today's reminder popup, calendar dots) can be toggled by type in Permissions & Privacy." },
  { q: '账号如何退出或切换？', qEn: 'How do I sign out or switch accounts?', a: '「我的」→ 账号设置 → 切换用户，可选择退出登录或切换微信账号。退出后本地数据保留，登录后自动同步。', aEn: 'Me > Account Settings > Switch User; you can sign out or switch WeChat accounts. Local data is kept after signing out and syncs automatically after signing in.' }
];

Page({
  data: {
    lang: 'zh',
    safeTop: (app.globalData && app.globalData.safeTop) || 88,
    faqs: [],
    fbTypes: ['功能建议', '问题反馈', '内容纠错', '其他'],
    fbTypesEn: ['Feature request', 'Problem report', 'Content correction', 'Other'],
    fbTypeIdx: 0,
    fbText: '',
    fbContact: ''
  },

  _en() { return (wx.getStorageSync('lang') || this.data.lang || 'zh') === 'en'; },
  _t(zh, enTxt) { return this._en() ? enTxt : zh; },

  onLoad() {
    const en = (wx.getStorageSync('lang') || 'zh') === 'en';
    this.setData({
      lang: en ? 'en' : 'zh',
      faqs: FAQS.map(f => Object.assign({}, f, {
        q: en ? f.qEn : f.q,
        a: en ? f.aEn : f.a,
        open: false
      })),
      fbTypes: en ? ['Feature request', 'Problem report', 'Content correction', 'Other'] : ['功能建议', '问题反馈', '内容纠错', '其他'],
      fbTypeIdx: 0
    });
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
      wx.showToast({ title: this._t('请填写反馈内容', 'Please enter your feedback'), icon: 'none' });
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
      title: this._t('反馈已收到', 'Feedback received'),
      content: this._t('感谢你的反馈，我们会认真阅读并持续改进。如需跟进，请留意联系方式。', 'Thanks for your feedback — we read every message. We will contact you if follow-up is needed.'),
      showCancel: false,
      confirmText: this._t('好的', 'OK')
    });
  },

  goBack() {
    wx.navigateBack();
  }
});
