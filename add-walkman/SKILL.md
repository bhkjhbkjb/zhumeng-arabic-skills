---
name: add-walkman
description: 给「逐梦阿语」小程序的「随身听 / 耳朵模式」批量新增内容（沉浸式锁屏播放的整句听力）。可以往已有词书追加句子，也可以新建一本词书。当用户输入 /add-walkman 后跟词书/主题/数量时触发。
---

# 新增随身听（耳朵模式）内容 Skill

「随身听」= 学习页 → 03 随身听 → 耳朵模式。每本词书是一组整句阿语，进去后自动循环朗读，适合通勤、睡前磨耳朵。

## 触发条件

- 用户输入 `/add-walkman` 后跟参数
- 例：
  - `/add-walkman 词书:日常问候 数量:15`
  - `/add-walkman 新建词书:餐厅点餐 数量:20`
  - `/add-walkman 主题:打车出行 数量:12`（没指定词书时，自己判断归到哪本，或新建）

## 涉及的文件（只改这两个 TSV，别手改 .ts）

| 文件 | 作用 | 列 |
|------|------|----|
| `content-input/excel/walkman_books.tsv` | 词书（卡片）列表 | `id  title  subtitle` |
| `content-input/excel/walkman_tracks.tsv` | 句子（每条音轨） | `id  arabic  chinese  audio  bookIds` |

> ⚠️ `miniprogram/resources/walkman.ts` 是构建脚本自动生成的，**永远不要手改**。

## 现有词书（先认清楚归到哪本）

| id | 词书 | 句子 id 前缀 |
|----|------|-----------|
| b1 | 日常问候 | `trk_greet_###` |
| b2 | 自我介绍 | `trk_intro_###` |
| b3 | 时间安排 | `trk_time_###` |
| b4 | 办公室沟通 | `trk_office_###` |
| b5 | 采购与报价 | `trk_buy_###` |
| b6 | 出行与酒店 | `trk_hotel_###` |
| all | 全部词书 | （聚合，不单独建句子） |

`all` 是聚合视图，**每条句子都要把 `all` 写进 bookIds**，否则「全部词书」里看不到。

## 执行流程

### 第 1 步：确定归属词书

- 用户指定了已有词书 → 用它的 id（如 b3）和前缀（如 `trk_time`）。
- 用户要新建词书 → 走【新建词书】小节，先拿到新 id（b7、b8…）和一个新前缀。
- 用户只给了主题没给词书 → 判断能不能塞进现有某本；语义对不上就新建。拿不准用 AskUserQuestion 问一句。

### 第 2 步：找下一个句子 id

读 `walkman_tracks.tsv`，找该前缀已用到的最大 3 位序号，从下一个接着编。
例：`trk_time` 已到 `trk_time_004`，这次从 `trk_time_005` 开始。

### 第 3 步：生成 TSV 行

每行五列，用 **Tab** 分隔（不是空格）：

```
id<Tab>arabic<Tab>chinese<Tab>audio<Tab>bookIds
```

字段要求：

- `id`：`<前缀>_<3位数>`，如 `trk_time_005`
- `arabic`：**必须带完整元音符（harakat）**；整句 4–12 词，口语化、生活化，别用生僻书面语
- `chinese`：通顺意译，不要逐字硬翻
- `audio`：写约定占位路径 `/assets/audio/walkman/<id>.mp3`
  - **不需要真的去做 mp3 文件**。App 端开了运行时 TTS（`arabicTts` 云函数），文件不存在时会用阿语文本自动合成发音。
- `bookIds`：用竖线 `|` 连接，**必须包含 `all`**，如 `b3|all`

把生成的行追加到 `walkman_tracks.tsv` 末尾。

### 第 4 步（仅新建词书时）：写 books 表

在 `walkman_books.tsv` 里、`all` 那一行**之前**插入新行：

- `id`：现有最大 b 序号 + 1（如已有 b6 → 用 b7）
- `title`：词书名 + 句数，如 `餐厅点餐 20 句`
- `subtitle`：一句话说明覆盖哪些场景

新前缀自拟一个有意义的英文短词（如餐厅→`trk_food`、打车→`trk_taxi`），并在本 skill 的"现有词书"心智里记住它。

### 第 5 步：校验 + 构建

```bash
npm run check:content   # 先干跑校验，看有没有重复 id / 缺列
npm run build:content   # 真正生成 resources/walkman.ts + cloud-import-bundle.json
```

两条都要绿。`build:content` 会同时更新本地资源和云导入包。

### 第 5.5 步：自动自审（强制，新内容必做）

> 用户要求：**生成新内容后必须自动审查**，审完无误才交付。统一走 `review-content` skill。

1. 跑体检脚本：

   ```bash
   node .claude/skills/review-content/check.mjs walkman
   ```

   报告写在 `content-input/generated/content-review-report.txt`。重复 id / 漏标元音 / 空字段 / bookIds 必含 all 且词书真实 必须归零。

2. 再按 `review-content` SKILL「阶段 1」的**通用阿语核心 + 随身听附则**逐条复核本批新增句：
   - 元音 تشكيل、句子口语自然通顺（动词变位、性数格一致）、中文意译准确。
   - `arabic` 4-12 词；`bookIds` 含 `all`；同前缀序号连续不重复；不与已有句重复。

3. 发现问题就地改 TSV，改完重跑 `npm run check:content && npm run build:content`，再跑一次 check.mjs，全绿才进下一步。

### 第 6 步：告诉用户怎么上线

```
✅ 已新增 N 条「<词书名>」随身听句子
✅ id 范围：<前缀>_001 - <前缀>_NNN
✅ 已写入 TSV 并构建完成

下一步操作（必须做，否则真机看不到新句子）：
1. 微信开发者工具 → 右键 cloudfunctions/contentImporter → 上传并部署（云端安装依赖）
   （只有改过 books / 加过新词书时才必须重新部署；只加 tracks 也建议部署一次保证 bundle 最新）
2. 小程序 → 我的 → 设置 → 资源导入（管理员）→ 点「仅导入随身听」
3. 进 学习 → 随身听 → 对应词书，就能听到新句子（首次播放会现场合成发音，稍等一两秒）

说明：
- 词书卡片（标题/副标题）是打包进小程序代码的，改完重新「编译」就能看到，不依赖云导入。
- 句子内容存在云端 walkman_tracks 集合，必须走上面第 2 步导入才会更新。
```

## 质量门槛

- 阿语必须带完整元音符（每个词都标），这是发音合成和跟读的基础。
- 句子要口语、实用、成套——同一本词书内尽量覆盖一个场景的高频表达，不要东一句西一句。
- 中文意译自然，不要翻译腔。
- 每条 bookIds 都含 `all`。
- 同前缀序号连续、不跳号、不重复；不重复已有句子。

## 不要做

- ❌ 不要手改 `miniprogram/resources/walkman.ts`（会被构建覆盖）。
- ❌ 不要漏掉 bookIds 里的 `all`。
- ❌ 不要为了凑数写没带元音的阿语。
- ❌ 不要去生成 mp3 文件——运行时 TTS 会兜底，留占位路径即可。
- ❌ 不要用空格代替 Tab 分隔 TSV 列。
