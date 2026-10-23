// pages/module/module.js - 模块细分页（显示某模块下的技能）
const { SKILLS, MODULES, getModuleSkillsLocalized, getUserSkills, localizeSkills, getModules, categoryLabel } = require('../data/skills')

const app = getApp();

Page({
  goBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) });
  },

  data: {
    lang: 'zh',
    safeTop: (app.globalData && app.globalData.safeTop) || 88,
    module: null,
    groups: [],       // 按原分类分组的技能
    total: 0,
    fromSearch: false,
  },

  _en() { return (wx.getStorageSync('lang') || this.data.lang || 'zh') === 'en'; },

  onLoad(options) {
    const en = (wx.getStorageSync('lang') || 'zh') === 'en'
    const lang = en ? 'en' : 'zh'
    this.setData({ lang })
    const key = options.key || ''
    const mod = getModules(lang).find(m => m.key === key)
    if (!mod) {
      wx.showToast({ title: '模块不存在', icon: 'none' })
      return
    }
    // 按原分类分组（含用户自学录制视频，自动加入所选类型）
    const usrSkills = getUserSkills()
    const groups = mod.categories
      .map(name => ({
        name: categoryLabel(name, lang),
        items: localizeSkills(SKILLS.filter(s => s.category === name), lang)
          .concat(usrSkills.filter(u => u.category === name))
      }))
      .filter(g => g.items.length > 0)
    const total = getModuleSkillsLocalized(key, lang).length
    this.setData({ module: mod, groups, total })
    wx.setNavigationBarTitle({ title: mod.name })
  },

  onTapSkill(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/subchart/pages/firstaid/prepare/prepare?skill=' + id })
  },
})
