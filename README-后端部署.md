# 熊宝喂养 · 后端（微信云开发）部署说明

小程序数据已全面接入微信云开发：**用户 / 宝宝档案 / 喂养记录 / 耗材库存 / 成长足迹 / 测量记录 / 疫苗 / 提醒 全部上云**，
支持多端同步、多人协作共享、删除增量同步（墓碑机制）。

---

## 一、需要部署的云函数（在微信开发者工具中逐个「右键 → 上传并部署：云端安装依赖」）

| 云函数 | 作用 | 必部署 |
|---|---|---|
| `cloudData` | **全量数据云端同步**（pull / push / wipe）——后端核心 | ✅ 必须 |
| `loginUser` | 微信一键登录（自动注册，写入用户资料） | ✅ 必须 |
| `familyCloud` | 家庭 / 邀请码 / 成员管理（多人协作） | ✅ 使用协作时 |
| `pushReminder` | 订阅消息提醒推送 | ✅ 使用提醒推送时 |
| `getWeather` | 和风天气查询 | ✅ 使用天气时 |
| `voiceAsr` | 语音识别 | ✅ 使用语音录入时 |
| `getMiniQr` | 小程序码（喂养周报保存图 / 分享图上的二维码） | ✅ 使用周报保存分享时 |
| `sendSms` / `verifySms` | 手机号验证码登录 | ⭕ 可选 |

> 每个云函数目录都含 `package.json`，上传时选择 **「云端安装依赖」**。

---

## 二、云数据库集合（首次调用云函数时自动创建，无需手动建）

| 集合 | 内容 |
|---|---|
| `panda_users` | 用户资料（loginUser 写入） |
| `panda_babies` | 宝宝档案（_id = 本地宝宝 id，ownerOpenid 归属） |
| `panda_baby_meta` | 宝宝小数据包（奶粉库存 / 过敏记录 / 纸尿裤数 / 保质期提醒 / 疫苗计划） |
| `panda_records` | 喂养记录（母乳 / 瓶喂 / 吸奶 / 营养品 / 换尿布 / 睡眠 / 辅食 / 喝水 / 体温 / 洗澡） |
| `panda_inventory` | 耗材库存 |
| `panda_footprints` | 成长足迹（图片 / 视频 / 语音 / 每日小记） |
| `panda_measures` | 身高 / 体重 / 头围测量 |
| `panda_vaccines` | 疫苗状态 |
| `panda_tombs` | 删除墓碑（增量删除同步） |
| `panda_families` | 家庭（familyCloud 使用） |
| `panda_subscriptions` | 订阅消息登记 |

> 集合权限建议：全部设为 **「仅创建者可读写」** 或「仅管理端可读写」——所有读写都经由云函数完成（云函数走服务端 SDK，不受客户端权限限制），
> 前端绝不直接操作数据库，安全合规。

---

## 三、同步机制（多端 / 多成员）

- **本地优先**：所有页面读写仍走本地缓存（即时响应、离线可用）
- **云端增量同步**：
  - 每次数据保存 → 600ms 防抖推送 `cloudData.push`（新增/修改按文档 upsert）
  - 小程序启动 / 回到前台 → 静默 `cloudData.pull` 拉取云端合并（按 `updatedAt` 新者胜）
  - 删除本地数据 → 写墓碑 `panda_tombs`，推送后云端删除对应文档；其他端 pull 时同步移除
- **登录即同步**：首次登录成功自动拉取云端数据合并 + 推送本地
- **家庭共享**：加入同一家庭的成员，可读写家庭 owner 名下所有宝宝数据（`cloudData` 已做可见性校验）

### 可见性 / 权限规则
- 每个宝宝文档带 `ownerOpenid`（创建者）
- 可见范围 = 自己创建的宝宝 + 自己所在家庭的 owner 所创建的宝宝
- 宝宝档案仅创建者可改；记录 / 库存 / 足迹等家庭成员可共同读写

---

## 四、订阅消息（提醒推送，可选）

### 配置步骤
1. 登录 [mp.weixin.qq.com](https://mp.weixin.qq.com) → 你的小程序 → **功能 → 订阅消息**
2. 从公共模板库选 4 个提醒类模板（选择带「内容 / 时间 / 名称」字段的），分别用于：
   - **疫苗应种提醒**（vaccine）
   - **营养品补充提醒**（supplement）
   - **库存 / 保质期到期提醒**（stock）
   - **母乳 / 喂养提醒**（milk）
3. 把申请到的模板 ID 填到 `utils/cloud-sync.js` 顶部 `REMIND_TEMPLATES` 对应 `tmplId`（未填的类型只在站内弹窗提醒，不推送）
4. 用户侧：**我的 → 设置 → 权限与隐私 → 开启提醒推送**，会拉起订阅授权（一次性授权，每次授权推送一次，建议定期引导开启）
5. 部署 `pushReminder` 云函数（`cloudfunctions/pushReminder`，右键「上传并部署：云端安装依赖」），它自带定时触发器 `config.json`（每天 8:00–21:00 每小时整点）和 `subscribeMessage.send` 云调用权限
6. ⚠️ 一次 `requestSubscribeMessage` 最多传 **3 个模板 ID**，本项目 4 个模板已按「每次取 3 个 + 再点一次补授权」处理，并且云端登记会把多次授权**合并**保存

### 模板字段配置（已内置真实字段，一般无需改动）
`pushReminder` 按模板的**关键词**组装 data。四个模板的真实字段已从后台「订阅消息 → 我的模板 → 详情」逐条核对，并写进代码的 `DEFAULT_FIELDS`，开箱即可发送：

| 用途 | 模板 | 字段（关键词 → 变量） |
|---|---|---|
| vaccine | 疫苗倒计时提醒 `gRiBoOCq…prJeDE` | `time7`←date · `number3`←value(还剩天数) · `thing1`←name(疫苗名) |
| supplement | 宝宝喂养提醒 `j5ugla1O…cJmjRKc` | `thing5`←note(温馨提示) · `thing6`←extra(距离上次) |
| stock | 库存不足提醒 `Ed2TJf1e…Yzxug` | `thing1`←note(库存信息) · `thing3`←name(物料名称) · `number13`←value(当前库存数) |
| milk | 保质期到期提醒 `0HAU94Xp…WZmpM` | `time16`←date(过期日期) · `thing6`←food(食物名称) · `thing5`←name(物品名称) · `number2`←value(剩余天数) |

`fields` 可用变量：`name` / `date` / `note` / `value` / `extra` / `food` / `count`。

**只有**后台换过模板、字段名变了才需要覆盖：云开发控制台 → 数据库 → 新建集合 `panda_push_config`（权限「仅管理端可读写」）→ 新建文档 `_id = templates`，内容直接粘贴 `cloudfunctions/pushReminder/panda_push_config.json`。不建这个集合不影响发送。

> 字段名依据（2026-10 核对）：
> 疫苗倒计时提醒 模版编号 54900，详细内容为「下次接种时间 {{time7.DATA}} / 还剩天数 {{number3.DATA}} / 疫苗 {{thing1.DATA}}」；
> 宝宝喂养提醒 75942「温馨提示 {{thing5.DATA}} / 距离上次 {{thing6.DATA}}」；
> 库存不足提醒 22691「库存信息 {{thing1.DATA}} / 物料名称 {{thing3.DATA}} / 当前库存数 {{number13.DATA}}」；
> 保质期到期提醒 1326「过期日期 {{time16.DATA}} / 食物名称 {{thing6.DATA}} / 物品名称 {{thing5.DATA}} / 剩余天数 {{number2.DATA}}」。

### 自检（1 分钟定位为什么收不到）
小程序端先点一次「去开启」，然后在**云开发控制台 → 云函数 → pushReminder → 测试**，传入：
```json
{ "action": "diagnose" }
```
返回重点看：
- `没有订阅记录` → 授权弹窗没点同意，或 familyCloud 未部署
- `details[].skipped: 未授权该模板` → 用户只勾了部分模板
- `details[].errors[].errCode = 47003` → 订阅消息字段问题，现在有两种原因，都会被自动兜底：
  1. **字段名为空/缺失**（errMsg 形如 `data.thing1.value is empty`）：字段映射指向的变量没有值。`buildData` 现在会按字段类型换一个语义变量，仍为空则填兜底文案（如「库存不足」「疫苗提醒」），不会再传空串。
  2. **后台模板字段名变了**（thing1 → thing2 之类）：云函数会调用 `subscribeMessage.getTemplateList` 读真实字段名，再按「字段类型顺序」自动对齐（vaccine: time→date / number→value / thing→name；stock: thing→note,name；milk: thing→food,name），**通常不需要再手改映射**。
  - 拿不到模板列表（接口异常/无权限）时自动退回 `DEFAULT_FIELDS`，行为与旧版一致。
  - 想确认实际用了哪个映射：返回体 `details[].fieldMap[type]` 里有 `fields`（本次采用的映射）、`detected`（从后台读到的真实字段）和 `data`（实际发送的字段值）。
  - 仍想强制指定映射：写 `panda_push_config` 的 `fields` 即可覆盖；若映射里的变量不存在，会自动按类型换一个语义变量，不会传空值。
- `details[].errors[].errCode = 43101` → 该模板的一次性授权已用完，需要用户再点「去开启」
- `hit` 全为 0 → 今天没有到期提醒，属于正常（可先用 `{"action":"send"}` 手动推一次）

### 推送范围（v2）
- 家庭扫描：加入家庭的所有成员按各自订阅类型推送
- **主账户（self）扫描**：无家庭的主账户也可收到自己宝宝的提醒推送（无需创建家庭）
- 推送内容取云端同步数据：疫苗（`panda_baby_meta.vaccinePlan` 待接种、3 天内）、营养品（`panda_records` 按频率/手动改期）、库存不足（`panda_inventory` 奶粉 <2 罐、其他耗材 ≤10）、保质期/保修期（`panda_baby_meta.shelfWarnings` 当天到期或已过期 3 天内）
- 同类提醒当天只推 1 条（`panda_push_log` 去重），每条会消耗对应模板 1 次授权

---

## 五、云端一致性 & 多端冲突处理

- **写入冲突检测**：`cloudData.push` 逐条比对云端 `updatedAt`（`_u`），云端较新则跳过写入并返回 `conflicts` 列表
- **自动收敛**：未冲突数据按「新者胜」合并；墓碑删除始终优先同步（删除不被冲突阻塞）
- **手动合并提示**：同一记录被多端同时修改（云端较新）时，前端弹出「发现数据冲突」提示：
  - **保留本机** → 强制重推本地版本覆盖云端
  - **使用云端** → 拉取云端最新版本（推荐）
  - 30 分钟内同类提示最多弹一次，避免静默同步反复打扰
- **拉取完整性**：云端拉取按 1000 条/页自动分页（上限 2 万条/集合），避免记录多时数据缺失

---

## 六、验证清单

1. 部署 `cloudData` + `loginUser` 后，真机预览（模拟器无登录态，建议真机）
2. 登录 → 添加宝宝 → 记录一条喂养 → 看云开发控制台 `panda_records` 集合出现该记录
3. 删除一条记录 → 看 `panda_tombs` 出现墓碑、`panda_records` 对应文档被删
4. 另一台设备登录同一微信账号 → 启动后自动拉到全部数据

---

## 七、语音识别（voiceAsr）密钥配置【必做，否则语音录入永远失败】

语音识别使用**腾讯云语音识别（ASR）一句话识别**，云函数 `voiceAsr` 已部署「云端安装依赖」版本（含
`wx-server-sdk` + `tencentcloud-sdk-nodejs-asr`）。但运行还需要 **API 密钥**，未配置时返回
`{code:-3, msg:'云函数未配置腾讯云 SecretId / SecretKey'}`，前端表现为「识别失败」。

### 配置步骤（约 10 分钟，一次性）
1. **开通服务**：登录 [腾讯云控制台](https://console.cloud.tencent.com)（可用微信扫码登录）
   → 搜索「语音识别」→ 进入产品页 → 点击「开通」（按量付费，免费额度内不产生费用）
2. **创建密钥**：控制台右上角头像 → **访问管理 CAM** → **API 密钥管理** → **新建密钥**
   （若提示需要实名认证，先完成个人实名认证）
   → 记下 **SecretId** 和 **SecretKey**（只显示一次，务必复制保存）
3. **配置到云函数环境变量**：
   - 微信开发者工具 → 点顶部 ☁ **云开发**按钮 → 打开云开发控制台
   - 左侧 **云函数** → 找到 **voiceAsr** → **配置**（或函数详情 → 函数配置）
   - 在「环境变量」新增两项：
     - `TENCENT_SECRET_ID` = 你的 SecretId
     - `TENCENT_SECRET_KEY` = 你的 SecretKey
   - 保存后**重新部署一次** voiceAsr（右键 → 上传并部署：云端安装依赖）或点击「更新配置」
4. **验证**：真机长按 tabbar 中央 + 号 → 松手 → 应出现「已识别并保存『类型』」toast；
   模拟器可点快速记录抽屉「语音录入」测试（模拟器录音格式与真机不同，最终以真机为准）

### 常见问题
- **返回 code:-2**：录音上传/下载异常，检查网络或 `cloud.uploadFile` 权限
- **返回 code:-4 + 识别失败消息**：多为音频格式或时长问题，确保用 16k 单声道 mp3
- **提示该账号未开通 ASR**：回第 1 步开通语音识别服务
- **不想用腾讯云**：可改接微信同声传译插件（WechatSI），个人主体需在小程序后台
  「设置 → 第三方设置 → 插件管理」申请插件 `wx069ba97219f66d99`，审核通过后改
  `plan.js` 语音段为插件 API（本项目默认走腾讯云 ASR 方案）
