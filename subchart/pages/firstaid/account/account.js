// pages/account/account.js - 账号注册/登录
const USER_KEY = 'firstaid_user'

const app = getApp();

Page({
  goBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) });
  },

  data: {
    safeTop: (app.globalData && app.globalData.safeTop) || 88,
    loggedIn: false,
    nickname: '',
    phone: '',
    user: null,
    wechatLogging: false,
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
      desc: '用于完善账号信息，实现微信一键登录',
      success: (res) => {
        const info = res.userInfo || {}
        const nickname = (info.nickName || '').trim() || '微信用户'
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
        wx.showToast({ title: '微信登录成功', icon: 'success' })
      },
      fail: () => {
        this.setData({ wechatLogging: false })
        wx.showToast({ title: '已取消微信授权，可用下方方式注册', icon: 'none' })
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
      wx.showToast({ title: '请输入昵称', icon: 'none' })
      return
    }
    if (phone && !/^1\d{10}$/.test(phone)) {
      wx.showToast({ title: '手机号格式不正确', icon: 'none' })
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
    wx.showToast({ title: '注册成功', icon: 'success' })
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
    wx.showToast({ title: '请修改后重新保存', icon: 'none' })
  },

  // 退出登录
  onLogout() {
    wx.showModal({
      title: '退出登录',
      content: '退出后本机保存的账号信息将被清除，确认退出？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync(USER_KEY)
          this.setData({ loggedIn: false, user: null, nickname: '', phone: '' })
          wx.showToast({ title: '已退出', icon: 'none' })
        }
      }
    })
  },

  // 去填写宝宝信息
  onGoBaby() {
    wx.navigateTo({ url: '/subchart/pages/firstaid/baby/baby' })
  },
})
