/**
 * 家庭常备药清单 · 英文层（按 index 与 medicine.js 的 MED_CATEGORIES 对齐）
 * 数据层仍保留中文，展示时按 lang 取对应层
 */

const MED_CATEGORIES_EN = [
  {
    name: 'Fever & pain relief',
    items: [
      { name: 'Paracetamol (acetaminophen)', note: 'Adult fever and pain relief; keep child drops or suspension if there is a baby over 6 months', qty: '1 box tablets + child formula as needed', type: 'Adult / child' },
      { name: 'Ibuprofen', note: 'Fever, pain and inflammation; child formula from 6 months; alternate with paracetamol', qty: '1 box + child suspension as needed', type: 'Adult / child' },
      { name: 'Cooling gel patch', note: 'Physical cooling to soothe a feverish baby; not a substitute for medicine', qty: 'Several', type: 'Child' }
    ]
  },
  {
    name: 'Cold & cough',
    items: [
      { name: 'Cold granules / combination cold medicine', note: 'Choose by syndrome; do not stack ingredients with fever reducers', qty: '1 box', type: 'Adult' },
      { name: 'Cough & phlegm medicine (ambroxol etc.)', note: 'Aimed at loosening phlegm; dry and wet coughs need different drugs', qty: '1 bottle', type: 'Adult' },
      { name: 'Throat lozenges', note: 'Soothe a dry, sore throat', qty: '1 box', type: 'Adult' },
      { name: 'Saline nasal spray', note: 'Gentle, safe relief for a stuffy baby nose', qty: '1 bottle', type: 'Child' }
    ]
  },
  {
    name: 'Digestion',
    items: [
      { name: 'Smectite powder', note: 'Physical anti-diarrheal; works best on an empty stomach', qty: '1 box', type: 'Adult / child' },
      { name: 'Oral rehydration salts III', note: 'Replace water and salts in diarrhoea, vomiting or fever; essential with a baby', qty: 'Several sachets', type: 'Adult / child' },
      { name: 'Probiotics (bifidobacteria etc.)', note: 'Support gut flora after diarrhoea or antibiotics', qty: '1 box', type: 'Adult / child' },
      { name: 'Domperidone (prokinetic)', note: 'Bloating, nausea, indigestion (over 12 years)', qty: '1 box', type: 'Adult' },
      { name: 'Hydrotalcite / acid reducer', note: 'Stomach pain, acid reflux, heartburn', qty: '1 box', type: 'Adult' }
    ]
  },
  {
    name: 'Topical care',
    items: [
      { name: 'Povidone-iodine swabs', note: 'Wound disinfection, mild irritation, safe for baby', qty: 'Individually packed, several', type: 'All' },
      { name: 'Mupirocin ointment', note: 'Skin infection and small wound inflammation (topical)', qty: '1 tube', type: 'All' },
      { name: 'Burn ointment (moist exposed burn)', note: 'Minor burns: rinse with cool water for 15 minutes first, then apply', qty: '1 tube', type: 'All' },
      { name: 'Calamine lotion', note: 'Relieves itching from insect bites and prickly heat; safe for baby', qty: '1 bottle', type: 'All' },
      { name: 'Artificial tears / sodium hyaluronate drops', note: 'Soothe dry eyes and flush out foreign objects', qty: '1', type: 'Adult' },
      { name: 'Zinc oxide ointment', note: 'Barrier care for baby nappy rash', qty: '1 tube', type: 'Child' }
    ]
  },
  {
    name: 'Allergy',
    items: [
      { name: 'Loratadine', note: 'Hives, allergic rhinitis and other allergies (over 2 years)', qty: '1 box', type: 'Adult / child' },
      { name: 'Cetirizine', note: 'Alternative antihistamine; more drowsiness than loratadine', qty: '1 box', type: 'Adult / child' },
      { name: 'Anaphylaxis action plan (no medicine)', note: 'If anyone has severe allergies, confirm with a doctor whether to keep an adrenaline pen and get training', qty: '—', type: 'Memo' }
    ]
  },
  {
    name: 'Chronic conditions',
    items: [
      { name: 'Family chronic-disease medicines', note: 'Long-term drugs for hypertension, diabetes or heart disease; keep 1–2 weeks and check expiry', qty: 'Per prescription', type: 'As needed' },
      { name: 'Vitamin D', note: 'Can be given from birth; 400 IU daily for 0–1 year', qty: '1 bottle', type: 'Child' },
      { name: 'Calcium (as needed)', note: 'For breastfeeding mothers or as prescribed', qty: 'As needed', type: 'Adult' }
    ]
  }
]

module.exports = { MED_CATEGORIES_EN }
