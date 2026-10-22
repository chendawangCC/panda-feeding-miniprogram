// pages/baby/baby.js - 多宝宝管理
const { getBabies, getActiveBaby, setActiveBaby, addBaby, updateBaby, removeBaby } = require('../data/babies')
const { getAgeText } = require('../data/recommend')

const app = getApp();

Page({
  goBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) });
  },

  data: {
    safeTop: (app.globalData && app.globalData.safeTop) || 88,
    // 表单态
    mode: 'list',        // list(列表) | form(表单)
    isEdit: false,
    editId: '',
    name: '',
    gender: '',
    genderIndex: -1,
    genders: ['小王子', '小公主'],
    birthDate: '',
    today: '',
    // 列表态
    babies: [],
    activeId: '',
    hasBabies: false,
  },

  onLoad() {
    // 日期选择上限：今天
    const now = new Date()
    const pad = n => (n < 10 ? '0' + n : '' + n)
    const today = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate())
    this.setData({ today })
  },

  onShow() {
    this.refreshList()
  },

  // 刷新宝宝列表（月龄实时计算 = 自动更新）
  refreshList() {
    const babies = getBabies()
    const active = getActiveBaby()
    const list = babies.map(b => {
      const g = b.gender === 'boy' ? '小王子' : b.gender === 'girl' ? '小公主' : ''
      return {
        id: b.id,
        name: b.name,
        genderLabel: g,
        birthDate: b.birthDate,
        ageText: getAgeText(b.birthDate),
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
    wx.showToast({ title: '已切换', icon: 'none' })
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
      wx.showToast({ title: '请选择宝宝性别', icon: 'none' })
      return
    }
    if (!birthDate) {
      wx.showToast({ title: '请选择出生日期', icon: 'none' })
      return
    }
    if (this.data.isEdit) {
      updateBaby(this.data.editId, { name: name || '宝宝', gender, birthDate })
      wx.showToast({ title: '已保存', icon: 'success' })
    } else {
      addBaby(name, gender, birthDate)
      wx.showToast({ title: '已添加', icon: 'success' })
    }
    this.setData({ mode: 'list' })
    this.refreshList()
  },

  // 删除宝宝
  onDelete(e) {
    const id = e.currentTarget.dataset.id
    const b = getBabies().find(x => x.id === id)
    wx.showModal({
      title: '删除宝宝',
      content: '确定删除「' + (b ? b.name : '') + '」吗？删除后无法恢复。',
      confirmColor: '#C8102E',
      success: (res) => {
        if (res.confirm) {
          removeBaby(id)
          this.refreshList()
          wx.showToast({ title: '已删除', icon: 'none' })
        }
      }
    })
  },
})
