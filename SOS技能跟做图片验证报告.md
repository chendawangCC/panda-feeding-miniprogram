# SOS 技能跟做图片验证报告

检查日期：2026-10-23

范围：`subchart/pages/firstaid` 下的 37 条内置急救/护理技能、250 个跟做步骤

结论：**跟做图片缺失已修复；当前 37 条技能、250 个步骤全部有存在的图示，中英文模式均为 0 空图。**

## 一、修复前问题

| 项目 | 修复前 |
| --- | ---: |
| 内置技能数 | 37 |
| 跟做步骤总数 | 250 |
| 会显示「跟做视频·即将上线」占位的步骤 | 105 |
| 存在空步骤的技能数 | 24 |
| 代码引用但文件不存在的图片 | 5 |
| 完全没有任何图片分支的技能 | 9 |
| 技能 ID 重复 | `baby_fever` 被两条不同技能复用 |

典型问题：

- 成人心肺复苏、成人海姆立克、婴儿气道梗阻等技能存在重复 `if/else` 分支，后写分支覆盖前写分支。
- `this._cycleStep` 从未赋值，所有「交替图」逻辑实际失效。
- 红屁屁技能真实 ID 是 `baby_diaper`，代码却判断 `baby_rashes`，永远不命中。
- 产后恶露、哺乳期堵奶、中暑、成人溺水、触电、骨折、鼻出血、动物咬伤等技能完全没有步骤图分支。
- 5 个图片路径指向不存在的文件：`baby_mosquito_repel.jpg`、`baby_rashes_cream.jpg`、`baby_fever_cool.jpg`、`baby_hold_cradle.jpg`、`baby_cord_clean.jpg`。

## 二、本次修改

1. 新增 `subchart/pages/firstaid/data/step-images.js`：用「技能 ID → 每步图片」的映射表替代超长 `if/else`，共 37 条技能映射。
2. 重构 `train.js` 的 `renderStep`：统一调用 `getStepImage(skillId, index)`，删除重复分支与失效的 `_cycleStep` 交替逻辑。
3. 补齐 15 张横版图示，全部为 600×337 JPG，与原有 80 张图保持同一暖米色半写实医学插画风格。
4. 修复重复 ID：第二条「发烧降温处理」由 `baby_fever` 改为 `baby_fever_guide`，中英文数据同步修改；原「婴儿发热护理」仍保留 `baby_fever`，不影响计划页体温跳转。
5. 补充 `VIDEO_MAP` 中 `baby_fever_guide` 的标题，避免准备页标题为空。

## 三、新增图示清单

| 文件 | 对应技能/场景 |
| --- | --- |
| `baby_mosquito_repel.jpg` | 防蚊虫叮咬处理 |
| `baby_diaper_cream.jpg` | 婴儿红屁屁护理 / 换尿布涂护臀膏 |
| `baby_fever_cool.jpg` | 婴儿发热护理 / 发烧降温处理 |
| `baby_hold_cradle.jpg` | 按月龄抱宝宝 |
| `baby_cord_clean.jpg` | 新生儿脐带护理 |
| `postpartum_lochia_observe.jpg` | 产后恶露观察 |
| `postpartum_breast_care.jpg` | 哺乳期堵奶/乳房护理 |
| `heatstroke_cool.jpg` | 中暑急救 |
| `adult_drowning_rescue.jpg` | 成人溺水急救 |
| `electric_shock_safe.jpg` | 触电急救 |
| `fracture_splint.jpg` | 骨折固定 |
| `nosebleed_press.jpg` | 鼻出血处理 |
| `animal_bite_wash.jpg` | 动物咬伤处理 |
| `burn_hospital.jpg` | 烧烫伤处理·送医步骤 |
| `sprain_followup.jpg` | 扭伤处理·后续处理 |

## 四、验证结果

| 验证项 | 结果 |
| --- | --- |
| 37 条技能是否全部有映射 | 通过，37/37 |
| 250 个步骤是否全部取到非空图片路径 | 通过，250/250 |
| 对应图片文件是否全部存在 | 通过，0 缺失 |
| 中文模式跟做页取图 | 通过 |
| 英文模式跟做页取图 | 通过 |
| 图片文件能否正常解码 | 通过，95/95 |
| 图片尺寸是否统一 | 通过，95 张均为 600×337 |
| 重复技能 ID 是否清除 | 通过，`baby_fever` / `baby_fever_guide` 各自独立 |
| 计划页 `?skill=baby_fever` 体温跳转 | 保持可用，仍指向「婴儿发热护理」 |

验证方式：

- 用 Node 加载 `Page({...})` 与真实 `skills.js`、`flattenSkill`、`step-images.js`，逐技能逐步骤调用 `renderStep`，并检查 `setData.stepImage` 是否为空、文件是否存在。
- 用 Python PIL 对 `subchart-assets/firstaid` 全部 95 张 JPG 做 `verify()` 解码与尺寸检查。
- 对修改文件执行 `node --check`。
- 对比修复前 `HEAD` 版 `train.js` 与当前版，修复前 105/250 步为空，修复后 0/250。

## 五、未覆盖项

- 未在微信开发者工具/真机上逐屏点击验收；本次验证覆盖代码路径、数据映射与图片文件本身。
- 用户自行录制的 `usr_` 技能不属于这 37 条内置技能，仍按原有视频/占位逻辑处理。
- AI 生成图内文字原则禁止；本次新图未加入中文说明文字，个别旧图原有的设备/时间显示文字保留。
