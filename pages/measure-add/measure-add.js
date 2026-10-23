const app = getApp();
const { WHO_STD } = require('../../utils/who-std.js');

Page({
  data: {
    safeTop: (app.globalData && app.globalData.safeTop) || 88,
    baby: {},
    idx: -1,
    date: '',
    time: '',
    height: '', weight: '', head: '',
    refText: '', phHeight: '如：66.2', phWeight: '如：7.4', phHead: '如：42.5'
  },

  onLoad(options) {
    const now = new Date();
    const pad = n => (n < 10 ? '0' + n : '' + n);
    const today = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
    const baby = app.globalData.baby || {};
    // 编辑模式：回填已有测量记录（优先用成长档案页传入的稳定 key）
    let idx = -1;
    // 优先用稳定 key 定位记录：成长档案列表按日期排序，显示序号不等于存储下标
    if (options && options.key) {
      let key = String(options.key);
      try { key = decodeURIComponent(key); } catch (e) {}
      const list = app.globalData.measures || [];
      const found = list.findIndex(m => String(m._cid || m._u || (String(m.date || '') + '-' + String(m.time || ''))) === key);
      if (found >= 0) idx = found;
    }
    if (idx < 0 && options && options.idx !== undefined) idx = Number(options.idx);
    if (idx >= 0) {
      const rec = (app.globalData.measures || [])[idx];
      if (rec) {
        this.setData({ date: rec.date || today, time: rec.time || '', height: rec.height ? String(rec.height) : '', weight: rec.weight ? String(rec.weight) : '', head: rec.head ? String(rec.head) : '' });
      }
    }
    // 按宝宝月龄给出 WHO 正常范围参考（身高 / 体重 / 头围）
    const m = baby.birthday ? Math.round(this.monthAge(baby.birthday, today)) : -1;
    let refText = '';
    let phHeight = '如：66.2', phWeight = '如：7.4', phHead = '如：42.5';
    if (m >= 0 && m <= 24) {
      const sex = (String(baby.gender || '男').indexOf('女') >= 0) ? 'girl' : 'boy';
      const std = WHO_STD[sex] || WHO_STD.boy;
      const pick = (arr) => arr[Math.min(m, arr.length - 1)];
      const h = pick(std.height), w = pick(std.weight), hc = pick(std.head);
      const f1 = (v) => (Math.round(v * 10) / 10);
      refText = '宝宝约 ' + m + ' 月龄参考（WHO ±2SD）：身高 ' + f1(h[0]) + '~' + f1(h[2]) + 'cm · 体重 ' + f1(w[0]) + '~' + f1(w[2]) + 'kg · 头围 ' + f1(hc[0]) + '~' + f1(hc[2]) + 'cm';
      phHeight = '参考 ' + f1(h[0]) + '~' + f1(h[2]) + 'cm';
      phWeight = '参考 ' + f1(w[0]) + '~' + f1(w[2]) + 'kg';
      phHead = '参考 ' + f1(hc[0]) + '~' + f1(hc[2]) + 'cm';
    }
    this.setData({ baby, idx, date: this.data.date || today, refText, phHeight, phWeight, phHead });
  },

  monthAge(birthday, dateStr) {
    const b = new Date(birthday.replace(/-/g, '/'));
    const d = dateStr ? new Date(dateStr.replace(/-/g, '/')) : new Date();
    let m = (d.getFullYear() - b.getFullYear()) * 12 + (d.getMonth() - b.getMonth());
    if (d.getDate() < b.getDate()) m--;
    return Math.max(0, m);
  },

  goBack() { wx.navigateBack(); },

  onDate(e) { this.setData({ date: e.detail.value }); },
  onTime(e) { this.setData({ time: e.detail.value }); },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [field]: e.detail.value });
  },

  /* 滑动选择：右侧数值实时跟随 */
  onSlide(e) {
    const field = e.currentTarget.dataset.field;
    let v = e.detail.value;
    if (field === 'weight') v = Number(v).toFixed(2);
    else v = Number(v).toFixed(1);
    this.setData({ [field]: v });
  },

  save() {
    const d = this.data;
    const height = Number(d.height);
    const weight = Number(d.weight);
    const head = Number(d.head);
    if (!d.date) { wx.showToast({ title: '请选择测量日期', icon: 'none' }); return; }
    if (!(height > 0) && !(weight > 0) && !(head > 0)) {
      wx.showToast({ title: '请至少填写一项测量值', icon: 'none' });
      return;
    }
    const g = app.globalData;
    const measures = (g.measures || []).slice();
    const rec = { date: d.date, time: d.time || '', height: height || 0, weight: weight || 0, head: head || 0, _u: Date.now() };
    if (d.idx >= 0 && d.idx < measures.length) {
      // 编辑时保留云端 _cid，避免同步时被当作新记录重复写入
      const old = measures[d.idx] || {};
      if (old._cid) rec._cid = old._cid;
      measures[d.idx] = rec;
    } else {
      measures.push(rec);
    }
    measures.sort((a, b) => {
      const ka = String(a.date || '') + ' ' + String(a.time || '');
      const kb = String(b.date || '') + ' ' + String(b.time || '');
      return ka < kb ? -1 : (ka > kb ? 1 : 0);
    });
    g.measures = measures;
    app.saveBabyData();
    wx.showToast({ title: '测量已保存', icon: 'none' });
    setTimeout(() => wx.navigateBack(), 400);
  },

  /* 删除测量记录（仅编辑模式显示） */
  delMeasure() {
    wx.showModal({
      title: '删除这条测量记录？',
      content: '删除后不可恢复',
      confirmText: '删除',
      confirmColor: '#C14C2E',
      success: (res) => {
        if (!res.confirm) return;
        const g = app.globalData;
        const measures = (g.measures || []).slice();
        if (this.data.idx >= 0 && this.data.idx < measures.length) {
          const cid = measures[this.data.idx] && measures[this.data.idx]._cid;
          measures.splice(this.data.idx, 1);
          g.measures = measures;
          app.saveBabyData();
          if (cid) app.tombCloud('measures', cid);
        }
        wx.showToast({ title: '已删除', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 400);
      }
    });
  }
});
