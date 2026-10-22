const app = getApp();

Page({
  data: {
    safeTop: 88,
    goodsAll: [],
    goodsDetail: null
  },

  onLoad() {
    const win = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    this.setData({ safeTop: (win.statusBarHeight || 20) + 44 });
    this.buildGoods();
  },

  onShow() {
    if (this.data.goodsAll.length) this.buildGoods();
  },

  goBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) });
  },

  GOODS_LIB() {
    return [
      { id: 'g01', cat: '喂养', icon: '/subchart/pages/firstaid/icons/spoon.png', title: '宽口径奶瓶', desc: '防胀气，好清洗', min: 0, max: 24, price: '', buyUrl: '', tags: ['奶瓶', '喂养'] },
      { id: 'g02', cat: '消耗', icon: '/subchart/pages/firstaid/icons/spoon.png', title: '纸尿裤', desc: '轻薄透气 整夜干爽', min: 0, max: 36, price: '', buyUrl: '', tags: ['纸尿裤', '消耗'] },
      { id: 'g03', cat: '消耗', icon: '/subchart/pages/firstaid/icons/spoon.png', title: '婴儿湿巾', desc: 'EDI纯水 温和不刺激', min: 0, max: 36, price: '', buyUrl: '', tags: ['湿巾', '消耗'] },
      { id: 'g04', cat: '喂养', icon: '/subchart/pages/firstaid/icons/spoon.png', title: '储奶袋', desc: '双层密封 不漏液', min: 0, max: 18, price: '', buyUrl: '', tags: ['母乳', '储奶'] },
      { id: 'g05', cat: '喂养', icon: '/subchart/pages/firstaid/icons/spoon.png', title: '电动吸奶器', desc: '双模式 低噪舒适', min: 0, max: 18, price: '', buyUrl: '', tags: ['吸奶', '母乳'] },
      { id: 'g06', cat: '喂养', icon: '/subchart/pages/firstaid/icons/spoon.png', title: '温奶器', desc: '恒温解冻 快速加热', min: 0, max: 18, price: '', buyUrl: '', tags: ['温奶', '喂养'] },
      { id: 'g07', cat: '喂养', icon: '/subchart/pages/firstaid/icons/spoon.png', title: '奶瓶消毒器', desc: '蒸汽烘干一体', min: 0, max: 18, price: '', buyUrl: '', tags: ['消毒', '喂养'] },
      { id: 'g08', cat: '营养', icon: '/subchart/pages/firstaid/icons/spoon.png', title: '维生素D3', desc: '出生15天起每日一滴', min: 0, max: 24, price: '', buyUrl: '', tags: ['D3', '营养'] },
      { id: 'g09', cat: '睡眠', icon: '/subchart/pages/firstaid/icons/spoon.png', title: '婴儿睡袋', desc: '防踢被 恒温安睡', min: 3, max: 24, price: '', buyUrl: '', tags: ['睡袋', '睡眠'] },
      { id: 'g10', cat: '护理', icon: '/subchart/pages/firstaid/icons/spoon.png', title: '婴儿抚触油', desc: '天然成分 温和滋润', min: 0, max: 12, price: '', buyUrl: '', tags: ['抚触', '护理'] },
      { id: 'g11', cat: '护理', icon: '/subchart/pages/firstaid/icons/cream.png', title: '婴儿面霜', desc: '秋冬保湿不干燥', min: 0, max: 36, price: '', buyUrl: '', tags: ['面霜', '护理'] },
      { id: 'g12', cat: '辅食', icon: '/subchart/pages/firstaid/icons/spoon.png', title: '高铁米粉', desc: '补铁第一口', min: 4, max: 24, price: '', buyUrl: '', tags: ['辅食', '米粉'] },
      { id: 'g13', cat: '辅食', icon: '/subchart/pages/firstaid/icons/spoon.png', title: '辅食碗勺套装', desc: '食品级硅胶 防摔', min: 4, max: 36, price: '', buyUrl: '', tags: ['辅食', '餐具'] },
      { id: 'g14', cat: '辅食', icon: '/subchart/pages/firstaid/icons/teether.png', title: '咬咬乐', desc: '磨牙啃咬好帮手', min: 5, max: 18, price: '', buyUrl: '', tags: ['磨牙', '辅食'] },
      { id: 'g15', cat: '辅食', icon: '/subchart/pages/firstaid/icons/spoon.png', title: '防水围兜', desc: '易清洗 好打理', min: 4, max: 36, price: '', buyUrl: '', tags: ['围兜', '辅食'] },
      { id: 'g16', cat: '辅食', icon: '/subchart/pages/firstaid/icons/spoon.png', title: '辅食机', desc: '蒸打一体 细腻辅食', min: 4, max: 24, price: '', buyUrl: '', tags: ['辅食机', '辅食'] },
      { id: 'g17', cat: '护理', icon: '/subchart/pages/firstaid/icons/spoon.png', title: '婴儿体温计', desc: '快速测温 安心守护', min: 0, max: 36, price: '', buyUrl: '', tags: ['体温', '护理'] },
      { id: 'g18', cat: '出行', icon: '/subchart/pages/firstaid/icons/spoon.png', title: '爬行垫', desc: '加厚防摔 自由探索', min: 4, max: 18, price: '', buyUrl: '', tags: ['爬行', '出行'] }
    ];
  },

  babyMonths() {
    const b = app.globalData.baby || {};
    if (!b.birthday) return null;
    const bp = String(b.birthday).split('-').map(Number);
    if (bp.length < 3 || !bp[0]) return null;
    const bd = new Date(bp[0], (bp[1] || 1) - 1, bp[2] || 1);
    const now = new Date();
    let m = (now.getFullYear() - bd.getFullYear()) * 12 + (now.getMonth() - bd.getMonth());
    if (now.getDate() < bd.getDate()) m--;
    return Math.max(0, m);
  },

  buildGoods() {
    const g = app.globalData;
    const m = this.babyMonths();
    const records = g.records || [];
    const stockItems = g.stockItems || [];
    const has = (types) => records.some(r => types.indexOf(r.type) >= 0);
    const owned = (kw) => stockItems.some(s => kw.some(k => (s.name || '').indexOf(k) >= 0));
    const boosts = {
      'g01': has(['配方奶']) ? 30 : 0, 'g02': has(['换尿布']) ? 28 : 0, 'g03': has(['换尿布']) ? 22 : 0,
      'g04': has(['吸奶', '母乳']) ? 26 : 0, 'g05': has(['吸奶']) ? 30 : 0, 'g06': has(['吸奶']) ? 20 : 0,
      'g07': has(['配方奶']) ? 18 : 0, 'g08': 10, 'g09': has(['睡眠']) ? 14 : 0, 'g10': 6, 'g11': 6,
      'g12': has(['辅食']) ? 32 : 0, 'g13': has(['辅食']) ? 26 : 0, 'g14': has(['辅食']) ? 18 : 0,
      'g15': has(['辅食']) ? 16 : 0, 'g16': has(['辅食']) ? 22 : 0, 'g17': has(['体温']) ? 20 : 0, 'g18': 8
    };
    const ownedCheck = {
      'g02': ['纸尿裤', '尿不湿'], 'g03': ['湿巾', '棉柔巾'], 'g05': ['吸奶器'], 'g06': ['温奶器'], 'g07': ['消毒器'],
      'g08': ['D3', '维生素'], 'g12': ['米粉'], 'g16': ['辅食机'], 'g17': ['体温计']
    };
    const all = this.GOODS_LIB().map((it) => {
      let score = 50;
      const reason = [];
      if (m !== null && m >= it.min && (it.max === null || m <= it.max)) score += 20;
      else if (m !== null) score -= 40;
      if (m !== null) {
        if (m >= it.min) {
          if (it.max !== null && m > it.max) reason.push('宝宝已超过' + it.max + '月适用期');
        } else {
          reason.push('宝宝' + m + '个月，建议' + it.min + '月+再用');
        }
      }
      const b = boosts[it.id] || 0;
      score += b;
      if (b >= 26) reason.push('根据近期喂养记录推荐');
      else if (b >= 18) reason.push('结合宝宝记录贴心推荐');
      const oc = ownedCheck[it.id];
      if (oc && owned(oc)) { score -= 15; reason.push('已在库存清单中'); }
      const favs = wx.getStorageSync('panda_goods_fav') || [];
      const faved = favs.indexOf(it.id) >= 0;
      return Object.assign({}, it, {
        score,
        reason: reason.length ? reason.join(' · ') : (m !== null ? ('宝宝' + m + '个月' + (m >= it.min ? '正合适' : '')) : '按宝宝月龄推荐'),
        faved
      });
    });
    all.sort((a, b) => b.score - a.score);
    this.setData({ goodsAll: all });
  },

  openGoodsDetail(e) {
    const id = e.currentTarget.dataset.id;
    const it = this.data.goodsAll.find(x => x.id === id);
    if (it) this.setData({ goodsDetail: it });
  },
  closeGoodsDetail() {
    this.setData({ goodsDetail: null });
  },
  toggleGoodsFav() {
    const d = this.data.goodsDetail;
    if (!d) return;
    const favs = wx.getStorageSync('panda_goods_fav') || [];
    const i = favs.indexOf(d.id);
    if (i >= 0) favs.splice(i, 1); else favs.push(d.id);
    wx.setStorageSync('panda_goods_fav', favs);
    const ai = this.data.goodsAll.findIndex(x => x.id === d.id);
    const patch = { 'goodsDetail.faved': i < 0 };
    if (ai >= 0) patch['goodsAll[' + ai + '].faved'] = i < 0;
    this.setData(patch);
    wx.showToast({ title: i < 0 ? '已加入关注' : '已取消关注', icon: 'none' });
  }
});
