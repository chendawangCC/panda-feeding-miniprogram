const app = getApp();
const perm = require('../../utils/perm.js');

const DEFAULT_FORM = {
  name: '',
  gender: '男宝宝',
  birthday: '',
  showBirthdayPicker: false,
  showTimePicker: false,
  relation: '妈妈',
  time: '',
  delivery: '顺产',
  blood: '',
  weight: '',
  height: '',
  avatar: ''
};

Page({

  onShareAppMessage() {
    return {
        imageUrl: '/images/share-cover.png', title: '熊宝喂养 · 宝宝档案', path: 'pages/baby-edit/baby-edit' };
  },
  onShareTimeline() {
    return { title: '熊宝喂养 · 宝宝档案' };
  },
  data: {
    lang: 'zh',
    safeTop: (app.globalData && app.globalData.safeTop) || 88,
    isEdit: false,
    babyId: '',
    form: Object.assign({}, DEFAULT_FORM),
    genders: ['男宝宝', '女宝宝', '暂不填写'],
    relations: ['妈妈', '爸爸', '奶奶', '姥姥', '爷爷'],
    deliveries: ['顺产', '剖宫产', '其他'],
    bloodTypes: ['A型', 'B型', 'AB型', 'O型', '未知'],
    // 显示层英译（底层存储值仍为中文，逻辑判断不受影响）
    genderMap: { '男宝宝': 'Boy', '女宝宝': 'Girl', '暂不填写': 'Not now' },
    relationMap: { '妈妈': 'Mom', '爸爸': 'Dad', '奶奶': 'Grandma', '姥姥': 'Grandma (maternal)', '爷爷': 'Grandpa' },
    deliveryMap: { '顺产': 'Natural', '剖宫产': 'C-section', '其他': 'Other' },
    bloodMap: { 'A型': 'Type A', 'B型': 'Type B', 'AB型': 'Type AB', 'O型': 'Type O', '未知': 'Unknown', '待填写': 'Not set' },
    bloodLabels: ['A型', 'B型', 'AB型', 'O型', '未知'],
  },

  onLoad(options) {
    const lang = wx.getStorageSync('lang') || 'zh';
    const bloodEn = ['Type A', 'Type B', 'Type AB', 'Type O', 'Unknown'];
    this.setData({ lang: lang, bloodLabels: lang === 'en' ? bloodEn : ['A型', 'B型', 'AB型', 'O型', '未知'] });
    const isEdit = !!(options && options.id);
    if (isEdit) {
      const baby = (app.globalData.babies || []).find(b => b.id === options.id);
      if (!baby) {
        wx.showToast({ title: wx.getStorageSync('lang') === 'en' ? 'Baby not found' : '未找到该宝宝', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 600);
        return;
      }
      this.setData({
        isEdit: true,
        babyId: options.id,
        form: Object.assign({}, DEFAULT_FORM, baby)
      });
    } else {
      this.setData({ isEdit: false, babyId: '', form: Object.assign({}, DEFAULT_FORM) });
    }
  },

  goBack() {
    wx.navigateBack();
  },

  /* 头像裁剪（1:1 方形，支持基础库 2.16+，旧库自动降级原图） */

  /* 头像选择：拍摄 / 相册 / 默认熊猫品牌头像（白底） */


  onName(e) { this.setData({ 'form.name': e.detail.value }); },
  onGenderBtn(e) { this.setData({ 'form.gender': e.currentTarget.dataset.value }); },
  openBirthdayPicker() { this.setData({ showBirthdayPicker: true }); },
  closeBirthdayPicker() { this.setData({ showBirthdayPicker: false }); },
  onBirthday(e) { this.setData({ 'form.birthday': e.detail.value, showBirthdayPicker: false }); },
  onRelationBtn(e) { this.setData({ 'form.relation': e.currentTarget.dataset.value }); },

  /* 增加自定义角色 */
  addRelation() {
    wx.showModal({
      title: this.data.lang === 'en' ? 'Add Role' : '新增角色',
      editable: true,
      placeholderText: this.data.lang === 'en' ? 'e.g. Aunt, Sister' : '请输入角色，如：阿姨、姑姑',
      success: (res) => {
        if (!res.confirm || !res.content) return;
        const name = res.content.trim();
        if (!name) return;
        const rels = this.data.relations.slice();
        if (rels.indexOf(name) >= 0) {
          this.setData({ 'form.relation': name });
          return;
        }
        rels.push(name);
        this.setData({ relations: rels, 'form.relation': name });
      }
    });
  },

  openTimePicker() { this.setData({ showTimePicker: true }); },
  closeTimePicker() { this.setData({ showTimePicker: false }); },
  onTime(e) { this.setData({ 'form.time': e.detail.value, showTimePicker: false }); },
  onDeliveryBtn(e) { this.setData({ 'form.delivery': e.currentTarget.dataset.value }); },
  onBloodChange(e) {
    this.setData({ 'form.blood': this.data.bloodTypes[Number(e.detail.value)] });
  },
  onWeight(e) { this.setData({ 'form.weight': e.detail.value }); },
  onHeight(e) { this.setData({ 'form.height': e.detail.value }); },


  save() {
    if (!perm.canEdit('profile', this.data.babyId)) {
      wx.showToast({ title: this.data.lang === 'en' ? 'View-only account cannot edit' : '当前账号仅有查看权限，无法修改档案', icon: 'none' });
      return;
    }
    const f = this.data.form;
    // 必填：小名 / 性别 / 出生日期 / 关系；生产方式等其余选填
    if (!f.name) {
      wx.showToast({ title: this.data.lang === 'en' ? 'Please enter baby nickname' : '请填写宝宝小名', icon: 'none' });
      return;
    }
    if (!f.gender || f.gender === '暂不填写') {
      wx.showToast({ title: this.data.lang === 'en' ? 'Please select gender' : '请选择宝宝性别', icon: 'none' });
      return;
    }
    if (!f.birthday) {
      wx.showToast({ title: this.data.lang === 'en' ? 'Please select birthday' : '请选择宝宝出生日期', icon: 'none' });
      return;
    }
    if (!f.relation) {
      wx.showToast({ title: this.data.lang === 'en' ? 'Please select your role' : '请选择我是宝宝的', icon: 'none' });
      return;
    }
    const profile = {
      ...f,
      birthday: f.birthday || '',
      blood: f.blood || '待填写',
      weight: f.weight || '待填写',
      height: f.height || '待填写',
      delivery: f.delivery || ''
    };
    if (this.data.isEdit) {
      app.updateBaby(this.data.babyId, profile);
      this.syncBirthMeasure(this.data.babyId);
      // 头像独立 key 双保险（主包写入可能因总量超限失败，独立 key 永不失败）
      if (f.avatar) { try { wx.setStorageSync('panda_avatar_' + this.data.babyId, f.avatar); } catch (e) {} }
      if (app.loadAvatars) app.loadAvatars();
      wx.showToast({ title: this.data.lang === 'en' ? 'Baby info updated' : '宝宝信息已更新', icon: 'none' });
    } else {
      const p = app.addBaby(profile, true);
      this.syncBirthMeasure(p && p.id);
      if (p && p.id && f.avatar) { try { wx.setStorageSync('panda_avatar_' + p.id, f.avatar); } catch (e) {} }
      if (app.loadAvatars) app.loadAvatars();
      wx.showToast({ title: this.data.lang === 'en' ? 'Baby profile created' : '宝宝档案已创建', icon: 'none' });
    }
    // 同步头像/信息：立即刷新页面栈中展示宝宝头像的页面（我的宝贝 / 成长档案等），返回即见最新头像
    try {
      getCurrentPages().forEach(pg => {
        if (pg && pg.route && pg.route !== 'pages/baby-edit/baby-edit' && typeof pg.refresh === 'function') {
          pg.refresh();
        }
      });
      // 定向强制刷新：我的宝贝 / 成长档案直接 setData 最新 babies（绕过任何缓存）
      getCurrentPages().forEach(pg => {
        if (!pg) return;
        if (pg.route === 'pages/my-babies/my-babies' || pg.route === 'subchart/pages/baby-profile/baby-profile') {
          pg.setData && pg.setData({ babies: (app.globalData.babies || []).slice() });
        }
      });
    } catch (e) {}
    // 新增宝宝完成 → 我的页（引导闭环终点）；编辑保存 → 返回上一页
    setTimeout(() => {
      if (this.data.isEdit) wx.navigateBack();
      else wx.switchTab({ url: '/pages/plan/plan' });
    }, 700);
  },

  /* 把出生身高 / 体重同步进成长档案（作为出生日期的第一条测量记录） */
  syncBirthMeasure(babyId) {
    if (!babyId) return;
    const f = this.data.form;
    const w = Number(f.weight);
    const h = Number(f.height);
    if ((!w && !h) || !f.birthday) return;
    const g = app.globalData;
    const measures = (g.measures || []).slice();
    const idx = measures.findIndex(m => m.date === f.birthday);
    const birth = {
      date: f.birthday,
      weight: w || 0,
      height: h || 0,
      head: idx >= 0 ? measures[idx].head || 0 : 0
    };
    if (idx >= 0) measures[idx] = Object.assign({}, measures[idx], birth);
    else {
      measures.push(birth);
      measures.sort((a, b) => (a.date < b.date ? -1 : 1));
    }
    g.measures = measures;
    app.persist();
  },

  /* 移除宝宝：确认后删除真实数据 */
  removeBaby() {
    const en = this.data.lang === 'en';
    const name = this.data.form.name || (en ? 'this baby' : '该宝宝');
    wx.showModal({
      title: en ? 'Remove Baby' : '移除宝宝',
      content: en ? ('Remove "' + name + '"? All records of this baby will be deleted permanently.') : ('确定移除「' + name + '」吗？该宝宝的记录等数据将一并删除，且无法恢复。'),
      confirmText: en ? 'Remove' : '移除',
      confirmColor: '#e0554e',
      cancelText: en ? 'Cancel' : '取消',
      success: (res) => {
        if (!res.confirm) return;
        app.removeBaby(this.data.babyId);
        wx.showToast({ title: en ? 'Baby profile deleted' : '已删除该宝宝档案', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 700);
      }
    });
  }
});
