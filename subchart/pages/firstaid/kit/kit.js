// pages/kit/kit.js - 家庭储备清单（tab页：急救包 + 常备药）
const { KIT_CATEGORIES } = require('../data/kit')
const { KIT_CATEGORIES_EN } = require('../data/kit-en')
const { MED_CATEGORIES } = require('../data/medicine')
const { MED_CATEGORIES_EN } = require('../data/medicine-en')

/** 按语言合并中英数据层（数据层仍保留中文，只换显示字段） */
function localizeCats(zhList, enList, en) {
  if (!en) return zhList
  return zhList.map((cat, i) => {
    const ec = (enList || [])[i] || {}
    const eItems = ec.items || []
    return Object.assign({}, cat, {
      name: ec.name || cat.name,
      items: cat.items.map((item, j) => {
        const ei = eItems[j] || {}
        return Object.assign({}, item, {
          name: ei.name || item.name,
          note: ei.note || item.note,
          qty: ei.qty || item.qty,
          type: ei.type || item.type
        })
      })
    })
  })
}

const STORAGE_KEY = 'firstaid_kit_checked'
const MED_KEY = 'firstaid_med_checked'

const app = getApp();

Page({
  goBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) });
  },

  data: {
    safeTop: (app.globalData && app.globalData.safeTop) || 88,
    tab: 'kit',            // 'kit' 急救包 | 'med' 常备药
    // 急救包
    categories: [],
    totalItems: 0,
    checkedItems: 0,
    essentialTotal: 0,
    essentialChecked: 0,
    progress: 0,
    // 常备药
    medCategories: [],
    medTotal: 0,
    medChecked: 0,
    medEssentialTotal: 0,
    medEssentialChecked: 0,
    medProgress: 0,
    expanded: {},
    medExpanded: {},
    lang: 'zh',
    titleMap: { kit: '急救包清单', med: '家庭常备药清单' }
  },

  _en() { return (wx.getStorageSync('lang') || this.data.lang || 'zh') === 'en'; },
  _t(zh, en) { return this._en() ? en : zh; },

  onLoad() {
    const en = (wx.getStorageSync('lang') || 'zh') === 'en'
    this.setData({
      lang: en ? 'en' : 'zh',
      titleMap: en
        ? { kit: 'First-aid kit list', med: 'Home medicine list' }
        : { kit: '急救包清单', med: '家庭常备药清单' }
    })
    this.buildKit()
    this.buildMed()
    wx.setNavigationBarTitle({ title: this.data.titleMap[this.data.tab] })
  },

  // 切换子 tab
  onSwitchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ tab })
    wx.setNavigationBarTitle({ title: this.data.titleMap[tab] })
  },

  /** 组装急救包数据 */
  buildKit() {
    const checked = wx.getStorageSync(STORAGE_KEY) || {}
    let totalItems = 0, checkedItems = 0, essentialTotal = 0, essentialChecked = 0
    const cats = localizeCats(KIT_CATEGORIES, KIT_CATEGORIES_EN, this._en())
    const categories = cats.map(cat => {
      const items = cat.items.map(item => {
        const isChecked = !!checked[item.id]
        totalItems++
        if (isChecked) checkedItems++
        if (item.essential) {
          essentialTotal++
          if (isChecked) essentialChecked++
        }
        return { ...item, checked: isChecked }
      })
      return { ...cat, items, checkedInCat: items.filter(i => i.checked).length }
    })
    const expanded = {}
    // 默认所有分类收起
    this.setData({
      categories,
      totalItems, checkedItems, essentialTotal, essentialChecked,
      progress: totalItems ? Math.round((checkedItems / totalItems) * 100) : 0,
      expanded
    })
  },

  /** 组装常备药数据 */
  buildMed() {
    const checked = wx.getStorageSync(MED_KEY) || {}
    let medTotal = 0, medChecked = 0, medEssentialTotal = 0, medEssentialChecked = 0
    const medCats = localizeCats(MED_CATEGORIES, MED_CATEGORIES_EN, this._en())
    const medCategories = medCats.map(cat => {
      const items = cat.items.map(item => {
        const isChecked = !!checked[item.id]
        medTotal++
        if (isChecked) medChecked++
        if (item.essential) {
          medEssentialTotal++
          if (isChecked) medEssentialChecked++
        }
        return { ...item, checked: isChecked }
      })
      return { ...cat, items, checkedInCat: items.filter(i => i.checked).length }
    })
    const medExpanded = {}
    // 默认所有分类收起
    this.setData({
      medCategories,
      medTotal, medChecked, medEssentialTotal, medEssentialChecked,
      medProgress: medTotal ? Math.round((medChecked / medTotal) * 100) : 0,
      medExpanded
    })
  },

  /** 勾选/取消一个物品（急救包） */
  onToggleItem(e) {
    const { id } = e.currentTarget.dataset
    let categories = this.data.categories
    let checkedItems = this.data.checkedItems
    let essentialChecked = this.data.essentialChecked

    categories = categories.map(cat => {
      const items = cat.items.map(item => {
        if (item.id === id) {
          if (!item.checked) {
            checkedItems++
            if (item.essential) essentialChecked++
          } else {
            checkedItems--
            if (item.essential) essentialChecked--
          }
          return { ...item, checked: !item.checked }
        }
        return item
      })
      return { ...cat, items, checkedInCat: items.filter(i => i.checked).length }
    })

    const checked = {}
    categories.forEach(cat => cat.items.forEach(item => { if (item.checked) checked[item.id] = true }))
    wx.setStorageSync(STORAGE_KEY, checked)

    this.setData({
      categories, checkedItems, essentialChecked,
      progress: this.data.totalItems ? Math.round((checkedItems / this.data.totalItems) * 100) : 0
    })
  },

  /** 勾选/取消一个药品（常备药） */
  onToggleMed(e) {
    const { id } = e.currentTarget.dataset
    let medCategories = this.data.medCategories
    let medChecked = this.data.medChecked
    let medEssentialChecked = this.data.medEssentialChecked

    medCategories = medCategories.map(cat => {
      const items = cat.items.map(item => {
        if (item.id === id) {
          if (!item.checked) {
            medChecked++
            if (item.essential) medEssentialChecked++
          } else {
            medChecked--
            if (item.essential) medEssentialChecked--
          }
          return { ...item, checked: !item.checked }
        }
        return item
      })
      return { ...cat, items, checkedInCat: items.filter(i => i.checked).length }
    })

    const checked = {}
    medCategories.forEach(cat => cat.items.forEach(item => { if (item.checked) checked[item.id] = true }))
    wx.setStorageSync(MED_KEY, checked)

    this.setData({
      medCategories, medChecked, medEssentialChecked,
      medProgress: this.data.medTotal ? Math.round((medChecked / this.data.medTotal) * 100) : 0
    })
  },

  /** 展开/折叠分类（急救包） */
  onToggleCategory(e) {
    const { id } = e.currentTarget.dataset
    this.setData({ [`expanded.${id}`]: !this.data.expanded[id] })
  },

  /** 展开/折叠分类（常备药） */
  onToggleMedCategory(e) {
    const { id } = e.currentTarget.dataset
    this.setData({ [`medExpanded.${id}`]: !this.data.medExpanded[id] })
  },

  /** 重置（急救包） */
  onReset() {
    wx.showModal({
      title: this._t('重置清单', 'Reset list'),
      content: this._t('确定将急救包清单全部重置为"未备齐"吗？', 'Reset every first-aid kit item back to unchecked?'),
      confirmText: this._t('重置', 'Reset'),
      confirmColor: '#29281F',
      success: (res) => {
        if (!res.confirm) return
        wx.removeStorageSync(STORAGE_KEY)
        this.buildKit()
        wx.showToast({ title: this._t('已重置', 'Reset done'), icon: 'success' })
      }
    })
  },

  /** 重置（常备药） */
  onResetMed() {
    wx.showModal({
      title: this._t('重置清单', 'Reset list'),
      content: this._t('确定将常备药清单全部重置为"未备齐"吗？', 'Reset every medicine item back to unchecked?'),
      confirmText: this._t('重置', 'Reset'),
      confirmColor: '#29281F',
      success: (res) => {
        if (!res.confirm) return
        wx.removeStorageSync(MED_KEY)
        this.buildMed()
        wx.showToast({ title: this._t('已重置', 'Reset done'), icon: 'success' })
      }
    })
  },

  /** 全部勾选（急救包） */
  onCheckAll() {
    wx.showModal({
      title: this._t('全部勾选', 'Check all'),
      content: this._t('将清单所有物品标记为"已备齐"？', 'Mark every first-aid kit item as ready?'),
      confirmText: this._t('勾选', 'Check'),
      confirmColor: '#29281F',
      success: (res) => {
        if (!res.confirm) return
        const checked = {}
        KIT_CATEGORIES.forEach(cat => cat.items.forEach(item => { checked[item.id] = true }))
        wx.setStorageSync(STORAGE_KEY, checked)
        this.buildKit()
        wx.showToast({ title: this._t('已全部勾选', 'All checked'), icon: 'success' })
      }
    })
  },

  /** 全部勾选（常备药） */
  onCheckAllMed() {
    wx.showModal({
      title: this._t('全部勾选', 'Check all'),
      content: this._t('将清单所有药品标记为"已备齐"？', 'Mark every medicine as ready?'),
      confirmText: this._t('勾选', 'Check'),
      confirmColor: '#29281F',
      success: (res) => {
        if (!res.confirm) return
        const checked = {}
        MED_CATEGORIES.forEach(cat => cat.items.forEach(item => { checked[item.id] = true }))
        wx.setStorageSync(MED_KEY, checked)
        this.buildMed()
        wx.showToast({ title: this._t('已全部勾选', 'All checked'), icon: 'success' })
      }
    })
  },

  /** 生成购物清单文本（急救包） */
  buildShoppingText(onlyUnchecked) {
    const en = this._en()
    const lines = [en ? 'Family first-aid kit · Shopping list' : '家庭急救包 · 购物清单', '——————————————']
    let count = 0
    this.data.categories.forEach(cat => {
      const catItems = cat.items.filter(i => (onlyUnchecked ? !i.checked : true))
      if (!catItems.length) return
      lines.push('')
      lines.push(en ? ('[' + cat.name + ']') : ('【' + cat.name + '】'))
      catItems.forEach(item => {
        lines.push('□ ' + item.name + (item.essential ? (en ? ' (essential)' : '（必备）') : ''))
        count++
      })
    })
    lines.push('')
    lines.push(en ? (count + ' items in total. Happy shopping!') : ('共 ' + count + ' 项，祝采购顺利！'))
    return lines.join('\n')
  },

  /** 生成常备药购物清单文本 */
  buildMedShoppingText(onlyUnchecked) {
    const en = this._en()
    const lines = [en ? 'Family medicine kit · Shopping list' : '家庭常备药 · 购物清单', '——————————————']
    let count = 0
    this.data.medCategories.forEach(cat => {
      const catItems = cat.items.filter(i => (onlyUnchecked ? !i.checked : true))
      if (!catItems.length) return
      lines.push('')
      lines.push(en ? ('[' + cat.name + ']') : ('【' + cat.name + '】'))
      catItems.forEach(item => {
        lines.push('□ ' + item.name + (item.essential ? (en ? ' (essential)' : '（必备）') : ''))
        count++
      })
    })
    lines.push('')
    lines.push(en
      ? (count + ' items in total. Buy from a licensed pharmacy and follow the label or your doctor.')
      : ('共 ' + count + ' 项。请到正规药店购买，遵医嘱或说明书使用。'))
    return lines.join('\n')
  },

  /** 生成打印核对单（急救包） */
  buildPrintText() {
    const en = this._en()
    const date = new Date()
    const dateStr = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0')
    const lines = en
      ? ['Family first-aid kit · Checklist', 'Date: ' + dateStr, '(☑ = ready   ☐ = to restock)', '——————————————']
      : ['家庭急救包 · 核对单', '日期：' + dateStr, '（☑ = 已备齐   ☐ = 待补充）', '——————————————']
    this.data.categories.forEach(cat => {
      lines.push('')
      lines.push(en ? ('[' + cat.name + ']') : ('【' + cat.name + '】'))
      cat.items.forEach(item => {
        lines.push((item.checked ? '☑' : '☐') + ' ' + item.name + (item.essential ? (en ? ' (essential)' : '（必备）') : '') + (item.qty ? ' | ' + item.qty : ''))
      })
    })
    lines.push('')
    lines.push((en ? 'Progress: ' : '核对进度：') + this.data.checkedItems + '/' + this.data.totalItems)
    return lines.join('\n')
  },

  /** 生成常备药打印核对单 */
  buildMedPrintText() {
    const en = this._en()
    const date = new Date()
    const dateStr = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0')
    const lines = en
      ? ['Family medicine kit · Checklist', 'Date: ' + dateStr, '(☑ = ready   ☐ = to restock)', '——————————————']
      : ['家庭常备药 · 核对单', '日期：' + dateStr, '（☑ = 已备齐   ☐ = 待补充）', '——————————————']
    this.data.medCategories.forEach(cat => {
      lines.push('')
      lines.push(en ? ('[' + cat.name + ']') : ('【' + cat.name + '】'))
      cat.items.forEach(item => {
        lines.push((item.checked ? '☑' : '☐') + ' ' + item.name + (item.essential ? (en ? ' (essential)' : '（必备）') : '') + (item.type ? ' | ' + item.type : ''))
      })
    })
    lines.push('')
    lines.push((en ? 'Progress: ' : '核对进度：') + this.data.medChecked + '/' + this.data.medTotal)
    return lines.join('\n')
  },

  /** 复制文本到剪贴板 */
  copyText(text, tip) {
    wx.setClipboardData({
      data: text,
      success: () => wx.showToast({ title: tip || (this._en() ? 'Copied' : '已复制'), icon: 'success' })
    })
  },

  /** 弹出操作面板 */
  onShowActions() {
    const isKit = this.data.tab === 'kit'
    const en = this._en()
    const actions = en
      ? ['Copy shopping list by category (unchecked only)', 'Copy shopping list by category (all items)', 'Copy a printable checklist']
      : ['按分类分享购物清单（仅未备齐）', '按分类分享购物清单（全部）', '生成打印核对单']
    wx.showActionSheet({
      itemList: actions,
      success: (res) => {
        if (res.tapIndex === 0) {
          this.copyText(isKit ? this.buildShoppingText(true) : this.buildMedShoppingText(true), en ? 'Shopping list copied' : '购物清单已复制')
        } else if (res.tapIndex === 1) {
          this.copyText(isKit ? this.buildShoppingText(false) : this.buildMedShoppingText(false), en ? 'Shopping list copied' : '购物清单已复制')
        } else if (res.tapIndex === 2) {
          this.copyText(isKit ? this.buildPrintText() : this.buildMedPrintText(), en ? 'Checklist copied' : '核对单已复制')
        }
      }
    })
  },

  /** 页面转发分享 */
  onShareAppMessage() {
    return {
        imageUrl: '/images/share-cover.png',
      title: this._en() ? 'My family emergency supplies' : '我的家庭储备清单',
      path: '/subchart/pages/firstaid/kit/kit'
    }
  }
})
