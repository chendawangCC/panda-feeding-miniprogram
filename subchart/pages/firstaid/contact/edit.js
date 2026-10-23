// pages/contact/edit.js
const STORAGE_KEY = 'firstaid_emergency_contacts'

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
    isEdit: false,
    contactId: '',
    name: '',
    phone: '',
    lang: 'zh',
    relation: '家人',
    relationLabel: '家人',
    relationIndex: 0,
    relations: RELATIONS,
    saving: false
  },

  _en() { return (wx.getStorageSync('lang') || this.data.lang || 'zh') === 'en'; },
  _t(zh, en) { return this._en() ? en : zh; },
  _relLabel(zh) {
    return this._en() ? (RELATION_EN[zh] || zh) : zh
  },

  onLoad(options) {
    const en = (wx.getStorageSync('lang') || 'zh') === 'en'
    this.setData({
      lang: en ? 'en' : 'zh',
      relations: RELATIONS.map(r => (en ? (RELATION_EN[r] || r) : r)),
      relationLabel: en ? (RELATION_EN['家人'] || '家人') : '家人'
    })
    if (!(options && options.id)) {
      wx.setNavigationBarTitle({ title: en ? 'Add contact' : '添加联系人' })
    }
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
          relationLabel: this._relLabel(contact.relation),
          relationIndex
        })
        wx.setNavigationBarTitle({ title: this._t('编辑联系人', 'Edit contact') })
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
    const zh = RELATIONS[index] || RELATIONS[0]
    this.setData({
      relation: zh,
      relationLabel: this._relLabel(zh),
      relationIndex: index
    })
  },

  onSave() {
    if (this.data.saving) return
    const name = this.data.name.trim()
    const phone = this.data.phone.trim()

    if (!name) {
      wx.showToast({ title: this._t('请输入姓名', 'Please enter a name'), icon: 'none' })
      return
    }
    if (!/^1\d{10}$/.test(phone)) {
      wx.showToast({ title: this._t('请输入正确的11位手机号', 'Enter a valid 11-digit mobile number'), icon: 'none' })
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
    wx.showToast({ title: this.data.isEdit ? this._t('已保存', 'Saved') : this._t('已添加', 'Added'), icon: 'success' })
    setTimeout(() => wx.navigateBack(), 600)
  }
})
