const app = getApp();
const perm = require('../../../utils/perm.js');

Page({

  onShareAppMessage() {
    return {
        imageUrl: '/images/share-cover.png', title: '熊宝喂养 · 耗材库存管理', path: 'pages/inventory/inventory' };
  },
  onShareTimeline() {
    return { title: '熊宝喂养 · 耗材库存管理' };
  },
  data: {
    safeTop: (app.globalData && app.globalData.safeTop) || 88,
    baby: {},
    stockItems: [],
    shelfWarnings: [],
    milkWarnings: [],
    goods: [],
    goodsAll: [],
    goodsDetail: null,
    goodsAllVisible: false,
    stockDialog: { visible: false, id: '', name: '', brand: '', count: '', unit: '', produceDate: '', shelfLife: '', price: '', size: '通用', sizeIndex: 0, grams: 800, warrantyMonths: 12 },
    unitOptions: ['罐', '包', '片', '盒', '瓶', '支', '个', '袋', '桶', '箱', '台', '套'],
    unitIndex: 0,
    sizeOptions: ['通用', 'NB', 'S', 'M', 'L', 'XL', 'XXL'],
    // 动态字段：按名称识别商品类型 → 显示对应尺码/克数/保修期
    stockKind: 'other',            // diaper|cloth|tissue|milk|appliance|other
    kindSizes: { diaper: ['NB', 'S', 'M', 'L', 'XL', 'XXL'], cloth: ['52', '59', '66', '73', '80', '90'], tissue: ['S', 'M', 'L', 'XL'] },
    warrantyOptions: ['6', '12', '24', '36', '48', '60'],
    warnDialog: { visible: false, id: '', name: '', date: '' },
    warrantyWarnings: [],
    stockWarnings: [],
    voiceState: { recording: false }
  },

  onShow() {
    // 喂养台录入：需登录后才可使用
    if (!app.requireLogin()) {
      setTimeout(() => wx.navigateBack({ fail: () => {} }), 400);
      return;
    }
    this.refresh();
    // 云端拉取完成后（家庭共享宝宝/成员新数据）刷新
    app.onPullDone(() => { this.refresh(); });
    // 启动库存实时轮询（家庭成员修改库存后实时同步）
    this._startInventoryPolling();
  },

  onHide() {
    // 停止库存轮询
    this._stopInventoryPolling();
  },

  onUnload() {
    // 停止库存轮询
    this._stopInventoryPolling();
  },

  /* 库存实时轮询：每3秒从云端拉取最新数据（家庭成员修改后实时同步） */
  _startInventoryPolling() {
    this._stopInventoryPolling();
    this._inventoryPollTimer = setInterval(() => {
      try {
        const cloudSync = require('../../utils/cloud-sync.js');
        if (cloudSync && cloudSync.pull) {
          cloudSync.pull().then(() => {
            this.refresh();
          }).catch(() => {});
        }
      } catch (e) {}
    }, 3000);
  },

  _stopInventoryPolling() {
    if (this._inventoryPollTimer) {
      clearInterval(this._inventoryPollTimer);
      this._inventoryPollTimer = null;
    }
  },

  refresh() {
    const g = app.globalData;
    // 自动清理旧版本残留的重复内置示例库存（count=0且是纸尿裤/奶粉/棉柔巾的重复条目），只保留用户真实录入的库存
    if (Array.isArray(g.stockItems)) {
      const seen = {};
      const cleaned = g.stockItems.filter(s => {
        // 移除所有count=0的旧内置示例条目（用户录入的真实库存都会带数量>0或自定义名称）
        if (!s.name) return false;
        if (Number(s.count) === 0 && ['纸尿裤', '奶粉', '棉柔巾'].includes(s.name)) {
          const k = s.name + '_' + (s.size || '');
          if (seen[k]) return false;
          seen[k] = true;
        }
        return true;
      });
      if (cleaned.length !== g.stockItems.length) {
        g.stockItems = cleaned;
        app.saveBabyData();
      }
    }
    this.setData({
      baby: g.baby || {},
      stockItems: this.decorateStock(g.stockItems || []),
      shelfWarnings: this.decorateWarnings(g.shelfWarnings || []),
      milkWarnings: this.buildMilkWarnings()
    });
    this.buildWarrantyWarnings();
    this.buildStockWarnings();
    this.buildGoods();
  },

  todayStr() {
    const d = new Date();
    const pad = n => (n < 10 ? '0' + n : '' + n);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  },

  /* 耗材库存：按生产日期+保质期计算到期 */
  decorateStock(list) {
    // 数量归零的耗材不显示
    list = (list || []).filter(s => Number(s.count) > 0);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const pad = n => (n < 10 ? '0' + n : '' + n);
    return list.map(s => {
      let expire = '', daysLeft = null, daysLabel = '';
      if (s.produceDate && s.shelfLife) {
        const p = String(s.produceDate).split('-').map(Number);
        const pd = new Date(p[0], (p[1] || 1) - 1, p[2] || 1);
        const ex = new Date(pd.getTime() + Number(s.shelfLife) * 86400000);
        expire = ex.getFullYear() + '-' + pad(ex.getMonth() + 1) + '-' + pad(ex.getDate());
        const diff = Math.round((ex - now) / 86400000);
        daysLeft = diff;
        daysLabel = diff < 0 ? '已过期' : diff === 0 ? '今天到期' : '剩 ' + diff + ' 天';
      }
      const nameSize = s.name ? ((String(s.name).match(/(NB|S|M|L|XL|XXL)/i) || ['', ''])[1]).toUpperCase() : '';
      const size = s.size || nameSize;
      return Object.assign({}, s, {
        initial: (s.name || '?').slice(0, 1),
        sizeText: size ? (size + ' 码') : '',
        expire,
        daysLeft,
        daysLabel,
        priceText: s.price ? ('¥' + (Number(s.price) % 1 === 0 ? Number(s.price) : Number(s.price).toFixed(2))) : ''
      });
    });
  },

  /* ==================== 母乳储存提醒：关联吸奶记录 · 按国标时限到期丢弃 ==================== */
  buildMilkWarnings() {
    const g = app.globalData;
    const MS = g.MILK_STORAGE || {};
    const records = g.records || [];
    const milkRecords = records.filter(r => r && r.type === '吸奶');
    // 没有任何母乳吸奶记录时，不显示任何到期提醒
    if (!milkRecords.length) {
      this.setData({ milkWarnings: [] });
      return;
    }
    const now = new Date();
    const dismissedMilk = wx.getStorageSync('dismissed_milk_exp') || {};
    const list = [];
    milkRecords.forEach((r, i) => {
      const recId = r.id || ('rec_' + i);
      if (dismissedMilk[recId]) return; // 已点知道了，不显示
      const st = MS[r.storage] ? r.storage : 'fridge';
      const cfg = MS[st] || MS.fridge;
      const dp = String(r.date || this.todayStr()).split('-').map(Number);
      const tp = String(r.time || '00:00').split(':').map(Number);
      const start = new Date(dp[0], (dp[1] || 1) - 1, dp[2] || 1, tp[0] || 0, tp[1] || 0, 0);
      let expire;
      if (cfg.unit === 'h') {
        expire = new Date(start.getTime() + cfg.value * 3600000);
      } else {
        expire = new Date(start.getFullYear(), start.getMonth() + cfg.value, start.getDate(), start.getHours(), start.getMinutes());
      }
      const diffMs = expire - now;
      const expired = diffMs <= 0;
      let daysLabel;
      if (expired) {
        daysLabel = '已过期，若未瓶喂使用，请丢弃';
      } else if (cfg.unit === 'h') {
        const mins = Math.max(1, Math.floor(diffMs / 60000));
        if (mins < 60) daysLabel = '剩 ' + mins + ' 分钟';
        else daysLabel = '剩 ' + Math.floor(mins / 60) + ' 小时 ' + (mins % 60) + ' 分钟';
      } else {
        daysLabel = '剩 ' + Math.ceil(diffMs / 86400000) + ' 天';
      }
      const total = (r.pumpLeftAmt || 0) + (r.pumpRightAmt || 0);
      const dateLabel = String(r.date || '').split('-').slice(1).join('/');
      list.push({
        id: recId,
        idx: i,
        storage: st,
        expired,
        daysLabel,
        amount: total ? total + ' ml' : '—',
        name: '母乳 · ' + dateLabel + ' ' + (r.time || ''),
        storageLabel: (cfg.label || '') + ' ' + (cfg.desc || '')
      });
    });
    return list.reverse();
  },

  dismissMilkWarning(e) {
    const id = e.currentTarget.dataset.id;
    const dismissed = wx.getStorageSync('dismissed_milk_exp') || {};
    dismissed[id] = true;
    wx.setStorageSync('dismissed_milk_exp', dismissed);
    wx.showToast({ title: '已知道了', icon: 'success' });
    this.setData({ milkWarnings: this.buildMilkWarnings() });
  },

  /* 保修期提醒：由电器库存自动生成 */
  buildWarrantyWarnings() {
    const now = new Date();
    const pad = n => (n < 10 ? '0' + n : '' + n);
    const list = (app.globalData.stockItems || []).filter(s => s.warrantyUntil).map(s => {
      const wp = String(s.warrantyUntil).split('-').map(Number);
      const end = new Date(wp[0], (wp[1] || 1) - 1, (wp[2] || 1), 23, 59, 59);
      const diffMs = end - now;
      let label = '', urgent = false, over = false;
      if (diffMs <= 0) { label = '已过保'; over = true; }
      else if (diffMs < 30 * 86400000) {
        urgent = true;
        const days = Math.max(1, Math.ceil(diffMs / 86400000));
        label = days <= 1 ? '今日到期' : '剩 ' + days + ' 天';
      } else {
        label = '剩 ' + Math.round(diffMs / 86400000) + ' 天';
      }
      return { id: 'warr_' + s.id, name: s.name || '电器', tip: '保修至 ' + s.warrantyUntil + ' · 录入时自动同步', daysLabel: label, over, urgent };
    });
    list.sort((a, b) => (a.over ? 0 : 1) - (b.over ? 0 : 1));
    this.setData({ warrantyWarnings: list });
  },
  /* 库存提醒：按库存数量自动生成（录入库存自动开启） */
  buildStockWarnings() {
    const th = (name, kind) => {
      if (kind === 'diaper') return 5;
      if (kind === 'tissue' || kind === 'cloth') return 3;
      if (kind === 'milk') return 1;
      return 1;
    };
    // 读取已点"知道了"忽略的库存提醒
    const dismissed = wx.getStorageSync('dismissed_stock_warn') || {};
    const seen = {};
    const list = (app.globalData.stockItems || []).map(s => {
      // 旧版本预置示例（纸尿裤/奶粉/棉柔巾，库存 0 且无耗材属性）不产生库存提醒
      if (app.isLegacyPresetStock && app.isLegacyPresetStock(s)) return null;
      const cnt = Number(s.count) || 0;
      const dk = this.detectKind(s.name);
      const t = th(s.name, dk.kind);
      // 按名称+尺码去重，避免旧重复条目同时显示
      const dedupKey = (s.name || '') + '_' + (s.size || '');
      if (cnt >= t) {
        // 库存回到正常，清除忽略状态，下次再偏低会重新提醒
        if (dismissed[dedupKey]) {
          delete dismissed[dedupKey];
          wx.setStorageSync('dismissed_stock_warn', dismissed);
        }
        return null;
      }
      if (seen[dedupKey]) return null;
      seen[dedupKey] = true;
      if (dismissed[dedupKey]) return null; // 已点知道了，不显示
      const low = cnt > 0;
      return {
        id: 'stockw_' + dedupKey,
        name: s.name + (s.size ? '（' + s.size + '）' : ''),
        tip: '库存 ' + cnt + ' ' + (s.unit || '个') + (low ? ('，低于建议 ' + t) : '，请及时补货'),
        daysLabel: low ? '偏低' : '用尽',
        over: !low, urgent: low
      };
    }).filter(Boolean);
    this.setData({ stockWarnings: list });
  },

  dismissStockWarning(e) {
    const id = e.currentTarget.dataset.id;
    // id是 stockw_ 开头，去掉前缀得到dedupKey
    const dedupKey = id.replace('stockw_', '');
    const dismissed = wx.getStorageSync('dismissed_stock_warn') || {};
    dismissed[dedupKey] = true;
    wx.setStorageSync('dismissed_stock_warn', dismissed);
    wx.showToast({ title: '已知道了', icon: 'success' });
    this.buildStockWarnings();
  },

  /* 切换母乳储存方式：重算国标到期时间 */
  setMilkStorage(e) {
    const idx = Number(e.currentTarget.dataset.idx);
    const st = e.currentTarget.dataset.st;
    const g = app.globalData;
    const rec = (g.records || [])[idx];
    if (!rec || rec.type !== '吸奶') return;
    if (rec.storage === st) return;
    rec.storage = st;
    app.saveBabyData();
    this.setData({ milkWarnings: this.buildMilkWarnings() });
    const cfg = (g.MILK_STORAGE || {})[st] || {};
    wx.showToast({ title: '已按「' + (cfg.label || '') + '」储存：' + (cfg.desc || ''), icon: 'none' });
  },

  /* 保质期剩余时间：按真实当前时间动态计算（不足 24h 精确到小时分钟） */
  decorateWarnings(list) {
    const now = new Date();
    return list.map(w => {
      let daysLeft = 0, label = '';
      if (w.date) {
        const parts = w.date.split('-').map(Number);
        // 到期日 24:00（当天结束）作为过期时刻，不足 24h 精确到小时分钟
        const end = new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59);
        const diffMs = end - now;
        daysLeft = Math.round(diffMs / 86400000);
        if (diffMs <= 0) {
          label = '已过期';
        } else if (diffMs < 86400000) {
          const mins = Math.max(1, Math.floor(diffMs / 60000));
          if (mins < 60) label = '剩 ' + mins + ' 分钟';
          else label = '剩 ' + Math.floor(mins / 60) + ' 小时 ' + (mins % 60) + ' 分钟';
        } else {
          label = '剩 ' + Math.round(diffMs / 86400000) + ' 天';
        }
      }
      return Object.assign({}, w, { daysLeft, daysLabel: label });
    });
  },

  persist() {
    const g = app.globalData;
    g.stockItems = this.data.stockItems;
    g.shelfWarnings = this.data.shelfWarnings;
    app.saveBabyData();
    // 库存修改后立即上传云端（家庭成员实时共享）
    if (g.user && g.user.openid) {
      try {
        const cloudData = require('../../utils/cloud-data.js');
        if (cloudData && cloudData.pushAll) {
          cloudData.pushAll(true); // true = 立即执行，不防抖
        }
      } catch (e) { console.log('[inventory] push error', e); }
    }
  },

  goBack() {
    wx.navigateBack({ delta: 1 });
  },

  /* ==================== 耗材库存 ==================== */
  addStock() {
    // 刚完成长按语音录入：抑制松手后误触发的 tap，不弹新增抽屉
    if (this._suppressTap) {
      this._suppressTap = false;
      return;
    }
    this.setData({
      stockDialog: { visible: true, id: '', name: '', brand: '', count: '', unit: '', produceDate: this.todayStr(), shelfLife: '', price: '', size: '通用', sizeIndex: 0, grams: 800, warrantyMonths: 12 },
      stockKind: 'other',
      sizeOptions: ['通用']
    });
  },
  /* 名称 → 商品类型（决定尺码/克数/保修期字段） */
  detectKind(name) {
    const n = (name || '').trim();
    if (!n) return { kind: 'other', sizes: ['通用'] };
    if (/纸尿裤|尿不湿|拉拉裤/.test(n)) return { kind: 'diaper', sizes: ['NB', 'S', 'M', 'L', 'XL', 'XXL'] };
    if (/奶粉|配方乳|配方奶|奶米粉|米粉/.test(n)) return { kind: 'milk', sizes: ['通用'] };
    if (/衣服|衣物|连体衣|睡袋|包被|帽子|袜子|围兜|口水巾|鞋/.test(n)) return { kind: 'cloth', sizes: ['52', '59', '66', '73', '80', '90'] };
    if (/纸巾|湿巾|棉柔巾|云柔巾|柔纸巾|柔巾/.test(n)) return { kind: 'tissue', sizes: ['S', 'M', 'L', 'XL'] };
    if (/吸奶器|消毒器|温奶器|摇奶器|辅食机|料理机|恒温壶|烘干机|洗衣机|电器|暖奶器/.test(n)) return { kind: 'appliance', sizes: ['通用'] };
    return { kind: 'other', sizes: ['通用'] };
  },

  editStock(e) {
    const id = e.currentTarget.dataset.id;
    const item = this.data.stockItems.find(s => s.id === id);
    if (!item) return;
    const dk = this.detectKind(item.name);
    const size = item.size || (item.name || '').match(/(NB|S|M|L|XL|XXL)/i) ? (item.size || (item.name.match(/(NB|S|M|L|XL|XXL)/i) || ['', '通用'])[1].toUpperCase()) : '通用';
    const sizeIndex = Math.max(0, dk.sizes.indexOf(size));
    this.setData({
      stockDialog: { visible: true, id: item.id, name: item.name, brand: item.brand || '', count: String(item.count), unit: item.unit || '', produceDate: item.produceDate || this.todayStr(), shelfLife: item.shelfLife ? String(item.shelfLife) : '', price: item.price ? String(item.price) : '', size, sizeIndex, grams: item.grams || 800, warrantyMonths: item.warrantyMonths || 12 },
      stockKind: dk.kind,
      sizeOptions: dk.sizes,
      unitIndex: Math.max(0, this.data.unitOptions.indexOf(item.unit || ''))
    });
  },

  closeStockDialog() {
    this.setData({ 'stockDialog.visible': false });
  },

  onStockInput(e) {
    const field = e.currentTarget.dataset.field;
    const val = e.detail.value;
    const patch = { ['stockDialog.' + field]: val };
    if (field === 'name') {
      const dk = this.detectKind(val);
      patch.stockKind = dk.kind;
      patch.sizeOptions = dk.sizes;
      patch['stockDialog.sizeIndex'] = 0;
      patch['stockDialog.size'] = dk.sizes[0] && dk.sizes[0] !== '通用' ? dk.sizes[0] : '通用';
    }
    this.setData(patch);
  },
  /* 奶粉克数滑动选择 */
  onMilkGrams(e) {
    this.setData({ 'stockDialog.grams': Number(e.detail.value) });
  },
  /* 单位下拉选择 */
  onStockUnit(e) {
    const idx = Number(e.detail.value);
    this.setData({ 'stockDialog.unit': this.data.unitOptions[idx] || '', unitIndex: idx });
  },
  /* 保修期选择（月） */
  onWarranty(e) {
    const idx = Number(e.detail.value);
    this.setData({ 'stockDialog.warrantyMonths': Number(this.data.warrantyOptions[idx]) });
  },

  openProduceDatePicker() {
    this.setData({ showProduceDatePicker: true });
  },
  closeProduceDatePicker() {
    this.setData({ showProduceDatePicker: false });
  },
  onProduceDate(e) {
    this.setData({ 'stockDialog.produceDate': e.detail.value, showProduceDatePicker: false });
  },

  onStockSize(e) {
    const idx = Number(e.detail.value);
    this.setData({ 'stockDialog.sizeIndex': idx, 'stockDialog.size': this.data.sizeOptions[idx] });
  },

  incStock(e) {
    const id = e.currentTarget.dataset.id;
    const list = this.data.stockItems.map(s => s.id === id ? Object.assign({}, s, { count: (Number(s.count) || 0) + 1 }) : s);
    this.setData({ stockItems: list });
    this.persist();
  },

  decStock(e) {
    const id = e.currentTarget.dataset.id;
    const item = this.data.stockItems.find(s => s.id === id);
    if (!item) return;
    const next = (Number(item.count) || 0) - 1;
    if (next < 0) {
      wx.showToast({ title: '库存已为 0', icon: 'none' });
      return;
    }
    const list = this.data.stockItems.map(s => s.id === id ? Object.assign({}, s, { count: next }) : s);
    this.setData({ stockItems: list });
    this.persist();
  },

  /* ==================== 语音录入耗材（长按 + 号） ==================== */
  /* 长按判定：按住超过 600ms 开始录音；单击仍为新增 */
  voiceTouchStart() {
    if (this._voicePressTimer) clearTimeout(this._voicePressTimer);
    this._voiceActive = false;
    this._voicePressTimer = setTimeout(() => {
      this._voicePressTimer = null;
      this._voiceActive = true;
      this.startVoiceRecord();
    }, 600);
  },
  voiceTouchEnd() {
    if (this._voicePressTimer) {
      clearTimeout(this._voicePressTimer);
      this._voicePressTimer = null;
      // 单击：走新增
      return;
    }
    if (this._voiceActive) {
      // 长按录音结束：抑制随后触发的 tap，不弹新增抽屉
      this._voiceActive = false;
      this._suppressTap = true;
      this.stopVoiceRecord();
      setTimeout(() => { this._suppressTap = false; }, 500);
      return;
    }
    this.stopVoiceRecord();
  },
  voiceTouchCancel() {
    if (this._voicePressTimer) { clearTimeout(this._voicePressTimer); this._voicePressTimer = null; }
    if (this._voiceActive) this.stopVoiceRecord();
  },

  initRecorder() {
    if (this.recorder) return this.recorder;
    this.recorder = wx.getRecorderManager();
    this.recorder.onStop((res) => {
      this.setData({ 'voiceState.recording': false });
      if (!res || !res.tempFilePath) return;
      this.recognizeVoice(res.tempFilePath);
    });
    this.recorder.onError(() => {
      this.setData({ 'voiceState.recording': false });
      wx.showToast({ title: '录音失败，请检查麦克风权限', icon: 'none' });
    });
    return this.recorder;
  },

  startVoiceRecord() {
    if (this.data.voiceState.recording) return;
    const that = this;
    // 先弹授权页，授权成功后才开始录音功能进程
    wx.authorize({
      scope: 'scope.record',
      success() { that.doStartRecord(); },
      fail() {
        // 拒绝过：引导去设置页开启
        wx.showModal({
          title: '需要麦克风权限',
          content: '请在设置中开启麦克风权限后使用语音录入',
          confirmText: '去设置',
          success(res) { if (res.confirm) wx.openSetting(); }
        });
      }
    });
  },

  doStartRecord() {
    this.setData({ 'voiceState.recording': true });
    this.initRecorder().start({
      duration: 60000,
      format: 'mp3',
      sampleRate: 16000,
      encodeBitRate: 48000,
      numberOfChannels: 1
    });
  },

  stopVoiceRecord() {
    if (this.data.voiceState.recording && this.recorder) this.recorder.stop();
  },

  /* 上传录音到云存储并调用 voiceAsr 识别 */
  recognizeVoice(tempFilePath) {
    const cloud = wx.cloud;
    if (!cloud || !cloud.uploadFile) {
      this.setData({ 'voiceState.recording': false });
      wx.showToast({ title: '未开通云开发，请手动录入', icon: 'none' });
      return;
    }
    wx.showLoading({ title: '识别中…' });
    const cloudPath = 'voice/inv_' + Date.now() + '.mp3';
    cloud.uploadFile({
      cloudPath,
      filePath: tempFilePath,
      success: (up) => {
        if (!up || !up.fileID) {
          wx.hideLoading();
          this.setData({ 'voiceState.recording': false });
          wx.showToast({ title: '上传失败，请重试', icon: 'none' });
          return;
        }
        wx.cloud.callFunction({
          name: 'voiceAsr',
          data: { fileID: up.fileID },
          success: (r) => {
            wx.hideLoading();
            const res = (r && r.result) || {};
            if (res.code === 0 && res.text) {
              this.onStockVoiceResult(res.text);
            } else if (res.code === -3) {
              this.setData({ 'voiceState.recording': false });
              wx.showToast({ title: '语音识别未配置密钥，请部署 voiceAsr', icon: 'none', duration: 3000 });
            } else {
              this.setData({ 'voiceState.recording': false });
              wx.showToast({ title: '识别失败：' + (res.msg || '未知错误'), icon: 'none' });
            }
          },
          fail: () => {
            wx.hideLoading();
            this.setData({ 'voiceState.recording': false });
            wx.showToast({ title: '云函数调用失败，请确认已部署 voiceAsr', icon: 'none' });
          }
        });
      },
      fail: () => {
        wx.hideLoading();
        this.setData({ 'voiceState.recording': false });
        wx.showToast({ title: '录音上传失败，请重试', icon: 'none' });
      }
    });
  },

  /* 智能解析耗材语音并直接填入库存表 */
  parseStockVoice(text) {
    const raw = (text || '').trim();
    if (!raw) return null;
    const t = raw.replace(/[，。、s]+/g, '').toLowerCase();
    let name = '', count = 1, unit = '个', grams = 800, size = '';
    const m = t.match(/(\d+)(包|片|个|盒|袋|瓶|卷|张|支|件|罐|条|双|组)/);
    if (m) { count = parseInt(m[1], 10); unit = m[2]; }
    const mg = t.match(/(\d+)(g|克|毫升|ml)/);
    if (mg) { grams = Math.min(1200, Math.max(100, parseInt(mg[1], 10))); unit = '克'; }
    const ms = t.match(/nb|s码|m码|l码|xl码|xxl码|52|59|66|73|80|90/);
    if (ms) size = String(ms[0]).replace('码', '').toUpperCase();
    const kw = [
      ['纸尿裤', /纸尿裤|尿不湿/],
      ['奶粉', /奶粉/],
      ['棉柔巾', /棉柔巾|柔巾/],
      ['湿巾', /湿巾/],
      ['纸巾', /纸巾|抽纸/],
      ['衣物', /衣物|衣服|连体衣|哈衣/],
      ['吸奶器', /吸奶器/],
      ['奶瓶', /奶瓶/],
      ['口水巾', /口水巾/]
    ];
    for (const item of kw) {
      if (item[1].test(t)) { name = item[0]; break; }
    }
    if (!name) {
      const cn = raw.replace(/[0-9a-zA-Z，。、\s]+/g, '').slice(0, 8);
      if (cn.length >= 2) name = cn;
    }
    if (!name) return null;
    return { name, count, unit, grams, size };
  },

  onStockVoiceResult(text) {
    const parsed = this.parseStockVoice(text);
    if (!parsed) {
      this.setData({ 'voiceState.recording': false });
      wx.showToast({ title: '识别失败，请重新录入', icon: 'none' });
      return;
    }
    const today = this.todayStr();
    const colors = ['#fff2b9', '#fff2b9', '#fff2b9', '#ffe3cc', '#f6dff0', '#f6f1e5'];
    const dk = this.detectKind(parsed.name);
    const list = this.data.stockItems.slice();
    list.push({
      id: 'st' + Date.now(),
      name: parsed.name,
      count: parsed.count,
      unit: parsed.unit || '个',
      color: colors[list.length % colors.length],
      produceDate: today,
      shelfLife: '',
      price: '',
      size: parsed.size || '',
      grams: dk.kind === 'milk' ? parsed.grams : '',
      warrantyMonths: dk.kind === 'appliance' ? 12 : 0,
      warrantyUntil: ''
    });
    this.setData({ stockItems: this.decorateStock(list) });
    this.persist();
    this.buildWarrantyWarnings();
    this.buildStockWarnings();
    wx.showToast({ title: '已识别并添加「' + parsed.name + '」', icon: 'success' });
  },

  saveStock() {
    // 库存是账号级别的，只要登录即可使用
    if (!app.globalData.user || !app.globalData.user.openid) {
      wx.showToast({ title: '请先登录账号', icon: 'none' });
      return;
    }
    const d = this.data.stockDialog;
    const name = (d.name || '').trim();
    const brand = (d.brand || '').trim();
    const count = Math.max(0, Number(d.count) || 0);
    const unit = (d.unit || '').trim();
    if (!name) {
      wx.showToast({ title: '请填写名称', icon: 'none' });
      return;
    }
    const produceDate = d.produceDate || '';
    const shelfLife = d.shelfLife ? Math.max(1, Number(d.shelfLife) || 0) : '';
    const price = d.price ? Number(d.price) : '';
    const size = d.size && d.size !== '通用' ? d.size : '';
    const dk = this.detectKind(name);
    const grams = dk.kind === 'milk' ? (d.grams || 800) : '';
    // 电器：保修期 → 保修到期日（购买日=生产日期或今天 + 保修月数）
    let warrantyUntil = '';
    if (dk.kind === 'appliance' && d.warrantyMonths) {
      const base = produceDate ? String(produceDate).split('-').map(Number) : (() => { const t = new Date(); return [t.getFullYear(), t.getMonth() + 1, t.getDate()]; })();
      const ex = new Date(base[0], (base[1] || 1) - 1 + Number(d.warrantyMonths), base[2] || 1);
      const pad = n => (n < 10 ? '0' + n : '' + n);
      warrantyUntil = ex.getFullYear() + '-' + pad(ex.getMonth() + 1) + '-' + pad(ex.getDate());
    }
    const colors = ['#fff2b9', '#fff2b9', '#fff2b9', '#ffe3cc', '#f6dff0', '#f6f1e5'];
    let list = this.data.stockItems.slice();
    if (d.id) {
      list = list.map(s => s.id === d.id ? Object.assign({}, s, { name, brand, count, unit: unit || s.unit, produceDate, shelfLife, price, size, grams, warrantyMonths: d.warrantyMonths || 0, warrantyUntil, _u: Date.now() }) : s);
    } else {
      list.push({ id: 'st' + Date.now(), name, brand, count, unit: unit || '个', color: colors[list.length % colors.length], produceDate, shelfLife, price, size, grams, warrantyMonths: d.warrantyMonths || 0, warrantyUntil, _u: Date.now() });
    }
    this.setData({ stockItems: this.decorateStock(list), 'stockDialog.visible': false });
    // 库存录入后自动同步保质期提醒（无需手动添加），电器类不生成保质期提醒，走保修期提醒
    const warnings = this.data.shelfWarnings.filter(w => (w.id || '').indexOf('stock_') !== 0);
    let expireDate = '';
    if (produceDate && shelfLife && dk.kind !== 'appliance') {
      const pp = String(produceDate).split('-').map(Number);
      const ex = new Date(pp[0], (pp[1] || 1) - 1, (pp[2] || 1) + Number(shelfLife));
      const pad = n => (n < 10 ? '0' + n : '' + n);
      expireDate = ex.getFullYear() + '-' + pad(ex.getMonth() + 1) + '-' + pad(ex.getDate());
    }
    const savedId = d.id || list[list.length - 1].id;
    if (expireDate) {
      warnings.push({ id: 'stock_' + savedId, name: name + (size ? '（' + size + '）' : ''), date: expireDate, tip: '按录入保质期自动同步' });
    }
    this.setData({ shelfWarnings: this.decorateWarnings(warnings) });
    this.persist();
    this.buildWarrantyWarnings();
    this.buildStockWarnings();
    wx.showToast({ title: d.id ? '已更新' : '已新增', icon: 'none' });
  },

  removeStock() {
    // 库存是账号级别的，只要登录即可使用
    if (!app.globalData.user || !app.globalData.user.openid) {
      wx.showToast({ title: '请先登录账号', icon: 'none' });
      return;
    }
    const id = this.data.stockDialog.id;
    wx.showModal({
      title: '删除耗材',
      content: '确定删除该耗材吗？',
      confirmColor: '#e25b4a',
      success: (res) => {
        if (!res.confirm) return;
        const gone = (this.data.stockItems || []).find(s => s.id === id);
        const cid = gone && gone._cid;
        const list = this.data.stockItems.filter(s => s.id !== id);
        this.setData({ stockItems: list, 'stockDialog.visible': false });
        this.persist();
        if (cid) app.tombCloud('inventory', cid);
        // 删除库存时同步移除其自动保质期提醒
        this.setData({ shelfWarnings: this.decorateWarnings(this.data.shelfWarnings.filter(w => w.id !== 'stock_' + id)) });
        this.persist();
        this.buildWarrantyWarnings();
        this.buildStockWarnings();
        wx.showToast({ title: '已删除', icon: 'none' });
      }
    });
  },

  /* ==================== 保质期提醒 ==================== */
  addWarning() {
    const now = new Date();
    const pad = n => (n < 10 ? '0' + n : '' + n);
    const today = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
    this.setData({ warnDialog: { visible: true, id: '', name: '', date: today } });
  },

  editWarning(e) {
    const id = e.currentTarget.dataset.id;
    const w = this.data.shelfWarnings.find(x => x.id === id);
    if (!w) return;
    this.setData({ warnDialog: { visible: true, id: w.id, name: w.name, date: w.date } });
  },

  closeWarnDialog() {
    this.setData({ 'warnDialog.visible': false });
  },

  onWarnInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ ['warnDialog.' + field]: e.detail.value });
  },

  openWarnDatePicker() {
    this.setData({ showWarnDatePicker: true });
  },
  closeWarnDatePicker() {
    this.setData({ showWarnDatePicker: false });
  },
  onWarnDate(e) {
    this.setData({ 'warnDialog.date': e.detail.value, showWarnDatePicker: false });
  },

  saveWarning() {
    const d = this.data.warnDialog;
    const name = (d.name || '').trim();
    if (!name) {
      wx.showToast({ title: '请填写名称', icon: 'none' });
      return;
    }
    const tip = this.buildWarnTip(d.date);
    let list = this.data.shelfWarnings.slice();
    if (d.id) {
      list = list.map(w => w.id === d.id ? Object.assign({}, w, { name, date: d.date, tip }) : w);
    } else {
      list.push({ id: 'w' + Date.now(), name, date: d.date, tip });
    }
    this.setData({ shelfWarnings: this.decorateWarnings(list), 'warnDialog.visible': false });
    this.persist();
    wx.showToast({ title: d.id ? '已更新' : '已添加提醒', icon: 'none' });
  },

  buildWarnTip(date) {
    if (!date) return '';
    const parts = date.split('-').map(Number);
    return '建议 ' + parts[0] + '年' + String(parts[1]).padStart(2, '0') + '月' + String(parts[2]).padStart(2, '0') + '日前使用完';
  },

  removeWarning() {
    const id = this.data.warnDialog.id;
    wx.showModal({
      title: '删除提醒',
      content: '确定删除该保质期提醒吗？',
      confirmColor: '#e25b4a',
      success: (res) => {
        if (!res.confirm) return;
        const list = this.data.shelfWarnings.filter(w => w.id !== id);
        this.setData({ shelfWarnings: this.decorateWarnings(list), 'warnDialog.visible': false });
        this.persist();
        // 删除库存时同步移除其自动保质期提醒
        this.setData({ shelfWarnings: this.decorateWarnings(this.data.shelfWarnings.filter(w => w.id !== 'stock_' + id)) });
        this.persist();
        this.buildWarrantyWarnings();
        this.buildStockWarnings();
        wx.showToast({ title: '已删除', icon: 'none' });
      }
    });
  },

  /* ==================== 好物种草（智能推荐 · 橱窗预留） ==================== */
  GOODS_LIB() {
    return [
      { id: 'g01', cat: '喂养', icon: '/subchart/pages/firstaid/icons/spoon.png', title: '宽口径奶瓶', desc: '防胀气，好清洗', min: 0, max: 24, price: '', buyUrl: '', tags: ['奶瓶', '喂养'] },
      { id: 'g02', cat: '消耗', icon: '/subchart/pages/firstaid/icons/spoon.png', title: '纸尿裤', desc: '轻薄透气 整夜干爽', min: 0, max: 36, price: '', buyUrl: '', tags: ['纸尿裤', '消耗'] },
      { id: 'g03', cat: '消耗', icon: '/subchart/pages/firstaid/icons/spoon.png', title: '婴儿湿巾', desc: 'EDI纯水 温和不刺激', min: 0, max: 36, price: '', buyUrl: '', tags: ['湿巾', '消耗'] },
      { id: 'g04', cat: '喂养', icon: '/subchart/pages/firstaid/icons/spoon.png', title: '储奶袋', desc: '双层密封 不漏液', min: 0, max: 18, price: '', buyUrl: '', tags: ['母乳', '储奶'] },
      { id: 'g05', cat: '喂养', icon: '/subchart/pages/firstaid/icons/spoon.png', title: '电动吸奶器', desc: '双模式 低噪舒适', min: 0, max: 18, price: '', buyUrl: '', tags: ['吸奶', '母乳'] },
      { id: 'g06', cat: '喂养', icon: '/subchart/pages/firstaid/icons/spoon.png', title: '温奶器', desc: '恒温解冻 快速加热', min: 0, max: 18, price: '', buyUrl: '', tags: ['温奶', '喂养'] },
      { id: 'g07', cat: '喂养', icon: '/subchart/pages/firstaid/icons/spoon.png', title: '奶瓶消毒器', desc: '蒸汽烘干一体', min: 0, max: 18, price: '', buyUrl: '', tags: ['消毒', '喂养'] },
      { id: 'g08', cat: '营养', icon: '/subchart/pages/firstaid/icons/spoon.png', title: '维生素D3', desc: '出生15天起每日一滴', min: 0, max: 24, price: '', buyUrl: '', tags: ['D3', '营养'] },
      { id: 'g09', cat: '睡眠', icon: '/subchart/pages/firstaid/icons/spoon.png', title: '婴儿睡袋', desc: '防踢被 恒温安睡', min: 3, max: 24, price: '', buyUrl: '', tags: ['睡袋', '睡眠'] },
      { id: 'g10', cat: '护理', icon: '/subchart/pages/firstaid/icons/spoon.png', title: '婴儿抚触油', desc: '天然成分 温和滋润', min: 0, max: 12, price: '', buyUrl: '', tags: ['抚触', '护理'] },
      { id: 'g11', cat: '护理', icon: '/subchart/pages/firstaid/icons/cream.png', title: '婴儿面霜', desc: '秋冬保湿不干燥', min: 0, max: 36, price: '', buyUrl: '', tags: ['面霜', '护理'] },
      { id: 'g12', cat: '辅食', icon: '/subchart/pages/firstaid/icons/spoon.png', title: '高铁米粉', desc: '补铁第一口', min: 4, max: 24, price: '', buyUrl: '', tags: ['辅食', '米粉'] },
      { id: 'g13', cat: '辅食', icon: '/subchart/pages/firstaid/icons/spoon.png', title: '辅食碗勺套装', desc: '食品级硅胶 防摔', min: 4, max: 36, price: '', buyUrl: '', tags: ['辅食', '餐具'] },
      { id: 'g14', cat: '辅食', icon: '/subchart/pages/firstaid/icons/teether.png', title: '咬咬乐', desc: '磨牙啃咬好帮手', min: 5, max: 18, price: '', buyUrl: '', tags: ['磨牙', '辅食'] },
      { id: 'g15', cat: '辅食', icon: '/subchart/pages/firstaid/icons/spoon.png', title: '防水围兜', desc: '易清洗 好打理', min: 4, max: 36, price: '', buyUrl: '', tags: ['围兜', '辅食'] },
      { id: 'g16', cat: '辅食', icon: '/subchart/pages/firstaid/icons/spoon.png', title: '辅食机', desc: '蒸打一体 细腻辅食', min: 4, max: 24, price: '', buyUrl: '', tags: ['辅食机', '辅食'] },
      { id: 'g17', cat: '护理', icon: '/subchart/pages/firstaid/icons/spoon.png', title: '婴儿体温计', desc: '快速测温 安心守护', min: 0, max: 36, price: '', buyUrl: '', tags: ['体温', '护理'] },
      { id: 'g18', cat: '出行', icon: '/subchart/pages/firstaid/icons/spoon.png', title: '爬行垫', desc: '加厚防摔 自由探索', min: 4, max: 18, price: '', buyUrl: '', tags: ['爬行', '出行'] }
    ];
  },
  babyMonths() {
    const b = app.globalData.baby || {};
    if (!b.birthday) return null;
    const bp = String(b.birthday).split('-').map(Number);
    if (bp.length < 3 || !bp[0]) return null;
    const bd = new Date(bp[0], (bp[1] || 1) - 1, bp[2] || 1);
    const now = new Date();
    let m = (now.getFullYear() - bd.getFullYear()) * 12 + (now.getMonth() - bd.getMonth());
    if (now.getDate() < bd.getDate()) m--;
    return Math.max(0, m);
  },
  /* 智能推荐：月龄匹配 + 真实记录/库存加权，生成推荐理由（橱窗预留字段） */
  buildGoods() {
    const g = app.globalData;
    const m = this.babyMonths();
    const records = g.records || [];
    const stockItems = g.stockItems || [];
    const cat = (r) => {
      if (!r || !r.date) return;
      const ymd = this.todayStr();
      if (r.date !== ymd && r.date > ymd.replace(/-/g, '')) return;
      return r.type;
    };
    const has = (types) => records.some(r => types.indexOf(r.type) >= 0);
    const hasRecent = (types) => records.slice().reverse().slice(0, 30).some(r => types.indexOf(r.type) >= 0);
    const owned = (kw) => stockItems.some(s => kw.some(k => (s.name || '').indexOf(k) >= 0));

    const boosts = {
      'g01': has(['配方奶']) ? 30 : 0, 'g02': (g.diaperStock < 10 && g.diaperStock > 0) || has(['换尿布']) ? 28 : 0,
      'g03': has(['换尿布']) ? 22 : 0, 'g04': has(['吸奶', '母乳']) ? 26 : 0, 'g05': has(['吸奶']) ? 30 : 0,
      'g06': has(['吸奶']) ? 20 : 0, 'g07': has(['配方奶']) ? 18 : 0, 'g08': (g.supplies && g.supplies.d3Days === 0) ? 16 : 0,
      'g09': has(['睡眠']) ? 14 : 0, 'g10': 6, 'g11': 6, 'g12': has(['辅食']) ? 32 : 0, 'g13': has(['辅食']) ? 26 : 0,
      'g14': has(['辅食']) ? 18 : 0, 'g15': has(['辅食']) ? 16 : 0, 'g16': has(['辅食']) ? 22 : 0, 'g17': has(['体温']) ? 20 : 0, 'g18': 8
    };
    const ownedCheck = {
      'g02': ['纸尿裤', '尿不湿'], 'g03': ['湿巾', '棉柔巾'], 'g05': ['吸奶器'], 'g06': ['温奶器'], 'g07': ['消毒器'],
      'g08': ['D3', '维生素'], 'g12': ['米粉'], 'g16': ['辅食机'], 'g17': ['体温计']
    };
    const all = this.GOODS_LIB().map((it) => {
      let score = 50;
      const reason = [];
      if (m !== null && m >= it.min && (it.max === null || m <= it.max)) score += 20;
      else if (m !== null) score -= 40;
      if (m !== null) {
        if (m >= it.min) {
          if (it.max !== null && m > it.max) reason.push('宝宝已超过' + it.max + '月适用期');
        } else {
          reason.push('宝宝' + m + '个月，建议' + it.min + '月+再用');
        }
      }
      const b = boosts[it.id] || 0;
      score += b;
      if (b >= 26) reason.push('根据近期喂养记录推荐');
      else if (b >= 18) reason.push('结合宝宝记录贴心推荐');
      const oc = ownedCheck[it.id];
      if (oc && owned(oc)) { score -= 15; reason.push('已在库存清单中'); }
      const favs = wx.getStorageSync('panda_goods_fav') || [];
      const faved = favs.indexOf(it.id) >= 0;
      return Object.assign({}, it, {
        score,
        reason: reason.length ? reason.join(' · ') : (m !== null ? ('宝宝' + m + '个月' + (m >= it.min ? '正合适' : '')) : '按宝宝月龄推荐'),
        faved
      });
    });
    all.sort((a, b) => b.score - a.score);
    this.setData({ goods: all.slice(0, 4), goodsAll: all });
  },
  moreGoods() {
    wx.navigateTo({ url: '/subchart/pages/goods/goods' });
  },
  closeGoodsAll() {
    this.setData({ goodsAllVisible: false });
  },
  openGoodsDetail(e) {
    const id = e.currentTarget.dataset.id;
    const it = this.data.goodsAll.find(x => x.id === id);
    if (it) this.setData({ goodsDetail: it });
  },
  closeGoodsDetail() {
    this.setData({ goodsDetail: null });
  },
  toggleGoodsFav() {
    const d = this.data.goodsDetail;
    if (!d) return;
    const favs = wx.getStorageSync('panda_goods_fav') || [];
    const i = favs.indexOf(d.id);
    if (i >= 0) favs.splice(i, 1); else favs.push(d.id);
    wx.setStorageSync('panda_goods_fav', favs);
    const ai = this.data.goodsAll.findIndex(x => x.id === d.id);
    const patch = { 'goodsDetail.faved': i < 0 };
    if (ai >= 0) patch['goodsAll[' + ai + '].faved'] = i < 0;
    this.setData(patch);
    wx.showToast({ title: i < 0 ? '已加入关注' : '已取消关注', icon: 'none' });
  }
});
