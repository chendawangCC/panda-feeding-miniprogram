// 跟做页步骤图示映射：技能 id → 按 flattenSkill 展开后的步骤顺序排列的图片名
// 不直接写完整路径，统一在 getStepImage 中拼接，便于校验与复用。
const BASE = '/subchart-assets/firstaid/'

const STEP_IMAGES = {
  adult_cpr: [
    'adult_cpr_safe', 'adult_cpr_judge', 'adult_cpr_call', 'adult_cpr_press', 'adult_cpr_breath', 'adult_cpr_press',
    'adult_cpr_breath', 'adult_cpr_press', 'adult_cpr_breath', 'adult_cpr_press', 'adult_cpr_breath', 'adult_cpr_press',
    'adult_cpr_breath', 'adult_cpr_judge',
  ],
  adult_heimlich: [
    'adult_heimlich_judge', 'adult_heimlich_stand', 'adult_heimlich_fist', 'adult_heimlich_impact', 'adult_heimlich_step0_judge', 'adult_heimlich_impact',
    'adult_heimlich_step0_judge', 'adult_heimlich_impact', 'adult_heimlich_step0_judge', 'adult_heimlich_step5_unconscious',
  ],
  infant_choking: [
    'infant_choking_judge', 'infant_choking_step1_position', 'infant_choking_step2_pat_back', 'infant_cpr_step2_press', 'infant_choking_step2_pat_back', 'infant_cpr_step2_press',
    'infant_choking_step2_pat_back', 'infant_cpr_step2_press', 'infant_choking_step5_recover', 'infant_choking_step6_unconscious',
  ],
  infant_cpr: [
    'infant_cpr_step0_judge', 'infant_cpr_step1_call', 'infant_cpr_step0_press', 'infant_cpr_step1_breath', 'infant_cpr_step2_press', 'infant_cpr_step3_breath',
    'infant_cpr_step0_press', 'infant_cpr_step1_breath', 'infant_cpr_step2_press', 'infant_cpr_step3_breath', 'infant_cpr_step0_press', 'infant_cpr_step1_breath',
    'infant_cpr_step5_recover',
  ],
  infant_fall: [
    'infant_fall_calm', 'infant_fall_check', 'infant_fall_step0_check', 'infant_fall_soothe', 'infant_fall_check',
  ],
  infant_fever_seizure: [
    'infant_seizure_side', 'infant_seizure_move', 'seizure_time', 'seizure_time', 'infant_seizure_cool', 'infant_cpr_step1_call',
  ],
  infant_milk_choking: [
    'infant_milk_side', 'infant_milk_pat', 'infant_milk_clean', 'infant_milk_clean', 'infant_cpr_step1_call',
  ],
  infant_swallow: [
    'infant_swallow_judge', 'infant_choking_step1_position', 'infant_swallow_digest', 'infant_swallow_observe', 'infant_swallow_observe',
  ],
  infant_drowning: [
    'infant_drowning_clean', 'infant_drowning_clean', 'infant_drowning_check', 'infant_cpr_step2_press', 'infant_drowning_hospital',
  ],
  bleeding: [
    'bleeding_gloves', 'bleeding_press', 'bleeding_step0_press', 'bleeding_elevate', 'bleeding_step1_bandage', 'bleeding_bandage',
  ],
  burn: [
    'burn_flush', 'burn_remove', 'burn_soak', 'burn_cover', 'burn_hospital',
  ],
  sprain: [
    'sprain_rest', 'sprain_ice', 'sprain_compress', 'bleeding_elevate', 'sprain_followup',
  ],
  seizure: [
    'seizure_protect', 'seizure_time', 'seizure_side', 'seizure_side', 'infant_cpr_step1_call',
  ],
  baby_eczema: [
    'baby_eczema_moisturize', 'baby_bath_wash', 'baby_eczema_moisturize', 'baby_eczema_moisturize', 'baby_diaper_change', 'infant_fall_check',
  ],
  baby_mosquito: [
    'baby_mosquito_repel', 'baby_mosquito_repel', 'baby_mosquito_repel', 'baby_eczema_moisturize', 'infant_fall_check',
  ],
  baby_diaper: [
    'baby_diaper_change', 'baby_diaper_cream', 'baby_diaper_change', 'baby_diaper_change', 'baby_diaper_cream', 'infant_fall_check',
  ],
  baby_burp: [
    'baby_burp_pat', 'baby_burp_pat', 'baby_burp_pat', 'baby_burp_pat', 'infant_milk_side',
  ],
  baby_bath: [
    'baby_bath_wash', 'baby_bath_wash', 'baby_bath_wash', 'baby_bath_wash', 'baby_eczema_moisturize',
  ],
  baby_fever: [
    'baby_fever_cool', 'baby_fever_cool', 'baby_fever_cool', 'baby_fever_cool', 'baby_fever_cool', 'infant_fall_check',
  ],
  baby_diaper_change: [
    'baby_diaper_change', 'baby_diaper_change', 'baby_diaper_change', 'baby_diaper_change', 'baby_diaper_cream', 'baby_diaper_change',
    'baby_diaper_change',
  ],
  baby_hold: [
    'baby_hold_cradle', 'baby_hold_cradle', 'baby_hold_cradle', 'baby_hold_cradle', 'baby_hold_cradle', 'baby_hold_cradle',
    'baby_hold_cradle',
  ],
  baby_cord: [
    'baby_cord_clean', 'baby_cord_clean', 'baby_cord_clean', 'baby_cord_clean', 'baby_cord_clean', 'infant_fall_check',
  ],
  baby_massage: [
    'baby_massage_abdomen', 'baby_massage_abdomen', 'baby_massage_abdomen', 'baby_massage_abdomen', 'baby_massage_abdomen', 'baby_massage_abdomen',
    'baby_massage_abdomen', 'baby_massage_abdomen',
  ],
  baby_fever_guide: [
    'baby_fever_cool', 'baby_fever_cool', 'baby_fever_cool', 'baby_fever_cool', 'baby_fever_cool', 'baby_fever_cool',
    'baby_fever_cool', 'baby_fever_cool', 'infant_fall_check',
  ],
  postpartum_kegel: [
    'postpartum_kegel', 'postpartum_kegel', 'postpartum_kegel', 'postpartum_kegel', 'postpartum_kegel', 'postpartum_kegel',
    'postpartum_kegel', 'postpartum_kegel', 'postpartum_kegel', 'postpartum_kegel', 'postpartum_kegel', 'postpartum_kegel',
    'postpartum_kegel',
  ],
  postpartum_glute: [
    'postpartum_glute', 'postpartum_glute', 'postpartum_glute', 'postpartum_glute', 'postpartum_glute', 'postpartum_glute',
    'postpartum_glute', 'postpartum_glute', 'postpartum_glute',
  ],
  postpartum_abs: [
    'postpartum_abs', 'postpartum_abs', 'postpartum_abs', 'postpartum_abs', 'postpartum_abs', 'postpartum_abs',
    'postpartum_abs', 'postpartum_abs', 'postpartum_abs', 'postpartum_abs', 'postpartum_abs', 'postpartum_abs',
    'postpartum_abs',
  ],
  postpartum_lochia: [
    'postpartum_lochia_observe', 'postpartum_lochia_observe', 'postpartum_lochia_observe', 'postpartum_lochia_observe', 'postpartum_lochia_observe',
  ],
  postpartum_csection: [
    'postpartum_csection', 'postpartum_csection', 'postpartum_csection', 'postpartum_csection', 'postpartum_csection',
  ],
  postpartum_breast: [
    'postpartum_breast_care', 'postpartum_breast_care', 'postpartum_breast_care', 'postpartum_breast_care', 'postpartum_breast_care', 'postpartum_breast_care',
  ],
  postpartum_mood: [
    'postpartum_mood', 'postpartum_mood', 'postpartum_mood', 'postpartum_mood', 'postpartum_mood',
  ],
  heatstroke: [
    'heatstroke_cool', 'heatstroke_cool', 'heatstroke_cool', 'heatstroke_cool', 'heatstroke_cool',
  ],
  adult_drowning: [
    'adult_drowning_rescue', 'adult_drowning_rescue', 'adult_cpr_judge', 'adult_cpr_press', 'adult_cpr_call',
  ],
  electric_shock: [
    'electric_shock_safe', 'electric_shock_safe', 'adult_cpr_judge', 'adult_cpr_press', 'adult_cpr_call',
  ],
  fracture: [
    'fracture_splint', 'bleeding_press', 'fracture_splint', 'fracture_splint', 'burn_hospital',
  ],
  nosebleed: [
    'nosebleed_press', 'nosebleed_press', 'nosebleed_press', 'nosebleed_press', 'infant_cpr_step1_call',
  ],
  animal_bite: [
    'animal_bite_wash', 'animal_bite_wash', 'bleeding_bandage', 'infant_fall_check', 'animal_bite_wash',
  ],
}

function getStepImage(skillId, index, total) {
  const arr = STEP_IMAGES[skillId]
  if (!arr || !arr.length) return ''
  const i = Math.max(0, Math.min(Number(index) || 0, arr.length - 1))
  return BASE + arr[i] + '.jpg'
}

module.exports = { STEP_IMAGES, getStepImage }
