const app = getApp();
const perm = require('../../../utils/perm.js');
const { diffDays } = require('../../../utils/vaccine-data.js');


Page({

  onShareAppMessage() {
    return {
        imageUrl: '/images/share-cover.png', title: '熊宝喂养 · 疫苗接种记录', path: 'pages/vaccine/vaccine' };
  },
  onShareTimeline() {
    return { title: '熊宝喂养 · 疫苗接种记录' };
  },
  data: {
    safeTop: (app.globalData && app.globalData.safeTop) || 88,
    babyName: '',
    birthday: '',
    ageText: '',
    today: '',
    filter: 'all',
    filters: [
      { key: 'all', label: '全部' },
      { key: 'free', label: '免费' },
      { key: 'paid', label: '自费' }
    ],
    rawAll: [],
    plan: [],
    stats: { total: 0, done: 0, pending: 0, skip: 0, overdue: 0 }
  },

  onShow() {
    // 疫苗记录：需登录后使用（无宝宝时页面内显示去添加宝宝）
    if (!app.requireLogin()) {
      setTimeout(() => wx.navigateBack({ fail: () => {} }), 400);
      return;
    }
    this.buildList();
    // 云端拉取完成后（家庭共享宝宝/成员新数据）刷新
    app.onPullDone(() => { this.buildList(); });
  },

  buildList() {
    const g = app.globalData;
    const today = this.todayStr();
    const raw = (g.vaccinePlan || []).map((v) => {
      const due = diffDays(today, v.dueDate);
      let state = 'future';
      if (v.status === 'done') state = 'done';
      else if (due < 0) state = 'past';
      else if (due === 0) state = 'today';
      else state = 'future';
      return Object.assign({}, v, { state, due });
    });
    // 时间轴：按应种日期升序（已接种保留在对应时间位置）
    raw.sort((a, b) => (a.due - b.due) || (String(a.dueDate) < String(b.dueDate) ? -1 : 1));

    const total = raw.length;
    const done = raw.filter(v => v.status === 'done').length;
    const pending = raw.filter(v => v.status === 'pending');

    // 下次接种提醒：取距离最近的一剂待接种疫苗（已过日期的忽略）
    let next = null;
    const future = pending.filter(v => v.due >= 0);
    if (future.length) {
      const nearest = future.reduce((a, b) => (a.due < b.due ? a : b));
      next = {
        title: nearest.group + ' ' + nearest.dose,
        due: nearest.due,
        dueDate: nearest.dueDate,
        daysText: nearest.due === 0 ? '今日应种' : ('还有 ' + nearest.due + ' 天')
      };
    }

    const plan = this.filterPlan(raw, this.data.filter);
    this.setData({
      rawAll: raw,
      plan: plan,
      babyName: (g.baby && g.baby.name) || '',
      birthday: (g.baby && g.baby.birthday) || '',
      ageText: this.ageText(g.baby && g.baby.birthday),
      today: today,
      next: next,
      stats: { total: total, done: done, pending: total - done, skip: 0 }
    });
  },

  filterPlan(plan, f) {
    if (f === 'all') return plan;
    return plan.filter(v => (f === 'free' ? v.type === '免费' : v.type === '自费'));
  },

  switchFilter(e) {
    const f = e.currentTarget.dataset.key;
    const plan = this.filterPlan(this.data.rawAll, f);
    this._planRows = plan;
    this.setData({ filter: f, plan: plan });
    this.drawVaxTable();
  },

  /* ==================== 时间轴交互 ==================== */
  /* 点击点选框：待接种 → 弹日期选择器；已接种 → 确认撤销 */
  onToggleDone(e) {
    const idx = e.currentTarget.dataset.index;
    const row = this.data.plan && this.data.plan[idx];
    if (!row) return;
    if (row.status === 'done') {
      wx.showModal({
        title: '撤销接种',
        content: '将「' + row.group + ' ' + row.dose + '」恢复为待接种？',
        success: (r) => { if (r.confirm) this.undoById(row.id); }
      });
    } else {
      this.setData({ showDoneDatePicker: true, doneDateTarget: { id: row.id, date: row.dueDate || this.todayStr(), mode: 'done' } });
    }
  },

  /* 点击应种日期：修改 dueDate */
  onTapDueDate(e) {
    const idx = e.currentTarget.dataset.index;
    const row = this.data.plan && this.data.plan[idx];
    if (!row) return;
    this.setData({ showDoneDatePicker: true, doneDateTarget: { id: row.id, date: row.dueDate || this.todayStr(), mode: 'due' } });
  },

  /* 长按：移除该疫苗（不接种） */
  onLongPressRemove(e) {
    const idx = e.currentTarget.dataset.index;
    const row = this.data.plan && this.data.plan[idx];
    if (!row) return;
    wx.showModal({
      title: '移除疫苗',
      content: '从接种计划中移除「' + row.group + ' ' + row.dose + '」？（不接种）',
      success: (r) => {
        if (!r.confirm) return;
        const list = app.globalData.vaccinePlan || [];
        const i = list.findIndex(x => x.id === row.id);
        if (i >= 0) list.splice(i, 1);
        app.persist();
        this.buildList();
        wx.showToast({ title: '已移除', icon: 'none' });
      }
    });
  },

  /* 标记已接种 */
  markDoneById(id) {
    if (!perm.canEdit('profile', app.globalData.currentBabyId)) {
      wx.showToast({ title: '当前账号仅有查看权限，无法标记接种', icon: 'none' });
      return;
    }
    const v = (app.globalData.vaccinePlan || []).find(x => x.id === id);
    if (!v) return;
    v.status = 'done';
    v.doneDate = this.todayStr();
    app.persist();
    this.buildList();
    wx.showToast({ title: '已标记接种', icon: 'none' });
  },

  /* 修改接种日期 */
  openDatePickerById(id, date) {
    this.setData({ showDoneDatePicker: true, doneDateTarget: { id: id, date: date || '' } });
  },

  closeDoneDatePicker() {
    this.setData({ showDoneDatePicker: false });
  },

  onDoneDateChange(e) {
    const t = this.data.doneDateTarget;
    const id = t && t.id;
    const v = (app.globalData.vaccinePlan || []).find(x => x.id === id);
    this.setData({ showDoneDatePicker: false, doneDateTarget: null });
    if (!v) return;
    if (!perm.canEdit('profile', app.globalData.currentBabyId)) {
      wx.showToast({ title: '当前账号仅有查看权限，无法修改', icon: 'none' });
      return;
    }
    if (t.mode === 'due') {
      v.dueDate = e.detail.value;
      app.persist();
      this.buildList();
      wx.showToast({ title: '应种日期已更新', icon: 'none' });
    } else {
      v.status = 'done';
      v.doneDate = e.detail.value;
      app.persist();
      this.buildList();
      wx.showToast({ title: '已标记接种', icon: 'none' });
    }
  },

  /* 撤销（改回待接种） */
  undoById(id) {
    if (!perm.canEdit('profile', app.globalData.currentBabyId)) {
      wx.showToast({ title: '当前账号仅有查看权限，无法修改', icon: 'none' });
      return;
    }
    const v = (app.globalData.vaccinePlan || []).find(x => x.id === id);
    if (!v) return;
    v.status = 'pending';
    v.doneDate = '';
    app.persist();
    this.buildList();
  },

  /* 没有宝宝 → 去我的宝宝添加 */
  goProfile() {
    wx.navigateTo({ url: '/pages/my-babies/my-babies' });
  },

  todayStr() {
    const d = new Date();
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
  },

  ageText(birth) {
    if (!birth) return '';
    const p = String(birth).split('-').map(Number);
    const bd = new Date(p[0], (p[1] || 1) - 1, p[2] || 1);
    const now = new Date();
    let m = (now.getFullYear() - bd.getFullYear()) * 12 + (now.getMonth() - bd.getMonth());
    if (now.getDate() < bd.getDate()) m -= 1;
    if (m < 0) m = 0;
    const y = Math.floor(m / 12), mm = m % 12;
    return (y ? y + '岁' : '') + (mm ? mm + '个月' : '') || '刚出生';
  },

  goBack() {
    wx.navigateBack({});
  }
});
