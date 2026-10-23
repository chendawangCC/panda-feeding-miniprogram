// data/recommend.js - 根据宝宝月龄/性别生成首页技能推荐
const { SKILLS, getSkillById, getSkillByIdLocalized, categoryLabel } = require('./skills')

// 月龄分档推荐规则
const AGE_BANDS = [
  {
    key: 'newborn',
    label: '0-2 个月 · 新生儿期',
    labelEn: '0–2 months · Newborn',
    months: [0, 3],
    note: '小宝宝呛奶、吐奶风险高，先练会这几项最要紧',
    noteEn: 'Milk choking and spit-up are the biggest risks now — these are the skills to learn first',
    skills: ['infant_milk_choking', 'baby_burp', 'baby_hold', 'baby_cord', 'baby_bath', 'baby_diaper_change'],
  },
  {
    key: 'early_infant',
    label: '3-5 个月 · 翻身期',
    labelEn: '3–5 months · Rolling over',
    months: [3, 6],
    note: '宝宝开始翻身、口水多，湿疹和红屁屁高发，防坠床要跟上',
    noteEn: 'Rolling, dribbling, eczema and nappy rash — and it is time to prevent falls from the bed',
    skills: ['baby_diaper_change', 'baby_hold', 'baby_eczema', 'baby_mosquito', 'infant_fall', 'baby_bath'],
  },
  {
    key: 'mid_infant',
    label: '6-8 个月 · 会坐会爬',
    labelEn: '6–8 months · Sitting and crawling',
    months: [6, 9],
    note: '宝宝会坐会爬，误吞小物件和坠床风险上升，口腔探索期要看好',
    noteEn: 'Sitting and crawling bring swallowing small objects and falls — watch the mouthing stage closely',
    skills: ['infant_swallow', 'infant_fall', 'baby_fever', 'baby_mosquito', 'baby_massage', 'baby_diaper_change'],
  },
  {
    key: 'late_infant',
    label: '9-12 个月 · 学步期',
    labelEn: '9–12 months · Learning to walk',
    months: [9, 13],
    note: '宝宝扶着走、到处摸，误吞、跌落、烫伤风险都在增加',
    noteEn: 'Cruising and touching everything — swallowed objects, falls and burns all become more likely',
    skills: ['infant_swallow', 'infant_fall', 'infant_drowning', 'burn', 'baby_fever', 'baby_massage'],
  },
  {
    key: 'toddler',
    label: '1-3 岁 · 幼儿期',
    labelEn: '1–3 years · Toddler',
    months: [13, 37],
    note: '活动范围大、好奇心强，误吞和溺水是最大风险，家长要会急救',
    noteEn: 'More mobility and curiosity — swallowed objects and drowning are the biggest risks, so parents need first aid skills',
    skills: ['infant_swallow', 'infant_drowning', 'infant_choking', 'burn', 'bleeding', 'adult_heimlich'],
  },
]

/**
 * 计算出生至今的月龄
 * @param {string} birthDate 'YYYY-MM-DD'
 * @returns {number}
 */
function calcMonths(birthDate) {
  if (!birthDate) return null
  const b = new Date(birthDate.replace(/-/g, '/'))
  if (isNaN(b.getTime())) return null
  const now = new Date()
  let months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth())
  // 若当天还没到出生日，再减一个月
  if (now.getDate() < b.getDate()) months -= 1
  return months
}

/**
 * 生成宝宝月龄展示文本（自动实时更新），如 "7个月" / "1岁2个月" / "23天"
 * @param {string} birthDate 'YYYY-MM-DD'
 * @returns {string}
 */
function getAgeText(birthDate, lang) {
  const en = lang === 'en'
  if (!birthDate) return ''
  const b = new Date(birthDate.replace(/-/g, '/'))
  if (isNaN(b.getTime())) return ''
  const now = new Date()

  // 总天数（含当天）
  const diffMs = now.getTime() - b.getTime()
  const totalDays = Math.floor(diffMs / 86400000)
  if (totalDays < 0) return ''

  // 月龄：整月数
  let months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth())
  if (now.getDate() < b.getDate()) months -= 1
  if (months < 0) months = 0

  // 剩余天数
  const anchor = new Date(b.getFullYear(), b.getMonth() + months, b.getDate())
  const remainDays = Math.floor((now.getTime() - anchor.getTime()) / 86400000)

  if (months <= 0) {
    return en ? totalDays + ' days' : totalDays + ' 天'
  }
  if (months < 12) {
    if (en) return months + ' months' + (remainDays > 0 ? ' ' + remainDays + ' days' : '')
    return months + ' 个月' + (remainDays > 0 ? ' ' + remainDays + ' 天' : '')
  }
  const years = Math.floor(months / 12)
  const restMonths = months % 12
  if (restMonths === 0) return en ? years + ' years' : years + ' 岁'
  return en ? years + ' years ' + restMonths + ' months' : years + ' 岁 ' + restMonths + ' 个月'
}

/**
 * 根据月龄找到对应分档
 * @param {number} months
 */
function getBandByMonths(months) {
  if (months == null) return null
  return AGE_BANDS.find(band => months >= band.months[0] && months < band.months[1]) || null
}

/**
 * 性别称谓
 * @param {string} gender 'boy' | 'girl' | ''
 */
function genderTitle(gender, lang) {
  const en = lang === 'en'
  if (gender === 'girl') return en ? 'little princess' : '小公主'
  if (gender === 'boy') return en ? 'little prince' : '小王子'
  return en ? 'baby' : '宝宝'
}

/**
 * 生成首页推荐数据
 * @param {object} baby { gender, birthDate, name }
 * @returns {object|null} { band, title, note, items: [{id,name,icon,desc,reason}], hasBaby }
 */
function getRecommendations(baby, lang) {
  const en = lang === 'en'
  if (!baby || !baby.birthDate) {
    return null
  }
  const months = calcMonths(baby.birthDate)
  const band = getBandByMonths(months)
  if (!band) return null

  const items = band.skills
    .map(id => getSkillByIdLocalized(id, lang))
    .filter(Boolean)
    .map(s => ({ id: s.id, name: s.name, icon: s.icon, desc: s.description }))

  return {
    band: en
      ? Object.assign({}, band, { label: band.labelEn || band.label, note: band.noteEn || band.note })
      : band,
    months,
    ageText: getAgeText(baby.birthDate, lang),
    genderTitle: genderTitle(baby.gender, lang),
    babyName: baby.name || (en ? 'baby' : '宝宝'),
    items,
    hasBaby: true,
  }
}

module.exports = { AGE_BANDS, calcMonths, getBandByMonths, genderTitle, getAgeText, getRecommendations }
