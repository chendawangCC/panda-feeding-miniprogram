// pages/record/record.js - 自学录制 / 上传规范教学视频
const USER_KEY = 'firstaid_user'
const POSTS_KEY = 'firstaid_video_posts'

// 类型选项（value 仍用中文，保证历史数据与筛选一致；label 按语言显示）
const TYPE_OPTIONS = [
  { value: '宝宝护理', zh: '宝宝护理', en: 'Baby care', cls: 'bao' },
  { value: '婴儿急救', zh: '婴儿急救', en: 'Infant first aid', cls: 'ji' },
  { value: '妈妈护理', zh: '妈妈护理', en: 'Mum care', cls: 'ma' },
  { value: '成人急救', zh: '成人急救', en: 'Adult first aid', cls: 'cheng' },
  { value: '通用急救', zh: '通用急救', en: 'General first aid', cls: 'tong' },
]

// 身份选项（同上：value 中文，label 双语）
const ROLE_OPTIONS = [
  { value: '普通用户', zh: '普通用户', en: 'General user' },
  { value: '护士', zh: '护士', en: 'Nurse' },
  { value: '医生', zh: '医生', en: 'Doctor' },
]

const app = getApp();

Page({
  goBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) });
  },

  data: {
    safeTop: (app.globalData && app.globalData.safeTop) || 88,
    videoPath: '',        // 拍摄/选择的视频本地路径
    videoDuration: 0,
    lang: 'zh',
    types: [],
    roles: [],
    type: '宝宝护理',
    role: '普通用户',
    title: '',
    desc: '',
    license: '',
    myPosts: [],          // 我的录制列表
    submitting: false,
  },

  _en() { return (wx.getStorageSync('lang') || this.data.lang || 'zh') === 'en'; },
  _t(zh, en) { return this._en() ? en : zh; },

  onLoad() {
    const en = (wx.getStorageSync('lang') || 'zh') === 'en'
    this.setData({
      lang: en ? 'en' : 'zh',
      types: TYPE_OPTIONS.map(t => ({ value: t.value, label: en ? t.en : t.zh, cls: t.cls })),
      roles: ROLE_OPTIONS.map(r => ({ value: r.value, label: en ? r.en : r.zh }))
    })
    wx.setNavigationBarTitle({ title: en ? 'Record a demo' : '自学录制' })
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
      wx.showToast({ title: this._t('请先拍摄或选择视频', 'Record or pick a video first'), icon: 'none' })
      return
    }
    if (!title) {
      wx.showToast({ title: this._t('请输入视频标题', 'Please enter a title'), icon: 'none' })
      return
    }
    if ((this.data.role === '护士' || this.data.role === '医生') && !this.data.license.trim()) {
      wx.showToast({ title: this._t('护士/医生请填写资质证号', 'Nurses and doctors: please enter your licence number'), icon: 'none' })
      return
    }

    const user = wx.getStorageSync(USER_KEY) || {}
    const typeObj = this.data.types.find(t => t.value === this.data.type) || this.data.types[0]
    const now = new Date()
    const pad = n => String(n).padStart(2, '0')
    const post = {
      id: 'v_' + Date.now(),
      title,
      type: this.data.type,
      typeLabel: typeObj.label,
      typeClass: typeObj.cls,
      role: this.data.role,
      author: user.nickname || this._t('匿名', 'Anonymous'),
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
      title: this._t('已保存', 'Saved'),
      content: this._t('教学视频已保存，并自动加入所选类型的技能模块页，点击可观看并跟做。',
        'Your demo is saved and added to the matching skill page; tap it to watch and follow along.'),
      showCancel: false,
      confirmText: this._t('知道了', 'Got it'),
      success: () => {
        this.setData({ submitting: false })
      }
    })
  },

  // 删除我的录制
  onDelete(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: this._t('删除这条教学视频？', 'Delete this demo?'),
      content: this._t('删除后将从家庭急救页移除', 'It will also disappear from the family first-aid page'),
      success: (res) => {
        if (!res.confirm) return
        const user = wx.getStorageSync(USER_KEY)
        const myName = user && user.nickname
        const posts = (wx.getStorageSync(POSTS_KEY) || []).filter(p => !(p.id === id && p.author === myName))
        wx.setStorageSync(POSTS_KEY, posts)
        this.refreshMyPosts()
        wx.showToast({ title: this._t('已删除', 'Deleted'), icon: 'none' })
      }
    })
  },
})
