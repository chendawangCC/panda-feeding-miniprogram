// pages/account/account.js - 账号注册/登录
const USER_KEY = 'firstaid_user'

const app = getApp();

Page({
  goBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) });
  },

  data: {
    safeTop: (app.globalData && app.globalData.safeTop) || 88,
    lang: 'zh',
    loggedIn: false,
    nickname: '',
    phone: '',
    user: null,
    wechatLogging: false,
  },

  _en() { return (wx.getStorageSync('lang') || this.data.lang || 'zh') === 'en'; },
  _t(zh, en) { return this._en() ? en : zh; },

  onLoad() {
    const en = (wx.getStorageSync('lang') || 'zh') === 'en'
    this.setData({ lang: en ? 'en' : 'zh' })
    wx.setNavigationBarTitle({ title: en ? 'Account' : '账号' })
  },

  onShow() {
    const user = wx.getStorageSync(USER_KEY)
    if (user && user.nickname) {
      this.setData({ loggedIn: true, user })
    } else {
      this.setData({ loggedIn: false })
    }
  },

  onNicknameInput(e) {
    this.setData({ nickname: e.detail.value })
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value })
  },

  /**
   * 微信一键登录：
   * 1. wx.login 获取临时 code（本地标记登录方式；正式上线接入后端后，
   *    用此 code 换取 openid/session_key 建立服务端登录态）
   * 2. wx.getUserProfile 拉取微信昵称与头像（需用户点击授权）
   * 3. 写入本地账号完成登录
   */
  onWechatLogin() {
    if (this.data.wechatLogging) return
    this.setData({ wechatLogging: true })

    // 先拿登录凭证（换取 openid 的入口，本地仅作标记）
    wx.login({
      success: (loginRes) => {
        const code = loginRes.code || ''
        this.doGetUserProfile(code)
      },
      fail: () => {
        // 模拟器/个别环境 login 可能失败，仍继续尝试获取用户资料
        this.doGetUserProfile('')
      }
    })
  },

  doGetUserProfile(code) {
    wx.getUserProfile({
      desc: this._t('用于完善账号信息，实现微信一键登录', 'Used to complete your profile and sign in with WeChat'),
      success: (res) => {
        const info = res.userInfo || {}
        const nickname = (info.nickName || '').trim() || this._t('微信用户', 'WeChat user')
        const avatarUrl = info.avatarUrl || ''
        // 头像取微信头像 URL；拿不到时用昵称首字兜底
        const avatarImg = avatarUrl && avatarUrl.indexOf('http') === 0 ? avatarUrl : ''
        const user = {
          nickname,
          phone: '',
          avatar: nickname.charAt(0),
          avatarImg,
          loginType: 'wechat',
          wechatCode: code,
          loginAt: Date.now(),
        }
        wx.setStorageSync(USER_KEY, user)
        this.setData({ loggedIn: true, user, wechatLogging: false })
        wx.showToast({ title: this._t('微信登录成功', 'Signed in with WeChat'), icon: 'success' })
      },
      fail: () => {
        this.setData({ wechatLogging: false })
        wx.showToast({ title: this._t('已取消微信授权，可用下方方式注册', 'WeChat authorisation cancelled - you can register below'), icon: 'none' })
      },
      complete: () => {
        this.setData({ wechatLogging: false })
      }
    })
  },

  // 注册/保存（本地）
  onRegister() {
    const nickname = this.data.nickname.trim()
    const phone = this.data.phone.trim()
    if (!nickname) {
      wx.showToast({ title: this._t('请输入昵称', 'Please enter a nickname'), icon: 'none' })
      return
    }
    if (phone && !/^1\d{10}$/.test(phone)) {
      wx.showToast({ title: this._t('手机号格式不正确', 'Phone number format is invalid'), icon: 'none' })
      return
    }
    const user = {
      nickname,
      phone,
      avatar: nickname.charAt(0),
      avatarImg: '',
      loginType: 'local',
      loginAt: Date.now(),
    }
    wx.setStorageSync(USER_KEY, user)
    this.setData({ loggedIn: true, user, nickname: '', phone: '' })
    wx.showToast({ title: this._t('注册成功', 'Registered'), icon: 'success' })
  },

  // 编辑账号信息
  onEdit() {
    const user = this.data.user
    if (!user) return
    this.setData({
      loggedIn: false,
      nickname: user.nickname || '',
      phone: user.phone || '',
    })
    wx.showToast({ title: this._t('请修改后重新保存', 'Edit the fields, then save again'), icon: 'none' })
  },

  // 退出登录
  onLogout() {
    wx.showModal({
      title: this._t('退出登录', 'Sign out'),
      content: this._t('退出后本机保存的账号信息将被清除，确认退出？', 'Your saved account info will be cleared on this device. Sign out?'),
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync(USER_KEY)
          this.setData({ loggedIn: false, user: null, nickname: '', phone: '' })
          wx.showToast({ title: this._t('已退出', 'Signed out'), icon: 'none' })
        }
      }
    })
  },

  // 去填写宝宝信息
  onGoBaby() {
    wx.navigateTo({ url: '/subchart/pages/firstaid/baby/baby' })
  },
})
