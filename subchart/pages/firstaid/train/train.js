// pages/train/train.js
const { getSkillById, flattenSkill } = require('../data/skills')

const app = getApp();

Page({
  goBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) });
  },

  data: {
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
  onLoad(options) {
    const skill = getSkillById(options.skill)
    if (!skill) {
      wx.showToast({ title: '技能不存在', icon: 'none' })
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
      ? '第' + step.cycleRound + (step.cycleLabel || '轮') + ' / 共' + step.cycleTotal + (step.cycleLabel || '轮')
      : ''

    // 根据技能和步骤索引，匹配对应的步骤图示（跟随文案同步切换）
    const currentSkill = this.data.skill;
    let stepImage = '';
    if (currentSkill) {
      const sid = currentSkill.id;
      // 婴儿气道梗阻（全流程7步全覆盖）
      if (sid === 'infant_choking') {
        if (index === 0) stepImage = '/subchart-assets/firstaid/infant_choking_judge.jpg';
        else if (index === 1) stepImage = '/subchart-assets/firstaid/infant_choking_step1_position.jpg';
        else if (index >= 2 && index <= 6) {
          stepImage = (this._cycleStep % 2 === 0)
            ? '/subchart-assets/firstaid/infant_choking_step2_pat_back.jpg'
            : '/subchart-assets/firstaid/infant_choking_step4_repeat.jpg';
        }
        else if (index === 7) stepImage = '/subchart-assets/firstaid/infant_choking_step5_recover.jpg';
        else if (index >= 8) stepImage = '/subchart-assets/firstaid/infant_cpr_step2_press.jpg';
      }
      // 成人心肺复苏
      else if (sid === 'adult_cpr') {
        if (index === 3) stepImage = '/subchart-assets/firstaid/adult_cpr_press.jpg';
        else if (index === 4) stepImage = '/subchart-assets/firstaid/adult_cpr_breath.jpg';
      }
      // 成人心肺复苏
      else if (sid === 'adult_cpr') {
        if (index === 0) stepImage = '/subchart-assets/firstaid/adult_cpr_safe.jpg';
        else if (index === 1) stepImage = '/subchart-assets/firstaid/adult_cpr_judge.jpg';
        else if (index === 2) stepImage = '/subchart-assets/firstaid/adult_cpr_call.jpg';
        else if (index >= 3 && index <= 12) {
          stepImage = (this._cycleStep % 2 === 0)
            ? '/subchart-assets/firstaid/adult_cpr_press.jpg'
            : '/subchart-assets/firstaid/adult_cpr_breath.jpg';
        }
      }
      // 成人海姆立克
      else if (sid === 'adult_heimlich') {
        if (index === 0) stepImage = '/subchart-assets/firstaid/adult_heimlich_judge.jpg';
        else if (index === 1) stepImage = '/subchart-assets/firstaid/adult_heimlich_stand.jpg';
        else if (index === 2) stepImage = '/subchart-assets/firstaid/adult_heimlich_fist.jpg';
        else if (index >= 3 && index <= 6) stepImage = '/subchart-assets/firstaid/adult_heimlich_impact.jpg';
      }
      // 止血包扎
      else if (sid === 'bleeding') {
        if (index === 0) stepImage = '/subchart-assets/firstaid/bleeding_gloves.jpg';
        else if (index === 1 || index === 2) stepImage = '/subchart-assets/firstaid/bleeding_press.jpg';
        else if (index === 3) stepImage = '/subchart-assets/firstaid/bleeding_elevate.jpg';
        else if (index === 4 || index === 5) stepImage = '/subchart-assets/firstaid/bleeding_bandage.jpg';
      }
      // 烧烫伤
      else if (sid === 'burn') {
        if (index === 0) stepImage = '/subchart-assets/firstaid/burn_flush.jpg';
        else if (index === 1) stepImage = '/subchart-assets/firstaid/burn_remove.jpg';
        else if (index === 2) stepImage = '/subchart-assets/firstaid/burn_soak.jpg';
        else if (index === 3) stepImage = '/subchart-assets/firstaid/burn_cover.jpg';
      }
      // 扭伤
      else if (sid === 'sprain') {
        if (index === 0) stepImage = '/subchart-assets/firstaid/sprain_rest.jpg';
        else if (index === 1) stepImage = '/subchart-assets/firstaid/sprain_ice.jpg';
        else if (index === 2) stepImage = '/subchart-assets/firstaid/sprain_compress.jpg';
        else if (index === 3) stepImage = '/subchart-assets/firstaid/bleeding_elevate.jpg';
      }
      // 癫痫发作
      else if (sid === 'seizure') {
        if (index === 0) stepImage = '/subchart-assets/firstaid/seizure_protect.jpg';
        else if (index === 1) stepImage = '/subchart-assets/firstaid/seizure_time.jpg';
        else if (index === 3) stepImage = '/subchart-assets/firstaid/seizure_side.jpg';
      }
      // 婴儿湿疹护理
      else if (sid === 'baby_eczema') {
        if (index === 2 || index === 3) stepImage = '/subchart-assets/firstaid/baby_eczema_moisturize.jpg';
      }
      // 婴儿拍嗝
      else if (sid === 'baby_burp') {
        if (index === 1 || index === 2) stepImage = '/subchart-assets/firstaid/baby_burp_pat.jpg';
      }
      // 婴儿洗澡
      else if (sid === 'baby_bath') {
        if (index === 2 || index === 3) stepImage = '/subchart-assets/firstaid/baby_bath_wash.jpg';
      }
      // 婴儿换尿布
      else if (sid === 'baby_diaper_change') {
        if (index === 2 || index === 4) stepImage = '/subchart-assets/firstaid/baby_diaper_change.jpg';
      }
      // 婴儿抚触按摩
      else if (sid === 'baby_massage') {
        if (index === 3 || index === 4) stepImage = '/subchart-assets/firstaid/baby_massage_abdomen.jpg';
      }
      // 婴儿心肺复苏
      else if (sid === 'infant_cpr') {
        if (index === 0) stepImage = '/subchart-assets/firstaid/infant_cpr_step0_judge.jpg';
        else if (index === 1) stepImage = '/subchart-assets/firstaid/infant_cpr_step1_call.jpg';
        else if (index >= 2 && index < 12) {
          // 循环5轮：按压/吹气交替显示
          stepImage = (index % 2 === 0)
            ? '/subchart-assets/firstaid/infant_cpr_step2_press.jpg'
            : '/subchart-assets/firstaid/infant_cpr_step3_breath.jpg';
        }
        else if (index >= 12) stepImage = '/subchart-assets/firstaid/infant_cpr_step5_recover.jpg';
      }
      // 成人海姆立克
      else if (sid === 'adult_heimlich') {
        if (index === 0) stepImage = '/subchart-assets/firstaid/adult_heimlich_step0_judge.jpg';
        else if (index === 1) stepImage = '/subchart-assets/firstaid/adult_heimlich_step0_stand.jpg';
        else if (index === 2) stepImage = '/subchart-assets/firstaid/adult_heimlich_step2_fist_position.jpg';
        else if (index === 3) stepImage = '/subchart-assets/firstaid/adult_heimlich_step1_impact.jpg';
        else if (index >= 5) stepImage = '/subchart-assets/firstaid/adult_heimlich_step5_unconscious.jpg';
      }
      // 婴儿心肺复苏
      else if (sid === 'infant_cpr') {
        if (index === 2) stepImage = '/subchart-assets/firstaid/infant_cpr_step0_press.jpg';
        else if (index === 3) stepImage = '/subchart-assets/firstaid/infant_cpr_step1_breath.jpg';
      }
      // 婴儿热性惊厥
      else if (sid === 'infant_fever_seizure') {
        if (index === 0) stepImage = '/subchart-assets/firstaid/infant_fever_seizure_step0_side.jpg';
        else if (index === 1) stepImage = '/subchart-assets/firstaid/infant_fever_seizure_step1_protect.jpg';
      }
      // 婴儿呛奶
      else if (sid === 'infant_milk_choking') {
        if (index === 1) stepImage = '/subchart-assets/firstaid/infant_milk_choking_step0_pat.jpg';
        else if (index === 2) stepImage = '/subchart-assets/firstaid/infant_milk_choking_step1_clean.jpg';
      }
      // 婴儿坠床
      else if (sid === 'infant_fall') {
        if (index === 0) stepImage = '/subchart-assets/firstaid/infant_fall_calm.jpg';
        else if (index === 1 || index === 2) stepImage = '/subchart-assets/firstaid/infant_fall_check.jpg';
        else if (index === 3 || index === 4) stepImage = '/subchart-assets/firstaid/infant_fall_soothe.jpg';
      }
      // 婴儿热性惊厥
      else if (sid === 'infant_fever_seizure') {
        if (index === 0) stepImage = '/subchart-assets/firstaid/infant_seizure_side.jpg';
        else if (index === 1) stepImage = '/subchart-assets/firstaid/infant_seizure_move.jpg';
        else if (index === 2) stepImage = '/subchart-assets/firstaid/seizure_time.jpg';
        else if (index === 4) stepImage = '/subchart-assets/firstaid/infant_seizure_cool.jpg';
      }
      // 婴儿呛奶
      else if (sid === 'infant_milk_choking') {
        if (index === 0) stepImage = '/subchart-assets/firstaid/infant_milk_side.jpg';
        else if (index === 1) stepImage = '/subchart-assets/firstaid/infant_milk_pat.jpg';
        else if (index === 2 || index === 3) stepImage = '/subchart-assets/firstaid/infant_milk_clean.jpg';
      }
      // 婴儿溺水
      else if (sid === 'infant_drowning') {
        if (index === 0 || index === 1) stepImage = '/subchart-assets/firstaid/infant_drowning_clean.jpg';
        else if (index === 2) stepImage = '/subchart-assets/firstaid/infant_drowning_check.jpg';
        else if (index === 4) stepImage = '/subchart-assets/firstaid/infant_drowning_hospital.jpg';
      }
      // 婴儿误吞异物
      else if (sid === 'infant_swallow') {
        if (index === 0) stepImage = '/subchart-assets/firstaid/infant_swallow_judge.jpg';
        else if (index === 2) stepImage = '/subchart-assets/firstaid/infant_swallow_digest.jpg';
        else if (index === 3 || index === 4) stepImage = '/subchart-assets/firstaid/infant_swallow_observe.jpg';
      }
      // 外伤止血
      else if (sid === 'bleeding') {
        if (index === 1) stepImage = '/subchart-assets/firstaid/bleeding_step0_press.jpg';
        else if (index === 4) stepImage = '/subchart-assets/firstaid/bleeding_step1_bandage.jpg';
      }
      // 烧烫伤
      else if (sid === 'burn') {
        if (index === 0) stepImage = '/subchart-assets/firstaid/burn_step0_rinse.jpg';
      }
      // 扭伤
      else if (sid === 'sprain') {
        if (index === 1) stepImage = '/subchart-assets/firstaid/sprain_step1_bandage.jpg';
      }
      // 产后凯格尔训练
      else if (sid === 'postpartum_kegel') {
        stepImage = '/subchart-assets/firstaid/postpartum_kegel.jpg';
      }
      // 产后提臀训练
      else if (sid === 'postpartum_glute') {
        stepImage = '/subchart-assets/firstaid/postpartum_glute.jpg';
      }
      // 产后收腹训练
      else if (sid === 'postpartum_abs') {
        stepImage = '/subchart-assets/firstaid/postpartum_abs.jpg';
      }
      // 剖腹产伤口护理
      else if (sid === 'postpartum_csection') {
        stepImage = '/subchart-assets/firstaid/postpartum_csection.jpg';
      }
      // 产后情绪关注
      else if (sid === 'postpartum_mood') {
        stepImage = '/subchart-assets/firstaid/postpartum_mood.jpg';
      }
      // 婴儿防蚊虫
      else if (sid === 'baby_mosquito') {
        stepImage = '/subchart-assets/firstaid/baby_mosquito_repel.jpg';
      }
      // 婴儿红屁屁
      else if (sid === 'baby_rashes') {
        stepImage = '/subchart-assets/firstaid/baby_rashes_cream.jpg';
      }
      // 婴儿发烧降温
      else if (sid === 'baby_fever') {
        stepImage = '/subchart-assets/firstaid/baby_fever_cool.jpg';
      }
      // 新生儿抱姿
      else if (sid === 'baby_hold') {
        stepImage = '/subchart-assets/firstaid/baby_hold_cradle.jpg';
      }
      // 新生儿脐带护理
      else if (sid === 'baby_cord') {
        stepImage = '/subchart-assets/firstaid/baby_cord_clean.jpg';
      }
    }

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
    this.setData({ phase: 'done', percent: 100, beatOn: false, cheerText: '太棒了，动作完成得很标准！' })
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
