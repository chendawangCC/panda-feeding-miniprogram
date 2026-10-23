// pages/family/family.js - 家庭急救专题页（技能 + 规范教学视频 + 录制入口）
const { SKILLS, localizeSkills, currentLang } = require('../data/skills')
const { getBabies, getActiveBaby } = require('../data/babies')

const USER_KEY = 'firstaid_user'
const POSTS_KEY = 'firstaid_video_posts'

const app = getApp();

Page({
  goBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) });
  },

  data: {
    lang: 'zh',
    safeTop: (app.globalData && app.globalData.safeTop) || 88,
    skills: [],        // 家庭急救技能（成人急救 + 通用急救）
    videos: [],        // 护士/医生上传的规范教学视频
    userRole: '',      // 当前用户身份（普通用户/护士/医生）
  },

  _en() { return (wx.getStorageSync('lang') || this.data.lang || 'zh') === 'en'; },

  onLoad() {
    // 家庭急救技能：成人急救 + 通用急救 两个分类
    const lang = currentLang()
    const skills = localizeSkills(
      SKILLS.filter(s => s.category === '成人急救' || s.category === '通用急救'), lang)
    this.setData({ lang, skills })
  },

  onShow() {
    this.refreshVideos()
  },

  refreshVideos() {
    const posts = wx.getStorageSync(POSTS_KEY) || []
    // 新的在前
    const videos = posts.slice().reverse()
    const user = wx.getStorageSync(USER_KEY)
    const userRole = user && user.role ? user.role : ''
    this.setData({ videos, userRole })
  },

  onTapSkill(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/subchart/pages/firstaid/prepare/prepare?skill=' + id })
  },

  // 自学录制 / 上传教学视频
  onRecord() {
    wx.navigateTo({ url: '/subchart/pages/firstaid/record/record' })
  },

  onCall120() {
    wx.showModal({
      title: this._en() ? 'Call emergency services' : '拨打急救电话',
      content: this._en() ? 'Call 120 now?' : '确认拨打 120 吗？',
      confirmText: this._en() ? 'Call' : '拨打',
      confirmColor: '#C8102E',
      success(res) {
        if (res.confirm) {
          wx.makePhoneCall({ phoneNumber: '120' })
        }
      }
    })
  },
})
