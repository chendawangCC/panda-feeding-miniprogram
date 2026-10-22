// pages/prepare/prepare.js
const { getSkillById, VIDEO_MAP } = require('../data/skills')

const app = getApp();

Page({
  goBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) });
  },

  data: {
    safeTop: (app.globalData && app.globalData.safeTop) || 88,
    skill: null,
    video: null,       // { url, title, source, hasVideo, isUploaded }
  },

  onLoad(options) {
    const skill = getSkillById(options.skill)
    if (!skill) {
      wx.showToast({ title: '技能不存在', icon: 'none' })
      return
    }
    const video = this.buildVideo(skill)
    this.setData({ skill, video })
    wx.setNavigationBarTitle({ title: skill.name })
  },

  // 组装视频：优先本地已上传教学视频，其次 VIDEO_MAP 直链
  buildVideo(skill) {
    if (skill.videoUrl) {
      return { url: skill.videoUrl, title: skill.videoTitle || '我的教学视频', source: 'user', hasVideo: true, isUploaded: false }
    }
    const key = 'fa_video_' + skill.id
    const local = wx.getStorageSync(key) || ''
    if (local) {
      return { url: local, title: '我的教学视频', source: 'uploaded', hasVideo: true, isUploaded: true }
    }
    const v = VIDEO_MAP[skill.id] || {}
    const url = v.url || ''
    return {
      url: url,
      title: v.title || '真人教学指导',
      source: v.source || '',
      hasVideo: !!(url && url.indexOf('http') === 0),
      isUploaded: false,
    }
  },

  onStart() {
    const skill = this.data.skill
    if (!skill) return
    // 用 redirectTo 替换 prepare 页：train 完成后返回直接回到分类页（module），而不是停在准备页
    wx.redirectTo({
      url: '/subchart/pages/firstaid/train/train?skill=' + skill.id
    })
  },

  // 上传 / 重新上传教学视频（仅视频格式 · 大小≤50MB · 横屏最佳）
  onUploadVideo() {
    const skill = this.data.skill
    if (!skill) return
    wx.chooseMedia({
      count: 1,
      mediaType: ['video'],
      sourceType: ['album', 'camera'],
      maxDuration: 600,
      success: (res) => {
        const f = res.tempFiles[0]
        if (!f) return
        // 仅接受视频格式
        if (f.fileType && f.fileType !== 'video') {
          wx.showToast({ title: '仅支持视频格式', icon: 'none' })
          return
        }
        // 大小限制：不超过 50MB（云存储安全上限，避免上传失败）
        const sizeMB = (f.size || 0) / 1024 / 1024
        if (sizeMB > 50) {
          wx.showModal({
            title: '视频过大',
            content: '当前视频约 ' + sizeMB.toFixed(1) + ' MB，超过 50MB 限制，请压缩或重新录制后上传。',
            showCancel: false
          })
          return
        }
        // 横竖屏检测：视频框为横屏（16:9），竖屏/方形视频提示用户选择处理方式
        const w = f.width || 0, h = f.height || 0
        if (w && h && h > w) {
          wx.showActionSheet({
            itemList: ['换一个横屏视频', '仍要上传（按横屏适配）'],
            success: (r) => {
              if (r.tapIndex === 0) { this.onUploadVideo(); return }
              this.doUpload(f.tempFilePath, skill.id, true)
            },
            fail: () => {}
          })
          return
        }
        if (w && h && (w / h) < 1.2) {
          wx.showActionSheet({
            itemList: ['换一个横屏视频', '仍要上传（按横屏适配）'],
            success: (r) => {
              if (r.tapIndex === 0) { this.onUploadVideo(); return }
              this.doUpload(f.tempFilePath, skill.id, true)
            },
            fail: () => {}
          })
          return
        }
        this.doUpload(f.tempFilePath, skill.id, false)
      },
      fail: (err) => {
        // 用户取消不算错误
        if (err && err.errMsg && err.errMsg.indexOf('cancel') >= 0) return
        wx.showToast({ title: '选择视频失败', icon: 'none' })
      }
    })
  },

  doUpload(temp, skillId, isPortrait) {
    wx.showLoading({ title: '上传中…' })
    this.uploadToCloud(temp, skillId, isPortrait)
  },

  // 优先上传云存储（多端同步），云不可用则降级本地持久化
  uploadToCloud(temp, skillId) {
    const done = (url) => this.saveVideo(url, skillId)
    if (wx.cloud && wx.cloud.uploadFile) {
      const cloudPath = 'fa-videos/' + skillId + '-' + Date.now() + '.mp4'
      wx.cloud.uploadFile({
        cloudPath,
        filePath: temp,
        success: (r) => { done(r.fileID) },
        fail: () => { this.saveLocal(temp, done) }
      })
    } else {
      this.saveLocal(temp, done)
    }
  },

  // 本地持久化（无云环境时，视频存本地用户目录，可跨会话播放）
  saveLocal(temp, done) {
    try {
      wx.getFileSystemManager().saveFile({
        tempFilePath: temp,
        success: (r) => done(r.savedFilePath),
        fail: () => done(temp) // 至少当前会话可播放
      })
    } catch (e) {
      done(temp)
    }
  },

  saveVideo(url, skillId) {
    wx.hideLoading()
    wx.setStorageSync('fa_video_' + skillId, url)
    const skill = this.data.skill
    this.setData({
      video: { url, title: '我的教学视频', source: 'uploaded', hasVideo: true, isUploaded: true }
    })
    wx.showToast({ title: '教学视频已上传', icon: 'success' })
  },

  // 移除已上传教学视频
  onRemoveVideo() {
    const skill = this.data.skill
    if (!skill) return
    wx.showModal({
      title: '移除教学视频',
      content: '确定移除该技能的教学视频吗？',
      success: (r) => {
        if (!r.confirm) return
        wx.removeStorageSync('fa_video_' + skill.id)
        this.setData({
          video: { url: '', title: '真人教学指导', source: '', hasVideo: false, isUploaded: false }
        })
        wx.showToast({ title: '已移除', icon: 'none' })
      }
    })
  }
})
