// pages/plan/plan.js - 我的
const { getBabies, getActiveBaby } = require('../data/babies')
const { KIT_CATEGORIES } = require('../data/kit')
const { MED_CATEGORIES } = require('../data/medicine')

const USER_KEY = 'firstaid_user'
const KIT_KEY = 'firstaid_kit_checked'
const CONTACT_KEY = 'firstaid_emergency_contacts'

const app = getApp();

Page({
  goBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) });
  },

  data: {
    safeTop: (app.globalData && app.globalData.safeTop) || 88,
    loggedIn: false,
    user: null,
    babies: [],
    activeBaby: null,
    kitProgress: '',     // 如 "12/31"
    medProgress: '',
    contactCount: 0,
  },

  onShow() {
    this.refreshAll()
    // 同步自定义 tabBar 选中态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 })
    }
  },

  refreshAll() {
    const user = wx.getStorageSync(USER_KEY)
    const loggedIn = !!(user && user.nickname)

    const babies = getBabies()
    const activeBaby = getActiveBaby()

    // 急救包进度（存储为 {id: true} 对象）
    const kitChecked = wx.getStorageSync(KIT_KEY) || {}
    const kitTotal = KIT_CATEGORIES.reduce((a, c) => a + c.items.length, 0)
    const kitProgress = Object.keys(kitChecked).length + '/' + kitTotal

    // 常备药进度
    const medChecked = wx.getStorageSync('firstaid_med_checked') || {}
    const medTotal = MED_CATEGORIES.reduce((a, c) => a + c.items.length, 0)
    const medProgress = Object.keys(medChecked).length + '/' + medTotal

    const contacts = wx.getStorageSync(CONTACT_KEY) || []
    const contactCount = contacts.length

    this.setData({
      loggedIn,
      user: loggedIn ? user : null,
      babies,
      activeBaby,
      kitProgress,
      medProgress,
      contactCount,
    })
  },

  // 跳转账号
  onTapAccount() {
    wx.navigateTo({ url: '/subchart/pages/firstaid/account/account' })
  },

  // 家庭急救·教学视频
  onTapFamily() {
    wx.navigateTo({ url: '/subchart/pages/firstaid/family/family' })
  },

  // 宝宝管理
  onTapBaby() {
    wx.navigateTo({ url: '/subchart/pages/firstaid/baby/baby' })
  },

  // 急救包（普通页）
  onTapKit() {
    wx.navigateTo({ url: '/subchart/pages/firstaid/kit/kit' })
  },

  // 紧急联系人
  onTapContact() {
    wx.navigateTo({ url: '/subchart/pages/firstaid/contact/contact' })
  },

  // 退出登录
  onLogout() {
    wx.showModal({
      title: '退出登录',
      content: '退出后本机保存的账号信息将被清除，确认退出？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync(USER_KEY)
          this.refreshAll()
          wx.showToast({ title: '已退出', icon: 'none' })
        }
      }
    })
  },

  onCall120() {
    wx.showModal({
      title: '拨打急救电话',
      content: '确认拨打 120 吗？',
      confirmText: '拨打',
      confirmColor: '#C8102E',
      success(res) {
        if (res.confirm) {
          wx.makePhoneCall({ phoneNumber: '120' })
        }
      }
    })
  },
})
