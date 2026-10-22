// 云函数：获取小程序码（用于周报保存图 / 分享图）
// 通过云开发开放接口 cloud.openapi.wxacode.getUnlimited 生成，无需自管 access_token
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event) => {
  try {
    const scene = (event.scene || 'weekly').slice(0, 32)
    const page = (event.page || 'pages/index/index').slice(0, 128)
    const width = Number(event.width) || 430
    const result = await cloud.openapi.wxacode.getUnlimited({
      scene,
      page,
      width,
      checkPath: false,
      envVersion: (event.envVersion || 'release').slice(0, 12)
    })
    // buffer 转 base64 返回，前端写入本地临时文件后绘制
    return { code: 0, base64: result.buffer.toString('base64') }
  } catch (e) {
    const msg = (e && e.errMsg) || (e && e.message) || '生成小程序码失败'
    return { code: 2, msg }
  }
}
