/**
 * 家庭急救包清单 · 英文层（按 index 与 kit.js 的 KIT_CATEGORIES 对齐）
 * 数据层仍保留中文，展示时按 lang 取对应层
 */

const KIT_CATEGORIES_EN = [
  {
    name: 'Cleaning & disinfection',
    items: [
      { name: 'Povidone-iodine swabs / solution', note: 'Gentle broad-spectrum disinfection, less irritating than alcohol; first choice for scrapes and cuts', qty: 'Several, individually packed' },
      { name: 'Sterile saline', note: 'Rinse dirt and debris out of wounds; also safe for something in the eye', qty: 'A few small vials' },
      { name: '75% alcohol wipes', note: 'Disinfect skin and intact areas; do not use on open wounds', qty: 'One box' },
      { name: 'No-rinse hand gel', note: 'Clean hands before touching a wound to reduce cross-infection', qty: '1 bottle' },
      { name: 'Sterile cotton swabs / balls', note: 'For applying medicine and for pressure to stop bleeding', qty: 'One pack' }
    ]
  },
  {
    name: 'Bleeding control & bandaging',
    items: [
      { name: 'Adhesive bandages (multiple sizes)', note: 'Cover small wounds; keep one box of each size', qty: '1 box of each size' },
      { name: 'Sterile gauze pads', note: 'Direct pressure to stop bleeding and to cover wounds', qty: '5×5 / 10×10 cm, several each' },
      { name: 'Elastic bandage', note: 'Pressure dressing and fixing gauze; snug but not tight', qty: '2–3 rolls' },
      { name: 'Triangular bandage', note: 'Immobilise an arm fracture or make a sling', qty: '1–2' },
      { name: 'Medical tape', note: 'Secure gauze and bandages', qty: '1 roll' },
      { name: 'Tourniquet', note: 'For severe bleeding when pressure fails; record the time applied', qty: '1' }
    ]
  },
  {
    name: 'Tools & instruments',
    items: [
      { name: 'Medical scissors', note: 'Cut gauze and clothing', qty: '1' },
      { name: 'Tweezers', note: 'Pick out small foreign objects and cotton balls', qty: '1' },
      { name: 'Digital thermometer', note: 'Monitor temperature; an ear or forehead thermometer is better with a baby', qty: '1' },
      { name: 'Medical gloves', note: 'Protection from contact with blood', qty: '2–3 pairs' },
      { name: 'Surgical masks', note: 'Protection and a barrier for rescue breaths', qty: 'Several' },
      { name: 'CPR face shield', note: 'Barrier protection when giving rescue breaths', qty: '2' },
      { name: 'Instant ice pack / cold patch', note: 'Cold compress for sprains and swelling', qty: '2' }
    ]
  },
  {
    name: 'Common medicines',
    items: [
      { name: 'Fever reducer (paracetamol / ibuprofen)', note: 'One type is enough; add a child formula if there is a baby at home', qty: '1 box' },
      { name: 'Anti-diarrheal medicine', note: 'e.g. smectite powder, to help prevent dehydration', qty: '1 box' },
      { name: 'Antihistamine (loratadine etc.)', note: 'For allergic reactions', qty: '1 box' },
      { name: 'Burn ointment', note: 'For minor burns; rinse with cool water first, then apply', qty: '1 tube' },
      { name: 'Oral rehydration salts', note: 'Replenish electrolytes after diarrhoea or heat stroke', qty: '2–3 sachets' },
      { name: 'Family chronic-disease medicines', note: 'e.g. blood pressure or glucose medicine; keep enough on hand', qty: 'As needed' }
    ]
  },
  {
    name: 'Emergency extras',
    items: [
      { name: 'Multi-function flashlight', note: 'Rechargeable light; keep spare batteries', qty: '1' },
      { name: 'High-frequency rescue whistle', note: 'Loud call for help that carries far', qty: '1' },
      { name: 'Foil emergency blanket', note: 'Retains heat and prevents hypothermia', qty: '1–2' },
      { name: 'Emergency contact card', note: 'Family details, allergies, chronic conditions, blood type', qty: '1' },
      { name: 'Emergency drinking water', note: 'Water supply after a disaster', qty: '3 days per person' },
      { name: 'Emergency food', note: 'No-cook food such as compressed biscuits, canned food or energy bars', qty: '3 days per person' },
      { name: 'First-aid handbook', note: 'A paper copy to follow step by step in an emergency', qty: '1' }
    ]
  }
]

module.exports = { KIT_CATEGORIES_EN }
