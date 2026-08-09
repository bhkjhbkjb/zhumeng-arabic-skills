---
name: add-listening
description: 给「逐梦阿语」小程序新增听力/跟读训练内容。可以批量补「听力训练句子」(listening_training_sentences) 或者「跟读训练场景+句子」(speaking_shadowing)。当用户输入 /add-listening 后跟类型/主题/数量/难度时触发。
---

# 新增听力/跟读内容 Skill

## 触发条件

- 用户输入 `/add-listening` 后跟参数
- 例：
  - `/add-listening 类型:听力 主题:机场登机 数量:20 难度:beginner`
  - `/add-listening 类型:跟读 场景:酒店入住 数量:15 难度:intermediate`

## 两种类型，先识别

| 类型 | 对应表 | 用在哪 |
|------|-------|-------|
| 听力 | `listening_training_sentences.tsv` | 听力 hub → 精听训练 / 泛听电台 |
| 跟读 | `speaking_shadowing_scenarios.tsv` + `speaking_shadowing_sentences.tsv` | 口语 hub → 跟读训练 |

如果用户没指明类型，用 AskUserQuestion 问一下「想补听力训练还是跟读训练？」

## 必备参数

| 参数 | 听力 | 跟读 |
|------|------|------|
| 主题/场景 | 主题（如机场登机） | 场景（如酒店入住） |
| 数量 | 推荐 15-30 句 | 推荐 10-20 句 |
| 难度 | beginner/intermediate/advanced | beginner/intermediate/advanced |

默认值：数量 20、难度 beginner。

## 执行流程 —— 类型 = 听力

### 第 1 步：找下一个 id

读 `listening_training_sentences.tsv` 最后一行的 id。规则：`ls_<level3字母>_<3位数>`，例如 `ls_beg_039` / `ls_int_012` / `ls_adv_007`。

- level3 = beginner→beg / intermediate→int / advanced→adv

### 第 2 步：确定 order

每个难度下 order 是连续递增的。要先扫一下当前难度最大 order，然后从下一个开始。

### 第 3 步：生成 TSV 行

列：`id  level  order  topic  scene  arabic  chinese  tips  audioSrc`

字段质量要求：

- `topic` 是大类（如「商务接待」「报价沟通」），同一批次可共用
- `scene` 是具体子场景（如「首次到访欢迎」「询价开场」）
- `arabic` 完整带元音；句长 6-15 词
- `chinese` 通顺意译
- `tips` 1-2 句中文，要写**听力难点提示**（连读 / 喉音 / 元音过渡 / 重读位置等），不能写"加油"这类无营养话
- `audioSrc` 留空

### 第 4 步：追加 + 构建

追加到 `listening_training_sentences.tsv` 末尾，跑 check + build。

## 执行流程 —— 类型 = 跟读

### 第 1 步：是新场景还是已有场景？

读 `speaking_shadowing_scenarios.tsv`，看用户给的场景名是否已存在：
- 存在 → 只追加 sentences
- 不存在 → 先在 scenarios 表追加 1 行，再加 sentences

### 第 2 步：场景 id 规则

格式：`scene_<英文短词>`，例如 `scene_cafe`、`scene_hotel`、`scene_meeting`。英文短词来自中文场景名的合理音译/意译。

### 第 3 步：scenarios 表字段

列：`id  order  title  subtitle  summary  icon`

- order：当前最大 order + 1
- title：中文场景名（如「酒店入住」）
- subtitle：1-3 字标签（如「出行口语」）
- summary：1 句中文描述这个场景练什么
- icon：英文标识词，对应小程序里的图标占位（hotel/airport/cafe/meeting/...）

### 第 4 步：sentences 表字段

句子 id：`ss_<场景短词>_<3位数>`，例如 `ss_hotel_001`。

列：`id  sceneId  order  arabic  chinese  audioSrc  durationMs`

- sceneId：第 2 步定的场景 id
- order：该场景内独立连续编号，从 1 开始
- arabic：完整带元音；跟读句不要太长，**4-10 词**为宜
- chinese：意译
- audioSrc：留空
- durationMs：估算播放时长，按阿语词数估：每词约 400-500 毫秒，整句加 800 毫秒缓冲；范围一般 2000-6000

### 第 5 步：追加 + 构建

按表写入，跑 check + build。

## 通用步骤（无论类型）

### 校验

```bash
npm run check:content
```

### 构建

```bash
npm run build:content
```

### 自动自审（强制，新内容必做）

> 用户要求：**生成新内容后必须自动审查**，审完无误才交付。统一走 `review-content` skill。

1. 跑体检脚本（听力用 `listening`，跟读用 `shadowing`）：

   ```bash
   node .claude/skills/review-content/check.mjs listening    # 类型=听力
   node .claude/skills/review-content/check.mjs shadowing    # 类型=跟读
   ```

   报告写在 `content-input/generated/content-review-report.txt`。孤儿引用（跟读 sceneId）/ 漏标元音 / 空字段 / order 重复 / 重复 id 必须归零。

2. 再按 `review-content` SKILL「阶段 1」的**通用阿语核心 + 对应模块附则**逐条复核本批新增句：
   - 元音 تشكيل、句子语法（动词变位、性数格一致）、中文意译准确。
   - 听力 `tips` 给真发音/听辨提示；跟读 `durationMs` 按词数估、句短 4-10 词、`sceneId` 真实。
   - 同场景/同难度 order 连续不重复；不与已有句重复。

3. 发现问题就地改 TSV，改完重跑 `npm run check:content && npm run build:content`，再跑一次 check.mjs，全绿才进下一步。

### 告诉用户下一步

```
✅ 已生成 X 条「<主题>」<听力|跟读>训练句
✅ id 范围：xxx_001 - xxx_NNN
✅ 已写入 TSV 并构建完成

下一步操作：
1. 微信开发者工具 → 右键 cloudfunctions/contentImporter → 上传并部署
2. 小程序 → 我的 → 设置 → 资源导入（管理员） → 仅导入听力 或 仅导入口语
3. 进「学习 → 听力 → 精听训练」或「学习 → 口语 → 跟读训练」就能看到新句
```

## 质量门槛

- 阿语必须带完整元音符
- 听力的 tips 字段是核心价值，不能糊弄——要给真正的发音/听辨提示
- 跟读的 durationMs 不能拍脑袋写，至少按词数粗估
- 同一场景下 order 不能跳号或重复
- 不重复已有句

## 不要做

- ❌ 不要在不识别类型的情况下硬跑（必须先确认是听力还是跟读）
- ❌ 不要在 sentences 里引用未在 scenarios 表存在的 sceneId
- ❌ 不要把同一句话同时写进听力和跟读两个表
