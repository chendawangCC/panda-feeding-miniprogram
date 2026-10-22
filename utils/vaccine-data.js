/* ============================================================
 * 疫苗记录数据
 *  - 免费疫苗：依据《国家免疫规划疫苗儿童免疫程序及说明(2021年版)》
 *  - 自费疫苗：依据常见非免疫规划疫苗推荐程序（各地门诊略有差异，仅供参考）
 *  - 每条剂次按「出生日期 + 月龄/天数」自动推算应种日期
 * ============================================================ */

/* 疫苗剂次定义：months=出生后第N个月龄，days=额外天数（与月份累加）
 * 例：出生24h内 → {months:0, days:0, note:'出生后24小时内'}
 *     1月龄      → {months:1}
 *     1.5月龄    → {months:1, days:15}
 */
const VACCINE_PROGRAM = [
  // ==================== 免费（国家免疫规划） ====================
  {
    group: '乙肝疫苗', short: 'HepB', type: '免费', color: '#fff2b9',
    desc: '预防乙型肝炎',
    doses: [
      { dose: '第1剂', months: 0, days: 0, note: '出生后24小时内' },
      { dose: '第2剂', months: 1, days: 0, note: '1月龄' },
      { dose: '第3剂', months: 6, days: 0, note: '6月龄' }
    ]
  },
  {
    group: '卡介苗', short: 'BCG', type: '免费', color: '#ffe3cc',
    desc: '预防结核病',
    doses: [
      { dose: '第1剂', months: 0, days: 0, note: '出生后尽早接种' }
    ]
  },
  {
    group: '脊灰疫苗', short: 'IPV/bOPV', type: '免费', color: '#dbf3e1',
    desc: '预防脊髓灰质炎（1、2剂IPV；3、4剂bOPV）',
    doses: [
      { dose: '第1剂', months: 2, days: 0, note: '2月龄' },
      { dose: '第2剂', months: 3, days: 0, note: '3月龄' },
      { dose: '第3剂', months: 4, days: 0, note: '4月龄' },
      { dose: '第4剂', months: 48, days: 0, note: '4岁' }
    ]
  },
  {
    group: '百白破疫苗', short: 'DTaP', type: '免费', color: '#e9e6ff',
    desc: '预防百日咳、白喉、破伤风',
    doses: [
      { dose: '第1剂', months: 3, days: 0, note: '3月龄' },
      { dose: '第2剂', months: 4, days: 0, note: '4月龄' },
      { dose: '第3剂', months: 5, days: 0, note: '5月龄' },
      { dose: '第4剂', months: 18, days: 0, note: '18月龄' }
    ]
  },
  {
    group: '白破疫苗', short: 'DT', type: '免费', color: '#dbe9f3',
    desc: '预防白喉、破伤风（6岁加强）',
    doses: [
      { dose: '第1剂', months: 72, days: 0, note: '6岁' }
    ]
  },
  {
    group: '麻腮风疫苗', short: 'MMR', type: '免费', color: '#fff2b9',
    desc: '预防麻疹、流行性腮腺炎、风疹',
    doses: [
      { dose: '第1剂', months: 8, days: 0, note: '8月龄' },
      { dose: '第2剂', months: 18, days: 0, note: '18月龄' }
    ]
  },
  {
    group: '乙脑减毒活疫苗', short: 'JE-I', type: '免费', color: '#e0f0e6',
    desc: '预防流行性乙型脑炎',
    doses: [
      { dose: '第1剂', months: 8, days: 0, note: '8月龄' },
      { dose: '第2剂', months: 24, days: 0, note: '2岁' }
    ]
  },
  {
    group: 'A群流脑疫苗', short: 'MPSV-A', type: '免费', color: '#ffe9d9',
    desc: '预防A群流行性脑脊髓膜炎',
    doses: [
      { dose: '第1剂', months: 6, days: 0, note: '6月龄' },
      { dose: '第2剂', months: 9, days: 0, note: '9月龄' }
    ]
  },
  {
    group: 'A+C群流脑疫苗', short: 'MPSV-AC', type: '免费', color: '#ffe9d9',
    desc: '预防A群、C群流行性脑脊髓膜炎',
    doses: [
      { dose: '第1剂', months: 36, days: 0, note: '3岁' },
      { dose: '第2剂', months: 72, days: 0, note: '6岁' }
    ]
  },
  {
    group: '甲肝减毒活疫苗', short: 'HepA-I', type: '免费', color: '#dbf3e1',
    desc: '预防甲型病毒性肝炎',
    doses: [
      { dose: '第1剂', months: 18, days: 0, note: '18月龄' }
    ]
  },

  // ==================== 自费（非免疫规划，推荐参考） ====================
  {
    group: '13价肺炎球菌结合疫苗', short: 'PCV13', type: '自费', color: '#e3f2fd',
    desc: '预防肺炎球菌侵袭性疾病（按说明书可6周龄起种）',
    doses: [
      { dose: '第1剂', months: 2, days: 0, note: '2月龄（可6周龄起）' },
      { dose: '第2剂', months: 4, days: 0, note: '4月龄' },
      { dose: '第3剂', months: 6, days: 0, note: '6月龄' },
      { dose: '第4剂', months: 12, days: 0, note: '12-15月龄加强' }
    ]
  },
  {
    group: '五价轮状病毒疫苗', short: 'RV5', type: '自费', color: '#fce4ec',
    desc: '预防婴幼儿轮状病毒胃肠炎（超龄不可补种，请按时）',
    doses: [
      { dose: '第1剂', months: 1, days: 15, note: '6-12周龄首剂' },
      { dose: '第2剂', months: 2, days: 15, note: '间隔4-10周' },
      { dose: '第3剂', months: 3, days: 15, note: '32周龄内完成3剂' }
    ]
  },
  {
    group: '五联疫苗', short: 'DTaP-IPV-Hib', type: '自费', color: '#e8eaf6',
    desc: '百白破+脊灰+Hib 联合（可替代部分免费剂次）',
    doses: [
      { dose: '第1剂', months: 2, days: 0, note: '2月龄' },
      { dose: '第2剂', months: 3, days: 0, note: '3月龄' },
      { dose: '第3剂', months: 4, days: 0, note: '4月龄' },
      { dose: '第4剂', months: 18, days: 0, note: '18月龄加强' }
    ]
  },
  {
    group: 'Hib疫苗', short: 'Hib', type: '自费', color: '#ede7f6',
    desc: 'b型流感嗜血杆菌结合疫苗',
    doses: [
      { dose: '第1剂', months: 2, days: 0, note: '2月龄' },
      { dose: '第2剂', months: 3, days: 0, note: '3月龄' },
      { dose: '第3剂', months: 4, days: 0, note: '4月龄' },
      { dose: '第4剂', months: 18, days: 0, note: '18月龄加强' }
    ]
  },
  {
    group: 'EV71手足口疫苗', short: 'EV71', type: '自费', color: '#fff8e1',
    desc: '预防EV71型手足口病（5岁内尽早接种）',
    doses: [
      { dose: '第1剂', months: 6, days: 0, note: '6月龄起' },
      { dose: '第2剂', months: 7, days: 0, note: '间隔1个月' }
    ]
  },
  {
    group: '水痘疫苗', short: 'Var', type: '自费', color: '#e1f5fe',
    desc: '预防水痘',
    doses: [
      { dose: '第1剂', months: 12, days: 0, note: '12月龄' },
      { dose: '第2剂', months: 48, days: 0, note: '4岁' }
    ]
  },
  {
    group: '流感疫苗', short: 'Flu', type: '自费', color: '#f3e5f5',
    desc: '预防季节性流感（每年接种，首次2剂）',
    doses: [
      { dose: '第1剂', months: 6, days: 0, note: '6月龄起 · 每年接种' },
      { dose: '第2剂', months: 7, days: 0, note: '首次接种第2剂（间隔≥1月）' }
    ]
  }
];

/* 在出生日期上累加月龄/天数 → 'YYYY-MM-DD' */
function addAge(birth, months, days) {
  const parts = String(birth).split('-').map(Number);
  const d = new Date(parts[0], (parts[1] || 1) - 1 + months, (parts[2] || 1) + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

/* 生成某宝宝的完整疫苗计划（无则全部待接种） */
function buildVaccinePlan(birthday) {
  if (!birthday) return [];
  const plan = [];
  let seq = 0;
  VACCINE_PROGRAM.forEach((v) => {
    v.doses.forEach((dose) => {
      seq += 1;
      plan.push({
        id: v.short + '_' + dose.dose + '_' + seq,
        group: v.group,
        short: v.short,
        type: v.type,
        color: v.color,
        desc: v.desc,
        dose: dose.dose,
        note: dose.note,
        months: dose.months,
        days: dose.days,
        dueDate: addAge(birthday, dose.months, dose.days),
        status: 'pending', // pending 待接种 | done 已接种 | skip 不接种
        doneDate: ''
      });
    });
  });
  return plan;
}

/* 计算两个 YYYY-MM-DD 相差的天数（b - a） */
function diffDays(a, b) {
  const pa = String(a).split('-').map(Number);
  const pb = String(b).split('-').map(Number);
  const da = new Date(pa[0], (pa[1] || 1) - 1, pa[2] || 1);
  const db = new Date(pb[0], (pb[1] || 1) - 1, pb[2] || 1);
  return Math.round((db - da) / 86400000);
}

module.exports = {
  VACCINE_PROGRAM: VACCINE_PROGRAM,
  buildVaccinePlan: buildVaccinePlan,
  diffDays: diffDays
};
