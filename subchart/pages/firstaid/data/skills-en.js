/**
 * 家庭急救跟做训练器 - 技能英文对照表
 * 与 skills.js 中 SKILLS 数组按 index 一一对应（37 条，顺序不可变）。
 * 只提供显示层文本：name / short / description / keyPoints / warnings / segments。
 * segments 内部按 index 对齐，仅含 title / text / label（children 同理），
 * type、count、bpm、seconds、rounds 等节奏参数始终取自中文数据层。
 */
module.exports = [
  {
    id: 'adult_cpr',
    name: 'Adult CPR',
    short: 'Adult CPR',
    description: 'Win the golden 4 minutes: compress at 100–120/min, compressions : breaths = 30:2, 5 cycles.',
    keyPoints: [
      'Compression point: midpoint of the nipple line (lower half of the sternum)',
      'Depth 5–6 cm, rate 100–120/min',
      'Compressions : breaths = 30:2',
      'Check response after 5 cycles and use an AED as soon as possible'
    ],
    warnings: [
      'Compress hard, fast and without pause (breaks must stay under 10 seconds)',
      'If untrained, continuous compressions come first — compression-only CPR is acceptable'
    ],
    segments: [
      { title: 'Make sure the scene is safe', text: 'Look around for danger so neither you nor the casualty is hurt again' },
      { title: 'Check responsiveness and breathing', text: 'Tap both shoulders and shout; watch the chest for no more than 10 seconds' },
      { title: 'Call for help at once', text: 'Have someone call 120 and fetch an AED; if you are alone, start compressions before calling' },
      {
        label: 'cycles',
        children: [
          { title: 'Compress 30 times', text: 'Heel of the hand on the nipple line, arms straight, press vertically 5–6 cm' },
          { title: 'Give 2 rescue breaths', text: 'Tilt the head, lift the chin, pinch the nose and give mouth-to-mouth breaths of about 1 second each' }
        ]
      },
      { title: 'Reassess and continue', text: 'After 5 cycles check response and breathing; if not recovered, continue CPR until the AED or paramedics arrive' }
    ]
  },
  {
    id: 'adult_heimlich',
    name: 'Adult Heimlich Maneuver',
    short: 'Adult Choking',
    description: 'Conscious adult with an obstructed airway: quick inward-and-upward thrusts two fingers above the navel.',
    keyPoints: [
      'Aim the thumb side of your fist two finger-widths above the navel',
      'Wrap the other hand over the fist and thrust quickly inward and upward, about once per second',
      'Repeat until the object is expelled'
    ],
    warnings: [
      'Never use abdominal thrusts on babies under 1 year — use back blows plus chest thrusts',
      'For pregnant or obese casualties, thrust on the lower half of the sternum instead'
    ],
    segments: [
      { title: 'Recognize the obstruction', text: 'Sudden inability to speak or cough, no breathing, bluish lips → airway obstruction' },
      { title: 'Take your position', text: 'Stand behind the casualty, wrap both arms around the waist and have them lean forward' },
      { title: 'Make a fist and place it', text: 'Make a fist and place the thumb side two finger-widths above the navel' },
      {
        label: 'rounds',
        children: [
          { title: 'Abdominal thrusts ×5', text: 'Wrap the other hand over the fist and thrust quickly inward and upward, about once per second' },
          { title: 'Check', text: 'See whether the object is out and whether the casualty can speak or cough' }
        ]
      },
      { title: 'If consciousness is lost', text: 'If the casualty becomes unresponsive, lay them down gently, call 120 at once and switch to CPR' }
    ]
  },
  {
    id: 'infant_choking',
    name: 'Infant Airway Obstruction',
    short: 'Infant Choking',
    description: 'Under 1 year: cycles of 5 back blows and 5 chest thrusts; abdominal thrusts are strictly forbidden.',
    keyPoints: [
      'Back blows: face down on your forearm, head lower than body, heel of hand between the shoulder blades, 5 times',
      'Chest thrusts: turn face up, still head-down, heel of hand just below the nipple line, 5 times',
      'Alternate 5 back blows and 5 chest thrusts until the object is out or the baby cries'
    ],
    warnings: [
      'Never use abdominal thrusts — an infant’s organs are delicate and easily injured',
      'Support the chin firmly and never cover the mouth or nose',
      'If the baby becomes unresponsive, stop the thrusts, start infant CPR and call 120'
    ],
    segments: [
      { title: 'Recognize the obstruction', text: 'Sudden violent coughing, unable to cry, blue lips → airway obstruction' },
      { title: 'Position the baby', text: 'Place the baby face down along your forearm, support the chin, keep the head lower than the body' },
      {
        label: 'cycles',
        children: [
          { title: '5 back blows', text: 'Strike between the shoulder blades with the heel of your hand — firm but not violent' },
          { title: '5 chest thrusts', text: 'Turn the baby face up, keep the head low, press 5 times just below the nipple line' }
        ]
      },
      { title: 'Watch for recovery', text: 'Object out, or the baby cries and breathes again → stop and observe; see a doctor if needed' },
      { title: 'If consciousness is lost', text: 'Start infant CPR at once and have someone call 120' }
    ]
  },
  {
    id: 'infant_cpr',
    name: 'Infant CPR',
    short: 'Infant CPR',
    description: 'Two fingers just below the nipple line, about 4 cm deep, 30:2, 5 cycles.',
    keyPoints: [
      'Use two fingers (or encircling thumbs), depth about 4 cm',
      'Rate 100–120/min, compressions : breaths = 30:2',
      'Cover the mouth and nose with your mouth and blow gently to avoid injuring the lungs'
    ],
    warnings: [
      'Breathe gently to protect the infant’s lungs',
      'If you are alone: give 2 minutes of CPR before calling 120'
    ],
    segments: [
      { title: 'Check response and breathing', text: 'Tap the soles and call loudly; watch the chest for no more than 10 seconds' },
      { title: 'Call for help', text: 'If someone is present, have them call 120; if alone, do 2 minutes of CPR first' },
      {
        label: 'cycles',
        children: [
          { title: '30 two-finger compressions', text: 'Two fingers just below the nipple line, press straight down about 4 cm' },
          { title: '2 gentle breaths', text: 'Seal your mouth over the baby’s mouth and nose, blow about 1 second each, gently' }
        ]
      },
      { title: 'Continue until recovery', text: 'Keep cycling compressions and breaths until breathing returns or help arrives' }
    ]
  },
  {
    id: 'infant_fall',
    name: 'Baby Fall from Bed / Head Bump',
    short: 'Fall & Head Bump',
    description: 'Check consciousness and injuries first, then observe for 24–48 hours; go to hospital at any danger sign.',
    keyPoints: [
      'Stay calm, tap and call gently to check responsiveness',
      'Check for bleeding, swelling and abnormal limb movement',
      'Observe for 24–48 hours: alertness, vomiting, drowsiness',
      'If all is normal, comfort the baby; any abnormality → see a doctor at once'
    ],
    warnings: [
      'Unresponsive, repeated vomiting, convulsions, or too drowsy to wake → hospital immediately',
      'Blood or fluid from the nose or ear, bulging fontanelle, abnormal pupils → hospital immediately',
      'Do not shake the baby, and do not give water to induce vomiting',
      'Once a baby over 6 months can roll over, fit cot rails and put a soft mat beside the bed'
    ],
    segments: [
      { title: 'Stay calm', text: 'Take a breath first; do not snatch up a crying baby — watch for a few seconds' },
      { title: 'Check responsiveness', text: 'Tap the soles, call loudly and watch the reaction and breathing' },
      { title: 'Check for injuries', text: 'Look for bumps or bleeding on the head and whether the limbs move normally (do not press a bump)' },
      { title: 'Keep observing', text: 'If nothing is abnormal, comfort the baby and keep watching (this lesson shows 30 seconds)' },
      { title: 'Danger signs — call 120', text: 'Unresponsive, repeated vomiting, convulsions, drowsiness, blood or fluid from ear or nose → call 120' }
    ]
  },
  {
    id: 'infant_fever_seizure',
    name: 'Febrile Seizure in Infants',
    short: 'Febrile Seizure',
    description: 'Side-lying to prevent choking, time the seizure, cool the baby; over 5 minutes call 120.',
    keyPoints: [
      'Turn the baby on the side with the head turned to prevent inhaling vomit',
      'Move hard objects away and protect the head',
      'Note the time the seizure started',
      'Loosen clothing to cool down; see a doctor after the seizure stops'
    ],
    warnings: [
      'Never put anything in the baby’s mouth (it damages teeth and the airway)',
      'Do not restrain, shake or pinch the philtrum',
      'Over 5 minutes, repeated seizures within 24 hours, or no recovery of consciousness → call 120',
      'Never sponge the baby with alcohol'
    ],
    segments: [
      { title: 'Stay calm, turn on the side', text: 'Place the baby on the side with the head turned so vomit cannot enter the lungs' },
      { title: 'Move dangerous objects', text: 'Clear hard objects around the baby and protect the head with your hand or a soft pad' },
      { title: 'Note the time', text: 'Check the clock and remember when the seizure started' },
      { title: 'Time and watch', text: 'This lesson demonstrates 30 seconds; in real life record the seizure duration' },
      { title: 'Cool the baby', text: 'Loosen the collar and cool the room; for high fever sponge with lukewarm water — never alcohol' },
      { title: 'Over 5 minutes — call 120', text: 'Over 5 minutes, repeated seizures, or no recovery of consciousness → call 120 at once' }
    ]
  },
  {
    id: 'infant_milk_choking',
    name: 'Milk Choking / Spitting Up',
    short: 'Milk Choking',
    description: 'If milk chokes the baby, turn them to the side or face down and pat the back to drain it; blue lips → treat as airway obstruction.',
    keyPoints: [
      'Turn the baby to the side or face down over your forearm, head lower, so milk can drain out',
      'Pat the back with a cupped hand to help it out',
      'Clear leftover milk from the mouth and nose',
      'Keep watching even after breathing returns to normal'
    ],
    warnings: [
      'Cannot breathe or blue lips → treat as infant airway obstruction and call 120 at once',
      'Do not hold the baby upright to pat the back (milk can go deeper)',
      'Frequent choking, or choking at every feed → see a doctor',
      'Burp after feeds and lay the baby on the right side to reduce aspiration'
    ],
    segments: [
      { title: 'Change position', text: 'At once place the baby on the side, or face down on your forearm with the head lower' },
      { title: 'Pat the back to drain', text: 'Pat the back with a cupped hand to help the milk flow out (same as back blows)' },
      { title: 'Clear mouth and nose', text: 'Gently wipe residual milk from the mouth and nose with gauze or a soft towel' },
      { title: 'Check breathing', text: 'Confirm the baby is breathing steadily and the colour is pink again' },
      { title: 'Severe — call 120', text: 'If the baby still cannot breathe or lips are blue → start infant airway-obstruction first aid and call 120' }
    ]
  },
  {
    id: 'infant_swallow',
    name: 'Swallowed Foreign Object',
    short: 'Swallowed Object',
    description: 'Decide first whether it is stuck in the airway or swallowed; batteries, magnets or sharp objects need immediate medical care.',
    keyPoints: [
      'Decide first: crying and breathing = digestive tract; blue lips and no breathing = airway obstruction',
      'Most small objects swallowed pass in the stool — watch the nappies',
      'Batteries, magnets, sharp or corrosive objects → hospital immediately',
      'Vomiting, abdominal pain, blood in stool or refusing feeds → hospital immediately'
    ],
    warnings: [
      'Do not induce vomiting blindly (sharp or corrosive objects make it worse)',
      'If the airway is blocked → start infant airway-obstruction first aid at once',
      'Multiple magnets, coins or a battery swallowed → hospital immediately, do not wait',
      'Keep small parts, coins, batteries and buttons out of the baby’s reach'
    ],
    segments: [
      { title: 'Assess the situation', text: 'Can the baby cry and breathe normally? Is the colour normal?' },
      { title: 'Airway obstruction', text: 'Blue lips or unable to breathe → switch to infant airway-obstruction first aid and call 120' },
      { title: 'Watch the digestive tract', text: 'Normal breathing usually means the object went down; watch the stools — most pass on their own' },
      { title: 'Hazardous object — hospital', text: 'Battery, magnet, sharp or corrosive object → hospital immediately, do not wait for it to pass' },
      { title: 'Red-flag symptoms', text: 'Vomiting, abdominal pain, blood in stool, refusing feeds or lethargy → hospital immediately' }
    ]
  },
  {
    id: 'infant_drowning',
    name: 'Infant Drowning / Water Choking',
    short: 'Drowning',
    description: 'Get the baby out of the water at once, lie on the side and clear the mouth and nose; if not breathing, start infant CPR and call 120.',
    keyPoints: [
      'Take the baby out of the water immediately, lie on the side and clear the mouth and nose',
      'Check responsiveness and breathing',
      'No breathing / no response → start infant CPR and have someone call 120',
      'Even after recovery, see a doctor (watch for delayed pulmonary oedema)'
    ],
    warnings: [
      'Infant drowning progresses very fast — never leave the baby in the bath, always keep a hand on them',
      'When there is no breathing, do not waste time draining water — start CPR',
      'Even when breathing returns, go to hospital (secondary drowning risk)',
      'Empty bathtubs, buckets and inflatable pools right after use'
    ],
    segments: [
      { title: 'Get out of the water', text: 'Take the baby out at once, lay them on a flat safe surface and turn to the side' },
      { title: 'Clear mouth and nose', text: 'Remove water, secretions and foreign objects from the mouth and nose' },
      { title: 'Check breathing', text: 'Watch the chest rise, tap and call to check the reaction' },
      { title: 'No breathing — act', text: 'No breathing / no response → start infant CPR and have someone call 120' },
      { title: 'See a doctor', text: 'Even after breathing returns, go to hospital promptly to rule out delayed pulmonary oedema' }
    ]
  },
  {
    id: 'bleeding',
    name: 'Bleeding Control & Bandaging',
    short: 'Bleeding',
    description: 'Direct pressure first, plus elevation and a pressure bandage; use a tourniquet only if needed.',
    keyPoints: [
      'Direct pressure is the most effective method (keep it on for at least 5 minutes)',
      'Raise the limb above heart level when there is no fracture',
      'A pressure bandage should be tight enough to slip one finger underneath',
      'Record the tourniquet time to prevent limb ischaemia'
    ],
    warnings: [
      'Do not pull out an embedded object — pad and immobilize around it',
      'Use a tourniquet only for heavy bleeding uncontrolled by pressure, then send to hospital at once',
      'Wear gloves to protect yourself from blood contact'
    ],
    segments: [
      { title: 'Protect yourself', text: 'Put on medical gloves and avoid direct contact with blood' },
      { title: 'Direct pressure', text: 'Press sterile gauze or a clean cloth firmly on the wound (in real life keep at least 5 minutes)' },
      { title: 'Keep pressing (practice)', text: 'Hold the pressure without releasing; this lesson shows 30 seconds' },
      { title: 'Raise the limb', text: 'If there is no fracture, raise the injured limb above heart level to slow the bleeding' },
      { title: 'Pressure bandage', text: 'Wrap an elastic bandage in circles, tight enough to slip one finger underneath' },
      { title: 'If bleeding continues', text: 'For heavy bleeding not controlled by pressure, apply a tourniquet (upper third of arm or thigh), note the time and go to hospital at once' }
    ]
  },
  {
    id: 'burn',
    name: 'Burns & Scalds',
    short: 'Burns',
    description: 'Five steps: cool, remove, soak, cover, send. Cool under running water immediately.',
    keyPoints: [
      'Cool the burn under running cool water for 15–20 minutes',
      'Five steps: cool → remove → soak → cover → send',
      'Severe or large burns, or burns on the face, joints or perineum → hospital immediately'
    ],
    warnings: [
      'Never apply toothpaste, soy sauce, sesame oil or other folk remedies',
      'Do not use ice directly (it causes cold injury) — running water is enough',
      'Do not pop blisters; cover gently with clean gauze'
    ],
    segments: [
      { title: 'Cool (rinse)', text: 'Rinse the burn under running cool water (this lesson shows 60 seconds; in reality 15–20 minutes)' },
      { title: 'Remove', text: 'Gently remove clothing over the burn; if it sticks, cut around it instead of pulling' },
      { title: 'Soak', text: 'Soak the burn in cool water to keep cooling (can be skipped for large areas)' },
      { title: 'Cover', text: 'Cover gently with sterile gauze or a clean cloth without breaking blisters' },
      { title: 'Send', text: 'Severe or large burns, or burns on the face, joints or perineum → hospital at once' }
    ]
  },
  {
    id: 'sprain',
    name: 'Sprain Care (RICE)',
    short: 'Sprain RICE',
    description: 'RICE: rest, ice, compression, elevation.',
    keyPoints: [
      'Rest: stop activity and avoid weight bearing',
      'Ice: 15–20 minutes each time, every 1–2 hours',
      'Compression: elastic bandage with moderate pressure',
      'Elevation: raise the limb above heart level'
    ],
    warnings: [
      'Do not put ice directly on the skin — wrap it in a towel to prevent cold injury',
      'No heat and no rubbing in the first 48 hours',
      'Severe pain, inability to bear weight or joint deformity → hospital immediately'
    ],
    segments: [
      { title: 'Rest', text: 'Stop activity at once and avoid putting weight on the injury' },
      { title: 'Ice', text: 'Wrap an ice pack in a towel and apply (15–20 minutes each time; this lesson shows 20 seconds)' },
      { title: 'Compression', text: 'Apply an elastic bandage with moderate pressure, not too tight' },
      { title: 'Elevation', text: 'Raise the limb above heart level to reduce swelling' },
      { title: 'What comes next', text: 'Ice for 48 hours, then heat is allowed; severe pain or inability to bear weight → see a doctor' }
    ]
  },
  {
    id: 'seizure',
    name: 'Seizure Care',
    short: 'Seizure',
    description: 'Protect the head, move hazards away, recovery position, note the time; over 5 minutes call 120.',
    keyPoints: [
      'Protect the head and move sharp or dangerous objects away',
      'Once the seizure eases, put the person in the recovery position to keep the airway open',
      'Record the time the seizure started'
    ],
    warnings: [
      'Never put anything in the mouth (it damages teeth and the airway)',
      'Do not restrain the convulsing limbs',
      'Over 5 minutes, continuous or repeated seizures, first-ever seizure, pregnancy, or seizure in water → call 120'
    ],
    segments: [
      { title: 'Protect the head', text: 'Put something soft under the head, move sharp or dangerous objects away to prevent injury' },
      { title: 'Note the time', text: 'Start timing from the beginning to judge later whether medical care is needed' },
      { title: 'Stay and watch', text: 'Do not restrain the limbs and never put anything in the mouth' },
      { title: 'Recovery position', text: 'When the seizure eases, turn the person on the side, keep the airway open and clear secretions around the mouth' },
      { title: 'Decide on calling 120', text: 'Over 5 minutes, continuous or repeated seizures, first seizure, pregnancy or seizure in water → call 120 at once' }
    ]
  },
  {
    id: 'baby_eczema',
    name: 'Infant Eczema Care',
    short: 'Eczema Care',
    description: 'Moisturize above all: thick moisturizer daily, short lukewarm baths, breathable cotton clothing.',
    keyPoints: [
      'Moisturizing is the core: apply fragrance-free cream at least 2–3 times a day',
      'Bath water below 37°C for 5–10 minutes, moisturize straight after',
      'Wear breathable cotton clothes and avoid overheating and sweating',
      'Keep nails short to prevent scratching'
    ],
    warnings: [
      'Moderate-to-severe eczema, oozing or a rash that will not heal → see a doctor and follow the prescription',
      'Do not use steroid creams on your own — they need medical assessment',
      'Watch whether it relates to specific foods (milk, egg) but do not eliminate foods by yourself'
    ],
    segments: [
      { title: 'Assess the skin', text: 'Look at redness, papules and dry flaking to judge whether it is mild or moderate-to-severe' },
      { title: 'Lukewarm bath', text: 'Water below 37°C, bath 5–10 minutes, no alkaline body wash' },
      { title: 'Apply moisturizer', text: 'Within 3 minutes of the bath apply a thick layer, focusing on dry and rough areas' },
      { title: 'Moisturizing massage', text: 'Massage in small circles until absorbed; this lesson shows 20 seconds' },
      { title: 'Clothing and nails', text: 'Change into loose cotton clothes and trim the nails to prevent scratching' },
      { title: 'When to see a doctor', text: 'Oozing, spreading rash, or sleep affected → see a doctor promptly' }
    ]
  },
  {
    id: 'baby_mosquito',
    name: 'Mosquito & Bug Bite Care',
    short: 'Bite Care',
    description: 'Physical protection first; after a bite, cool compress, anti-itch lotion and watch for allergic reaction.',
    keyPoints: [
      'Prefer physical protection: mosquito nets, long sleeves, window screens',
      'Avoid the dawn and dusk peaks, and keep away from bushes and water edges',
      'Use chemical repellents under 6 months only after asking a doctor',
      'After a bite: cool compress plus calamine lotion for the itch'
    ],
    warnings: [
      'DEET repellents have age limits — use with caution under 6 months',
      'Spreading redness, fever or blisters → see a doctor promptly',
      'Do not scratch — broken skin can become infected'
    ],
    segments: [
      { title: 'Physical protection', text: 'Check the net and window screens, and dress the baby in light-colored long sleeves' },
      { title: 'Protection outdoors', text: 'Avoid dawn and dusk peaks and stay away from bushes, water and rubbish' },
      { title: 'Choosing a repellent', text: 'Children’s repellent can be used over 6 months; under 6 months ask a doctor first' },
      { title: 'After a bite', text: 'Cool the area with a cool towel first, then apply calamine lotion or baby anti-itch cream' },
      { title: 'Watch and seek care', text: 'Spreading redness, blisters, fever or lethargy → see a doctor promptly' }
    ]
  },
  {
    id: 'baby_diaper',
    name: 'Nappy Rash Care',
    short: 'Nappy Rash',
    description: 'Change often, wash with warm water, keep dry, apply barrier cream.',
    keyPoints: [
      'Change the nappy every 2–3 hours, or straight after a bowel movement',
      'Wash with warm water and pat dry with a soft cloth instead of rubbing',
      'Let the bottom air-dry for 10–15 minutes every day',
      'Apply barrier cream to form a protective layer'
    ],
    warnings: [
      'Do not scrub repeatedly with wet wipes (it irritates the skin)',
      'No talcum powder (it can be inhaled)',
      'Broken skin, ulceration or signs of thrush → see a doctor promptly'
    ],
    segments: [
      { title: 'Change often', text: 'Change every 2–3 hours or right after a bowel movement to reduce urine and stool irritation' },
      { title: 'Wash with warm water', text: 'Rinse with warm water and pat dry with a soft cloth — avoid rubbing back and forth' },
      { title: 'Air-dry', text: 'Leave the bottom bare for 10–15 minutes (this lesson shows 20 seconds)' },
      { title: 'Air-dry practice', text: 'Keep the baby lying face up with the bottom uncovered; this lesson shows 20 seconds' },
      { title: 'Barrier cream', text: 'Apply a layer of barrier cream to block urine irritation, then put on a fresh nappy' },
      { title: 'When to see a doctor', text: 'Broken or ulcerated skin, blisters, suspected fungal infection → see a doctor promptly' }
    ]
  },
  {
    id: 'baby_burp',
    name: 'Burping & Spit-up Care',
    short: 'Burping',
    description: 'Burp after feeds to reduce spit-up; learn the right position and what to do when milk comes back.',
    keyPoints: [
      'Hold the baby upright after a feed with the head on your shoulder and pat the back',
      'Burp for about 10–15 minutes until the burp comes',
      'If milk comes back, turn the baby to the side at once to prevent aspiration',
      'Keep a good position during feeds to avoid swallowing too much air'
    ],
    warnings: [
      'Frequent projectile vomiting, poor weight gain, or yellow-green or bloody vomit → see a doctor promptly',
      'Do not pick the baby up straight away when milk comes back — turn to the side first',
      'Pat with a cupped hand, gently'
    ],
    segments: [
      { title: 'Get into position', text: 'Hold the baby upright after the feed, head on your shoulder, body slightly tilted back' },
      { title: 'Burp with a cupped hand', text: 'Pat the back gently with a cupped hand, from bottom to top (this lesson shows 20 seconds)' },
      { title: 'Burping practice', text: 'Pat the back with the rhythm; this lesson shows 20 seconds' },
      { title: 'Look for the burp', text: 'Once you hear the burp you are done; if not, change sides and pat a few more minutes' },
      { title: 'If milk comes back', text: 'Turn the baby to the side at once, clear the mouth and nose and prevent choking' }
    ]
  },
  {
    id: 'baby_bath',
    name: 'Bathing Your Baby',
    short: 'Bath Care',
    description: 'Right water temperature, safe support, moisturize after; never leave the baby alone.',
    keyPoints: [
      'Room 26–28°C, water 37–38°C (test with your elbow)',
      'Support the head and neck and never take both hands off the baby',
      'Bath for 5–10 minutes, not longer',
      'Pat dry and moisturize immediately after'
    ],
    warnings: [
      'Never leave the baby alone in the bath, not even for a second',
      '5–8 cm of water is enough — do not fill it deeper',
      'Do not let a heat lamp shine into the baby’s eyes',
      'Before the cord stump falls off, keep it dry and out of the water'
    ],
    segments: [
      { title: 'Prepare supplies', text: 'Get the tub, warm water, towel, lotion and clean clothes ready' },
      { title: 'Test the water', text: 'Test with your elbow — 37–38°C, warm but not hot' },
      { title: 'Lower the baby in', text: 'One hand supports the head and neck, the other the bottom; ease in feet first' },
      { title: 'Washing practice', text: 'Wash gently with a soft towel (this lesson shows 30 seconds)' },
      { title: 'Dry and moisturize', text: 'Lift the baby out and pat dry at once, then apply lotion' }
    ]
  },
  {
    id: 'baby_fever',
    name: 'Infant Fever Care',
    short: 'Fever Care',
    description: 'Measure correctly, cool physically, watch alertness; fever in very young babies needs a doctor.',
    keyPoints: [
      'Use a digital thermometer for armpit or ear temperature to judge the fever',
      'Light clothing to release heat, more milk or water to stay hydrated',
      'Above 38.5°C with obvious discomfort, use antipyretics as advised by a doctor',
      'Watch alertness, feeding and urine output'
    ],
    warnings: [
      'Fever (≥38°C) in a baby under 3 months → hospital immediately',
      'Lethargy, refusing feeds, convulsions, fast breathing or rash → see a doctor promptly',
      'Do not bundle up to sweat, and never sponge with alcohol — risk of a sudden temperature drop or poisoning'
    ],
    segments: [
      { title: 'Measure correctly', text: 'Take armpit or ear temperature with a digital thermometer and record the value and time' },
      { title: 'Release heat', text: 'Loosen extra clothing, ventilate the room and keep a comfortable temperature' },
      { title: 'Keep hydrated', text: 'Offer more milk or water and check that urine output is normal' },
      { title: 'Physical cooling practice', text: 'Wipe the forehead, armpits and groin with a lukewarm towel (this lesson shows 30 seconds)' },
      { title: 'Watch alertness', text: 'Alert, playing and feeding → observe at home; lethargic → see a doctor' },
      { title: 'When to see a doctor', text: 'Very young baby, very high fever, convulsions or abnormal breathing → see a doctor promptly' }
    ]
  },
  {
    id: 'baby_diaper_change',
    name: 'Changing a Nappy',
    short: 'Nappy Change',
    description: 'The full nappy routine: cleaning order, drying, barrier cream — preventing rash and leaks.',
    keyPoints: [
      'Prepare a fresh nappy, warm-water wipes, barrier cream and a changing mat',
      'Cleaning order: wipe the front first, then the back; for girls always front to back',
      'Dry thoroughly before putting on the fresh nappy to prevent rash',
      'Leave one finger of slack at the waist and tidy the leak guards'
    ],
    warnings: [
      'Always keep one hand on the baby so they cannot roll off',
      'For boys, cover the penis with a clean cloth to avoid spraying',
      'For girls always wipe front to back so stool does not reach the urethra',
      'Change right after a bowel movement; check every 2–3 hours'
    ],
    segments: [
      { title: 'Prepare supplies', text: 'Have a fresh nappy, warm-water wipes, barrier cream and mat within reach' },
      { title: 'Open the soiled nappy', text: 'Support both ankles with one hand, lift the legs gently, open and slide out the nappy, roll it up and bin it' },
      { title: 'Wipe front to back', text: 'Wipe gently front to back with warm-water wipes; for girls especially avoid contaminating the urethra' },
      { title: 'Drying practice', text: 'Keep the baby lying face up and let the bottom dry completely (this lesson shows 20 seconds)' },
      { title: 'Barrier cream', text: 'Apply a thin layer of barrier cream to form a protective film before the fresh nappy' },
      { title: 'Put on the fresh nappy', text: 'Lift the legs, slide the nappy under, leave one finger of slack at the waist and fold out the leak guards' },
      { title: 'Finish and check', text: 'Dress the baby and check the fit; change straight after a bowel movement to prevent rash' }
    ]
  },
  {
    id: 'baby_hold',
    name: 'Holding Your Baby by Age',
    short: 'Holding',
    description: 'Cradle hold at 0–3 months, brief upright hold at 3–6 months, seated hold from 6 months — always support head, neck and hips.',
    keyPoints: [
      '0–3 months: mostly cradle hold, always supporting the head, neck and hips (the neck has no strength yet)',
      '3–6 months: brief upright holds, head on your shoulder, one hand on the head and neck, one on the bottom',
      '6 months+: forward-facing seated hold, still supporting the lower back',
      'Lift and put down slowly, keeping the baby close to your body'
    ],
    warnings: [
      'A newborn’s neck is very fragile — never shake the baby',
      'Keep upright holding short and check the baby is comfortable',
      'Always support firmly, especially the head and neck — never leave them unsupported'
    ],
    segments: [
      { title: 'Check the age', text: '0–3 months cradle hold, 3–6 months brief upright hold, 6 months+ seated hold' },
      { title: 'Cradle hold (0–3 months)', text: 'Rest the head and neck in the crook of your arm, support the hips with the other hand, keep the baby against your chest' },
      { title: 'Cradle hold practice', text: 'Hold the position and feel the support on the head, neck and hips (this lesson shows 20 seconds)' },
      { title: 'Upright hold (3–6 months)', text: 'Head on your shoulder, one hand on the head and neck, one on the bottom, body close' },
      { title: 'Upright hold practice', text: 'Keep the upright hold and protect the head and neck (this lesson shows 20 seconds)' },
      { title: 'Seated hold (6 months+)', text: 'Let the baby sit facing forward in the crook of your arm, one arm around the chest and tummy to support the back' },
      { title: 'Putting down', text: 'Lower slowly close to the mattress, bottom first then head, with gentle movements' }
    ]
  },
  {
    id: 'baby_cord',
    name: 'Newborn Umbilical Cord Care',
    short: 'Cord Care',
    description: 'Daily cleaning before the stump falls off (about 1–2 weeks after birth) to prevent infection.',
    keyPoints: [
      'Clean 1–2 times a day with 75% alcohol or iodophor, working from the centre outwards',
      'Keep the area dry and airy; fold the nappy edge down to avoid rubbing',
      'Use a waterproof cover in the bath or keep the area dry, and clean it straight after',
      'The stump usually falls off naturally within 1–2 weeks — never pull it'
    ],
    warnings: [
      'Redness around the cord, discharge, odour or persistent bleeding → hospital immediately',
      'Do not apply talcum powder or oil to the cord',
      'Never pull the cord stump off — let it fall naturally'
    ],
    segments: [
      { title: 'Prepare supplies', text: 'Get 75% alcohol or iodophor and sterile cotton buds ready, and wash your hands' },
      { title: 'Expose the cord', text: 'Lift the cord gently to expose the base and keep the baby warm' },
      { title: 'Clean from the centre out', text: 'Dip a cotton bud in the antiseptic and clean in circles from the centre of the base outwards' },
      { title: 'Cleaning practice', text: 'Clean gently from the centre of the base outwards (this lesson shows 20 seconds)' },
      { title: 'Keep it dry', text: 'Fold the top edge of the nappy down so the cord stays dry and is not rubbed' },
      { title: 'Watch and seek care', text: 'Redness, discharge, odour or persistent bleeding → see a doctor promptly' }
    ]
  },
  {
    id: 'baby_massage',
    name: 'Infant Massage',
    short: 'Massage',
    description: 'Gentle massage that builds bonding and development: head and face, chest and tummy, limbs, back.',
    keyPoints: [
      'Do it when the baby is awake, about an hour after a feed, room 26–28°C',
      'Order: head and face → chest and tummy → limbs → back, with gentle strokes',
      'Use baby oil to reduce friction',
      'Pause if the baby cries or refuses — never force it'
    ],
    warnings: [
      'Avoid the navel area before the cord falls off',
      'Use light pressure and watch the baby’s expression',
      'Skip massage during fever or when the skin is broken'
    ],
    segments: [
      { title: 'Prepare the room', text: 'Room 26–28°C, lay a soft mat, warm the oil between your palms' },
      { title: 'Head and face', text: 'Stroke gently from between the brows outwards, small circles on the cheeks, avoiding the fontanelle' },
      { title: 'Chest', text: 'Draw gentle crossing circles over the chest, avoiding the nipples' },
      { title: 'Tummy', text: 'Rub the tummy gently clockwise, avoiding the navel' },
      { title: 'Tummy practice', text: 'Gentle clockwise circles (this lesson shows 20 seconds)' },
      { title: 'Limbs', text: 'Knead the limbs gently, stroking from the base towards the ends' },
      { title: 'Back', text: 'With the baby face down, stroke gently down both sides of the spine' },
      { title: 'Finish and observe', text: 'Watch the baby’s reaction and stop at once if they cry or seem uncomfortable' }
    ]
  },
  {
    id: 'baby_fever_guide',
    name: 'Fever Management',
    short: 'Low & High Fever',
    description: 'Physical cooling for low fever, antipyretics for high fever with a dosing guide, plus warning signs — cool safely, never bundle up.',
    keyPoints: [
      'Armpit ≥37.5°C is fever; 37.5–38.4°C is low fever and can be managed physically first; above 38.5°C with discomfort, use antipyretics',
      'Low fever: fewer clothes, lukewarm sponge, more fluids, watch alertness',
      'High fever: paracetamol (≥3 months) 10–15 mg/kg per dose every 4–6 h, max 4 doses/24 h; ibuprofen (≥6 months) 5–10 mg/kg every 6–8 h, max 4 doses/24 h',
      'Never sponge with alcohol and never bundle up to sweat; do not medicate babies under 3 months yourself'
    ],
    warnings: [
      'Paracetamol overdose harms the liver and ibuprofen overdose harms the kidneys — always dose by weight and interval',
      'Do not alternate or combine the two antipyretics unless a doctor has specifically advised it',
      'Never give aspirin to infants (it can trigger Reye’s syndrome)',
      'If fever does not come down or keeps returning, see a doctor promptly'
    ],
    segments: [
      { title: 'Confirm the fever', text: 'Take armpit temperature; ≥37.5°C is fever — first check alertness and feeding' },
      { title: 'Low fever (37.5–38.4°C)', text: 'Fewer clothes, open the window, wipe the neck, armpits and groin with lukewarm water around 37°C; offer more water or breast milk' },
      { title: 'Watch low fever', text: 'Alert, eating and playing → observe at home and recheck every 4–6 hours; no need to rush to medicine' },
      { title: 'Before treating high fever', text: 'Only consider antipyretics when temperature ≥38.5°C and the baby is clearly uncomfortable (crying, irritable, lethargic)' },
      { title: 'Paracetamol dosing', text: '≥3 months: 10–15 mg/kg per dose (about 60–90 mg for a 6 kg baby), every 4–6 hours, max 4 doses in 24 hours' },
      { title: 'Ibuprofen dosing', text: '≥6 months: 5–10 mg/kg per dose (about 40–80 mg for an 8 kg baby), every 6–8 hours, max 4 doses in 24 hours' },
      { title: 'Do not do these', text: 'Never sponge with alcohol, never bundle up to sweat; no aspirin; do not alternate the two antipyretics yourself; no medication under 3 months — go straight to a doctor' },
      { title: 'Fluids and monitoring', text: 'Offer extra water or breast milk to prevent dehydration, check the temperature often and watch alertness, breathing and any rash' },
      { title: 'When to see a doctor', text: 'Under 3 months, fever over 72 hours, convulsions, lethargy or drowsiness, fast breathing, refusing feeds or dehydration, rash with petechiae → see a doctor immediately' }
    ]
  },
  {
    id: 'postpartum_kegel',
    name: 'Kegel Exercises at Home',
    short: 'Kegel',
    description: 'Pelvic floor training: squeeze 5 seconds, relax 5 seconds, 10 reps per set, 3 sets a day.',
    keyPoints: [
      'Squeeze the pelvic floor (as if holding in urine or wind) and hold for 5 seconds',
      'Relax for 5 seconds, then repeat; 10 reps make a set',
      'Do 3 sets a day — while feeding or watching TV works well',
      'Results usually appear after 4–8 weeks of consistency'
    ],
    warnings: [
      'Empty your bladder before training',
      'Do not hold your breath or compensate with the abdominal and gluteal muscles',
      'With a hypertonic or painful pelvic floor, do not force training — ask a physiotherapist first'
    ],
    segments: [
      { title: 'Check the timing', text: 'Make sure it is safe to start (1 week after a vaginal birth, 6 weeks after a caesarean), and empty your bladder' },
      { title: 'Find the pelvic floor', text: 'Try the feeling of stopping urine mid-flow, or use a mirror to see the perineum lift' },
      {
        label: 'sets',
        children: [
          { title: 'Squeeze and hold', text: 'Squeeze the pelvic floor and hold for 5 seconds (do not hold your breath)' },
          { title: 'Relax', text: 'Relax completely for 5 seconds' }
        ]
      },
      { title: 'Complete a set', text: 'You have done 5 reps; aim for 3 sets a day and 4–8 weeks for results' }
    ]
  },
  {
    id: 'postpartum_glute',
    name: 'Postpartum Glute Bridge',
    short: 'Glute Bridge',
    description: 'Glute bridge: lying on your back with knees bent, lift the hips to activate the glutes and ease back strain.',
    keyPoints: [
      'Lie on your back, knees bent, feet flat on the floor shoulder-width apart',
      'Squeeze the glutes to lift the hips until the body forms a straight line',
      'Hold 2–3 seconds and lower slowly, 10–15 reps per set',
      'Move slowly and breathe out on the effort'
    ],
    warnings: [
      'If your lower back complains, reduce the range — do not use the back to compensate',
      'Avoid stretching the area while a caesarean wound is healing',
      'If pain is marked or lochia suddenly increases → stop and ask a doctor'
    ],
    segments: [
      { title: 'Check the timing', text: 'Make sure it is safe to start (2 weeks after a vaginal birth, 6 weeks after a caesarean)' },
      { title: 'Set up lying down', text: 'Lie on your back, knees bent, feet flat shoulder-width apart, arms by your sides' },
      {
        label: 'sets',
        children: [
          { title: 'Lift the hips', text: 'Squeeze the glutes and lift, hold 2 seconds then lower' },
          { title: 'Rest between sets', text: 'Relax for 10 seconds and reset your breathing' }
        ]
      },
      { title: 'Finish the session', text: 'You have done 3 sets; 1–2 sessions a day, with consistency you will see results' }
    ]
  },
  {
    id: 'postpartum_abs',
    name: 'Postpartum Core Recovery',
    short: 'Core Training',
    description: 'Diaphragmatic breathing plus pelvic tilts wake up the deep abdominals; check for separation before training.',
    keyPoints: [
      'Check abdominal separation first (within two fingers is fine)',
      'Diaphragmatic breathing: the belly expands on inhale and draws in on exhale',
      'Combine with a posterior pelvic tilt and Kegel exercises',
      'Progress gradually and avoid crunches and sit-ups'
    ],
    warnings: [
      'With obvious separation, avoid crunches, sit-ups and lifting heavy objects',
      'Keep the lower back on the floor during training — do not let it compensate',
      'Pain, dizziness or abnormal lochia → stop and ask a doctor'
    ],
    segments: [
      { title: 'Check for separation', text: 'Lie on your back with knees bent, lift the head to look at the navel and feel the gap along the midline with your fingers' },
      { title: 'Diaphragmatic breathing', text: 'The belly rises on the inhale and draws back towards the spine on the exhale' },
      {
        label: 'sets',
        children: [
          { title: 'Draw in and breathe', text: 'Exhale and draw the belly in, feel the abdominals engage, hold 5 seconds' },
          { title: 'Relax and inhale', text: 'Relax and breathe naturally for 5 seconds' }
        ]
      },
      { title: 'Finish the session', text: 'Do 2–3 sets of diaphragmatic breathing a day, together with Kegels, to rebuild your core' }
    ]
  },
  {
    id: 'postpartum_lochia',
    name: 'Watching Postpartum Lochia',
    short: 'Lochia',
    description: 'Track the colour, amount and smell of lochia and recognize anything abnormal in time.',
    keyPoints: [
      'Colour changes: bloody (red) → serous (pale red) → white, usually settled within 4–6 weeks',
      'Change sanitary pads often, wash the vulva with warm water daily and keep it dry',
      'Watch changes in amount, colour and smell'
    ],
    warnings: [
      'A sudden increase in lochia, large clots or a foul smell → see a doctor promptly',
      'Soaking a whole pad within an hour suggests heavy bleeding',
      'Fever, abdominal pain, dizziness or palpitations → hospital immediately'
    ],
    segments: [
      { title: 'Know the lochia', text: 'Lochia is the discharge as the uterus recovers after birth; the colour fades from red onwards' },
      { title: 'Watch the colour', text: 'Bloody red for 3–4 days, serous pale red for about a week, then white, fading day by day' },
      { title: 'Watch amount and smell', text: 'The amount should decrease gradually with no foul smell; change pads often and note the changes' },
      { title: 'Perineal care', text: 'Wash the vulva with warm water twice a day, wipe front to back and keep it dry' },
      { title: 'Abnormal signs — see a doctor', text: 'Sudden increase, large clots, foul smell, fever or abdominal pain → hospital immediately' }
    ]
  },
  {
    id: 'postpartum_csection',
    name: 'C-section Wound Care',
    short: 'Wound Care',
    description: 'Keep the wound clean and dry, watch the healing and avoid stretching or infection.',
    keyPoints: [
      'Keep the wound and dressing clean and dry, and change dressings as advised',
      'Watch for redness, swelling, heat, pain and discharge',
      'Avoid lifting heavy objects; press on the wound when coughing hard',
      'Let the scab fall off naturally — do not pick it'
    ],
    warnings: [
      'Worsening redness, swelling, heat or pain, purulent discharge or fever → see a doctor promptly',
      'If the dressing becomes wet, change it and tell the medical staff',
      'Follow advice about bathing; keep the wound away from water until healed'
    ],
    segments: [
      { title: 'Keep it dry', text: 'Keep the wound and dressing dry and wipe away sweat promptly' },
      { title: 'Watch the healing', text: 'Check the wound every day for redness, swelling, discharge or opening' },
      { title: 'Avoid stretching', text: 'Press gently on the wound when coughing or sneezing, and avoid lifting heavy objects' },
      { title: 'Change dressings on time', text: 'Change dressings as advised and let the scab fall off naturally' },
      { title: 'Abnormal signs — see a doctor', text: 'Worsening redness, swelling, heat or pain, purulent discharge or fever → see a doctor promptly' }
    ]
  },
  {
    id: 'postpartum_breast',
    name: 'Blocked Ducts & Breast Care',
    short: 'Blocked Duct',
    description: 'Empty the breast often, warm and cold compresses, gentle massage; recognize mastitis in time.',
    keyPoints: [
      'Feed on demand and empty the breasts often to avoid long periods of engorgement',
      'Warm compress before feeds, cold compress after to ease the ache',
      'Massage gently from the lump towards the nipple',
      'Pointing the baby’s chin towards the lump helps drainage'
    ],
    warnings: [
      'Red, hot, painful breast with fever, chills or feeling unwell → possible mastitis, see a doctor promptly',
      'Do not rub hard — it can damage the breast tissue',
      'Treat cracked nipples promptly and keep the areola clean'
    ],
    segments: [
      { title: 'Empty often', text: 'Feed on demand, alternating sides, and avoid milk pooling' },
      { title: 'Warm compress before feeds', text: 'Warm-compress the breast for 3–5 minutes before feeding to help milk flow' },
      { title: 'Gentle massage', text: 'Massage in gentle circles from the lump towards the nipple (this lesson shows 20 seconds)' },
      { title: 'Massage practice', text: 'Use gentle strokes and massage (this lesson shows 20 seconds)' },
      { title: 'Cold compress after feeds', text: 'Cold-compress the breast for 10 minutes after feeding to ease the ache and swelling' },
      { title: 'Recognize mastitis', text: 'Redness, heat, pain with fever → see a doctor promptly, do not tough it out' }
    ]
  },
  {
    id: 'postpartum_mood',
    name: 'Postpartum Emotions',
    short: 'Emotional Care',
    description: 'Recognize postpartum mood swings and depression, and learn to self-regulate and ask for help.',
    keyPoints: [
      'Postpartum mood swings (tearfulness, anxiety) are mostly hormonal and usually settle on their own',
      'Protect sleep, move a little and talk to family and friends',
      'Low mood lasting over 2 weeks or affecting daily life → see a doctor promptly',
      'Family members can help by understanding and sharing the care'
    ],
    warnings: [
      'Thoughts of harming yourself or the baby → seek professional help immediately / call a mental health hotline',
      'Postpartum depression is an illness — “just cheer up” does not fix it',
      'Severe insomnia, marked appetite or weight change, loss of interest → see a doctor promptly'
    ],
    segments: [
      { title: 'Recognize the emotions', text: 'Tell apart the short postpartum mood swings and persistent postpartum depression' },
      { title: 'Protect your rest', text: 'Rest whenever you can and let family share night feeds and housework' },
      { title: 'Talk and get support', text: 'Talk to your partner, family and friends and say what you need' },
      { title: 'Self-regulation', text: 'Keep a little time for yourself each day — a walk, some music' },
      { title: 'Signs to get help', text: 'Low mood over 2 weeks, or thoughts of harm → seek medical help immediately' }
    ]
  },
  {
    id: 'heatstroke',
    name: 'Heatstroke First Aid',
    short: 'Heatstroke',
    description: 'Move to shade, cool down fast, replace fluids; severe heatstroke needs immediate medical care.',
    keyPoints: [
      'Move to a cool, ventilated place at once and loosen clothing',
      'Cool the forehead, neck, armpits and groin with cool towels or ice packs',
      'If conscious, sip diluted salt water or a sports drink in small amounts',
      'Temperature still rising or confusion → medical care immediately'
    ],
    warnings: [
      'Do not force a large amount of water at once — risk of water intoxication',
      'Do not sponge with alcohol',
      'High fever, convulsions or unconsciousness → call 120 at once'
    ],
    segments: [
      { title: 'Move to shade', text: 'Move the person to a cool, ventilated place, lie them flat and loosen their collar' },
      { title: 'Cool the body', text: 'Apply cool towels or ice packs to the forehead, neck, armpits and groin — the large blood vessels' },
      { title: 'Cool and watch', text: 'Keep cooling and observing; this lesson shows 30 seconds' },
      { title: 'Replace fluids', text: 'If conscious, sip diluted salt water or a sports drink in small amounts' },
      { title: 'Decide on medical care', text: 'Temperature still high, confusion or convulsions → call 120 at once' }
    ]
  },
  {
    id: 'adult_drowning',
    name: 'Adult Drowning First Aid',
    short: 'Drowning',
    description: 'Rescue safely, clear the mouth and nose, check breathing; no breathing → start CPR and call 120.',
    keyPoints: [
      'Make sure you are safe first, rescue with equipment — do not jump in blindly',
      'Once on shore, clear the mouth and nose and open the airway',
      'Check breathing: no breathing → start CPR at once',
      'Even after recovery, go to hospital for 24-hour observation'
    ],
    warnings: [
      'Protect yourself during the rescue to avoid a second drowning',
      'Do not hang the person upside down to drain water — it delays CPR',
      'No breathing and no pulse → start CPR and call 120 at once'
    ],
    segments: [
      { title: 'Rescue safely', text: 'Use a pole, rope or life ring to rescue; avoid entering the water yourself' },
      { title: 'Clear mouth and nose', text: 'On shore, turn the head to the side and clear mud, weeds and water, then open the airway' },
      { title: 'Check breathing', text: 'Watch the chest rise for 5–10 seconds to see whether there is breathing' },
      { title: '30 chest compressions', text: 'No breathing → start chest compressions, 30 compressions then 2 rescue breaths (this lesson shows the rhythm)' },
      { title: 'Call 120', text: 'Continue CPR until the ambulance arrives; once breathing returns, place on the side, keep warm and send to hospital' }
    ]
  },
  {
    id: 'electric_shock',
    name: 'Electric Shock First Aid',
    short: 'Electric Shock',
    description: 'Cut the power and separate the casualty from the source first; no breathing → start CPR.',
    keyPoints: [
      'Cut the power or move the wire away at once and confirm it is dead before touching anyone',
      'Use a dry wooden stick or an insulator to separate the casualty from the source',
      'Never pull the casualty with your bare hands',
      'No breathing and no pulse → start CPR and call 120 at once'
    ],
    warnings: [
      'Always confirm the power is off before rescuing so you are not shocked too',
      'Do not touch anything with bare hands in a wet environment',
      'See a doctor even with mild symptoms (internal or heart rhythm injury is possible)'
    ],
    segments: [
      { title: 'Cut the power', text: 'Switch off the power or unplug at once and confirm it is dead' },
      { title: 'Move the wire away', text: 'Use a dry wooden stick, plastic or another insulator — never your bare hands' },
      { title: 'Check consciousness and breathing', text: 'Tap and call to check responsiveness and watch for breathing' },
      { title: '30 chest compressions', text: 'No breathing → start 30 chest compressions (this lesson shows the rhythm)' },
      { title: 'Call 120', text: 'Continue CPR and call 120; even mild symptoms need a hospital check' }
    ]
  },
  {
    id: 'fracture',
    name: 'Fracture Immobilization',
    short: 'Fracture',
    description: 'Immobilize first and apply cold to ease pain; for open fractures stop the bleeding before splinting.',
    keyPoints: [
      'Immobilize the injured limb first and do not move it unnecessarily',
      'Splint with a board covering the joints above and below the fracture',
      'Tight enough to slip one finger under — do not compress nerves or vessels',
      'For open fractures, stop the bleeding and bandage before splinting'
    ],
    warnings: [
      'Do not try to set the bone and do not pull on the limb',
      'Numbness, paleness or coldness means the splint is too tight — loosen it',
      'Suspected spine or neck fracture → do not move the person, wait for professional rescue'
    ],
    segments: [
      { title: 'Immobilize', text: 'Keep the casualty comfortable and do not move the injured limb' },
      { title: 'Stop the bleeding', text: 'For open fractures, apply pressure and bandage first; do not pull out embedded objects' },
      { title: 'Splint', text: 'Use a board, stiff cardboard or the other limb, covering the joints above and below the fracture' },
      { title: 'Check the splint', text: 'Check the tightness and the circulation at the extremities; this lesson shows 20 seconds' },
      { title: 'Send to hospital', text: 'Send to hospital promptly after splinting; for spine injuries wait for professional rescue' }
    ]
  },
  {
    id: 'nosebleed',
    name: 'Nosebleed Care',
    short: 'Nosebleed',
    description: 'Sit leaning forward, pinch the nostrils, cool the bridge of the nose; persistent bleeding needs medical care.',
    keyPoints: [
      'Sit upright and lean forward — do not tilt the head back (blood can run down the throat)',
      'Pinch both nostrils with thumb and index finger for 10 minutes',
      'Cool the bridge of the nose and forehead to constrict the vessels',
      'Bleeding that will not stop, is heavy, or keeps recurring → see a doctor promptly'
    ],
    warnings: [
      'Do not tilt the head back and do not stuff in tissue (it can injure again)',
      'Blood running into the throat should be spat out, not swallowed',
      'High blood pressure, a bleeding disorder, or bleeding over 20 minutes → see a doctor promptly'
    ],
    segments: [
      { title: 'Sit and lean forward', text: 'Sit upright with the head slightly forward so blood can run out' },
      { title: 'Pinch the nostrils', text: 'Pinch both nostrils with thumb and index finger (this lesson shows 10 seconds)' },
      { title: 'Keep pinching', text: 'Keep pinching for 10 minutes; this lesson shows 20 seconds' },
      { title: 'Cool compress', text: 'Apply a cool towel or ice pack to the bridge of the nose and forehead to help stop the bleeding' },
      { title: 'Decide on medical care', text: 'Bleeding over 20 minutes, heavy or recurring → see a doctor promptly' }
    ]
  },
  {
    id: 'animal_bite',
    name: 'Animal Bite Care',
    short: 'Animal Bite',
    description: 'Rinse and disinfect the wound, stop bleeding and bandage; dog or cat bites need a rabies risk assessment.',
    keyPoints: [
      'Rinse the wound with running water and soap for at least 15 minutes',
      'After rinsing, disinfect with iodophor and apply a pressure bandage if bleeding',
      'Dog or cat bites and scratches → see a doctor soon to assess rabies vaccination',
      'Note details of the animal for follow-up'
    ],
    warnings: [
      'Do not suck the wound with your mouth',
      'Deep or large wounds, or bleeding that will not stop → see a doctor promptly',
      'Bitten by a stray or wild animal → hospital immediately'
    ],
    segments: [
      { title: 'Rinse the wound', text: 'Rinse with running water and soap for at least 15 minutes (this lesson shows 30 seconds)' },
      { title: 'Rinsing practice', text: 'Keep rinsing the wound; this lesson shows 30 seconds' },
      { title: 'Disinfect and stop bleeding', text: 'After rinsing, disinfect with iodophor and apply a pressure bandage if bleeding is obvious' },
      { title: 'Assess and seek care', text: 'Dog or cat bite, a deep wound, or a wild animal bite → see a doctor immediately' },
      { title: 'Note the animal', text: 'Record the animal and its vaccination status for follow-up' }
    ]
  }
];
