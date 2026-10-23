// pages/index/index.js
const { SKILLS, MODULES, getModuleSkills, getSkillById } = require('../data/skills')
const { getRecommendations } = require('../data/recommend')
const { getActiveBaby, getBabies } = require('../data/babies')

const USER_KEY = 'firstaid_user'
const CONTACT_KEY = 'firstaid_emergency_contacts'

const app = getApp();

Page({
  goBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) });
  },

  data: {
    lang: 'zh',
    safeTop: (app.globalData && app.globalData.safeTop) || 88,
    greeting: '你好',
    modules: [],         // 四大模块聚合卡片
    tools: [],           // 工具 2×2 网格
    remind: null,        // 今日提醒卡
    loggedIn: false,
    user: null,
    activeBaby: null,
    babyCount: 0,
    recommendation: null,
    noBaby: false,
    doneCount: 0,
    totalSkills: 0,
    contactCount: 0,
    keyword: '',         // 搜索关键词
    searchResults: [],   // 搜索结果
    searching: false,    // 是否处于搜索状态
  },

  _en() { return (wx.getStorageSync('lang') || this.data.lang || 'zh') === 'en'; },
  _t(zh, enTxt) { return this._en() ? enTxt : zh; },

  onLoad() {
    const en = (wx.getStorageSync('lang') || 'zh') === 'en';
    this.setData({ lang: en ? 'en' : 'zh' });
    // 时间问候（对齐母 App"早上好，妈妈"）
    const h = new Date().getHours()
    let greeting = '你好'
    if (h < 5) greeting = '夜深了'
    else if (h < 11) greeting = '早上好'
    else if (h < 14) greeting = '中午好'
    else if (h < 18) greeting = '下午好'
    else greeting = '晚上好'
    greeting = greeting + '，妈妈'

    // 四大模块聚合卡片
    const MODULE_EN = {
      baby_care: { name: 'Baby Care', tagline: 'Daily care' },
      baby_emergency: { name: 'Baby First Aid', tagline: 'Life-saving skills' },
      mama: { name: 'Mom Care', tagline: 'Postpartum care & recovery' },
      general: { name: 'General', tagline: 'Adult & general first aid' }
    };
    const modules = MODULES.map(mod => {
      const enTxt = MODULE_EN[mod.key] || {};
      return {
        key: mod.key,
        name: en ? (enTxt.name || mod.name) : mod.name,
        icon: mod.icon,
        tagline: en ? (enTxt.tagline || mod.tagline) : mod.tagline,
        count: getModuleSkills(mod.key).length,
      };
    })

    // 工具 2×2 网格（聚焦 SOS 指导职责）
    // 工具网格：去掉「家庭急救」「紧急呼救」（家庭急救内容已并入通用急救模块）
    const tools = [
      { key: 'kit', icon: '/subchart/pages/firstaid/icons/backpack.png',
        name: en ? 'First Aid Kit' : '急救包清单', desc: en ? 'Check supplies & essentials' : '物资核对与常备药' },
      { key: 'record', icon: '/subchart/pages/firstaid/icons/video.png',
        name: en ? 'Self-recording' : '自学录制', desc: en ? 'Record standard first aid & care' : '录制规范急救与护理' },
    ]

    this.setData({
      greeting,
      modules,
      tools,
      totalSkills: SKILLS.length,
    })
  },

  onShow() {
    this.refreshUser()
    this.refreshRemind()
    // 同步自定义 tabBar 选中态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 })
    }
  },

  refreshUser() {
    const user = wx.getStorageSync(USER_KEY)
    const loggedIn = !!(user && user.nickname)

    let activeBaby = null
    let recommendation = null
    let noBaby = false
    let babyCount = 0

    if (loggedIn) {
      const babies = getBabies()
      babyCount = babies.length
      activeBaby = getActiveBaby()
      if (activeBaby && activeBaby.birthDate) {
        recommendation = getRecommendations(activeBaby)
      } else {
        noBaby = true
      }
    }

    // 学习足迹
    const done = wx.getStorageSync('firstaid_done') || {}
    const doneCount = Object.keys(done).length
    const contacts = wx.getStorageSync(CONTACT_KEY) || []
    const contactCount = contacts.length

    this.setData({
      loggedIn,
      user: loggedIn ? user : null,
      activeBaby,
      babyCount,
      recommendation,
      noBaby,
      doneCount,
      contactCount,
    })
  },

  // 今日提醒卡：优先取个性化推荐第一项，否则默认家庭急救技能
  refreshRemind() {
    const user = wx.getStorageSync(USER_KEY)
    const loggedIn = !!(user && user.nickname)
    let skill = null

    if (loggedIn) {
      const baby = getActiveBaby()
      if (baby && baby.birthDate) {
        const rec = getRecommendations(baby)
        if (rec && rec.items && rec.items.length) {
          skill = getSkillById(rec.items[0].id)
        }
      }
    }
    if (!skill) skill = getSkillById('adult_heimlich')

    if (!skill) {
      this.setData({ remind: null })
      return
    }
    const remind = {
      tag: '今日推荐',
      title: '跟学 · ' + skill.name,
      sub: skill.description,
      skillId: skill.id,
    }
    this.setData({ remind })
  },

  // 搜索输入
  onSearchInput(e) {
    const keyword = e.detail.value.trim()
    this.setData({ keyword })
    if (!keyword) {
      this.setData({ searching: false, searchResults: [] })
      return
    }
    const lower = keyword.toLowerCase()
    const results = SKILLS.filter(s =>
      s.name.toLowerCase().indexOf(lower) >= 0 ||
      s.category.indexOf(keyword) >= 0 ||
      s.short.indexOf(keyword) >= 0 ||
      s.id.toLowerCase().indexOf(lower) >= 0
    )
    this.setData({ searching: true, searchResults: results })
  },

  onSearchClear() {
    this.setData({ keyword: '', searching: false, searchResults: [] })
  },

  // 提醒卡"查看今日计划"→ 去跟学
  onTapRemind(e) {
    const id = e.currentTarget.dataset.id
    if (id) {
      wx.navigateTo({ url: '/subchart/pages/firstaid/prepare/prepare?skill=' + id })
    }
  },

  // 工具卡入口
  onTapTool(e) {
    const key = e.currentTarget.dataset.key
    if (key === 'kit') wx.navigateTo({ url: '/subchart/pages/firstaid/kit/kit' })
    else if (key === 'family') wx.navigateTo({ url: '/subchart/pages/firstaid/family/family' })
    else if (key === 'contact') wx.navigateTo({ url: '/subchart/pages/firstaid/contact/contact' })
    else if (key === 'record') wx.navigateTo({ url: '/subchart/pages/firstaid/record/record' })
  },

  // 点击模块卡片 → 模块细分页
  onTapModule(e) {
    const key = e.currentTarget.dataset.key
    wx.navigateTo({ url: '/subchart/pages/firstaid/module/module?key=' + key })
  },

  onTapRecommend(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/subchart/pages/firstaid/prepare/prepare?skill=' + id })
  },

  onTapSkill(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/subchart/pages/firstaid/prepare/prepare?skill=' + id })
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
  }
})
