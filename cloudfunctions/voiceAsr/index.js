/**
 * 云函数 voiceAsr —— 语音识别
 *
 * 小程序端：wx.getRecorderManager 录音(mp3) -> wx.cloud.uploadFile 上传云存储
 * 本函数：下载录音 -> 调用腾讯云「一句话识别」(SentenceRecognition) -> 返回识别文本
 *
 * 配置（云函数环境变量）：
 *   TENCENT_SECRET_ID  腾讯云 SecretId（个人实名可开通，语音识别有免费额度）
 *   TENCENT_SECRET_KEY 腾讯云 SecretKey
 */
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  const { fileID } = event || {};
  if (!fileID) return { code: -1, msg: '缺少 fileID' };

  const secretId = process.env.TENCENT_SECRET_ID;
  const secretKey = process.env.TENCENT_SECRET_KEY;
  if (!secretId || !secretKey) {
    return { code: -3, msg: '云函数未配置腾讯云 SecretId / SecretKey' };
  }

  // 1. 从云存储下载录音
  let data;
  try {
    const res = await cloud.downloadFile({ fileID });
    data = res.fileContent;
  } catch (e) {
    return { code: -2, msg: '下载录音失败：' + e.message };
  }

  // 2. 调用腾讯云一句话识别
  const tencentcloud = require('tencentcloud-sdk-nodejs-asr');
  const AsrClient = tencentcloud.asr.v20190614.Client;
  const client = new AsrClient({
    credential: { secretId, secretKey },
    region: 'ap-guangzhou',
    profile: { httpProfile: { endpoint: 'asr.tencentcloudapi.com' } }
  });

  try {
    const r = await client.SentenceRecognition({
      EngSerViceType: '16k_zh',   // 16k 中文普通话
      SourceType: 1,              // 1 = 语音数据（Base64）
      VoiceFormat: 'mp3',         // 与前端录音 format 保持一致（mp3 全平台稳定）
      Data: data.toString('base64'),
      DataLen: data.length
    });
    return { code: 0, text: r.Result || '' };
  } catch (e) {
    // 透出腾讯云错误码/信息，便于前端与排查（如 InvalidParameter、FailedOperation 等）
    const code = (e && (e.code || e.Code)) || '';
    const msg = (e && (e.message || e.Message)) || e.message || '未知错误';
    return { code: -4, msg: '识别失败：' + (code ? code + ' ' : '') + msg };
  }
};
