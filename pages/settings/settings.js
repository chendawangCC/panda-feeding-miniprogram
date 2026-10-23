const app = getApp();
const cloudData = require('../../utils/cloud-data.js');

Page({

  onShareAppMessage() {
    return {
        imageUrl: '/images/share-cover.png', title: '熊宝喂养 · 设置', path: 'pages/settings/settings' };
  },

  data: {
    lang: 'zh',
    safeTop: (app.globalData && app.globalData.safeTop) || 88,
    user: {},
    loginVisible: false,
    loginTab: 'wechat',

    profileVisible: false,
    avatarUrl: '',
    nickname: '',
    exportVisible: false,
    exportPreviewVisible: false,
    previewImg: '',
    exportCanvasH: 1200,
    exporting: false,
    exportItems: [
      { key: 'records', label: '喂养记录', desc: '母乳 / 配方奶 / 睡眠 / 换尿布等全部喂养记录', checked: true, count: 0 },
      { key: 'babies', label: '宝宝成长档案', desc: '宝宝的出生与基本信息档案', checked: true, count: 0 },
      { key: 'cost', label: '喂养台成本统计', desc: '奶粉、纸尿裤等喂养物品的购入成本统计', checked: true, count: 0 },
      { key: 'allergy', label: '过敏统计手册', desc: '辅食过敏与不过敏食物统计', checked: true, count: 0 }
    ]
  },

  onShow() {
    const lang = wx.getStorageSync('lang') || 'zh';
    const exportItems = lang === 'en' ? [
      { key: 'records', label: 'Feeding Records', desc: 'Breastfeeding / bottle / sleep / diaper and all records', checked: true, count: 0 },
      { key: 'babies', label: 'Baby Profile', desc: 'Birth and basic profile of baby', checked: true, count: 0 },
      { key: 'cost', label: 'Feeding Station Cost', desc: 'Purchase cost of formula, diapers and supplies', checked: true, count: 0 },
      { key: 'allergy', label: 'Allergy Manual', desc: 'Solid food allergy statistics', checked: true, count: 0 }
    ] : [
      { key: 'records', label: '喂养记录', desc: '母乳 / 配方奶 / 睡眠 / 换尿布等全部喂养记录', checked: true, count: 0 },
      { key: 'babies', label: '宝宝成长档案', desc: '宝宝的出生与基本信息档案', checked: true, count: 0 },
      { key: 'cost', label: '喂养台成本统计', desc: '奶粉、纸尿裤等喂养物品的购入成本统计', checked: true, count: 0 },
      { key: 'allergy', label: '过敏统计手册', desc: '辅食过敏与不过敏食物统计', checked: true, count: 0 }
    ];
    const old = this.data.exportItems || [];
    exportItems.forEach(it => {
      const prev = old.find(o => o.key === it.key);
      if (prev) { it.checked = prev.checked; it.count = prev.count; }
    });
    this.setData({ user: app.getUser(), lang: lang, exportItems: exportItems });
  },

  switchLang() {
    wx.showActionSheet({
      itemList: ['简体中文', 'English'],
      success: (res) => {
        const newLang = res.tapIndex === 0 ? 'zh' : 'en';
        wx.setStorageSync('lang', newLang);
        const go = () => setTimeout(() => wx.reLaunch({ url: '/pages/plan/plan' }), 800);
        try {
          const cs = require('../../utils/cloud-sync.js');
          if (cs && cs.syncLang) cs.syncLang(newLang).then(go).catch(go); else go();
        } catch (e) { go(); }
        wx.showToast({ title: newLang === 'en' ? 'Switched to English' : '已切换中文', icon: 'success' });
      }
    });
  },

  goBack() {
    wx.navigateBack();
  },

  /* ===== 账号卡：登录 / 编辑资料 ===== */
  onAccountTap() {
    const u = this.data.user;
    if (u && u.logged) {
      this.setData({ profileVisible: true, avatarUrl: u.avatar || '', nickname: u.nickname || '' });
    } else {
      this.openLogin();
    }
  },

  /* 登录成功后一次性申请定位和麦克风权限 */
  requestPermissionsOnce() {
    wx.getLocation({ type: 'gcj02', success: () => {}, fail: () => {} });
    wx.authorize({ scope: 'scope.record', success: () => {}, fail: () => {} });
  },

  /* 账号栏：编辑资料（改头像/账户名） */
  editProfile() {
    const u = this.data.user;
    if (u && u.logged) {
      this.setData({ profileVisible: true, avatarUrl: u.avatar || '', nickname: u.nickname || '' });
    } else {
      this.openLogin();
    }
  },
  /* 切换用户：退出当前账号并重新登录 */
  switchUser() {
    const u = this.data.user;
    if (u && u.logged) {
      wx.showModal({
        title: '切换用户',
        content: '将退出当前账号，重新选择账号登录？',
        success: (res) => {
          if (!res.confirm) return;
          const user = app.saveUser({ logged: false, phone: '', openid: '', nickname: '', avatar: '' });
          this.setData({ user: user });
          this.openLogin();
        }
      });
    } else {
      this.openLogin();
    }
  },
  openLogin() {
    // 统一用「我的」页的登录抽屉
    wx.setStorageSync('panda_open_login', 1);
    wx.switchTab({ url: '/pages/plan/plan' });
  },
  closeLogin() {
    this.setData({ loginVisible: false });
    this.clearCountdown();
  },


  /* 微信一键登录（含超时兜底：云函数长时间无响应时停止 loading 并明确提示） */
  wechatLogin() {
    const self = this;
    wx.showLoading({ title: '登录中…' });
    let settled = false;
    const done = () => { if (!settled) { settled = true; wx.hideLoading(); } };
    const failTip = (msg) => { done(); wx.showToast({ title: msg, icon: 'none' }); };
    const login = () => {
      if (!wx.cloud || !wx.cloud.callFunction) {
        failTip('请先开通云开发并部署 loginUser 云函数');
        return;
      }
      // 12 秒超时：云函数无响应时停止 loading，避免“点了没反应”一直转圈
      const timer = setTimeout(() => { if (!settled) failTip('登录超时，请检查云函数 loginUser 是否已部署'); }, 12000);
      const finish = () => clearTimeout(timer);
      wx.cloud.callFunction({
        name: 'loginUser',
        success: (r) => {
          done();
          finish();
          const res = (r && r.result) || {};
          if (res.code === 0 && res.openid) {
            const existing = app.getUser() || {};
            const cloudNick = (res.nickname || '').trim();
            const cloudAvatar = res.avatar || '';
            // 只要登录成功拿到 openid 就直接进入，不再依赖 isNew 判断
            // （云端 users 查询失败时 isNew 会误判为 true，导致老账号被要求重设资料）
            if (res.openid) {
              const user = app.saveUser({
                openid: res.openid, logged: true,
                nickname: cloudNick || existing.nickname || '熊宝家长',
                avatar: cloudAvatar || existing.avatar || ''
              });
              this.setData({ user: user });
              wx.showLoading({ title: '同步云端数据...', mask: true });
              const cs = require('../../utils/cloud-sync.js');
              // 先全量拉云端业务数据（记录/宝宝/足迹/库存/疫苗），再恢复家庭权限
              app.syncCloudAfterLogin().then((cd) => {
                const g=app.globalData; console.log('[登录] g.babies=', (g.babies||[]).length, 'currentBabyId=', g.currentBabyId, 'firstBaby=', g.babies && g.babies[0] && g.babies[0].name);
                return cs.getMyFamily().then(() => cs.pull()).catch(() => {});
              }).then(() => {
                wx.hideLoading();
                this.setData({ loginVisible: false });
                wx.showToast({ title: '登录成功', icon: 'success' });
                // 云端无昵称/头像 → 弹资料设置抽屉，设置后自动上报云端
                if (!cloudNick || !cloudAvatar) {
                  this.setData({
                    profileVisible: true,
                    nickname: cloudNick || '',
                    avatarUrl: cloudAvatar || ''
                  });
                }
              }).catch((e) => {
                console.error('[登录] 同步失败', e);
                wx.hideLoading();
                this.setData({ loginVisible: false });
                wx.showToast({ title: '登录成功', icon: 'success' });
              });
            } else {
              failTip('登录失败：未获取到 openid');
            }
          } else {
            failTip(res.msg || '登录失败');
          }
        },
        fail: () => {
          finish();
          failTip('云函数调用失败，请确认已部署 loginUser');
        }
      });
    };
    wx.login({
      success: () => login(),
      fail: () => login()
    });
  },

  /* 新账号：尝试使用微信昵称/头像自动注册；不使用则进入设置 */
  fetchWechatProfile() {
    const self = this;
    let settled = false;
    const showProfile = () => {
      if (settled) return;
      settled = true;
      self.setData({ profileVisible: true, avatarUrl: '', nickname: '' });
    };
    if (!wx.getUserProfile) {
      showProfile();
      return;
    }
    // 3 秒无响应兜底：新版基础库 getUserProfile 可能静默不回调，超时直接进入资料设置
    const timer = setTimeout(() => showProfile(), 3000);
    wx.getUserProfile({
      desc: '用于完善宝宝喂养记录的个人资料',
      success: (res) => {
        clearTimeout(timer);
        if (settled) return;
        settled = true;
        const info = (res && res.userInfo) || {};
        const nickname = ((info.nickName || '').trim()) || '微信用户';
        const avatar = info.avatarUrl || '';
        const user = app.saveUser({ nickname: nickname, avatar: avatar });
        self.syncUserToCloud(nickname, avatar, '');
        self.setData({ user: user });
        wx.showToast({ title: '登录成功', icon: 'success' });
      },
      fail: () => {
        clearTimeout(timer);
        showProfile();
      }
    });
  },

  /* 把账号资料同步到云端 users */
  syncUserToCloud(nickname, avatar, phone) {
    if (!wx.cloud || !wx.cloud.callFunction) return;
    const u = app.getUser();
    console.log('[syncUser] openid=', u && u.openid, 'nick=', nickname, 'hasAvatar=', !!avatar);
    if (!u || !u.openid) { console.warn('[syncUser] 无 openid，跳过'); return; }
    wx.cloud.callFunction({
      name: 'loginUser',
      data: { nickname: nickname || '', avatar: avatar || '', phone: phone || '' },
      success: (r) => { console.log('[syncUser] 上报成功', r && r.result); },
      fail: (e) => { console.error('[syncUser] 上报失败', e); }
    });
  },

  /* 手机号：获取验证码 */


  startCountdown(sec) {
    this.clearCountdown();
    this._cd = setInterval(() => {
      if (this.data.countdown <= 1) {
        this.clearCountdown();
        this.setData({ countdown: 0 });
        return;
      }
      this.setData({ countdown: this.data.countdown - 1 });
    }, 1000);
    this.setData({ countdown: sec });
  },
  clearCountdown() {
    if (this._cd) { clearInterval(this._cd); this._cd = null; }
  },

  /* 头像选择（chooseAvatar 临时文件 → base64 保存，正圆形显示） */
  onAvatarTap() {
    wx.showActionSheet({
      itemList: ['使用微信头像', '从相册选择', '拍照'],
      success: (res) => {
        if (res.tapIndex === 0) {
          wx.getUserProfile({
            desc: '用于设置账号头像和用户名',
            success: (p) => {
              this.setData({
                avatarUrl: p.userInfo.avatarUrl,
                nickname: p.userInfo.nickName || this.data.nickname
              });
            }
          });
        } else {
          const sourceType = res.tapIndex === 1 ? ['album'] : ['camera'];
          wx.chooseMedia({
            count: 1,
            mediaType: ['image'],
            sourceType: sourceType,
            success: (r) => {
              const url = r.tempFiles[0].tempFilePath;
              this.setData({ avatarUrl: url });
            }
          });
        }
      }
    });
  },
  onAvatarChoose(e) {
    const url = e.detail.avatarUrl;
    if (!url) return;
    const fs = wx.getFileSystemManager();
    fs.readFile({
      filePath: url,
      encoding: 'base64',
      success: (r) => {
        this.setData({ avatarUrl: 'data:image/jpeg;base64,' + r.data });
      },
      fail: () => {
        this.setData({ avatarUrl: url });
      }
    });
  },
  onNickInput(e) {
    this.setData({ nickname: e.detail.value });
  },

  /* 保存资料 */
  saveProfile() {
    // 必须设置用户名与头像才能登录成功
    if (!this.data.nickname.trim()) {
      wx.showToast({ title: '请输入用户名', icon: 'none' });
      return;
    }
    if (!this.data.avatarUrl) {
      wx.showToast({ title: '请选择头像', icon: 'none' });
      return;
    }
    const nickname = this.data.nickname.trim();
    const avatar = this.data.avatarUrl;
    const user = app.saveUser({
      nickname: nickname,
      avatar: avatar,
      logged: true
    });
    this.syncUserToCloud(nickname, avatar, '');
    this.setData({ user: user, profileVisible: false });
    wx.showToast({ title: '资料已保存', icon: 'success' });
  },
  closeProfile() {
    this.setData({ profileVisible: false });
  },

  /* 退出登录 */
  logout() {
    wx.showModal({
      title: '退出登录',
      content: '退出后本地记录将清空，云端数据已保留，重新登录即可恢复',
      success: async (res) => {
        if (!res.confirm) return;
        // 退出前先把本地未推送数据冲刷上云端，避免重登后数据丢失
        try {
          const cloudData = require('../../utils/cloud-data.js');
          await cloudData.flushPush();
        } catch (e) {}
        app.clearAllLocalData();
        const user = app.saveUser({ logged: false, phone: '', openid: '', nickname: '', avatar: '' });
        this.setData({ user: user });
        // 直接回到我的页
        wx.reLaunch({ url: '/pages/plan/plan' });
      }
    });
  },

  /* 登录后添加宝宝 */
  goAddBaby() {
    wx.navigateTo({ url: '/pages/my-babies/my-babies' });
  },

  openExport() {
    const g = app.globalData;
    this.setData({
      exportVisible: true,
      'exportItems[0].count': (g.records || []).length,
      'exportItems[1].count': (g.babies || []).length,
      'exportItems[2].count': this.costItems().length,
      'exportItems[3].count': Object.keys((g.foodAllergyMap) || {}).length
    });
  },

  closeExport() {
    this.setData({ exportVisible: false });
  },

  toggleExportItem(e) {
    const key = e.currentTarget.dataset.key;
    const items = this.data.exportItems.map(i => i.key === key ? Object.assign({}, i, { checked: !i.checked }) : i);
    this.setData({ exportItems: items });
  },

  /* 喂养台成本统计：库存物品（含购入价格） */
  costItems() {
    const g = app.globalData;
    return (g.stockItems || []).filter(s => s && s.price);
  },

  costLine() {
    const items = this.costItems();
    const lines = [];
    if (!items.length) {
      lines.push('【喂养台成本统计】暂无带购入价格的库存物品');
      lines.push('  提示：在首页「库存管理」录入物品时可填写购入价格');
      return lines;
    }
    lines.push('【喂养台成本统计】共 ' + items.length + ' 项（价格为购入总价）');
    let total = 0;
    items.forEach(s => {
      const price = Number(s.price) || 0;
      total += price;
      lines.push('  · ' + (s.name || '未命名') + (s.size && s.size !== '通用' ? '（' + s.size + '）' : '') + ' × ' + (Number(s.count) || 0) + ' ' + (s.unit || '') + '  购入价 ¥' + (Math.round(price * 100) / 100));
    });
    lines.push('  合计：¥' + (Math.round(total * 100) / 100));
    return lines;
  },

  /* 构建导出内容（文本 + 喂养记录表格混合结构） */
  buildExportContent() {
    const sel = this.data.exportItems.filter(i => i.checked);
    if (!sel.length) {
      wx.showToast({ title: '请至少选择一项数据', icon: 'none' });
      return null;
    }
    const g = app.globalData;
    const pad = n => (n < 10 ? '0' + n : '' + n);
    const now = new Date();
    const content = [];
    content.push({ kind: 'title', text: '熊宝喂养 · 数据导出' });
    content.push({ kind: 'text', text: '导出时间：' + now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes()) });
    content.push({ kind: 'text', text: '当前宝宝：' + ((g.baby && g.baby.name) || '未命名') });
    content.push({ kind: 'blank' });

    if (sel.some(i => i.key === 'records')) {
      const recs = g.records || [];
      content.push({ kind: 'section', text: '【喂养记录】共 ' + recs.length + ' 条' });
      if (recs.length) {
        content.push({
          kind: 'table',
          head: ['日期', '时间', '类型', '详情', '备注'],
          rows: recs.map(r => [r.date || '', r.time || '', r.type || '', this.recordDetail(r), r.note || ''])
        });
      } else {
        content.push({ kind: 'text', text: '（暂无喂养记录）' });
      }
      content.push({ kind: 'blank' });
    }
    if (sel.some(i => i.key === 'babies')) {
      const babies = g.babies || [];
      content.push({ kind: 'section', text: '【宝宝成长档案】共 ' + babies.length + ' 位宝宝' });
      if (babies.length) {
        babies.forEach(b => {
          content.push({ kind: 'text', text: '  · ' + (b.name || '未命名') + (b.gender ? '（' + b.gender + '）' : '') });
          if (b.birthday) content.push({ kind: 'text', text: '    出生日期：' + b.birthday });
          if (b.relation) content.push({ kind: 'text', text: '    关系：' + b.relation });
          if (b.delivery) content.push({ kind: 'text', text: '    出生方式：' + b.delivery });
          if (b.blood) content.push({ kind: 'text', text: '    血型：' + b.blood });
          if (b.weight) content.push({ kind: 'text', text: '    出生体重：' + b.weight + 'kg' });
          if (b.height) content.push({ kind: 'text', text: '    出生身高：' + b.height + 'cm' });
        });
      } else {
        content.push({ kind: 'text', text: '（暂无宝宝档案）' });
      }
      content.push({ kind: 'blank' });
    }
    if (sel.some(i => i.key === 'cost')) {
      content.push({ kind: 'section', text: '【喂养台成本统计】' });
      this.costLine().forEach(l => content.push({ kind: 'text', text: l }));
      content.push({ kind: 'blank' });
    }
    if (sel.some(i => i.key === 'allergy')) {
      const recs = g.records || [];
      const af = [], sf = [];
      let ac = 0, sc = 0;
      recs.forEach(r => {
        if (!r || r.type !== '辅食') return;
        const names = r.foodNames || [];
        if (r.allergy) { ac++; names.forEach(f => { if (f && af.indexOf(f) < 0) af.push(f); }); }
        else if (r.allergy === false) { sc++; names.forEach(f => { if (f && sf.indexOf(f) < 0) sf.push(f); }); }
      });
      content.push({ kind: 'section', text: '【过敏统计手册】过敏 ' + ac + ' 次 / 不过敏 ' + sc + ' 次' });
      content.push({ kind: 'text', text: '已记录过敏食物：' + (af.length ? af.join('、') : '暂无') });
      content.push({ kind: 'text', text: '已记录不过敏食物：' + (sf.length ? sf.join('、') : '暂无') });
      content.push({ kind: 'blank' });
    }
    return content;
  },

  /* 喂养记录表格「详情」列 */
  recordDetail(r) {
    switch (r.type) {
      case '母乳': return '左 ' + (r.nursingL || 0) + 'ml / 右 ' + (r.nursingR || 0) + 'ml / 共 ' + (r.total || 0) + 'ml';
      case '配方奶': return (r.amount || 0) + 'ml';
      case '瓶喂母乳': return (r.amount || 0) + 'ml';
      case '吸奶': return '左 ' + (r.pumpLeftAmt || 0) + 'ml / 右 ' + (r.pumpRightAmt || 0) + 'ml / 共 ' + (r.pumpTotal || 0) + 'ml';
      case '换尿布': return (r.diaperChoice || '') + (r.diaperSize ? ' ' + r.diaperSize + '码' : '') + (r.peeColor ? ' 尿' + r.peeColor : '') + (r.stoolColor ? ' 便' + r.stoolColor : '');
      case '喝水': return (r.water || 0) + 'ml';
      case '睡眠': return (r.sleepStart || '') + ' 至 ' + (r.sleepEnd || '') + ' 共 ' + Math.round((r.sleepSeconds || 0) / 60) + ' 分钟';
      case '辅食': return (r.simpleAmount || 0) + 'g' + (r.food ? ' ' + r.food : '');
      case '营养品': return (r.supps || []).join('、') || '';
      case '语音记录': return r.note || '';
      default: return r.note || r.detail || '';
    }
  },

  /* 选择导出格式 */
  doExport() {
    if (!this.buildExportContent()) return;
    wx.showActionSheet({
      itemList: ['保存为图片（PNG）', '保存为 PDF 文档', '导出 Excel 表格'],
      success: (res) => {
        if (res.tapIndex === 0) this.exportImage();
        else if (res.tapIndex === 1) this.exportPdf();
        else this.exportExcel();
      }
    });
  },

  /* 导出 Excel 表格：优先走云函数 exportXlsx 生成 xlsx，未部署时回退本地 CSV */
  exportExcel() {
    const sel = this.data.exportItems.filter(i => i.checked);
    const g = app.globalData;
    const sheets = [];
    if (sel.some(i => i.key === 'records')) {
      sheets.push({
        name: '喂养记录',
        head: ['日期', '时间', '类型', '详情', '备注'],
        rows: (g.records || []).map(r => [r.date || '', r.time || '', r.type || '', this.recordDetail(r), r.note || ''])
      });
    }
    if (sel.some(i => i.key === 'babies')) {
      sheets.push({
        name: '宝宝成长档案',
        head: ['宝宝', '性别', '出生日期', '关系', '出生方式', '血型', '出生体重(kg)', '出生身高(cm)'],
        rows: (g.babies || []).map(b => [b.name || '', b.gender || '', b.birthday || '', b.relation || '', b.delivery || '', b.blood || '', b.weight || '', b.height || ''])
      });
    }
    if (sel.some(i => i.key === 'cost')) {
      sheets.push({
        name: '喂养台成本统计',
        head: ['商品', '规格', '数量', '购入总价(¥)'],
        rows: this.costItems().map(s => [s.name || '未命名', (s.size && s.size !== '通用' ? s.size + '码' : ''), (Number(s.count) || 0) + (s.unit || ''), Number(s.price) || 0])
      });
    }
    if (sel.some(i => i.key === 'allergy')) {
      const af = [], sf = [];
      (g.records || []).forEach(r => {
        if (!r || r.type !== '辅食') return;
        const names = r.foodNames || [];
        if (r.allergy) names.forEach(f => { if (f && af.indexOf(f) < 0) af.push(f); });
        else if (r.allergy === false) names.forEach(f => { if (f && sf.indexOf(f) < 0) sf.push(f); });
      });
      sheets.push({
        name: '过敏统计手册',
        head: ['过敏食物', '不过敏食物'],
        rows: [[af.join('、') || '暂无', sf.join('、') || '暂无']]
      });
    }
    if (!sheets.length) {
      wx.showToast({ title: '没有可导出的数据', icon: 'none' });
      return;
    }
    if (!(wx.cloud && wx.cloud.callFunction)) {
      this.exportCsvLocal(sheets);
      return;
    }
    wx.showLoading({ title: '生成中...' });
    wx.cloud.callFunction({
      name: 'exportXlsx',
      data: { sheets },
      success: (r) => {
        wx.hideLoading();
        const res = (r && r.result) || {};
        if (res.code === 0 && res.url) {
          this.downloadAndOpen(res.url);
        } else {
          this.exportCsvLocal(sheets);
        }
      },
      fail: () => {
        wx.hideLoading();
        this.exportCsvLocal(sheets);
      }
    });
  },

  /* 云函数未部署时的回退：本地生成 CSV 文件（Excel 可直接打开） */
  exportCsvLocal(sheets) {
    const rows = [];
    sheets.forEach(sh => {
      rows.push(sh.name);
      rows.push((sh.head || []).join(','));
      (sh.rows || []).forEach(r => rows.push(r.map(cell => '"' + String(cell == null ? '' : cell).replace(/"/g, '""') + '"').join(',')));
      rows.push('');
    });
    const csv = '\ufeff' + rows.join('\r\n'); // BOM 保证中文不乱码
    const now = new Date();
    const pad = n => (n < 10 ? '0' + n : '' + n);
    const filePath = wx.env.USER_DATA_PATH + '/熊宝喂养导出_' + now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate()) + '_' + pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds()) + '.csv';
    wx.getFileSystemManager().writeFile({
      filePath,
      data: csv,
      encoding: 'utf8',
      success: () => {
        wx.showModal({
          title: 'Excel 已导出',
          content: '已生成表格文件（CSV 格式，可用 Excel/WPS 直接打开）：' + filePath + '\n如需转发或打开，请使用下方按钮。',
          confirmText: '转发文件',
          cancelText: '知道了',
          success: (res) => {
            if (res.confirm) wx.shareFileMessage({ filePath, fileName: '熊宝喂养导出.xlsx' });
          }
        });
      },
      fail: () => wx.showToast({ title: '导出失败，请重试', icon: 'none' })
    });
  },

  /* 下载云函数生成的 xlsx 并打开预览 */
  downloadAndOpen(url) {
    wx.downloadFile({
      url,
      success: (res) => {
        if (res.statusCode !== 200) {
          wx.showToast({ title: '下载失败，请重试', icon: 'none' });
          return;
        }
        wx.openDocument({
          filePath: res.tempFilePath,
          fileType: 'xlsx',
          showMenu: true,
          fail: () => wx.showToast({ title: '打开失败', icon: 'none' })
        });
      },
      fail: () => wx.showToast({ title: '下载失败，请重试', icon: 'none' })
    });
  },

  /* 预览：生成内容长图并弹窗展示 */
  previewExport() {
    const content = this.buildExportContent();
    if (!content) return;
    this.renderExportImage(content, (img) => {
      // 分两步关闭导出选项弹窗再打开预览，保证 dialog 计数下 tabBar 保持隐藏
      this.setData({ exportVisible: false });
      this.setData({ previewImg: img, exportPreviewVisible: true });
    });
  },

  closePreview() {
    this.setData({ exportPreviewVisible: false });
  },

  renderExportImage(content, cb) {
    if (this.data.exporting) return;
    this.setData({ exporting: true });
    wx.showLoading({ title: '正在生成…', mask: true });
    // 先异步获取小程序码（getMiniQr 云函数），拿到后加大底部预留高度
    this.fetchQr((qrImg) => {
      const headH = 180;
      const footH = qrImg ? 320 : 120;
      let H = headH + this.contentHeight(content) + footH;
      H = Math.min(H, 4000);
      this.setData({ exportCanvasH: H });
      // 表格块 → 自绘表格（drawTable），预留 tableImgs 通道
      const tables = [];
      content.forEach((it, i) => {
        if (it.kind === 'table' && (it.rows || []).length) tables.push({ i: i, it: it });
      });
      const renderAll = (tableImgs) => {
        setTimeout(() => {
          const ctx = wx.createCanvasContext('exportCanvas', this);
          this.drawExportCanvas(ctx, content, H, tableImgs, qrImg);
          ctx.draw(false, () => {
            wx.canvasToTempFilePath({
              canvasId: 'exportCanvas',
              fileType: 'png',
              success: (res) => {
                wx.hideLoading();
                this.setData({ exporting: false });
                cb && cb(res.tempFilePath);
              },
              fail: () => {
                wx.hideLoading();
                this.setData({ exporting: false });
                wx.showToast({ title: '生成失败，请重试', icon: 'none' });
              }
            }, this);
          });
        }, 300);
      };
      const loop = (idx, imgs) => {
        if (idx >= tables.length) { renderAll(imgs); return; }
        this.renderTableImg(tables[idx].it, (img) => {
          if (img) imgs[tables[idx].i] = img;
          loop(idx + 1, imgs);
        });
      };
      loop(0, {});
    });
  },

  /* 获取小程序码：调用 getMiniQr 云函数（未部署/失败时回退 null，不影响导出） */
  fetchQr(cb) {
    if (!(wx.cloud && wx.cloud.callFunction)) { cb && cb(null); return; }
    wx.cloud.callFunction({
      name: 'getMiniQr',
      data: { scene: 'export', page: 'pages/index/index' },
      success: (r) => {
        const res = (r && r.result) || {};
        if (res.code === 0 && res.base64) {
          const filePath = wx.env.USER_DATA_PATH + '/mini-qr-export.png';
          wx.getFileSystemManager().writeFile({
            filePath,
            data: res.base64,
            encoding: 'base64',
            success: () => cb && cb(filePath),
            fail: () => cb && cb(null)
          });
        } else {
          cb && cb(null);
        }
      },
      fail: () => cb && cb(null)
    });
  },

  /* 导出表格：直接走 drawExportCanvas 内的 drawTable 自绘（不依赖 ECharts） */
  renderTableImg(table, cb) {
    cb && cb(null);
  },

  /* ECharts 表格 option（固定列宽，表头冻结） */
  buildExportTableOption(table, cols, W, rowH, headH) {
    const head = table.head || [];
    const rows = table.rows || [];
    const dataHead = head.map((h) => [h, '_head']);
    const dataRows = [];
    rows.forEach((_, ri) => {
      head.forEach((h) => dataRows.push([h, String(ri)]));
    });
    return {
      backgroundColor: 'transparent',
      animation: false,
      grid: { left: 0, right: 0, top: headH, bottom: 0 },
      xAxis: { type: 'category', data: head, show: false, boundaryGap: true },
      yAxis: [
        { type: 'category', data: rows.map((_, i) => String(i)), show: false },
        { type: 'category', data: ['_head'], position: 'top', show: false }
      ],
      series: [
        { type: 'custom', yAxisIndex: 1, data: dataHead, renderItem: (params, api) => this.exportTableHeadItem(params, api, head, cols, headH) },
        { type: 'custom', yAxisIndex: 0, data: dataRows, renderItem: (params, api) => this.exportTableRowItem(params, api, rows, head, cols, rowH) }
      ]
    };
  },

  /* 表头单元格（固定列宽手动定位） */
  exportTableHeadItem(params, api, head, cols, headH) {
    const ci = params.dataIndex % head.length;
    const x = this.colOffset(cols, ci);
    const w = cols[ci];
    const children = [];
    if (ci === 0) {
      children.push({ type: 'rect', shape: { x: 0, y: 0, width: this.colOffset(cols, head.length), height: headH }, style: { fill: '#ffd95a' } });
    }
    children.push(this.exportTableText(x + w / 2, headH / 2, head[ci], { align: 'center', fill: '#29281f', font: 'bold 22px sans-serif' }));
    return { type: 'group', children: children };
  },

  /* 数据单元格（固定列宽手动定位，详情列可完整换行截断） */
  exportTableRowItem(params, api, rows, head, cols, rowH) {
    const di = params.dataIndex;
    const ci = di % head.length;
    const ri = Math.floor(di / head.length);
    const row = rows[ri];
    if (!row) return { type: 'group', children: [] };
    const x = this.colOffset(cols, ci);
    const w = cols[ci];
    const y0 = ri * rowH;
    const children = [];
    if (ci === 0) {
      children.push({ type: 'rect', shape: { x: 0, y: y0, width: this.colOffset(cols, head.length), height: rowH }, style: { fill: ri % 2 ? '#fbf6e8' : '#fffdf7', stroke: '#e3dcc4', lineWidth: 1 } });
    }
    const txt = String(row[ci] == null ? '' : row[ci]);
    const maxChars = Math.max(1, Math.floor((w - 14) / 20));
    const text = txt.length > maxChars ? txt.slice(0, maxChars - 1) + '…' : txt;
    children.push(this.exportTableText(x + 10, y0 + rowH / 2, text, { align: 'left', fill: '#29281f', fontSize: 20 }));
    return { type: 'group', children: children };
  },

  /* 列 x 偏移累加 */
  colOffset(cols, c) {
    let x = 0;
    for (let i = 0; i < c; i++) x += cols[i];
    return x;
  },

  /* ECharts custom text 元素 */
  exportTableText(x, y, text, opt) {
    const el = {
      type: 'text',
      style: {
        x: x, y: y, text: text,
        align: opt.align || 'center',
        verticalAlign: 'middle',
        fill: opt.fill || '#29281f',
        fontSize: opt.fontSize,
        font: opt.font
      }
    };
    return el;
  },

  /* 导出为图片：保存到相册 */
  exportImage() {
    const content = this.buildExportContent();
    if (!content) return;
    this.renderExportImage(content, (img) => {
      wx.saveImageToPhotosAlbum({
        filePath: img,
        success: () => {
          this.setData({ exportVisible: false });
          wx.showToast({ title: '已保存为图片', icon: 'none' });
        },
        fail: (err) => {
          if (err && err.errMsg && err.errMsg.indexOf('auth') >= 0) {
            wx.showModal({
              title: '需要相册权限',
              content: '请在设置中允许「保存到相册」，即可保存导出图片',
              confirmText: '去设置',
              success: (r) => { if (r.confirm) wx.openSetting(); }
            });
          } else {
            wx.showToast({ title: '保存失败，请重试', icon: 'none' });
          }
        }
      });
    });
  },

  /* 导出为 PDF */
  exportPdf() {
    const content = this.buildExportContent();
    if (!content) return;
    this.renderExportImage(content, (img) => {
      this.imageToPdf(img);
    });
  },

  imageToPdf(imgPath) {
    const ctx = wx.createCanvasContext('exportCanvas', this);
    // 读取预览图转 JPEG 尺寸信息
    wx.getImageInfo({
      src: imgPath,
      success: (info) => {
        const W = info.width;
        const H = info.height;
        // 用离屏 canvas 转 JPEG
        const jctx = wx.createCanvasContext('pdfCanvas', this);
        jctx.drawImage(imgPath, 0, 0, W, H);
        jctx.draw(false, () => {
          wx.canvasToTempFilePath({
            canvasId: 'pdfCanvas',
            fileType: 'jpg',
            quality: 0.9,
            success: (res) => {
              wx.getFileSystemManager().readFile({
                filePath: res.tempFilePath,
                success: (rd) => {
                  const pdf = this.buildPdf(rd.data, W, H);
                  const pad = n => (n < 10 ? '0' + n : '' + n);
                  const now = new Date();
                  const filePath = wx.env.USER_DATA_PATH + '/熊宝喂养导出_' + now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate()) + '_' + pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds()) + '.pdf';
                  wx.getFileSystemManager().writeFile({
                    filePath,
                    data: pdf,
                    success: () => {
                      this.setData({ exportVisible: false });
                      wx.openDocument({
                        filePath,
                        fileType: 'pdf',
                        showMenu: true,
                        success: () => wx.showToast({ title: '已生成 PDF 文件', icon: 'none' }),
                        fail: () => wx.showToast({ title: 'PDF 已生成，可打开查看', icon: 'none' })
                      });
                    },
                    fail: () => wx.showToast({ title: 'PDF 生成失败', icon: 'none' })
                  });
                },
                fail: () => wx.showToast({ title: '读取图片失败', icon: 'none' })
              });
            },
            fail: () => wx.showToast({ title: 'PDF 生成失败', icon: 'none' })
          }, this);
        });
      },
      fail: () => wx.showToast({ title: 'PDF 生成失败', icon: 'none' })
    });
  },

  /* 手写生成单页 PDF（内嵌 JPEG 图片） */
  buildPdf(jpegData, imgW, imgH) {
    const pageW = 595.28;
    const pageH = 841.89;
    const scale = Math.min(pageW / imgW, pageH / imgH);
    const drawW = (imgW * scale).toFixed(2);
    const drawH = (imgH * scale).toFixed(2);
    const content = 'q\n' + drawW + ' 0 0 ' + drawH + ' 0 0 cm\n/Im0 Do\nQ\n';
    const ascii = (s) => {
      const a = new Uint8Array(s.length);
      for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i) & 0xff;
      return a;
    };
    const obj3 = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + pageW + ' ' + pageH + '] /Resources << /XObject << /Im0 4 0 R >> /ProcSet [/PDF /ImageC] >> /Contents 5 0 R >>';
    const imgLen = jpegData.byteLength || jpegData.length;
    const contentLen = ascii(content).length;
    const obj4Body = '<< /Type /XObject /Subtype /Image /Width ' + imgW + ' /Height ' + imgH + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + imgLen + ' >>\nstream\n';
    const obj5Body = '<< /Length ' + contentLen + ' >>\nstream\n';
    const chunks = [];
    const offsets = [];
    const pushStr = (s) => { const b = ascii(s); chunks.push(b); return b.length; };
    const pushBytes = (b) => {
      const arr = b instanceof ArrayBuffer ? new Uint8Array(b) : b;
      chunks.push(arr);
      return arr.length;
    };

    let offset = 0;
    // header
    offset += pushStr('%PDF-1.4\n');
    const objOffsets = [0, 0, 0, 0, 0, 0];
    const emitObj = (num, body, isStream) => {
      objOffsets[num] = offset;
      offset += pushStr(num + ' 0 obj\n');
      offset += pushStr(body);
      if (isStream) {
        offset += pushBytes(jpegData);
        offset += pushStr('\nendstream\n');
      }
      offset += pushStr('endobj\n');
    };
    emitObj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    emitObj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    emitObj(3, obj3);
    emitObj(4, obj4Body, true);
    emitObj(5, obj5Body);
    offset += pushBytes(ascii(content));
    offset += pushStr('\nendstream\nendobj\n');

    // xref
    const xrefOffset = offset;
    let xref = 'xref\n0 6\n0000000000 65535 f \n';
    for (let i = 1; i <= 5; i++) {
      xref += ('0000000000' + objOffsets[i]).slice(-10) + ' 00000 n \n';
    }
    xref += 'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n' + xrefOffset + '\n%%EOF\n';
    offset += pushStr(xref);

    const total = new Uint8Array(offset);
    let p = 0;
    chunks.forEach(c => { total.set(c, p); p += c.length; });
    return total.buffer;
  },

  /* 绘制导出长图 */
  drawExportCanvas(ctx, content, H, tableImgs, qrImg) {
    const W = 750;
    const pad = 50;
    ctx.setFillStyle('#fffaf0');
    ctx.fillRect(0, 0, W, H);
    // 顶部品牌区：品牌 icon（不裁切）+ 熊宝喂养
    ctx.setFillStyle('#ffd95a');
    ctx.fillRect(0, 0, W, 140);
    ctx.setFillStyle('#29281f');
    ctx.setFontSize(36);
    ctx.setTextAlign('center');
    const brandTitle = '熊宝喂养';
    const logoSize = 40;
    const gap = 14;
    const titleW = brandTitle.length * 36;
    const totalW = logoSize + gap + titleW;
    const startX = (W - totalW) / 2;
    // 品牌 icon 白色圆角底
    const lpad = 6;
    const bx = startX - lpad;
    const by = 70 - logoSize + 8 - lpad;
    const bs = logoSize + lpad * 2;
    const r = 12;
    ctx.beginPath();
    ctx.moveTo(bx + r, by);
    ctx.arcTo(bx + bs, by, bx + bs, by + bs, r);
    ctx.arcTo(bx + bs, by + bs, bx, by + bs, r);
    ctx.arcTo(bx, by + bs, bx, by, r);
    ctx.arcTo(bx, by, bx + bs, by, r);
    ctx.closePath();
    ctx.setFillStyle('#ffffff');
    ctx.fill();
    try {
      ctx.drawImage('/images/brand-logo.png', startX, 70 - logoSize + 8, logoSize, logoSize);
    } catch (e) {}
    ctx.fillText(brandTitle, startX + logoSize + gap + titleW / 2, 70);
    ctx.setFillStyle('#765d18');
    ctx.setFontSize(24);
    // 内容
    let y = 180;
    const lineH = 40;
    for (let i = 0; i < content.length; i++) {
      if (y > H - 60) break;
      const it = content[i];
      if (it.kind === 'blank') { y += 16; continue; }
      if (it.kind === 'table') {
        const ti = tableImgs && tableImgs[i];
        const tableW = 650;
        const tableH = 46 + (it.rows || []).length * 46;
        if (ti) {
          try { ctx.drawImage(ti, pad, y, tableW, tableH); } catch (e) {}
          y += tableH;
        } else {
          y = this.drawTable(ctx, it, W, pad, y, H);
        }
        continue;
      }
      const isSection = it.kind === 'section';
      const isTitle = it.kind === 'title';
      ctx.setFillStyle(isSection ? '#b97b05' : '#29281f');
      ctx.setFontSize(isTitle ? 32 : isSection ? 26 : 22);
      ctx.setTextAlign('left');
      const maxW = W - pad * 2;
      const cw = isTitle ? 32 : isSection ? 26 : 22;
      const perLine = Math.floor(maxW / cw);
      const text = it.text || '';
      let cur = '';
      let n = 0;
      for (let c = 0; c < text.length; c++) {
        cur += text[c];
        n++;
        if (n >= perLine) {
          ctx.fillText(cur, pad, y);
          y += lineH;
          cur = '';
          n = 0;
          if (y > H - 60) break;
        }
      }
      if (cur) { ctx.fillText(cur, pad, y); y += lineH; }
    }
    // 底部（含小程序码）
    if (qrImg) {
      const qs = 170;
      const qx = W - pad - qs;
      const qy = H - 250;
      // 白色圆角底
      const bs2 = qs + 24;
      ctx.setFillStyle('#ffffff');
      ctx.beginPath();
      ctx.moveTo(qx - 12 + 16, qy - 12);
      ctx.arcTo(qx - 12 + bs2, qy - 12, qx - 12 + bs2, qy - 12 + bs2, 16);
      ctx.arcTo(qx - 12 + bs2, qy - 12 + bs2, qx - 12, qy - 12 + bs2, 16);
      ctx.arcTo(qx - 12, qy - 12 + bs2, qx - 12, qy - 12, 16);
      ctx.arcTo(qx - 12, qy - 12, qx - 12 + bs2, qy - 12, 16);
      ctx.closePath();
      ctx.fill();
      try { ctx.drawImage(qrImg, qx, qy, qs, qs); } catch (e) {}
      ctx.setFillStyle('#b9b2a0');
      ctx.setFontSize(20);
      ctx.setTextAlign('center');
      ctx.fillText('长按识别小程序码', qx + qs / 2, H - 30);
      ctx.fillText('由「熊宝喂养」小程序生成', (pad + qx - 20) / 2, H - 40);
    } else {
      ctx.setFillStyle('#b9b2a0');
      ctx.setFontSize(20);
      ctx.setTextAlign('center');
      ctx.fillText('由「熊宝喂养」小程序生成', W / 2, H - 40);
    }
  },

  /* 绘制表格块（表头 + 数据行 + 网格线） */
  drawTable(ctx, table, W, pad, yTop, H) {
    // 列宽按内容类型分配：日期/时间数字列、类型/详情中文列，详情列多行换行不截断
    const cols = [145, 85, 130, 200, 90];
    const headH = 46;
    const tableW = cols.reduce((a, b) => a + b, 0);
    let y = yTop;
    const wrapText = (txt, maxChars) => {
      const lines = [];
      let cur = '';
      for (let i = 0; i < txt.length; i++) {
        cur += txt[i];
        if (cur.length >= maxChars) { lines.push(cur); cur = ''; }
      }
      if (cur) lines.push(cur);
      return lines.length ? lines : [''];
    };
    // 表头
    ctx.setFillStyle('#ffd95a');
    ctx.fillRect(pad, y, tableW, headH);
    ctx.setFillStyle('#29281f');
    ctx.setFontSize(22);
    ctx.setTextAlign('left');
    let x = pad;
    for (let c = 0; c < table.head.length; c++) {
      ctx.fillText(table.head[c], x + 12, y + 31);
      x += cols[c];
    }
    y += headH;
    // 数据行（详情列多行，行高动态）
    ctx.setStrokeStyle('#e3dcc4');
    ctx.setLineWidth(1);
    for (let r = 0; r < table.rows.length; r++) {
      const row = table.rows[r] || [];
      const detail = String(row[3] == null ? '' : row[3]);
      const detailLines = wrapText(detail, Math.max(1, Math.floor((cols[3] - 18) / 20)));
      const rowH = Math.max(46, detailLines.length * 32);
      if (y + rowH > H - 60) break;
      ctx.setFillStyle(r % 2 === 0 ? '#fffdf7' : '#fbf6e8');
      ctx.fillRect(pad, y, tableW, rowH);
      ctx.setFontSize(20);
      x = pad;
      for (let c = 0; c < cols.length; c++) {
        if (c === 3) {
          ctx.setFillStyle('#29281f');
          detailLines.forEach((ln, li) => ctx.fillText(ln, x + 10, y + 24 + li * 32));
        } else {
          let txt = String(row[c] == null ? '' : row[c]);
          // 含中文按全角 20px，纯数字/时间按半角 12px 估算
          const cw = /[\u4e00-\u9fa5]/.test(txt) ? 20 : 12;
          const maxChars = Math.max(1, Math.floor((cols[c] - 18) / cw));
          if (txt.length > maxChars) txt = txt.slice(0, maxChars - 1) + '…';
          ctx.setFillStyle('#29281f');
          ctx.fillText(txt, x + 10, y + (rowH + 22) / 2);
        }
        x += cols[c];
      }
      // 横向网格线
      ctx.beginPath(); ctx.moveTo(pad, y + rowH); ctx.lineTo(pad + tableW, y + rowH); ctx.stroke();
      // 纵向网格线
      let vx = pad;
      for (let c = 0; c <= cols.length; c++) {
        ctx.beginPath(); ctx.moveTo(vx, yTop); ctx.lineTo(vx, y + rowH); ctx.stroke();
        vx += cols[c];
      }
      y += rowH;
    }
    return y;
  },

  /* 估算导出内容总高度 */
  contentHeight(content) {
    let h = 0;
    content.forEach(it => {
      if (it.kind === 'table') {
        // 与 drawTable 的列宽/换行逻辑保持一致：详情列 200，20px 字号
        const rows = it.rows || [];
        let th = 46;
        rows.forEach(row => {
          const detail = String((row && row[3]) == null ? '' : row[3]);
          const per = Math.max(1, Math.floor((200 - 18) / 20));
          const lines = Math.max(1, Math.ceil(detail.length / per));
          th += Math.max(46, lines * 32);
        });
        h += th;
      } else if (it.kind === 'blank') h += 16;
      else h += 40;
    });
    return h;
  },

  /* 设置菜单 */
  onMenu(e) {
    const action = e.currentTarget.dataset.action;
    if (action === 'baby') {
      wx.navigateTo({ url: '/pages/my-babies/my-babies' });
    } else if (action === 'collab') {
      wx.navigateTo({ url: '/subchart/pages/collaboration/collaboration' });
    } else if (action === 'export') {
      // 在设置页直接弹出导出面板（不切回记录页）
      this.openExport();
    } else if (action === 'privacy') {
      wx.navigateTo({ url: '/subchart/pages/privacy/privacy' });
    } else if (action === 'service') {
      wx.navigateTo({ url: '/subchart/pages/service/service' });
    } else {
      wx.showToast({ title: '功能开发中', icon: 'none' });
    }
  }
});
