/**
 * 云函数 getWeather —— 实时天气
 *
 * 调用和风天气免费版「实时天气」接口（个人免费注册即可获取 Key）：
 *   https://{专属API Host}/v7/weather/now?location=经度,纬度&key=KEY（专属 Host 见控制台-设置，公共域名已废弃）
 *
 * 配置（优先级）：
 *   1. 云函数环境变量 QWEATHER_KEY（推荐）
 *   2. settings.js 内置 Key（个人原型快速部署即用）
 *
 * 小程序端：wx.getLocation 获取经纬度 -> 调用本云函数；定位失败时降级北京。
 */
const cloud = require('wx-server-sdk');
const https = require('https');
const zlib = require('zlib');
const settings = require('./settings');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

function iconEmoji(code) {
  const n = parseInt(code, 10);
  if (n === 100) return '☀️';
  if (n === 101) return '⛅';
  if (n >= 102 && n <= 103) return '🌤';
  if (n === 104) return '☁️';
  if (n >= 200 && n < 300) return '⛈';
  if (n >= 300 && n < 400) return '🌧';
  if (n >= 400 && n < 500) return '🌨';
  if (n >= 500 && n < 600) return '🌫';
  if (n >= 600 && n < 700) return '🌨';
  return '🌤';
}

exports.main = async (event) => {
  const key = process.env.QWEATHER_KEY || settings.QWEATHER_KEY;
  if (!key) {
    return { code: -3, msg: '未配置和风天气 Key（环境变量 QWEATHER_KEY 或 settings.js）' };
  }
  const { lat, lng } = event || {};
  const location = (lat && lng) ? (lng + ',' + lat) : '116.4074,39.9042';

  return new Promise((resolve) => {
    const url = 'https://' + (process.env.QWEATHER_HOST || settings.QWEATHER_HOST || 'devapi.qweather.com') + '/v7/weather/now?location=' + location + '&key=' + key;
    https.get(url, (res) => {
      // 和风接口可能返回 gzip 压缩，需先解压再解析
      const chunks = [];
      res.on('data', (c) => { chunks.push(c); });
      res.on('end', () => {
        try {
          let buf = Buffer.concat(chunks);
          if (res.headers['content-encoding'] === 'gzip') buf = zlib.gunzipSync(buf);
          const data = JSON.parse(buf.toString());
          if (data && data.code === '200' && data.now) {
            resolve({
              code: 0,
              text: data.now.text,
              temp: data.now.temp,
              icon: iconEmoji(data.now.icon),
              iconCode: String(data.now.icon),
              obsTime: data.now.obsTime
            });
          } else if (data && data.error) {
            // 例如 Host 白名单未生效：Invalid Host
            resolve({ code: -6, msg: '天气接口被拒绝：' + ((data.error && data.error.detail) || data.error.title || '') });
          } else {
            resolve({ code: -2, msg: '天气接口返回异常：' + ((data && data.code) || '未知') });
          }
        } catch (e) {
          resolve({ code: -4, msg: '解析天气数据失败' });
        }
      });
    }).on('error', (e) => {
      resolve({ code: -5, msg: e.message });
    });
  });
};
