/**
 * 云函数 loginUser —— 微信一键登录（自动注册）
 *
 * 小程序端：wx.login 获取 code 后调用本函数（仅用于触发登录态）
 * 1. 通过云开发上下文获取当前用户 openid
 * 2. 新账号自动注册：users 集合无该 openid 记录时自动创建
 * 3. 传入 nickname / avatar / phone 时同步更新 users 资料
 * 返回 openid 及用户资料，由小程序端保存为本地账号标识。
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const USERS = 'users';

exports.main = async (event) => {
  const { code, nickname, avatar, phone } = event || {};
  try {
    const ctx = cloud.getWXContext();
    const openid = ctx.OPENID;
    if (!openid) return { code: -1, msg: '获取 openid 失败' };

    // 1) 查 users：无记录 → 新账号自动注册
    let isNew = false;
    let rec = null;
    try {
      const r = await db.collection(USERS).where({ openid }).limit(1).get();
      rec = r.data && r.data[0];
    } catch (e) {
      rec = null; // 集合不存在等视为新账号
    }

    const saveNick = (nickname || '').toString().trim();
    const saveAvatar = avatar || '';
    const savePhone = phone ? String(phone).trim() : '';

    if (!rec) {
      isNew = true;
      rec = {
        openid,
        nickname: saveNick,
        avatar: saveAvatar,
        phone: savePhone,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      try {
        await db.collection(USERS).add({ data: rec });
      } catch (e) {
        // 并发下重复创建兜底：再查一次
        try {
          const r2 = await db.collection(USERS).where({ openid }).limit(1).get();
          if (r2.data && r2.data[0]) {
            rec = r2.data[0];
            isNew = false;
          }
        } catch (e2) {}
      }
    } else if (saveNick || saveAvatar || savePhone) {
      const upd = { updatedAt: Date.now() };
      if (saveNick) upd.nickname = saveNick;
      if (saveAvatar) upd.avatar = saveAvatar;
      if (savePhone) upd.phone = savePhone;
      try {
        await db.collection(USERS).doc(rec._id).update({ data: upd });
        rec = Object.assign({}, rec, upd);
      } catch (e) {
        // 忽略更新失败（如集合未建权限）
      }
    }

    return {
      code: 0,
      openid: openid,
      unionid: ctx.UNIONID || '',
      isNew: !!isNew,
      nickname: (rec && rec.nickname) || '',
      avatar: (rec && rec.avatar) || ''
    };
  } catch (e) {
    return { code: -2, msg: '登录失败：' + e.message };
  }
};
