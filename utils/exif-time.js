/**
 * utils/exif-time.js —— 读取图片 EXIF 拍摄时间（DateTimeOriginal / DateTime）
 *
 * 说明：chooseMedia 返回的 time 在部分机型不可靠（返回当前时间或 -1），
 * 照片拍摄时间最准确的来源是 JPEG EXIF 中的 DateTimeOriginal（0x9003）。
 * 本模块为轻量纯手写解析（不引入第三方库，控制包体积），
 * 解析失败返回 0，由调用方兜底（退回 chooseMedia time / 当前时间）。
 */

/** 解析 TIFF 结构（IFD0 → ExifIFD → 0x9003/0x0132） */
function parseTiff(dv, base) {
  if (base + 8 > dv.byteLength) return null;
  const b0 = dv.getUint8(base);
  const le = b0 === 0x49;              // 'II' 小端
  if (!le && b0 !== 0x4D) return null; // 'MM' 大端
  const u16 = (o) => (le ? dv.getUint16(o, true) : dv.getUint16(o, false));
  const u32 = (o) => (le ? dv.getUint32(o, true) : dv.getUint32(o, false));
  if (u16(base + 2) !== 0x2A) return null;

  const readTagStr = (ifdOff, tagId) => {
    const n = u16(ifdOff);
    for (let i = 0; i < n; i++) {
      const e = ifdOff + 2 + i * 12;
      if (e + 12 > dv.byteLength) break;
      if (u16(e) !== tagId) continue;
      const type = u16(e + 2);
      const cnt = u32(e + 4);
      if (type !== 2 || cnt <= 0 || cnt > 24) return null; // ASCII，长度上限防溢出
      let strOff = e + 8;
      if (cnt > 4) {
        strOff = base + u32(e + 8);
        if (strOff + cnt > dv.byteLength) return null;
      }
      let s = '';
      for (let k = 0; k < cnt - 1; k++) s += String.fromCharCode(dv.getUint8(strOff + k));
      return s;
    }
    return null;
  };

  // IFD0
  let ifd0 = base + u32(base + 4);
  if (ifd0 + 2 > dv.byteLength) return null;
  // 先看 IFD0 内是否直接有 DateTime（0x0132，兜底）
  let fallback = readTagStr(ifd0, 0x0132);
  // 找 ExifIFDPointer（0x8769）
  const n0 = u16(ifd0);
  let exifOff = null;
  for (let i = 0; i < n0; i++) {
    const e = ifd0 + 2 + i * 12;
    if (e + 12 > dv.byteLength) break;
    if (u16(e) === 0x8769) { exifOff = base + u32(e + 8); break; }
  }
  let str = fallback;
  if (exifOff != null && exifOff + 2 <= dv.byteLength) {
    str = readTagStr(exifOff, 0x9003) || readTagStr(exifOff, 0x0132) || fallback;
  }
  if (!str) return null;
  const m = String(str).match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  const ts = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]).getTime();
  return isFinite(ts) ? ts : null;
}

/** 从 ArrayBuffer 解析 EXIF 时间（仅 JPEG） */
function parseExifTime(buf) {
  try {
    const dv = new DataView(buf);
    const len = dv.byteLength;
    if (len < 4 || dv.getUint8(0) !== 0xFF || dv.getUint8(1) !== 0xD8) return null;
    let off = 2;
    while (off + 4 <= len) {
      if (dv.getUint8(off) !== 0xFF) { off++; continue; }
      const marker = dv.getUint8(off + 1);
      if (marker === 0xD8 || marker === 0x01 || (marker >= 0xD0 && marker <= 0xD7)) { off += 2; continue; }
      if (marker === 0xDA) break; // SOS：之后是压缩数据
      const size = dv.getUint16(off + 2);
      if (size < 2) { off += 2; continue; }
      if (marker === 0xE1 && size >= 16 &&
          dv.getUint8(off + 4) === 0x45 && dv.getUint8(off + 5) === 0x78 &&
          dv.getUint8(off + 6) === 0x69 && dv.getUint8(off + 7) === 0x66) {
        const t = parseTiff(dv, off + 10); // APP1 payload：'Exif\0\0' + TIFF
        if (t) return t;
      }
      off += 2 + size;
    }
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * 读取文件 EXIF 拍摄时间（Promise<number>，失败/非图片返回 0）
 */
function exifTime(filePath) {
  return new Promise((resolve) => {
    if (!filePath) return resolve(0);
    try {
      wx.getFileSystemManager().readFile({
        filePath: filePath,
        success: (res) => {
          try {
            const t = parseExifTime(res.data);
            resolve(t || 0);
          } catch (e) { resolve(0); }
        },
        fail: () => resolve(0)
      });
    } catch (e) {
      resolve(0);
    }
  });
}

module.exports = {
  parseExifTime,
  exifTime
};
