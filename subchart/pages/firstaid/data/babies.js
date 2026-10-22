// data/babies.js - 多宝宝数据管理（本地存储）
// 存储结构：
//   firstaid_babies: [ { id, name, gender, birthDate, createdAt } ]
//   firstaid_active_baby: 当前选中宝宝 id
// 兼容旧版单宝宝 firstaid_baby：读取时自动迁移
const BABIES_KEY = 'firstaid_babies'
const ACTIVE_KEY = 'firstaid_active_baby'
const LEGACY_KEY = 'firstaid_baby'

/**
 * 读取全部宝宝（含旧数据迁移）
 */
function getBabies() {
  let list = wx.getStorageSync(BABIES_KEY)
  if (!Array.isArray(list)) list = []

  // 旧版单宝宝迁移
  const legacy = wx.getStorageSync(LEGACY_KEY)
  if (legacy && legacy.birthDate) {
    const exists = list.some(b => b.birthDate === legacy.birthDate)
    if (!exists) {
      list.push({
        id: 'baby_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        name: legacy.name || '宝宝',
        gender: legacy.gender || '',
        birthDate: legacy.birthDate,
        createdAt: Date.now(),
      })
    }
    wx.removeStorageSync(LEGACY_KEY)
    wx.setStorageSync(BABIES_KEY, list)
  }
  return list
}

/**
 * 读取当前选中宝宝
 * @returns {object|null}
 */
function getActiveBaby() {
  const list = getBabies()
  if (!list.length) return null
  const activeId = wx.getStorageSync(ACTIVE_KEY)
  const found = list.find(b => b.id === activeId)
  return found || list[0]
}

/**
 * 设置当前宝宝
 * @param {string} id
 */
function setActiveBaby(id) {
  wx.setStorageSync(ACTIVE_KEY, id)
}

/**
 * 新增宝宝
 * @returns {object} 新宝宝
 */
function addBaby(name, gender, birthDate) {
  const list = getBabies()
  const baby = {
    id: 'baby_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    name: name || '宝宝',
    gender,
    birthDate,
    createdAt: Date.now(),
  }
  list.push(baby)
  wx.setStorageSync(BABIES_KEY, list)
  // 新增后设为当前宝宝
  wx.setStorageSync(ACTIVE_KEY, baby.id)
  return baby
}

/**
 * 更新宝宝信息
 * @param {string} id
 * @param {object} patch
 */
function updateBaby(id, patch) {
  const list = getBabies().map(b => (b.id === id ? Object.assign({}, b, patch) : b))
  wx.setStorageSync(BABIES_KEY, list)
}

/**
 * 删除宝宝，若删除的是当前宝宝则切换到第一个
 */
function removeBaby(id) {
  let list = getBabies().filter(b => b.id !== id)
  wx.setStorageSync(BABIES_KEY, list)
  const activeId = wx.getStorageSync(ACTIVE_KEY)
  if (activeId === id) {
    wx.setStorageSync(ACTIVE_KEY, list.length ? list[0].id : '')
  }
}

module.exports = {
  getBabies,
  getActiveBaby,
  setActiveBaby,
  addBaby,
  updateBaby,
  removeBaby,
}
