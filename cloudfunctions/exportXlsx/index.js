// 云函数：数据导出生成 xlsx 表格文件
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const xlsx = require('node-xlsx')

exports.main = async (event) => {
  try {
    // sheets: [{ name, head: [...], rows: [[...], ...] }]
    const sheets = (event.sheets || []).filter(s => s && (s.rows || []).length)
    if (!sheets.length) return { code: 1, msg: '没有可导出的数据' }
    const data = sheets.map(s => ({
      name: (s.name || '数据').slice(0, 28),
      data: [s.head || []].concat(s.rows || [])
    }))
    const buffer = xlsx.build(data)
    const cloudPath = 'exports/熊宝喂养导出_' + Date.now() + '.xlsx'
    const upload = await cloud.uploadFile({ cloudPath, fileContent: buffer })
    const { fileList } = await cloud.getTempFileURL({ fileList: [upload.fileID] })
    const url = (fileList && fileList[0] && fileList[0].tempFileURL) || ''
    return { code: 0, fileID: upload.fileID, url }
  } catch (e) {
    return { code: 2, msg: (e && e.message) || '生成失败' }
  }
}
