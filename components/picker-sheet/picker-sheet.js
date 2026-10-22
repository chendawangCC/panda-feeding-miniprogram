/* 自定义日期/时间选择器（底部弹出）
 * 规格：弹窗高 240pt、顶部把手、底部叠加 34pt 安全区、每行高 44pt、文字 15pt
 * mode: 'date' | 'time'
 */
function pad(n) { return n < 10 ? '0' + n : '' + n; }

Component({
  properties: {
    visible: { type: Boolean, value: false },
    mode: { type: String, value: 'date' },
    value: { type: String, value: '' },
    minTime: { type: String, value: '' } // 时间选择器最小可选时间 HH:MM
  },
  data: {
    years: [], months: [], days: [], hours: [], minutes: [],
    indexes: [0, 0, 0],
    yIdx: 0, mIdx: 0, dIdx: 0, hIdx: 0, minIdx: 0
  },
  observers: {
    visible(v) {
      if (v) this.initFromValue();
      const cur = this.currentPage();
      if (cur) {
        cur._ovl = cur._ovl || 0;
        cur._ovl = v ? cur._ovl + 1 : Math.max(0, cur._ovl - 1);
        const tab = cur.getTabBar ? cur.getTabBar() : null;
        if (tab && tab.setData) tab.setData({ hidden: (cur._ovl || 0) > 0 });
        if (cur.syncTabBar && cur._ovlSync !== false) {
          try { cur.syncTabBar(); } catch (e) {}
        }
      }
    }
  },
  methods: {
    range(a, b) { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; },
    genDays(y, m) { return this.range(1, new Date(y, m, 0).getDate()); },
    initFromValue() {
      const { mode, value } = this.data;
      if (mode === 'date') {
        const p = (value || '').split('-');
        const y = p[0] ? +p[0] : new Date().getFullYear();
        const m = p[1] ? +p[1] : new Date().getMonth() + 1;
        const d = p[2] ? +p[2] : 1;
        const years = this.range(y - 8, y + 8);
        const months = this.range(1, 12);
        const days = this.genDays(y, m);
        this.setData({
          years, months, days,
          yIdx: Math.max(0, years.indexOf(y)),
          mIdx: Math.max(0, months.indexOf(m)),
          dIdx: Math.max(0, days.indexOf(d)),
          indexes: [Math.max(0, years.indexOf(y)), Math.max(0, months.indexOf(m)), Math.max(0, days.indexOf(d))]
        });
      } else {
        const p = (value || '').split(':');
        const h = p[0] ? +p[0] : new Date().getHours();
        const mi = p[1] ? +p[1] : new Date().getMinutes();
        let hours = this.range(0, 23);
        let minutes = this.range(0, 59);
        // 如果设置了最小时间，过滤选项
        let minH = -1, minM = -1;
        if (this.data.minTime) {
          const mp = this.data.minTime.split(':');
          minH = Number(mp[0]) || 0;
          minM = Number(mp[1]) || 0;
          // 小时只保留>=minH的
          hours = hours.filter(hour => hour >= minH);
          // 如果当前小时等于minH，分钟只保留>=minM的
          if (h === minH) {
            minutes = minutes.filter(min => min >= minM);
          }
        }
        // 校正选中索引
        const safeH = hours.indexOf(h);
        const finalHIdx = safeH >= 0 ? safeH : 0;
        const finalH = hours[finalHIdx];
        let finalMinutes = minutes;
        if (finalH === minH) {
          finalMinutes = finalMinutes.filter(min => min >= minM);
        }
        const safeMin = finalMinutes.indexOf(mi);
        const finalMinIdx = safeMin >= 0 ? safeMin : 0;
        this.setData({
          hours, minutes: finalMinutes,
          hIdx: finalHIdx, minIdx: finalMinIdx,
          indexes: [finalHIdx, finalMinIdx]
        });
      }
    },
    onChange(e) {
      const v = e.detail.value;
      if (this.data.mode === 'date') {
        const y = this.data.years[v[0]], m = this.data.months[v[1]];
        const days = this.genDays(y, m);
        let dIdx = v[2]; if (dIdx >= days.length) dIdx = days.length - 1;
        this.setData({ yIdx: v[0], mIdx: v[1], dIdx, days, indexes: [v[0], v[1], dIdx] });
      } else {
        let minH = -1, minM = -1;
        if (this.data.minTime) {
          const mp = this.data.minTime.split(':');
          minH = Number(mp[0]) || 0;
          minM = Number(mp[1]) || 0;
        }
        const selectedH = this.data.hours[v[0]];
        let minutes = this.range(0, 59);
        if (selectedH === minH) {
          minutes = minutes.filter(min => min >= minM);
        }
        let minIdx = v[1];
        if (minIdx >= minutes.length) minIdx = minutes.length - 1;
        this.setData({ hours: this.data.hours, minutes, hIdx: v[0], minIdx, indexes: [v[0], minIdx] });
      }
    },
    onConfirm() {
      let val;
      if (this.data.mode === 'date') {
        const y = this.data.years[this.data.yIdx], m = this.data.months[this.data.mIdx];
        const days = this.data.days;
        const d = days[this.data.dIdx] || days[days.length - 1];
        val = y + '-' + pad(m) + '-' + pad(d);
      } else {
        val = pad(this.data.hours[this.data.hIdx]) + ':' + pad(this.data.minutes[this.data.minIdx]);
      }
      this.triggerEvent('confirm', { value: val });
    },
    onClose() { this.triggerEvent('close'); },
    // 隐藏/恢复 tabBar：常规 API + 自定义 tabBar（getTabBar）双保险
    currentPage() {
      try {
        const pages = getCurrentPages();
        return pages && pages[pages.length - 1];
      } catch (e) { return null; }
    },
    noop() {}
  }
});
