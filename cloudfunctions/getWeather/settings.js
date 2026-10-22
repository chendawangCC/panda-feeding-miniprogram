/**
 * 云函数 getWeather 本地配置文件
 *
 * 说明：
 *  - API Key 优先从云函数环境变量 QWEATHER_KEY 读取；
 *  - 未配置环境变量时，使用下方内置 Key（个人原型快速部署即用）。
 *
 * 安全提醒：内置 Key 会随代码分发。个人原型可用；正式上线建议改用
 * 云函数环境变量 QWEATHER_KEY，避免 Key 出现在代码仓库中。
 */
module.exports = {
  QWEATHER_KEY: '0d50ae6c29e5454abd2621c2b6d34f8f',
  QWEATHER_HOST: 'kk564wve49.re.qweatherapi.com'
};
