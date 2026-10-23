/* 提醒红点公共工具：母乳到期时间计算 + 「知道了」跨页面/跨成员同步
 * 统一三处入口：记录页日历（折叠/展开）、首页今日提醒、库存页母乳清单
 * 规则：
 *  - 储存起始时间 = pumpEnd（吸奶结束）优先，其次 time
 *  - 提醒 id = milk_<记录id或日期_时间_储存条件>_<到期日>
 *  - 「知道了」同时写 globalData.acknowledgedMilks（随云端 meta 并集同步给家庭成员）
 *    和本机 dismissed_milk_exp[记录id]（兼容首页/库存页旧逻辑）
 */
function pad(n) {
  return n < 10 ? '0' + n : '' + n;
}

function storageTimeOf(r) {
  return (r && (r.pumpEnd || r.time)) || '00:00';
}

function ymdOf(d) {
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

/* 计算一条吸奶记录的储存信息与到期日 */
function expireOf(r, MS) {
  const cfgMap = MS || {};
  const st = cfgMap[r.storage] ? r.storage : 'fridge';
  const cfg = cfgMap[st] || cfgMap.fridge || { unit: 'h', value: 24, label: '冷藏' };
  const dp = String(r.date || '').split('-').map(Number);
  if (!dp[0]) return null;
  const time = storageTimeOf(r);
  const tp = String(time).split(':').map(Number);
  const sec = tp[2] || 0;
  const start = new Date(dp[0], (dp[1] || 1) - 1, dp[2] || 1, tp[0] || 0, tp[1] || 0, sec);
  let expire;
  if (cfg.unit === 'h') expire = new Date(start.getTime() + Number(cfg.value || 0) * 3600000);
  else expire = new Date(start.getFullYear(), start.getMonth() + Number(cfg.value || 0), start.getDate(), start.getHours(), start.getMinutes(), sec);
  const ymd = ymdOf(expire);
  return {
    storage: st,
    cfg: cfg,
    time: time,
    start: start,
    expire: expire,
    ymd: ymd,
    ackId: milkAckId(r, ymd)
  };
}

function milkAckId(r, ymd) {
  const key = r.id ? String(r.id) : (String(r.date || '') + '_' + storageTimeOf(r) + '_' + (r.storage || 'fridge'));
  return 'milk_' + key + '_' + ymd;
}

/* 是否已「知道了」：云端同步的 ack 列表 或 本机旧键 */
function isMilkAcked(r, ymd) {
  if (!r) return false;
  let app = null;
  try { app = getApp(); } catch (e) { app = null; }
  const g = (app && app.globalData) || {};
  if ((g.acknowledgedMilks || []).indexOf(milkAckId(r, ymd)) >= 0) return true;
  try {
    const dismissed = wx.getStorageSync('dismissed_milk_exp') || {};
    if (r.id && dismissed[r.id]) return true;
  } catch (e) {}
  return false;
}

/* 标记「知道了」：写两处 + 立即上云，保证其它页面与家庭成员同步 */
function ackMilk(r, ymd) {
  if (!r) return '';
  return ackMilkById(milkAckId(r, ymd), r.id || '');
}

function ackMilkById(id, recId) {
  if (!id) return '';
  let app = null;
  try { app = getApp(); } catch (e) { app = null; }
  if (app && app.globalData) {
    const list = app.globalData.acknowledgedMilks || [];
    if (list.indexOf(id) < 0) list.push(id);
    app.globalData.acknowledgedMilks = list;
  }
  try {
    const dismissed = wx.getStorageSync('dismissed_milk_exp') || {};
    // 只按「这条记录 + 本次到期日」记，改变储存方式后新的到期提醒仍会重新出现
    dismissed[id] = true;
    wx.setStorageSync('dismissed_milk_exp', dismissed);
  } catch (e) {}
  try { if (app && app.persist) app.persist(); } catch (e) {}
  try { require('./cloud-data.js').pushAll(true); } catch (e) {}
  return id;
}

module.exports = {
  pad: pad,
  ymdOf: ymdOf,
  storageTimeOf: storageTimeOf,
  expireOf: expireOf,
  milkAckId: milkAckId,
  isMilkAcked: isMilkAcked,
  ackMilk: ackMilk,
  ackMilkById: ackMilkById
};
