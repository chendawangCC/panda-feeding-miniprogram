// pages/baby/baby.js - 多宝宝管理
const { getBabies, getActiveBaby, setActiveBaby, addBaby, updateBaby, removeBaby } = require('../data/babies')
const { getAgeText, genderTitle } = require('../data/recommend')

const GENDER_OPTIONS = [{ value: 'boy', zh: '小王子', en: 'Boy' }, { value: 'girl', zh: '小公主', en: 'Girl' }]

const app = getApp();

Page({
  goBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) });
  },

  data: {
    safeTop: (app.globalData && app.globalData.safeTop) || 88,
    lang: 'zh',
    // 表单态
    mode: 'list',        // list(列表) | form(表单)
    isEdit: false,
    editId: '',
    name: '',
    gender: '',
    genderIndex: -1,
    genders: ['小王子', '小公主'],   // 显示用，onLoad 按语言重建
    birthDate: '',
    today: '',
    // 列表态
    babies: [],
    activeId: '',
    hasBabies: false,
  },

  _en() { return (wx.getStorageSync('lang') || this.data.lang || 'zh') === 'en'; },
  _t(zh, en) { return this._en() ? en : zh; },

  onLoad() {
    // 日期选择上限：今天
    const now = new Date()
    const pad = n => (n < 10 ? '0' + n : '' + n)
    const today = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate())
    const en = (wx.getStorageSync('lang') || 'zh') === 'en'
    this.setData({
      today,
      lang: en ? 'en' : 'zh',
      genders: GENDER_OPTIONS.map(g => (en ? g.en : g.zh))
    })
    wx.setNavigationBarTitle({ title: en ? 'Baby profiles' : '宝宝信息' })
  },

  onShow() {
    this.refreshList()
  },

  // 刷新宝宝列表（月龄实时计算 = 自动更新）
  refreshList() {
    const babies = getBabies()
    const active = getActiveBaby()
    const lang = this._en() ? 'en' : 'zh'
    const list = babies.map(b => {
      const g = b.gender ? genderTitle(b.gender, lang) : ''
      return {
        id: b.id,
        name: b.name,
        genderLabel: g,
        birthDate: b.birthDate,
        ageText: getAgeText(b.birthDate, lang),
        avatar: b.gender === 'girl' ? '👧' : '👦',
      }
    })
    this.setData({
      babies: list,
      activeId: active ? active.id : '',
      hasBabies: list.length > 0,
    })
  },

  // 切换当前宝宝
  onSelectBaby(e) {
    const id = e.currentTarget.dataset.id
    setActiveBaby(id)
    this.refreshList()
    wx.showToast({ title: this._t('已切换', 'Switched'), icon: 'none' })
  },

  // 打开添加表单
  onAdd() {
    this.setData({
      mode: 'form',
      isEdit: false,
      editId: '',
      name: '',
      gender: '',
      genderIndex: -1,
      birthDate: '',
    })
  },

  // 打开编辑表单
  onEdit(e) {
    const id = e.currentTarget.dataset.id
    const b = getBabies().find(x => x.id === id)
    if (!b) return
    const genderIndex = b.gender === 'boy' ? 0 : b.gender === 'girl' ? 1 : -1
    this.setData({
      mode: 'form',
      isEdit: true,
      editId: id,
      name: b.name || '',
      gender: b.gender || '',
      genderIndex,
      birthDate: b.birthDate || '',
    })
  },

  // 返回列表
  onBackToList() {
    this.setData({ mode: 'list' })
    this.refreshList()
  },

  onNameInput(e) {
    this.setData({ name: e.detail.value })
  },

  onGenderChange(e) {
    const index = Number(e.detail.value)
    this.setData({
      genderIndex: index,
      gender: index === 0 ? 'boy' : 'girl',
    })
  },

  onBirthDateChange(e) {
    this.setData({ birthDate: e.detail.value })
  },

  // 保存（新增或编辑）
  onSave() {
    const name = this.data.name.trim()
    const gender = this.data.gender
    const birthDate = this.data.birthDate
    if (!gender) {
      wx.showToast({ title: this._t('请选择宝宝性别', 'Please choose a gender'), icon: 'none' })
      return
    }
    if (!birthDate) {
      wx.showToast({ title: this._t('请选择出生日期', 'Please choose a birth date'), icon: 'none' })
      return
    }
    if (this.data.isEdit) {
      updateBaby(this.data.editId, { name: name || this._t('宝宝', 'Baby'), gender, birthDate })
      wx.showToast({ title: this._t('已保存', 'Saved'), icon: 'success' })
    } else {
      addBaby(name, gender, birthDate)
      wx.showToast({ title: this._t('已添加', 'Added'), icon: 'success' })
    }
    this.setData({ mode: 'list' })
    this.refreshList()
  },

  // 删除宝宝
  onDelete(e) {
    const id = e.currentTarget.dataset.id
    const b = getBabies().find(x => x.id === id)
    wx.showModal({
      title: this._t('删除宝宝', 'Delete baby'),
      content: this._t('确定删除「' + (b ? b.name : '') + '」吗？删除后无法恢复。', 'Delete ' + (b ? b.name : '') + '? This cannot be undone.'),
      confirmColor: '#C8102E',
      success: (res) => {
        if (res.confirm) {
          removeBaby(id)
          this.refreshList()
          wx.showToast({ title: this._t('已删除', 'Deleted'), icon: 'none' })
        }
      }
    })
  },
})
