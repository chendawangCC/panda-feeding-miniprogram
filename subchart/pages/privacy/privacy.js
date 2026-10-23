const REMIND_KEY = 'panda_remind_settings';
const PUSH_KEY = 'panda_push_enabled';
const cs = require('../../../utils/cloud-sync.js');

const app = getApp();
const SCOLE_LIST_CONST = () => SCOPE_LIST;

// 权限清单：仅列当前小程序真实使用的能力，点击可实际触发授权
const SCOPE_LIST = [
  { scope: 'scope.record', key: 'record', icon: '/images/icons/rec-voice.png', name: '麦克风', nameEn: 'Microphone', desc: '语音录入', descEn: 'Voice input' },
  { scope: 'scope.userLocation', key: 'userLocation', icon: '/images/icons/icon-location.png', name: '位置信息', nameEn: 'Location', desc: '获取所在地区实时天气', descEn: 'Local weather of your area' },
  { scope: 'scope.writePhotosAlbum', key: 'writePhotosAlbum', icon: '/images/icons/icon-album.png', name: '保存到相册', nameEn: 'Save to album', desc: '导出图片 / 周报保存到手机相册', descEn: 'Save exported images / weekly reports to your phone' }
];

const REMIND_DEF = { vaccine: true, nutrition: true, stock: true, milk: true, feed: true, memo: true };
const REMIND_ITEMS = [
  { key: 'vaccine', icon: '/images/icons/icon-vaccine.png', name: '疫苗提醒', nameEn: 'Vaccine reminders', desc: '临期疫苗应种提醒（含日历红点）', descEn: 'Upcoming vaccinations (incl. calendar dots)' },
  { key: 'nutrition', icon: '/images/icons/rec-supplement.png', name: '营养品提醒', nameEn: 'Supplement reminders', desc: '维生素 D / 营养品补充提醒', descEn: 'Vitamin D / supplement top-ups' },
  { key: 'stock', icon: '/images/icons/cube.svg', name: '库存与保质期', nameEn: 'Stock & expiry', desc: '库存预警、耗材保质期与保修期到期', descEn: 'Low stock, expiry and warranty alerts' },
  { key: 'milk', icon: '/images/icons/rec-bottle.png', name: '母乳到期', nameEn: 'Milk expiry', desc: '吸奶记录按国标时限到期提醒', descEn: 'Pumping-based expiry reminders by national standard' },
  { key: 'feed', icon: '/images/icons/rec-nursing.png', name: '喂养提醒', nameEn: 'Feeding reminders', desc: '喂养间隔 / 补奶建议提醒', descEn: 'Feeding interval / top-up suggestions' },
  { key: 'memo', icon: '/images/icons/book.svg', name: '每日小记', nameEn: 'Daily memo', desc: '每天到点提醒记录今日小记', descEn: 'A daily nudge to log today’s note' }
];

Page({
  data: { logged: false, },

  onShareAppMessage() {
    return {
        imageUrl: '/images/share-cover.png', title: this._t('熊宝喂养 · 隐私与权限', 'Panda Feeding · Privacy & Permissions'), path: 'pages/privacy/privacy' };
  },
  onShareTimeline() {
    return { title: this._t('熊宝喂养 · 隐私与权限', 'Panda Feeding · Privacy & Permissions') };
  },
  data: {
    lang: 'zh',
    safeTop: (app.globalData && app.globalData.safeTop) || 88,
    permissions: [],
    reminds: Object.assign({}, REMIND_DEF),
    remindItems: REMIND_ITEMS,
    storageText: '0 KB',
    pushEnabled: false
  },

  /* 注销账号：二次确认 → 云端永久删除 → 本地清空 → 回到未登录 */
  onDeleteAccount() {
    const cloudData = require('../../../utils/cloud-data.js');
    const cloudSync = require('../../../utils/cloud-sync.js');
    wx.showModal({
      title: this._t('注销账号', 'Delete account'),
      content: this._t('注销后，你的全部喂养记录、宝宝档案、库存、疫苗记录将被永久删除，且无法恢复。共享给你的宝宝数据仍保留在创建者账号中。再次登录将是全新账号。确定继续吗？', 'All your feeding records, baby profiles, stock and vaccine records will be permanently deleted and cannot be restored. Baby data shared with you stays with its creator. Signing in again creates a brand-new account. Continue?'),
      confirmText: this._t('确认注销', 'Delete'),
      cancelText: this._t('再想想', 'Not now'),
      confirmColor: '#d9534f',
      success: (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: this._t('正在注销...', 'Deleting...'), mask: true });
        
        // 第一步：退出家庭（如果在家庭中），确保共享宝宝数据不被删除
        const logoutFlow = () => {
          cloudData.deleteAccount().then(() => {
            wx.hideLoading();
            app.clearAllLocalData();
            app.saveUser({ logged: false, phone: '', openid: '', nickname: '', avatar: '' });
            this.setData({ logged: false });
            wx.showModal({
              title: this._t('已注销', 'Account deleted'),
              content: this._t('账号数据已全部删除，再次登录将是全新账号', 'All account data has been deleted. Signing in again creates a new account.'),
              showCancel: false,
              success: () => {
                wx.switchTab({ url: '/pages/plan/plan' });
              }
            });
          }).catch(err => {
            wx.hideLoading();
            wx.showToast({ title: this._t('注销失败：' + (err.message || ''), 'Delete failed: ' + (err.message || '')), icon: 'none' });
          });
        };
        
        // 先获取我的家庭和待审核状态，然后退出/取消申请
        cloudSync.getMyFamilies().then(fams => {
          const myOpenid = (app.globalData.user && app.globalData.user.openid) || '';
          // 找出我加入的所有家庭（包括待审核的）
          const myFamilies = (fams || []).filter(fam => 
            (fam.members || []).some(m => m.openid === myOpenid)
          );
          if (myFamilies.length) {
            // 逐个退出/取消申请
            const promises = myFamilies.map(fam => cloudSync.leaveFamily(fam._id));
            return Promise.all(promises);
          }
        }).then(() => {
          console.log('[注销] 已退出所有家庭和待审核申请');
          logoutFlow();
        }).catch(() => {
          // 失败也继续注销
          console.log('[注销] 退出家庭失败，继续注销');
          logoutFlow();
        });
      }
    });
  },

  _en() { return (wx.getStorageSync('lang') || this.data.lang || 'zh') === 'en'; },
  _t(zh, enTxt) { return this._en() ? enTxt : zh; },

  onLoad() {
    const en = (wx.getStorageSync('lang') || 'zh') === 'en';
    this.setData({
      lang: en ? 'en' : 'zh',
      remindItems: REMIND_ITEMS.map(it => ({
        key: it.key, icon: it.icon,
        name: en ? it.nameEn : it.name,
        desc: en ? it.descEn : it.desc
      }))
    });
    let saved = {};
    try { saved = wx.getStorageSync(REMIND_KEY) || {}; } catch (e) {}
    this.setData({ reminds: Object.assign({}, REMIND_DEF, saved) });
    this.refreshPermissions();
    this.refreshStorage();
  },

  onShow() {
    this.setData({ logged: !!(app.globalData.user && app.globalData.user.logged) });
    // 从设置页返回后刷新授权状态
    this.refreshPermissions();
    this.setData({ pushEnabled: !!wx.getStorageSync(PUSH_KEY) });
  },

  /* 开启提醒推送：无需家庭，主账户即可使用（需先配置订阅消息模板） */
  enablePush() {
    const self = this;
    cs.enableRemind().then(r => {
      wx.setStorageSync(PUSH_KEY, true);
      self.setData({ pushEnabled: true });
      const n = (r && r.grantedCount) || 0;
      wx.showToast({
        title: self._t('已授权 ' + n + ' 项（每项可推 1 条）', 'Authorized ' + n + ' templates (1 push each)'),
        icon: 'none',
        duration: 2000
      });
      // 授权后立即自检一次：今天若有到期提醒就马上推一条，证明推送链路可用
      self.probePush();
    }).catch(e => {
      wx.showToast({ title: (e && e.message) || self._t('开启失败', 'Could not enable'), icon: 'none', duration: 3000 });
    });
  },

  /* 授权后自检：调用 pushReminder 诊断一次，有到期提醒就立刻推送 */
  probePush() {
    const self = this;
    if (!wx.cloud || !wx.cloud.callFunction) return;
    wx.cloud.callFunction({ name: 'pushReminder', data: { action: 'diagnose' } })
      .then(res => {
        const r = (res && res.result) || {};
        if (r.code !== 0) {
          wx.showToast({ title: (r.msg || self._t('推送自检失败，请查看云函数日志', 'Self-check failed, see cloud logs')), icon: 'none', duration: 3000 });
          return;
        }
        const details = r.details || [];
        const sent = details.reduce((n, d) => n + ((d.sent || []).length), 0);
        if (sent > 0) {
          wx.showToast({ title: self._t('已推送 ' + sent + ' 条到期提醒，请在微信服务通知查看', 'Pushed ' + sent + ' reminder(s), check WeChat service notifications'), icon: 'none', duration: 3000 });
        } else {
          const errs = details.reduce((a, d) => a.concat(d.errors || []), []);
          if (errs.length) {
            const e0 = errs[0];
            wx.showModal({
              title: self._t('推送未成功', 'Push failed'),
              content: 'errCode ' + e0.errCode + '：' + (e0.errMsg || '') + self._t('\n（多为模板字段名不匹配，见 README 第四节）', '\n(likely template field mismatch, see README section 4)'),
              showCancel: false
            });
          } else {
            wx.showToast({ title: self._t('已授权；今天没有到期提醒，有提醒时会推送', 'Authorized; nothing due today — will push when due'), icon: 'none', duration: 3000 });
          }
        }
      })
      .catch(() => {
        wx.showToast({ title: self._t('已授权，但云函数 pushReminder 未部署', 'Authorized, but pushReminder is not deployed'), icon: 'none', duration: 3000 });
      });
  },

  /* 读取真实授权状态：getSetting + getAppAuthorizeSetting 双源，授权后进入页面/返回页面即同步 */
  refreshPermissions() {
    const self = this;
    const en = self._en();
    const appKeyOf = {
      'scope.record': 'microphoneAuthorized',
      'scope.userLocation': 'locationAuthorized',
      'scope.writePhotosAlbum': 'albumAuthorized'
    };
    let appAuth = {};
    try { appAuth = wx.getAppAuthorizeSetting ? (wx.getAppAuthorizeSetting() || {}) : {}; } catch (e) {}
    if (!this._granted) this._granted = {};

    /* 只认小程序级真实授权状态：
       true=已授权，false=已拒绝，undefined=从未申请；
       系统级 denied 说明已被系统关闭，同样属于“已拒绝”，需引导去设置；
       本次会话内用户刚点过授权成功的（部分 scope 不回传），按已授权处理 */
    const decorate = (it, authSetting) => {
      const v = authSetting[it.scope];
      const sysDenied = ['denied', 'restricted'].indexOf(appAuth[appKeyOf[it.scope]]) > -1;
      let st;
      if (v === true) st = 'ok';
      else if (v === false) st = 'denied';
      else if (sysDenied) st = 'denied';
      else if (self._granted[it.scope]) st = 'ok';
      else st = 'none';
      return Object.assign({}, it, {
        state: st,
        stateOk: st === 'ok',
        stateDeny: st === 'denied',
        stateText: st === 'ok' ? (en ? 'Granted' : '已授权') : (st === 'denied' ? (en ? 'Denied' : '已拒绝') : (en ? 'Not enabled' : '未开启')),
        actionText: st === 'denied' ? (en ? 'Settings' : '去设置') : (en ? 'Grant' : '去授权'),
        nameText: en ? it.nameEn : it.name,
        descText: en ? it.descEn : it.desc
      });
    };

    wx.getSetting({
      success: (res) => {
        const auth = (res && res.authSetting) || {};
        self.setData({ permissions: SCOLE_LIST_CONST().map(it => decorate(it, auth)) });
      },
      fail: () => {
        self.setData({ permissions: SCOLE_LIST_CONST().map(it => decorate(it, {})) });
      }
    });
  },

  /* 点击权限项：真实触发授权；已拒绝则引导去设置 */
  requestAuth(e) {
    const scope = e.currentTarget.dataset.scope;
    const item = SCOLE_LIST_CONST().find(x => x.scope === scope);
    if (!scope || !item) return;
    wx.authorize({
      scope: scope,
      success: () => {
        if (!this._granted) this._granted = {};
        this._granted[scope] = true;
        wx.showToast({ title: this._t('已授权' + item.name, (item.nameEn || item.name) + ' granted'), icon: 'success' });
        this.refreshPermissions();
      },
      fail: () => {
        wx.showModal({
          title: this._t('需要授权', 'Permission needed'),
          content: this._t('「' + item.name + '」未获得授权，部分功能将无法使用。是否前往设置开启？', '"' + (item.nameEn || item.name) + '" is not authorized, so some features will be unavailable. Open settings to enable it?'),
          confirmText: this._t('去设置', 'Settings'),
          confirmColor: '#b97b05',
          success: (r) => {
            if (r.confirm) {
              wx.openSetting({ success: () => setTimeout(() => this.refreshPermissions(), 500) });
            }
          }
        });
      }
    });
  },

  /* 打开小程序设置页统一调整权限 */
  openSetting() {
    wx.openSetting({
      success: () => this.refreshPermissions()
    });
  },

  /* 站内提醒开关：同步首页每日提醒弹窗 / 日历红点 / 每日小记 */
  onRemindSwitch(e) {
    const key = e.currentTarget.dataset.key;
    const val = e.detail.value;
    const reminds = Object.assign({}, this.data.reminds, { [key]: val });
    this.setData({ reminds });
    try { wx.setStorageSync(REMIND_KEY, reminds); } catch (e) {}
    wx.showToast({ title: val ? this._t('已开启', 'On') : this._t('已关闭', 'Off'), icon: 'none' });
  },

  /* 存储占用 */
  refreshStorage() {
    try {
      const info = wx.getStorageInfoSync();
      const kb = (info.currentSize / 1024).toFixed(1);
      this.setData({ storageText: kb + ' KB' });
    } catch (e) {}
  },

  /* 清除本地数据（强确认） */
  clearCache() {
    wx.showModal({
      title: this._t('清除本地数据', 'Clear local data'),
      content: this._t('将删除全部喂养记录、宝宝档案与库存数据，且无法恢复。确定要清除吗？', 'All feeding records, baby profiles and stock data will be deleted and cannot be recovered. Clear them?'),
      confirmText: this._t('仍要清除', 'Clear'),
      confirmColor: '#d9534f',
      success: (res) => {
        if (!res.confirm) return;
        wx.showModal({
          title: this._t('二次确认', 'Confirm again'),
          content: this._t('此操作不可恢复，请再次确认是否清除所有本地数据？', 'This cannot be undone. Clear all local data?'),
          confirmText: this._t('确认清除', 'Confirm'),
          confirmColor: '#d9534f',
          success: (res2) => {
            if (!res2.confirm) return;
            try { wx.clearStorageSync(); } catch (e) {}
            // 重新从云端拉取数据，更新全局数据
            const app = getApp();
            if (app.cloudSync && app.cloudSync.pull) {
              wx.showLoading({ title: this._t('同步云端数据...', 'Syncing cloud data...'), mask: true });
              app.cloudSync.pull().then(() => {
                wx.hideLoading();
                wx.showToast({ title: this._t('已清除本地数据并同步云端', 'Local data cleared, cloud synced'), icon: 'none' });
                this.refreshStorage();
                // 通知所有页面刷新
                const pages = getCurrentPages();
                pages.forEach(pg => { if (pg.onShow) pg.onShow(); });
              }).catch(() => {
                wx.hideLoading();
                wx.showToast({ title: this._t('已清除，重启小程序生效', 'Cleared — restart the app to apply'), icon: 'none' });
              });
            } else {
              wx.showToast({ title: this._t('已清除，重启小程序生效', 'Cleared — restart the app to apply'), icon: 'none' });
            }
            this.refreshStorage();
          }
        });
      }
    });
  },

  /* 隐私政策 */
  showPolicy() {
    wx.showModal({
      title: this._t('隐私政策', 'Privacy Policy'),
      content: this._t('熊宝喂养是面向母婴家庭的宝宝喂养与成长记录工具。\n1. 我们仅收集你主动录入的宝宝档案、喂养记录、库存提醒等必要信息，用于为你提供记录、提醒、统计功能；\n2. 位置信息仅用于获取当地天气，麦克风仅用于语音转文字录入喂养记录，保存到相册权限仅用于将导出的成长周报保存到你的手机，以上权限均需你主动授权，可随时在设置中撤回；\n3. 多人协作功能下，你邀请的家庭成员仅可见你主动共享的宝宝相关喂养数据，我们不会向任何第三方共享你的个人信息；\n4. 所有喂养数据加密存储于云端，用于多设备同步和多人协作，你可以随时导出或删除全部数据。', 'Panda Feeding is a baby feeding and growth tracking tool for families.\n1. We only collect the baby profiles, feeding records and stock reminders you enter, to provide recording, reminder and statistics features.\n2. Location is used only for local weather, the microphone only for voice-to-text feeding records, and photo album access only to save exported weekly reports. All permissions require your consent and can be revoked anytime in Settings.\n3. Family members you invite can only see the baby data you share; we never share your personal information with third parties.\n4. All feeding data is stored encrypted in the cloud for multi-device sync and collaboration, and you can export or delete it at any time.'),
      showCancel: false,
      confirmText: this._t('我知道了', 'Got it')
    });
  },

  /* 用户协议 */
  showTerms() {
    wx.showModal({
      title: this._t('用户协议', 'Terms of Use'),
      content: this._t('欢迎使用熊宝喂养。\n1. 本小程序为免费工具类应用，帮助你记录宝宝的喂养、睡眠、辅食、疫苗、库存等日常数据，提供提醒和统计功能；\n2. 你录入的所有数据归你本人所有，多人协作时你可自行设置家庭成员的查看和编辑权限；\n3. 本小程序提供的喂养提醒、库存提醒、疫苗提醒仅为工具提示，不构成任何医疗建议，宝宝如有健康问题请及时咨询专业医护人员；\n4. 请妥善保管你的微信账号，因个人原因泄露账号导致的数据问题由你自行承担。', 'Welcome to Panda Feeding.\n1. This is a free utility that helps you record feeding, sleep, solids, vaccines and stock, and provides reminders and statistics.\n2. All data you enter belongs to you; in family collaboration you can set each member’s view/edit permissions.\n3. Feeding, stock and vaccine reminders are tool prompts only and are not medical advice. Consult a healthcare professional for any health concerns.\n4. Keep your WeChat account safe; you are responsible for data issues caused by sharing your account.'),
      showCancel: false,
      confirmText: this._t('我知道了', 'Got it')
    });
  },

  goBack() {
    wx.navigateBack();
  }
});
