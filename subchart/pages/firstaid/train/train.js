// pages/train/train.js
const { getSkillByIdLocalized, flattenSkill } = require('../data/skills')
const { getStepImage } = require('../data/step-images')

const app = getApp();

Page({
  goBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) });
  },

  data: {
    lang: 'zh',
    safeTop: (app.globalData && app.globalData.safeTop) || 88,
    skill: null,
    steps: [],          // 展开后的线性步骤
    stepIndex: 0,       // 当前步骤下标
    totalSteps: 0,
    step: null,         // 当前步骤对象
    phase: 'idle',      // idle(未开始) | running(进行中) | paused(已暂停) | done(完成)
    countText: '',      // 倒计时/计数显示文本
    countTarget: '',    // 计数目标（如 /30）
    roundText: '',      // 循环进度（如 第2轮/共5轮）
    percent: 0,         // 进度百分比
    beatOn: false,      // 节拍视觉闪烁
    isPress: false,     // 当前是否为按压/冲击步骤
    isCountdown: false, // 当前是否为倒计时步骤
    isManual: false,    // 当前是否为手动确认步骤
    metronomeBpm: 0,    // 节拍器频率
    cheerText: '',       // 完成页鼓励文案
    stepImage: ''       // 当前步骤对应的图示图片路径
  },

  // ---- 生命周期 ----
  _en() { return (wx.getStorageSync('lang') || this.data.lang || 'zh') === 'en'; },

  onLoad(options) {
    const en = (wx.getStorageSync('lang') || 'zh') === 'en'
    const lang = en ? 'en' : 'zh'
    this.setData({ lang })
    const skill = getSkillByIdLocalized(options.skill, lang)
    if (!skill) {
      wx.showToast({ title: en ? 'Skill not found' : '技能不存在', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 800)
      return
    }
    const steps = flattenSkill(skill)
    this._timer = null
    this._beatTimer = null
    this._pressCount = 0
    this._countRemain = 0
    this._pausedAt = null
    this._bpmInterval = 0
    // 音频实例
    this.setData({
      skill,
      steps,
      totalSteps: steps.length,
      step: steps[0],
      phase: 'idle'
    })
    wx.setNavigationBarTitle({ title: skill.name })
    // 训练时保持屏幕常亮
    wx.setKeepScreenOn({ keepScreenOn: true })
    this.renderStep(0)
  },

  onUnload() {
    this.clearAllTimers()
    wx.setKeepScreenOn({ keepScreenOn: false })
  },

  renderStep(index) {
    const { steps, totalSteps } = this.data
    if (index >= totalSteps) {
      this.finish()
      return
    }
    const step = steps[index]
    const isPress = step.type === 'press'
    const isCountdown = step.type === 'countdown' || step.type === 'breath'
    const isManual = step.type === 'manual'
    this._pressCount = 0
    this._countRemain = step.seconds || 0

    const roundText = step.cycleRound
      ? (this._en()
        ? 'Round ' + step.cycleRound + ' of ' + step.cycleTotal
        : '第' + step.cycleRound + (step.cycleLabel || '轮') + ' / 共' + step.cycleTotal + (step.cycleLabel || '轮'))
      : ''

    // 数据驱动：按技能 id 和当前步骤索引取图，避免长 if/else 漏配或重复覆盖
    const currentSkill = this.data.skill;
    const stepImage = currentSkill ? getStepImage(currentSkill.id, index, totalSteps) : '';
    this.setData({
      step,
      stepIndex: index,
      isPress,
      isCountdown,
      isManual,
      roundText,
      percent: Math.round((index / totalSteps) * 100),
      countText: isPress ? '0' : (isCountdown ? String(this._countRemain) : ''),
      countTarget: isPress ? ('/' + step.count) : '',
      metronomeBpm: isPress ? (step.bpm || 100) : 0,
      beatOn: false,
      stepImage: stepImage
    })

  },

  // ---- 控制 ----
  onStart() {
    if (this.data.phase === 'done') return
    this.setData({ phase: 'running' })
    this.runCurrentStep()
  },

  onPause() {
    if (this.data.phase !== 'running') return
    this.clearAllTimers()
    this.setData({ phase: 'paused', beatOn: false })
  },

  onResume() {
    if (this.data.phase !== 'paused') return
    this.setData({ phase: 'running' })
    this.runCurrentStep(true)
  },

  onNext() {
    // 手动确认步骤：直接下一步（首次点击即视为开启整场训练）
    if (this.data.phase === 'done') return
    if (this.data.phase === 'idle') {
      this.setData({ phase: 'running' })
    }
    this.goNext()
  },

  onPrev() {
    this.clearAllTimers()
    const prevIndex = this.data.stepIndex - 1
    if (prevIndex >= 0) {
      this.setData({ phase: 'idle' })
      this.renderStep(prevIndex)
    }
  },

  onRestart() {
    this.clearAllTimers()
    this.setData({ phase: 'idle' })
    this.renderStep(0)
  },

  onGoHome() {
    wx.navigateBack()
  },

  onToggle() {
    // 运行时按下 = 暂停；暂停时按下 = 继续
    if (this.data.phase === 'running') {
      this.onPause()
    } else if (this.data.phase === 'paused') {
      this.onResume()
    }
  },

  // ---- 核心执行逻辑 ----
  runCurrentStep(resume) {
    const step = this.data.step
    if (!step) return
    if (step.type === 'press') {
      this.startPress(resume)
    } else if (step.type === 'countdown' || step.type === 'breath') {
      this.startCountdown(resume)
    }
    // manual 步骤无需自动计时，等待用户点击
  },

  /** 按压/冲击步骤：按 bpm 节拍计数，每拍播放滴答声 */
  startPress(resume) {
    const bpm = this.data.step.bpm || 100
    const interval = 60000 / bpm
    this._bpmInterval = interval
    this.clearBeatTimer()
    const tick = () => {
      this._pressCount++
      // 节拍反馈：视觉闪烁 + 震动 + 滴答声
      this.setData({
        countText: String(this._pressCount),
        beatOn: true
      })
      wx.vibrateShort({ type: 'light' })
      // 闪烁复位
      this._flashTimer = setTimeout(() => {
        this.setData({ beatOn: false })
      }, interval * 0.6)

      if (this._pressCount >= this.data.step.count) {
        // 完成本次计数
        this.clearBeatTimer()
        this.goNext()
      } else {
        this._beatTimer = setTimeout(tick, interval)
      }
    }
    // 首次启动或暂停后继续，都从当前计数接着排程（等待一个完整节拍间隔）
    this._beatTimer = setTimeout(tick, interval)
  },

  /** 倒计时步骤：按秒递减 */
  startCountdown(resume) {
    this.clearCountTimer()
    // 继续时保留剩余秒数
    const startFrom = resume && this._countRemain > 0 ? this._countRemain : (this.data.step.seconds || 0)
    this._countRemain = startFrom
    this.setData({ countText: String(startFrom) })
    this._timer = setInterval(() => {
      this._countRemain--
      if (this._countRemain <= 0) {
        this.clearCountTimer()
        this.setData({ countText: '0' })
        wx.vibrateShort({ type: 'medium' })
        this.goNext()
      } else {
        this.setData({ countText: String(this._countRemain) })
      }
    }, 1000)
  },

  goNext() {
    const nextIndex = this.data.stepIndex + 1
    if (nextIndex >= this.data.totalSteps) {
      this.finish()
    } else {
      this.renderStep(nextIndex)
      // 若下一步是自动计时步骤且正在运行，直接继续
      if (this.data.phase === 'running') {
        this.runCurrentStep()
      }
    }
  },

  finish() {
    this.clearAllTimers()
    this.setData({ phase: 'done', percent: 100, beatOn: false, cheerText: this._en() ? 'Great job — your technique looked solid!' : '太棒了，动作完成得很标准！' })
    wx.vibrateShort({ type: 'heavy' })
    // 记录"已掌握"（供首页成长足迹展示）
    try {
      const done = wx.getStorageSync('firstaid_done') || {}
      const d = new Date()
      const pad = n => String(n).padStart(2, '0')
      done[this.data.skill.id] = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
      wx.setStorageSync('firstaid_done', done)
    } catch (e) {}
  },

  // ---- 定时器清理 ----
  clearCountTimer() {
    if (this._timer) {
      clearInterval(this._timer)
      this._timer = null
    }
  },
  clearBeatTimer() {
    if (this._beatTimer) {
      clearTimeout(this._beatTimer)
      this._beatTimer = null
    }
    if (this._flashTimer) {
      clearTimeout(this._flashTimer)
      this._flashTimer = null
    }
  },
  clearAllTimers() {
    this.clearCountTimer()
    this.clearBeatTimer()
  }
})
