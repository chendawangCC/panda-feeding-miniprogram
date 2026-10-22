/**
 * 家庭急救包清单数据
 * 依据：GB/T 36750-2025《家用防灾应急包》基础型 38 项 + 急诊医生家庭急救箱建议
 * 每个物品：id / name(名称) / note(用途说明) / qty(建议数量或规格) / essential(是否核心必备)
 */

const KIT_CATEGORIES = [
  {
    id: 'disinfect',
    name: '清洁消毒',
    icon: '/subchart/pages/firstaid/icons/eczema.png',
    items: [
      { id: 'iodine', name: '碘伏棉签/碘伏溶液', note: '温和广谱消毒，刺激性低于酒精，擦伤割伤首选', qty: '独立包装若干', essential: true },
      { id: 'saline', name: '生理盐水', note: '冲洗伤口泥沙异物，异物入眼也可用', qty: '小支装若干', essential: true },
      { id: 'alcohol', name: '75%酒精棉片', note: '皮肤及完好部位消毒，勿用于开放性伤口', qty: '一盒', essential: false },
      { id: 'gel', name: '免洗消毒凝胶', note: '接触伤口前清洁双手，减少交叉感染', qty: '1瓶', essential: false },
      { id: 'swab', name: '无菌棉签/棉球', note: '涂药、按压止血的辅助用品', qty: '一包', essential: true }
    ]
  },
  {
    id: 'bandage',
    name: '止血包扎',
    icon: '/subchart/pages/firstaid/icons/bleeding.png',
    items: [
      { id: 'bandaid', name: '创可贴（多种尺寸）', note: '小伤口覆盖，准备大小号各一盒', qty: '大小号各1盒', essential: true },
      { id: 'gauze', name: '无菌纱布片', note: '直接压迫止血、覆盖伤口', qty: '5×5/10×10cm 各若干', essential: true },
      { id: 'elastic', name: '弹力绷带', note: '加压包扎、固定敷料，松紧适中', qty: '2-3卷', essential: true },
      { id: 'triangular', name: '三角巾', note: '固定手臂骨折、做临时吊带', qty: '1-2条', essential: true },
      { id: 'tape', name: '医用胶带', note: '固定纱布绷带', qty: '1卷', essential: true },
      { id: 'tourniquet', name: '止血带', note: '大出血且压迫无效时使用，需记录时间', qty: '1条', essential: true }
    ]
  },
  {
    id: 'tool',
    name: '工具器械',
    icon: '/subchart/pages/firstaid/icons/tool.png',
    items: [
      { id: 'scissors', name: '医用剪刀', note: '剪开纱布、衣物', qty: '1把', essential: true },
      { id: 'forceps', name: '镊子', note: '夹取小异物、棉球', qty: '1把', essential: true },
      { id: 'thermometer', name: '电子体温计', note: '监测体温，有宝宝建议备耳温/额温枪', qty: '1支', essential: true },
      { id: 'gloves', name: '医用橡胶手套', note: '防护，避免接触血液', qty: '2-3双', essential: true },
      { id: 'mask', name: '医用外科口罩', note: '防护及人工呼吸时保护', qty: '数个', essential: true },
      { id: 'cpap_shield', name: '人工呼吸膜', note: '做CPR人工呼吸时的隔离保护', qty: '2片', essential: false },
      { id: 'coldpack', name: '一次性冰袋/冷敷贴', note: '扭伤、崴脚冰敷降温', qty: '2个', essential: false }
    ]
  },
  {
    id: 'medicine',
    name: '常用药品',
    icon: '/subchart/pages/firstaid/icons/pill.png',
    items: [
      { id: 'antipyretic', name: '退烧药（对乙酰氨基酚/布洛芬）', note: '备一种即可，注意家中是否有宝宝需备儿童剂型', qty: '1盒', essential: true },
      { id: 'antidiarrheal', name: '止泻药', note: '如蒙脱石散，预防脱水', qty: '1盒', essential: true },
      { id: 'antiallergy', name: '抗过敏药（氯雷他定等）', note: '过敏应急', qty: '1盒', essential: true },
      { id: 'burncream', name: '烫伤膏', note: '轻度烫伤处理（先用凉水冲再涂）', qty: '1支', essential: true },
      { id: 'rehydration', name: '口服补液盐', note: '腹泻、中暑后补充电解质', qty: '2-3包', essential: false },
      { id: 'chrons', name: '家人慢病常备药', note: '如降压药、降糖药等，按需备足', qty: '按需', essential: false }
    ]
  },
  {
    id: 'survival',
    name: '应急辅助',
    icon: '/subchart/pages/firstaid/icons/flashlight.png',
    items: [
      { id: 'flashlight', name: '多功能手电筒', note: '照明+可充电，备好备用电池', qty: '1个', essential: true },
      { id: 'whistle', name: '高频救生哨', note: '呼救求救，声音穿透力强', qty: '1个', essential: true },
      { id: 'blanket', name: '铝箔急救毯', note: '保温御寒、防失温', qty: '1-2张', essential: true },
      { id: 'card', name: '紧急联系卡', note: '写清家人信息、过敏史、慢病史、血型', qty: '1张', essential: true },
      { id: 'water', name: '应急饮用水', note: '灾害后保障饮水', qty: '3天量/人', essential: true },
      { id: 'food', name: '应急食品', note: '压缩饼干、罐头、能量棒等免煮食品', qty: '3天量/人', essential: true },
      { id: 'manual', name: '急救手册', note: '纸质版，紧急时对照操作', qty: '1本', essential: false }
    ]
  }
]

module.exports = { KIT_CATEGORIES }
