/* 育儿百科文章 · 英文译文（与 encyclopedia-detail.js 中 ARTICLES 的 key 一一对应） */
const T_BABY = 'Baby Growth Guide';
const T_MOM = 'Mom Care Handbook';

module.exports = {
  /* ==================== 宝宝 ==================== */
  baby_0to1: {
    title: 'Caring for Your Baby: 0–1 Year',
    tag: T_BABY,
    intro: 'From newborn to first birthday, milestones and care priorities shift month by month. Knowing each key stage makes parenting calmer.',
    sections: [
      { h: 'Milestones by month', list: [
        '0–3 months: head lifting, visual tracking, grasp reflex; day-night rhythm gradually settles',
        '4–6 months: rolling over, grabbing toys, laughing aloud; in the oral stage and loves chewing hands',
        '7–9 months: sitting alone, learning to crawl, babbling; stranger and separation anxiety appear',
        '10–12 months: pulling to stand, cruising, saying mama and dada, loves imitating'
      ] },
      { h: 'Daily care essentials', list: [
        'Sleep: keep a consistent bedtime routine and always place your baby on the back',
        'Feeding: on demand; introduce solids gradually after 6 months',
        'Vaccines: follow the immunization record and observe for 24 hours after each dose',
        'Safety: prevent falls and burns, keep small objects away, leave nothing loose in the crib'
      ] }
    ],
    tips: ['Every baby has their own pace. Milestones are reference ranges, so there is no need to worry. If your baby is clearly behind, consult a child health doctor promptly.']
  },

  baby_food: {
    title: 'Starting Solids',
    tag: T_BABY,
    intro: 'Around 6 months is the golden window for solids. Watch for the signs, introduce foods in order, and stay alert to allergies.',
    sections: [
      { h: 'Signs your baby is ready', list: [
        'Can sit with support, head and neck are steady, and the tongue-thrust reflex has faded',
        'Shows interest in adult food — reaches out and stares at it',
        'Weight is about double the birth weight and your baby is still hungry despite more milk'
      ] },
      { h: 'Suggested order', list: [
        'First bite: iron-fortified rice cereal (single grain, smooth)',
        'Then: root vegetable purée → fruit purée → meat or liver purée → egg yolk',
        'Add only one new food at a time and wait 3 days before the next',
        'From thin to thick, from little to more, from fine to coarse'
      ] },
      { h: 'Watching for allergies', list: [
        'Common allergens: egg, milk, peanut, fish and shrimp, soy, wheat',
        'After a new food, watch for rash, diarrhea, vomiting or breathing problems',
        'Babies at high risk (family history of allergy) should ask a doctor first',
        'No salt or sugar before 1 year; honey only after 1 year'
      ] }
    ],
    tips: ['Early solids are mainly about tasting — milk is still the main source of nutrition. Avoid choking-risk foods such as whole nuts, jelly and hard candy.']
  },

  baby_growth: {
    title: 'Growth and Development Guide',
    tag: T_BABY,
    intro: 'Gross motor skills, fine motor skills, language and social skills grow together. Use play and company to help your baby unlock each new skill.',
    sections: [
      { h: 'Gross motor skills', list: [
        'Rolling over: plenty of tummy time to build neck and back strength',
        'Sitting: practise supported and independent sitting at 6–8 months; avoid baby walkers',
        'Crawling: create a safe crawling area and lure your baby with toys',
        'Walking: pull to stand and cruise at 10–15 months; bare feet are steadier'
      ] },
      { h: 'Fine motor skills', list: [
        'Grasping: rattles and soft blocks to practise the grip',
        'Finger control: tearing paper and picking up small biscuits to practise pincer grasp',
        'Hand-eye coordination: safe games such as threading beads and stacking rings'
      ] },
      { h: 'Language and interaction', list: [
        'Talk face to face and read picture books, speaking slowly',
        'Answer your baby babbling and encourage sounds',
        'Mirror play, peekaboo and clapping songs build social interaction',
        'Daily outdoor time and natural light help sleep and mood'
      ] }
    ],
    tips: ['If your baby is clearly and persistently behind in one area, arrange a developmental assessment at the child health clinic — early detection means early support.']
  },

  baby_can: {
    title: 'Is It OK? Quick Answers',
    tag: T_BABY,
    intro: 'Sleep position, travel, gear — here are the quick answers to the questions new parents ask most.',
    sections: [
      { h: 'Sleep position', list: [
        'Under 1 year, always place your baby on the back to reduce the risk of SIDS',
        'Side-lying can be used briefly while awake, but sleep should still start on the back',
        'No pillows, plush toys or thick quilts in the crib',
        'Once your baby can roll over independently, rolling onto the side or tummy needs no intervention'
      ] },
      { h: 'Travel', list: [
        'A car seat is a must; rear-facing until about 2 years is safer',
        'Buckle up in the stroller and shade the sun without covering the whole seat',
        'Avoid long outdoor time in heat; watch sun protection and hydration'
      ] },
      { h: 'Gear questions', list: [
        'Pillows: not recommended under 1 year',
        'Baby walkers: not recommended — injury risk and poor for balance',
        'Pacifiers: fine in moderation under 6 months; wean gradually after 1 year',
        'Bottles: sterilize regularly and replace worn nipples promptly'
      ] }
    ],
    tips: ['Behind every can or cannot are two measures — safety and development. Safety comes first; development follows your baby pace.']
  },

  baby_edu: {
    title: 'Early Learning for Babies',
    tag: T_BABY,
    intro: 'Early learning is not about teaching facts. It feeds your baby curiosity through play and interaction.',
    sections: [
      { h: '0–6 months: sensory awakening', list: [
        'Black-and-white cards and colourful mobiles for visual tracking',
        'Rattles and shakers to practise sound discrimination',
        'Gentle massage for touch and a stronger sense of security'
      ] },
      { h: '6–12 months: exploring the world', list: [
        'Peekaboo to build object permanence',
        'Passing toys back and forth for social and hand skills',
        'Imitating sounds and actions, encouraging babbling',
        'Reading picture books together and naming objects'
      ] },
      { h: 'Principles', list: [
        'Follow your baby interest; no forcing and no comparing',
        '10–20 minutes of quality time a day is enough',
        'More outdoor time, more movement, more real interaction',
        'Keep screens away as much as possible before 2 years'
      ] }
    ],
    tips: ['The best early learning is your company and response. Love and security are the foundation of all learning.']
  },

  baby_premature: {
    title: 'Caring for a Premature Baby',
    tag: T_BABY,
    intro: 'Premature babies need more patience and specialist care. Use corrected age for development and grow at their own pace.',
    sections: [
      { h: 'Calculating corrected age', list: [
        'Corrected age = actual age minus weeks born early',
        'Example: born 6 weeks early at 4 months actual age → about 2.5 months corrected',
        'Assess development by corrected age and stay relaxed during catch-up'
      ] },
      { h: 'Care essentials', list: [
        'Warmth and kangaroo care: skin to skin steadies temperature and mood',
        'Feed on demand; ask the doctor about catch-up nutrition if needed',
        'Keep follow-up visits: fundus, hearing and developmental screening all matter',
        'Limit visitors and mind hand hygiene to prevent infection'
      ] },
      { h: 'Catch-up growth', list: [
        'Most premature babies catch up within 2 years',
        'Watch the trend of the growth curve rather than a single number',
        'Breast milk is especially valuable — keep nursing or pumping'
      ] }
    ],
    tips: ['A premature baby is not behind — they simply have their own timetable. Follow the follow-up plan and give plenty of cuddles and responses.']
  },

  baby_hand: {
    title: 'Baby Chewing Hands',
    tag: T_BABY,
    intro: 'Hand chewing is a normal way for babies to explore the world and self-soothe; in most cases there is no need to stop it by force.',
    sections: [
      { h: 'Why babies chew hands', list: [
        'Oral exploration: the mouth is the earliest tool for understanding the world',
        'Self-soothing: a way to relax when sleepy, tired or bored',
        'Teething discomfort: chewing eases sore gums'
      ] },
      { h: 'When to pay attention', list: [
        'Under 1 year: normal — just keep hands clean',
        '1–2 years: gently redirect by day; no need to force it at bedtime',
        'After 3 years, if it is still frequent or affecting teeth alignment, consult a child health doctor or dentist'
      ] },
      { h: 'Gentle ways to stop', list: [
        'Offer a comfort toy or pacifier instead',
        'More hugs and company so boredom does not lead to hand chewing',
        'Enough play and movement by day for easier sleep at night',
        'Use positive guidance; scolding tends to backfire'
      ] }
    ],
    tips: ['Hand chewing is part of development, and forcing it away often makes it rebound. Give plenty of security and most babies move on naturally.']
  },

  baby_head: {
    title: 'Baby Head Shape',
    tag: T_BABY,
    intro: 'The skull is soft in the first year, so sleep position shapes the head. Safe back sleeping plus position changes keep head shape rounded.',
    sections: [
      { h: 'Common head shape issues', list: [
        'Flat head (flat back): from lying on the same side for long periods',
        'Asymmetry: always turning to one side, often linked to neck tightness (torticollis)',
        'Most mild asymmetry improves on its own once sitting and crawling begin'
      ] },
      { h: 'How to shape the head', list: [
        'Tummy time while awake — builds the neck and relieves pressure on the back of the head',
        'Alternate head direction in the crib (left today, right tomorrow)',
        'Switch arms when feeding and carrying',
        'Hold your baby upright and interact more while awake to reduce lying time'
      ] },
      { h: 'When to see a doctor', list: [
        'Clearly asymmetric head shape affecting the face',
        'Limited neck movement, which may indicate torticollis',
        'A helmet may be advised after assessment (effective between 3 and 18 months)'
      ] }
    ],
    tips: ['Shaping pillows are not recommended under 1 year (choking risk). Changing positions works better than any pillow.']
  },

  /* ==================== 妈妈 ==================== */
  mom_recover: {
    title: 'Postpartum Recovery',
    tag: T_MOM,
    intro: 'Postpartum recovery is a rebuilding project. The focus is pelvic floor, abdominal muscles and core strength — step by step.',
    sections: [
      { h: 'Pelvic floor recovery', list: [
        'Assess pelvic floor function at the 42-day check-up',
        'Kegel exercises: squeeze, hold, release — 3 sets a day',
        'Avoid long standing, squatting and lifting to reduce abdominal pressure',
        'If leaking or prolapse persists, start structured pelvic floor rehab'
      ] },
      { h: 'Abdominal separation', list: [
        'Self-check: lie down, lift the head and measure the gap along the midline',
        'More than two fingers needs care: avoid crunches and sit-ups',
        'Focus on breathing and pelvic floor exercises',
        'Severe separation needs rehab, not blind weight loss'
      ] },
      { h: 'Core and overall', list: [
        'In the first 6 weeks keep activity gentle (walking, breathing)',
        'After 6 weeks and a doctor review, increase intensity gradually',
        'Exercise while breastfeeding does not reduce milk supply — stay hydrated',
        'Balanced nutrition and enough sleep are the foundation'
      ] }
    ],
    tips: ['Recovery is not a race. Repair first, then reduce fat. The 42-day check-up and a doctor assessment are step one.']
  },

  mom_yuezi: {
    title: 'Postpartum Confinement (Yuezi)',
    tag: T_MOM,
    intro: 'The core of confinement is simple: rest well, stay clean sensibly, and have your emotions supported.',
    sections: [
      { h: 'Rest', list: [
        'Sleep when your baby sleeps and nap in fragments',
        'Avoid lying down all day; gentle activity helps prevent clots',
        'Let family share chores and night feeds so you get breathing room'
      ] },
      { h: 'Hygiene', list: [
        'You can wash your hair and shower — keep it quick and dry off promptly',
        'Care for perineal or C-section wounds as advised and keep them dry',
        'Ventilate the room; just avoid direct drafts on you'
      ] },
      { h: 'Emotional care', list: [
        'Mood swings after birth are common — it is not being dramatic',
        'Allow yourself to slow down; there is no perfect mother',
        'Say how you feel; family should listen more and judge less',
        'Low mood lasting more than 2 weeks may be postpartum depression — seek help'
      ] }
    ],
    tips: ['Confinement is not something to endure alone, it is a time to be cared for. Eat well, sleep well, feel well — a healthy mom keeps a calm baby.']
  },

  mom_eat: {
    title: 'What Can I Eat While Breastfeeding',
    tag: T_MOM,
    intro: 'A balanced diet matters more than strict avoidance. Only a few foods need limits, and milk-supply myths can be ignored.',
    sections: [
      { h: 'Eat more of', list: [
        'Quality protein: fish, meat, eggs, soy products — they support milk production',
        'Soups and plenty of water: breast milk is about 90% water',
        'Vegetables, fruit and whole grains for fibre',
        'Calcium and iron: dairy, leafy greens, red meat'
      ] },
      { h: 'Keep in moderation', list: [
        'Caffeine: up to 2 cups a day, preferably right after a feed',
        'Alcohol: best avoided; if you drink, wait 2–3 hours before feeding',
        'Spicy food: fine in moderation — watch whether your baby reacts',
        'Seafood: cook thoroughly; avoid high-mercury fish such as shark and swordfish'
      ] },
      { h: 'Myth busting', list: [
        'There is no scientific basis for most so-called milk-reducing foods — do not avoid foods blindly',
        'Getting angry does not spoil your milk, but emotions can affect let-down',
        'If supply seems low, check feeding frequency and latch before buying supplements'
      ] }
    ],
    tips: ['A normal diet is fine while breastfeeding. The key is drinking enough water and eating balanced meals. Eat well and your milk follows.']
  },

  mom_bag: {
    title: 'Hospital Bag Checklist',
    tag: T_MOM,
    intro: 'Pack a month ahead and sort it into four groups — documents, mom, baby, birth partner — so labour day stays calm.',
    sections: [
      { h: 'Documents', list: [
        'ID card, medical insurance card, pregnancy records and admission papers',
        'Phone charger and power bank',
        'A bank card and a little cash'
      ] },
      { h: 'For mom', list: [
        'Maternity pads, postpartum sanitary pads, disposable underwear',
        'Nursing bra, breast pads, breast pump (if needed)',
        'Toiletries, slippers, loose pyjamas',
        'Thermos and a straw cup for drinking during labour'
      ] },
      { h: 'For baby', list: [
        'One pack of newborn or size S diapers',
        'Side-snap tops, swaddle, small towels, bibs',
        'Baby wipes and diaper cream',
        'A small tin of formula (if needed) and bottles'
      ] },
      { h: 'Discharge checklist', list: [
        'Papers for the birth certificate',
        'Follow-up appointments the doctor arranged',
        'Book the 42-day postpartum check-up'
      ] }
    ],
    tips: ['Bag everything by category and label it so family can find things at a glance. If you are at risk of preterm birth, pack even earlier.']
  },

  mom_chankang: {
    title: 'Choosing Postpartum Rehab',
    tag: T_MOM,
    intro: 'Postpartum rehab offers are everywhere. The rule is simple: assess first, choose second, and prefer proper medical care.',
    sections: [
      { h: 'What you really need', list: [
        'Pelvic floor assessment and training (especially for leaking or prolapse)',
        'Abdominal separation repair (gap over two fingers)',
        'Wound and scar care, plus assessment of pelvic discomfort'
      ] },
      { h: 'Treat with caution', list: [
        'Sweating sessions said to flush out dampness: no evidence, and heavy sweating can dehydrate',
        'Pelvic adjustment packages: often manual or machine based — get a proper assessment first',
        'Expensive device packages: check whether the equipment is medical grade and whether an assessment report is provided'
      ] },
      { h: 'How to choose', list: [
        'Prefer the rehab department or postpartum clinic of a public hospital',
        'Check qualifications: does the therapist have professional training',
        'Get an assessment report first, then decide on treatments',
        'Refuse hard selling and buy only what you need'
      ] }
    ],
    tips: ['Postpartum rehab is medical care, not a beauty treatment. Complete the 42-day assessment first, then decide whether and what to do.']
  },

  mom_wash: {
    title: 'Can I Wash My Hair',
    tag: T_MOM,
    intro: 'Yes, you can wash your hair and shower during confinement. Do it the right way, keep warm, and you will feel cleaner and more comfortable.',
    sections: [
      { h: 'Washing sensibly', list: [
        'After a vaginal birth you can shower once you have the energy; after a C-section follow medical advice and keep the wound dry',
        'Use moderate water temperature and keep the room around 26°C',
        'Blow dry thoroughly with warm air right after washing',
        'Keep showers short to avoid fatigue'
      ] },
      { h: 'Why not washing is worse', list: [
        'Heavy postpartum sweating without cleaning encourages bacteria and slows wound healing',
        'Greasy hair and discomfort affect sleep and mood'
      ] },
      { h: 'Take note', list: [
        'No cold water and no sitz baths (avoid infection during the puerperium)',
        'Stay warm after washing and avoid drafts',
        'Wait until perineal or C-section wounds have scabbed before normal showers'
      ] }
    ],
    tips: ['Not washing your hair in confinement is an outdated idea. Clean sensibly and dry promptly — it is better for both mom and baby.']
  },

  mom_upgrade: {
    title: 'Becoming a Stronger You',
    tag: T_MOM,
    intro: 'The postpartum period is a window to rebuild your body and confidence. Start with small daily changes.',
    sections: [
      { h: 'Body', list: [
        'Repair the pelvic floor and abdominal muscles before losing fat',
        'Ten minutes a day: diaphragmatic breathing, Kegels and stretching',
        'Exercise moderately while breastfeeding and build up gradually',
        'Mind posture: use a cushion to support your lower back when feeding'
      ] },
      { h: 'Daily life', list: [
        'Create mom time: keep 20 minutes a day for yourself',
        'Record small wins and acknowledge what you have done',
        'Share tasks with family instead of doing everything alone'
      ] },
      { h: 'Mindset', list: [
        'No comparing, no self-blame — accept the changes in your body',
        'Give yourself a transition period when returning to work or social life',
        'Talk about feelings early and ask for help when you need it'
      ] }
    ],
    tips: ['Postpartum growth is not about going back to who you were, but becoming someone stronger. Slower is fine.']
  },

  mom_depress: {
    title: 'Postpartum Depression',
    tag: T_MOM,
    intro: 'Postpartum mood problems are common. Spot the signs, seek help early — it is treatable, so do not carry it alone.',
    sections: [
      { h: 'Signs to watch', list: [
        'Low mood and tearfulness lasting more than 2 weeks',
        'No interest in your baby or daily life, unable to feel joy',
        'Insomnia or sleeping too much, marked change in appetite',
        'Strong self-blame, worthlessness, even thoughts of self-harm'
      ] },
      { h: 'What family can do', list: [
        'Listen more, judge less, and never call it overreacting',
        'Take over night feeds and chores so mom can sleep',
        'Encourage and accompany her to see a doctor',
        'Watch for danger signs and get emergency care if needed'
      ] },
      { h: 'What mom can do', list: [
        'Say how you feel and ask your partner, family or friends for help',
        'Protect your sleep and rest when tired',
        'Gentle exercise and daylight help regulate mood',
        'See a psychologist or psychiatrist — proper treatment works'
      ] }
    ],
    tips: ['Postpartum depression is not your fault and not weakness. Asking for professional help is an act of self-care — calling a hospital or mental health hotline is the first step.']
  }
};
