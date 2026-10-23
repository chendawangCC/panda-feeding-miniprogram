// pages/contact/contact.js
const STORAGE_KEY = 'firstaid_emergency_contacts'

// 预置关系选项（存中文，显示按语言）
const RELATIONS = ['家人', '配偶', '父母', '医生', '邻居', '朋友', '其他']
const RELATION_EN = {
  '家人': 'Family', '配偶': 'Spouse', '父母': 'Parent', '医生': 'Doctor',
  '邻居': 'Neighbour', '朋友': 'Friend', '其他': 'Other'
}

const app = getApp();

Page({
  goBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) });
  },

  data: {
    safeTop: (app.globalData && app.globalData.safeTop) || 88,
    lang: 'zh',
    contacts: [],
    hasContacts: false
  },

  _en() { return (wx.getStorageSync('lang') || this.data.lang || 'zh') === 'en'; },
  _t(zh, en) { return this._en() ? en : zh; },

  onLoad() {
    const en = (wx.getStorageSync('lang') || 'zh') === 'en'
    this.setData({ lang: en ? 'en' : 'zh' })
    wx.setNavigationBarTitle({ title: en ? 'Emergency contacts' : '紧急联系人' })
  },

  onShow() {
    this.loadContacts()
  },

  /** 从本地读取联系人 */
  loadContacts() {
    const raw = wx.getStorageSync(STORAGE_KEY) || []
    const en = this._en()
    // relation 存中文，列表里额外给一个本地化显示字段
    const contacts = raw.map(c => Object.assign({}, c, {
      relationLabel: en ? (RELATION_EN[c.relation] || c.relation) : c.relation
    }))
    this.setData({ contacts, hasContacts: contacts.length > 0 })
  },

  /** 跳转新增 */
  onAdd() {
    wx.navigateTo({ url: '/subchart/pages/firstaid/contact/edit' })
  },

  /** 跳转编辑 */
  onEdit(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/subchart/pages/firstaid/contact/edit?id=' + id })
  },

  /** 一键拨打联系人 */
  onCall(e) {
    const id = e.currentTarget.dataset.id
    const contact = this.data.contacts.find(c => c.id === id)
    if (!contact) return
    wx.makePhoneCall({
      phoneNumber: contact.phone,
      fail: () => {}
    })
  },

  /** 拨打120 */
  onCall120() {
    wx.showModal({
      title: this._t('拨打急救电话', 'Call emergency'),
      content: this._t('确认拨打 120 吗？', 'Call 120 now?'),
      confirmText: this._t('拨打', 'Call'),
      confirmColor: '#29281F',
      success: (res) => {
        if (res.confirm) {
          wx.makePhoneCall({ phoneNumber: '120' })
        }
      }
    })
  },

  /** 删除联系人 */
  onDelete(e) {
    const id = e.currentTarget.dataset.id
    const contact = this.data.contacts.find(c => c.id === id)
    if (!contact) return
    wx.showModal({
      title: this._t('删除联系人', 'Delete contact'),
      content: this._t('确定删除「' + contact.name + '」吗？', 'Delete ' + contact.name + '?'),
      confirmText: this._t('删除', 'Delete'),
      confirmColor: '#C0392B',
      success: (res) => {
        if (!res.confirm) return
        const contacts = this.data.contacts.filter(c => c.id !== id)
        wx.setStorageSync(STORAGE_KEY, contacts)
        this.loadContacts()
        wx.showToast({ title: this._t('已删除', 'Deleted'), icon: 'success' })
      }
    })
  },

  onShareAppMessage() {
    return {
        imageUrl: '/images/share-cover.png',
      title: this._t('我的家庭急救紧急联系人', 'My family emergency contacts'),
      path: '/subchart/pages/firstaid/contact/contact'
    }
  }
})
