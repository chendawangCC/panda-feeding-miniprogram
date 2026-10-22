const app = getApp();
const FEED_TYPES = ['母乳', '配方奶', '吸奶'];

Page({

  onShareTimeline() {
    return { title: '熊宝喂养 · 喂养周报' };
  },
  data: {
    safeTop: (app.globalData && app.globalData.safeTop) || 88,
    rangeText: '',
    summary: [],
    week: [],
    days: [],
    empty: false,
    babyName: '',
    saving: false
  },

  onLoad() {
    this.setData({ babyName: (app.globalData.baby || {}).name || '宝宝' });
    this.buildWeekly();
  },

  onShow() {
    this.setData({ babyName: (app.globalData.baby || {}).name || '宝宝' });
    this.buildWeekly();
    // 数据可能变化：旧分享图作废，下次保存/分享重新生成
    this._shareImgExpired = true;
  },

  onReady() {
    // 预生成带小程序码的周报图（保存/分享秒出）
    setTimeout(() => this.buildShareImg(() => {}), 400);
  },

  onShareAppMessage() {
    return {
      imageUrl: (this._shareImg && !this._shareImgExpired) ? this._shareImg : '/images/share-cover.png',
      title: (this.data.babyName || '宝宝') + '的喂养周报 ' + this.data.rangeText,
      path: '/subchart/pages/weekly/weekly'
    };
  },

  goBack() {
    wx.navigateBack();
  },

  goPlan() {
    wx.switchTab({ url: '/pages/plan/plan' });
  },

  /* ==================== 构建周报（近 7 天真实记录） ==================== */
  buildWeekly() {
    const records = app.globalData.records || [];
    if (!records.length) {
      this.setData({ empty: true });
      return;
    }
    const today = new Date();
    const weeks = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
      days.push({
        key: this.fmtDate(d),
        date: (d.getMonth() + 1) + '月' + d.getDate() + '日',
        label: weeks[d.getDay()],
        isToday: i === 0,
        feeds: 0,
        milk: 0,
        min: 0,
        pee: 0,
        poop: 0
      });
    }
    records.forEach(r => {
      if (!r || !r.date) return;
      const di = days.findIndex(x => x.key === r.date);
      if (di < 0) return;
      if (FEED_TYPES.indexOf(r.type) >= 0) days[di].feeds++;
      if (r.type === '配方奶') days[di].milk += r.amount || 0;
      if (r.type === '吸奶') days[di].milk += r.pumpTotal || ((r.pumpLeftAmt || 0) + (r.pumpRightAmt || 0));
      if (r.type === '母乳') days[di].min += Math.round((r.total || 0) / 60);
      if (r.type === '换尿布') {
        const c = r.diaperChoice || '嘘嘘';
        if (c === '嘘嘘' || c === '嘘嘘+臭臭') days[di].pee++;
        if (c === '臭臭' || c === '嘘嘘+臭臭') days[di].poop++;
      }
    });
    this._days = days;

    const totalFeeds = days.reduce((s, d) => s + d.feeds, 0);
    const totalMilk = days.reduce((s, d) => s + d.milk, 0);
    const totalMin = days.reduce((s, d) => s + d.min, 0);
    const totalPee = days.reduce((s, d) => s + d.pee, 0);
    const totalPoop = days.reduce((s, d) => s + d.poop, 0);
    const avgMilk = Math.round(totalMilk / 7 * 10) / 10;

    this.setData({
      rangeText: days[0].date + ' - ' + days[6].date,
      summary: [
        { value: totalFeeds, label: '总喂养次数' },
        { value: totalMilk, label: '总奶量(ml)' },
        { value: totalMin, label: '亲喂时长(分)' },
        { value: avgMilk, label: '日均奶量' },
        { value: totalPee, label: '嘘嘘次数' },
        { value: totalPoop, label: '臭臭次数' }
      ],
      days,
      empty: false
    });
  },

  fmtDate(d) {
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  },

  /* ==================== 小程序码（分享/保存图上带二维码） ==================== */
  ensureQrCode(cb) {
    if (this._qrPath) { cb && cb(this._qrPath); return; }
    const cloud = wx.cloud;
    if (!cloud || !cloud.callFunction) { cb && cb(''); return; }
    cloud.callFunction({
      name: 'getMiniQr',
      data: { scene: 'weekly', page: 'pages/index/index', width: 280, envVersion: 'release' },
      success: (r) => {
        const res = (r && r.result) || {};
        if (res.code === 0 && res.base64) {
          const p = wx.env.USER_DATA_PATH + '/weekly_qr.png';
          try {
            wx.getFileSystemManager().writeFileSync(p, res.base64, 'base64');
            this._qrPath = p;
            cb && cb(p);
            return;
          } catch (e) {}
        }
        cb && cb('');
      },
      fail: () => { cb && cb(''); }
    });
  },

  /* 生成预览同款周报图（含小程序码），缓存 tempFilePath 供保存/分享复用 */
  buildShareImg(cb) {
    if (this._shareImg && !this._shareImgExpired) { cb && cb(this._shareImg); return; }
    this.ensureQrCode((qr) => {
      const ctx = wx.createCanvasContext('weeklyCanvas', this);
      this.drawCanvas(ctx, qr);
      ctx.draw(false, () => {
        wx.canvasToTempFilePath({
          canvasId: 'weeklyCanvas',
          success: (res) => {
            this._shareImg = res.tempFilePath;
            this._shareImgExpired = false;
            cb && cb(res.tempFilePath);
          },
          fail: () => { cb && cb(''); }
        });
      });
    });
  },

  /* ==================== 保存周报图片（与预览一致 + 小程序码） ==================== */
  saveImage() {
    if (this.data.saving) return;
    this.setData({ saving: true });
    wx.showLoading({ title: '生成周报图片…', mask: true });
    this.buildShareImg((path) => {
      if (!path) {
        wx.hideLoading();
        this.setData({ saving: false });
        wx.showToast({ title: '生成失败，请重试', icon: 'none' });
        return;
      }
      wx.saveImageToPhotosAlbum({
        filePath: path,
        success: () => {
          this.setData({ saving: false });
          wx.showToast({ title: '已保存到相册，可发给家人', icon: 'none' });
        },
        fail: (err) => {
          this.setData({ saving: false });
          if (err && err.errMsg && err.errMsg.indexOf('auth') >= 0) {
            wx.showModal({
              title: '需要相册权限',
              content: '请在设置中允许「保存到相册」，即可保存周报图片',
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

  /* 圆角矩形 */
  roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  },

  /* 复刻页面预览布局绘制周报图（文字格式/行与预览一致），右下角叠加小程序码 */
  drawCanvas(ctx, qrPath) {
    const d = this.data;
    const W = 750;
    const H = 1350;
    const cardX = 32, cardW = W - 64;   // 卡片 x=32..718
    const padX = 64;                    // 卡片 padding 32 → 内容左
    const bold = (size) => { try { ctx.font = 'bold ' + size + 'px sans-serif'; } catch (e) { ctx.setFontSize(size); } };

    // 背景
    ctx.setFillStyle('#fffaf0');
    ctx.fillRect(0, 0, W, H);

    // 卡片（白米黄 + 米黄描边，圆角 40）
    const cardTop = 32;
    this.roundRect(ctx, cardX, cardTop, cardW, H - 64, 40);
    ctx.setFillStyle('#fffaf0');
    ctx.fill();
    ctx.setStrokeStyle('#f0e6cf');
    ctx.setLineWidth(2);
    ctx.stroke();

    // 头部：logo + 标题 + 右上 range（与 .wc-head 一致）
    const logoY = cardTop + 40;
    const logo = 48;
    this.roundRect(ctx, padX, logoY, logo, logo, 12);
    ctx.setFillStyle('#fff');
    ctx.fill();
    try { ctx.drawImage('/images/brand-logo.png', padX, logoY, logo, logo); } catch (e) {}
    bold(34);
    ctx.setFillStyle('#29281f');
    ctx.setTextAlign('left');
    ctx.fillText((d.babyName || '宝宝') + ' · 喂养周报', padX + logo + 12, logoY + 34);
    ctx.setFontSize(22);
    ctx.setFillStyle('#8f896d');
    ctx.setTextAlign('right');
    ctx.fillText(d.rangeText, cardX + cardW - 32, logoY + 34);
    ctx.setTextAlign('left');

    // 指标区（白色圆角块，6 项一行：值 34 加粗 #b97b05 / 标签 20 #8f896d）
    const mTop = logoY + logo + 32;
    const mH = 137;
    this.roundRect(ctx, padX, mTop, cardW - 64, mH, 28);
    ctx.setFillStyle('#fff');
    ctx.fill();
    const mw = (cardW - 64 - 16) / 6;
    for (let i = 0; i < 6; i++) {
      const m = d.summary[i] || { value: 0, label: '' };
      const cx = padX + 8 + mw * i + mw / 2;
      bold(34);
      ctx.setTextAlign('center');
      ctx.setFillStyle('#b97b05');
      ctx.fillText(String(m.value), cx, mTop + 62);
      ctx.setFontSize(20);
      ctx.setFillStyle('#8f896d');
      ctx.fillText(m.label, cx, mTop + 102);
    }
    ctx.setTextAlign('left');

    // 每日明细标题
    const tTop = mTop + mH + 40;
    bold(28);
    ctx.setFillStyle('#29281f');
    ctx.fillText('每日明细', padX, tTop + 28);

    // 表头（22 #8f896d）
    const hTop = tTop + 44;
    ctx.setFontSize(22);
    ctx.setFillStyle('#8f896d');
    const cols = [
      { x: 84, align: 'left' },
      { x: 291, align: 'center' },
      { x: 374, align: 'center' },
      { x: 457, align: 'center' },
      { x: 540, align: 'center' },
      { x: 623, align: 'center' }
    ];
    const heads = ['日期', '次数', '奶量', '亲喂时长', '嘘嘘', '臭臭'];
    cols.forEach((c, i) => {
      ctx.setTextAlign(c.align);
      ctx.fillText(heads[i], c.x, hTop + 20);
    });
    ctx.setTextAlign('left');

    // 数据行（白色圆角 20，行文字 22 加粗，各列颜色与预览一致）
    const rowColor = ['#29281f', '#b97b05', '#8f896d', '#806c2e', '#a0812f', '#c99a54'];
    let yTop = hTop + 66;
    const rowH = 66, rowGap = 78;
    d.days.forEach(day => {
      this.roundRect(ctx, 84, yTop, 582, rowH, 20);
      ctx.setFillStyle('#fff');
      ctx.fill();
      const vals = [
        day.date,
        String(day.feeds),
        day.milk + ' ml',
        day.min + ' 分',
        day.pee + ' 次',
        day.poop + ' 次'
      ];
      bold(22);
      cols.forEach((c, i) => {
        ctx.setTextAlign(c.align);
        ctx.setFillStyle(rowColor[i]);
        ctx.fillText(vals[i], c.x, yTop + 40);
      });
      ctx.setTextAlign('left');
      yTop += rowGap;
    });

    // 小程序码（白底圆角，居中放卡片下方）
    if (qrPath) {
      const qr = 150, qx = (W - qr) / 2, qy = yTop - rowGap + rowH + 60;
      this.roundRect(ctx, qx - 16, qy - 16, qr + 32, qr + 32, 24);
      ctx.setFillStyle('#fff');
      ctx.fill();
      try { ctx.drawImage(qrPath, qx, qy, qr, qr); } catch (e) {}
    }
  }
});
