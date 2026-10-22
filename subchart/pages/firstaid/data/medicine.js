/**
 * 家庭常备药清单数据
 * 依据：国家卫健委/药监局家庭常备药指引 + 儿科/全科医生建议
 * 每个药品：id / name(通用名或商品名) / note(用途与用法提示) / qty(建议规格) / essential(是否核心必备) / type(剂型提示)
 * 注意：常备药清单仅用于家庭日常储备核对，不构成用药建议；用药请遵医嘱或阅读说明书
 */

const MED_CATEGORIES = [
  {
    id: 'fever',
    name: '退烧镇痛',
    icon: '/subchart/pages/firstaid/icons/fever.png',
    items: [
      { id: 'acetaminophen', name: '对乙酰氨基酚', note: '成人退烧止痛；家中如有6月龄+宝宝可备儿童滴剂/混悬液', qty: '片剂1盒 + 儿童剂型按需', essential: true, type: '成人/儿童均可' },
      { id: 'ibuprofen', name: '布洛芬', note: '退烧镇痛抗炎，6月龄以上可用儿童剂型；与对乙酰氨基酚间隔使用', qty: '缓释胶囊1盒 + 儿童混悬液按需', essential: true, type: '成人/儿童均可' },
      { id: 'coolpatch', name: '退热贴', note: '物理降温辅助，宝宝发热安抚，不能替代退烧药', qty: '数片', essential: false, type: '儿童' }
    ]
  },
  {
    id: 'cold',
    name: '感冒咳嗽',
    icon: '/subchart/pages/firstaid/icons/sneeze.png',
    items: [
      { id: 'cold_granule', name: '感冒清热颗粒/复方感冒药', note: '风寒/风热辨证选用，复方药勿与退烧药叠加成分', qty: '1盒', essential: true, type: '成人' },
      { id: 'cough_syrup', name: '止咳化痰药（氨溴索等）', note: '化痰为主，干咳/湿咳用药不同', qty: '1瓶', essential: true, type: '成人' },
      { id: 'lozenge', name: '润喉含片', note: '缓解咽喉干痛', qty: '1盒', essential: false, type: '成人' },
      { id: 'saline_spray', name: '生理性海水鼻喷', note: '宝宝鼻塞、清理鼻腔安全温和', qty: '1瓶', essential: false, type: '儿童' }
    ]
  },
  {
    id: 'stomach',
    name: '肠胃消化',
    icon: '/subchart/pages/firstaid/icons/meal.png',
    items: [
      { id: 'smectite', name: '蒙脱石散', note: '急慢性腹泻物理止泻，空腹服用效果好', qty: '1盒', essential: true, type: '成人/儿童' },
      { id: 'rehydration_salt', name: '口服补液盐III', note: '腹泻/呕吐/发热脱水时补水补盐，宝宝必备', qty: '数包', essential: true, type: '成人/儿童' },
      { id: 'probiotic', name: '益生菌（双歧杆菌等）', note: '调理肠道菌群，腹泻后/抗生素后使用', qty: '1盒', essential: false, type: '成人/儿童' },
      { id: 'domperidone', name: '多潘立酮（促胃动力）', note: '腹胀、恶心、消化不良（12岁以上）', qty: '1盒', essential: false, type: '成人' },
      { id: 'antacid', name: '铝碳酸镁/抑酸药', note: '胃痛、反酸、烧心', qty: '1盒', essential: false, type: '成人' }
    ]
  },
  {
    id: 'external',
    name: '外用护理',
    icon: '/subchart/pages/firstaid/icons/bleeding.png',
    items: [
      { id: 'iodophor', name: '碘伏棉签', note: '伤口消毒，刺激性小，宝宝可用', qty: '独立装若干', essential: true, type: '通用' },
      { id: 'mupirocin', name: '莫匹罗星软膏（百多邦）', note: '皮肤感染、小伤口消炎（外用药）', qty: '1支', essential: true, type: '通用' },
      { id: 'burn_cream', name: '烧烫伤膏/湿润烫伤膏', note: '轻度烫伤：先冷水冲15分钟再涂抹', qty: '1支', essential: true, type: '通用' },
      { id: 'calamine', name: '炉甘石洗剂', note: '蚊虫叮咬止痒、痱子（宝宝适用）', qty: '1瓶', essential: true, type: '通用' },
      { id: 'eye_drops', name: '人工泪液/玻璃酸钠滴眼液', note: '眼干、异物感冲洗缓解', qty: '1支', essential: false, type: '成人' },
      { id: 'zinc_oxide', name: '氧化锌软膏', note: '宝宝红屁屁隔离防护', qty: '1支', essential: false, type: '儿童' }
    ]
  },
  {
    id: 'allergy',
    name: '抗过敏',
    icon: '/subchart/pages/firstaid/icons/flower.png',
    items: [
      { id: 'loratadine', name: '氯雷他定', note: '荨麻疹、过敏性鼻炎等抗过敏（2岁以上）', qty: '1盒', essential: true, type: '成人/儿童' },
      { id: 'cetirizine', name: '西替利嗪', note: '抗过敏替代选择，嗜睡较氯雷他定明显', qty: '1盒', essential: false, type: '成人/儿童' },
      { id: 'epi_note', name: '过敏急救预案（无药）', note: '若家人有严重过敏史，提前与医生确认是否需要常备肾上腺素笔及使用培训', qty: '—', essential: false, type: '备忘' }
    ]
  },
  {
    id: 'chronic',
    name: '慢病常备',
    icon: '/subchart/pages/firstaid/icons/love.png',
    items: [
      { id: 'chronic_drugs', name: '家人慢病药品', note: '高血压/糖尿病/心脏病等长期用药，备足1-2周量并定期检查效期', qty: '按医嘱', essential: true, type: '按需' },
      { id: 'vitd', name: '维生素D', note: '宝宝出生后即可补充，0-1岁每天400IU', qty: '1瓶', essential: true, type: '儿童' },
      { id: 'calcium', name: '钙剂（按需）', note: '哺乳期妈妈或遵医嘱补充', qty: '按需', essential: false, type: '成人' }
    ]
  }
]

module.exports = { MED_CATEGORIES }
