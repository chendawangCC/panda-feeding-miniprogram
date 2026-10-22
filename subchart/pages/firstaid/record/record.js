// pages/record/record.js - 自学录制 / 上传规范教学视频
const USER_KEY = 'firstaid_user'
const POSTS_KEY = 'firstaid_video_posts'

// 类型选项
const TYPE_OPTIONS = [
  { value: '宝宝护理', label: '宝宝护理', cls: 'bao' },
  { value: '婴儿急救', label: '婴儿急救', cls: 'ji' },
  { value: '妈妈护理', label: '妈妈护理', cls: 'ma' },
  { value: '成人急救', label: '成人急救', cls: 'cheng' },
  { value: '通用急救', label: '通用急救', cls: 'tong' },
]

// 身份选项
const ROLE_OPTIONS = ['普通用户', '护士', '医生']

const app = getApp();

Page({
  goBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) });
  },

  data: {
    safeTop: (app.globalData && app.globalData.safeTop) || 88,
    videoPath: '',        // 拍摄/选择的视频本地路径
    videoDuration: 0,
    types: TYPE_OPTIONS,
    roles: ROLE_OPTIONS,
    type: '宝宝护理',
    role: '普通用户',
    title: '',
    desc: '',
    license: '',
    myPosts: [],          // 我的录制列表
    submitting: false,
  },

  onShow() {
    this.refreshMyPosts()
  },

  refreshMyPosts() {
    const user = wx.getStorageSync(USER_KEY)
    const myName = user && user.nickname
    const posts = wx.getStorageSync(POSTS_KEY) || []
    const myPosts = myName ? posts.filter(p => p.author === myName).slice().reverse() : []
    this.setData({ myPosts })
  },

  // 拍摄/选择视频
  onPickVideo() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['video'],
      sourceType: ['album', 'camera'],
      maxDuration: 120,
      camera: 'back',
      success: (res) => {
        const file = res.tempFiles && res.tempFiles[0]
        if (!file) return
        this.setData({
          videoPath: file.tempFilePath,
          videoDuration: Math.round(file.duration || 0),
        })
      },
    })
  },

  onTitleInput(e) {
    this.setData({ title: e.detail.value })
  },
  onDescInput(e) {
    this.setData({ desc: e.detail.value })
  },
  onLicenseInput(e) {
    this.setData({ license: e.detail.value })
  },

  // 选类型
  onTypeTap(e) {
    this.setData({ type: e.currentTarget.dataset.value })
  },

  // 选身份
  onRoleTap(e) {
    this.setData({ role: e.currentTarget.dataset.value })
  },

  // 保存并展示（原型：存本地；正式版上传云存储获得稳定链接）
  onSubmit() {
    if (this.data.submitting) return
    const title = this.data.title.trim()
    if (!this.data.videoPath) {
      wx.showToast({ title: '请先拍摄或选择视频', icon: 'none' })
      return
    }
    if (!title) {
      wx.showToast({ title: '请输入视频标题', icon: 'none' })
      return
    }
    if ((this.data.role === '护士' || this.data.role === '医生') && !this.data.license.trim()) {
      wx.showToast({ title: '护士/医生请填写资质证号', icon: 'none' })
      return
    }

    const user = wx.getStorageSync(USER_KEY) || {}
    const typeObj = TYPE_OPTIONS.find(t => t.value === this.data.type) || TYPE_OPTIONS[0]
    const now = new Date()
    const pad = n => String(n).padStart(2, '0')
    const post = {
      id: 'v_' + Date.now(),
      title,
      type: this.data.type,
      typeLabel: typeObj.label,
      typeClass: typeObj.cls,
      role: this.data.role,
      author: user.nickname || '匿名',
      desc: this.data.desc.trim(),
      license: this.data.license.trim(),
      videoPath: this.data.videoPath,
      videoDuration: this.data.videoDuration,
      createTime: now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes()),
    }

    const posts = wx.getStorageSync(POSTS_KEY) || []
    posts.push(post)
    wx.setStorageSync(POSTS_KEY, posts)

    this.setData({
      submitting: true,
      videoPath: '',
      videoDuration: 0,
      title: '',
      desc: '',
    })
    this.refreshMyPosts()
    wx.showModal({
      title: '已保存',
      content: '教学视频已保存，并自动加入所选类型的技能模块页，点击可观看并跟做。',
      showCancel: false,
      confirmText: '知道了',
      success: () => {
        this.setData({ submitting: false })
      }
    })
  },

  // 删除我的录制
  onDelete(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除这条教学视频？',
      content: '删除后将从家庭急救页移除',
      success: (res) => {
        if (!res.confirm) return
        const user = wx.getStorageSync(USER_KEY)
        const myName = user && user.nickname
        const posts = (wx.getStorageSync(POSTS_KEY) || []).filter(p => !(p.id === id && p.author === myName))
        wx.setStorageSync(POSTS_KEY, posts)
        this.refreshMyPosts()
        wx.showToast({ title: '已删除', icon: 'none' })
      }
    })
  },
})
