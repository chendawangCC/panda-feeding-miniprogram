// pages/contact/contact.js
const STORAGE_KEY = 'firstaid_emergency_contacts'

// 预置关系选项
const RELATIONS = ['家人', '配偶', '父母', '医生', '邻居', '朋友', '其他']

const app = getApp();

Page({
  goBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) });
  },

  data: {
    safeTop: (app.globalData && app.globalData.safeTop) || 88,
    contacts: [],
    hasContacts: false
  },

  onShow() {
    this.loadContacts()
  },

  /** 从本地读取联系人 */
  loadContacts() {
    const contacts = wx.getStorageSync(STORAGE_KEY) || []
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
      title: '拨打急救电话',
      content: '确认拨打 120 吗？',
      confirmText: '拨打',
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
      title: '删除联系人',
      content: '确定删除「' + contact.name + '」吗？',
      confirmText: '删除',
      confirmColor: '#C0392B',
      success: (res) => {
        if (!res.confirm) return
        const contacts = this.data.contacts.filter(c => c.id !== id)
        wx.setStorageSync(STORAGE_KEY, contacts)
        this.loadContacts()
        wx.showToast({ title: '已删除', icon: 'success' })
      }
    })
  },

  onShareAppMessage() {
    return {
        imageUrl: '/images/share-cover.png',
      title: '我的家庭急救紧急联系人',
      path: '/subchart/pages/firstaid/contact/contact'
    }
  }
})
