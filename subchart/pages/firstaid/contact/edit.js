// pages/contact/edit.js
const STORAGE_KEY = 'firstaid_emergency_contacts'

const RELATIONS = ['家人', '配偶', '父母', '医生', '邻居', '朋友', '其他']

const app = getApp();

Page({
  goBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) });
  },

  data: {
    safeTop: (app.globalData && app.globalData.safeTop) || 88,
    isEdit: false,
    contactId: '',
    name: '',
    phone: '',
    relation: '家人',
    relationIndex: 0,
    relations: RELATIONS,
    saving: false
  },

  onLoad(options) {
    // 编辑模式
    if (options.id) {
      const contacts = wx.getStorageSync(STORAGE_KEY) || []
      const contact = contacts.find(c => c.id === options.id)
      if (contact) {
        const relationIndex = RELATIONS.indexOf(contact.relation) >= 0 ? RELATIONS.indexOf(contact.relation) : 0
        this.setData({
          isEdit: true,
          contactId: contact.id,
          name: contact.name,
          phone: contact.phone,
          relation: contact.relation,
          relationIndex
        })
        wx.setNavigationBarTitle({ title: '编辑联系人' })
      }
    }
  },

  onNameInput(e) {
    this.setData({ name: e.detail.value })
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value })
  },

  onRelationChange(e) {
    const index = Number(e.detail.value)
    this.setData({
      relation: this.data.relations[index],
      relationIndex: index
    })
  },

  onSave() {
    if (this.data.saving) return
    const name = this.data.name.trim()
    const phone = this.data.phone.trim()

    if (!name) {
      wx.showToast({ title: '请输入姓名', icon: 'none' })
      return
    }
    if (!/^1\d{10}$/.test(phone)) {
      wx.showToast({ title: '请输入正确的11位手机号', icon: 'none' })
      return
    }

    this.setData({ saving: true })

    let contacts = wx.getStorageSync(STORAGE_KEY) || []
    const avatar = name.charAt(0)

    if (this.data.isEdit) {
      contacts = contacts.map(c => {
        if (c.id === this.data.contactId) {
          return { ...c, name, phone, relation: this.data.relation, avatar }
        }
        return c
      })
    } else {
      const contact = {
        id: 'c_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        name,
        phone,
        relation: this.data.relation,
        avatar
      }
      contacts.push(contact)
    }

    wx.setStorageSync(STORAGE_KEY, contacts)
    this.setData({ saving: false })
    wx.showToast({ title: this.data.isEdit ? '已保存' : '已添加', icon: 'success' })
    setTimeout(() => wx.navigateBack(), 600)
  }
})
