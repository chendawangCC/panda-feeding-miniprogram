# 多人协作 · 云端同步 + 扫码加入 + 提醒推送 部署说明

本版本新增「第三类」多人协作闭环：**云端数据库真实共享 + 扫码/邀请码加入 + 微信订阅消息提醒推送**。
以下三步在微信开发者工具中操作即可上线。

---

## 一、上传部署云函数（必须）

新增了两个云函数，需在微信开发者工具中分别右键 →「上传并部署：云端安装依赖」：

1. `cloudfunctions/familyCloud`
   - 家庭创建 / 邀请码 / 扫码加入 / 成员管理 / 数据包推送与拉取 / 订阅登记
   - 数据库集合 `panda_families`、`panda_subscriptions` 首次调用时自动创建，无需手动建集合
2. `cloudfunctions/pushReminder`
   - 定时扫描所有家庭数据包，收集「今日到期」提醒并推送订阅消息
   - 已内置定时触发器 `config.json`（每天 8:00 / 12:00 / 20:00 触发），上传时勾选「同步触发器」
   - 需开启云函数权限 `subscribeMessage.send`（config.json 已声明，上传后自动生效）

> 原有 getWeather / loginUser / sendSms / verifySms / voiceAsr 保持不变，登录依赖 loginUser（已部署）。

## 二、申请订阅消息模板（提醒推送的前提）

微信订阅消息是「用户主动订阅一次 → 服务端推送一次」的一次性授权模式：

1. 登录 [mp.weixin.qq.com](https://mp.weixin.qq.com) →「功能」→「订阅消息」→ 申请提醒类模板（例如「服务提醒」类目），
   建议申请 4 个模板：疫苗应种 / 营养品补充 / 库存到期 / 母乳到期（也可共用 1 个通用提醒模板）。
2. 拿到模板 ID 后，填入前端配置 `utils/cloud-sync.js` 顶部的 `REMIND_TEMPLATES`：
   ```js
   const REMIND_TEMPLATES = [
     { type: 'vaccine',    tmplId: '你的疫苗模板ID' },
     { type: 'supplement', tmplId: '你的营养品模板ID' },
     { type: 'stock',      tmplId: '你的库存模板ID' },
     { type: 'milk',       tmplId: '你的母乳模板ID' },
   ];
   ```
3. 若模板字段不是 thing1/time2/thing3，请同步调整 `cloudfunctions/pushReminder/index.js` 顶部 `TMPL_MAP` 的字段名。

## 三、使用闭环（体验路径）

- **创建家庭**：我的 → 多人协作与分享 → 创建我的家庭
- **邀请家人**：协作页 → 分享加入二维码（每次打开自动刷新云端邀请码，有效期 7 天）→ 亲友微信扫码 / 转发卡片
- **扫码加入**：我的 → 右上角扫码 → 识别二维码 → 自动加入并拉取家庭全部数据
- **真实共享**：任一成员新增记录/成长/疫苗/库存后，自动同步到云端；其他成员打开小程序自动拉取合并（版本号冲突保护，最后写入者胜）
- **提醒推送**：协作页 → 开启提醒推送 → 授权订阅消息；之后每天定时云函数扫描，
  当日有「疫苗应种 / 营养品补充 / 库存到期 / 母乳储存到期」时，向已开启的家人推送微信通知
- **成员管理**：创建者可点成员移除；成员可退出家庭

## 数据同步说明

- 同步内容：宝宝档案、喂养记录、成长足迹、营养品、疫苗计划与接种状态、库存与保质期、测量记录
- 云端为数据包式整包同步（`panda_families.data`），按版本号递增，冲突时以最新上传者为准
- 未加入家庭时，一切照旧纯本地运行，互不影响

## 已实现文件清单

| 文件 | 说明 |
|---|---|
| `cloudfunctions/familyCloud/` | 家庭 + 数据同步云函数 |
| `cloudfunctions/pushReminder/` | 订阅消息定时推送云函数（含定时触发器） |
| `utils/cloud-sync.js` | 前端云端同步封装（填模板 ID 在此） |
| `pages/collaboration/` | 多人协作页（云端家庭版） |
| `pages/mine/mine.js` | 扫码加入改为云端 joinFamily |
| `pages/index/index.js` | 分享卡片 invite 参数自动加入 |
| `app.js` | 保存后自动推送、启动自动拉取合并 |
