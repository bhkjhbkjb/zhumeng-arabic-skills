---
name: add-vocab
description: 给「逐梦阿语」小程序批量新增阿拉伯语词汇。当用户输入 /add-vocab 后跟主题/数量/词包/难度时触发；自动生成符合规范的 TSV 行，追加到 content-input/excel/vocabulary_words.tsv，跑校验和构建，并告诉用户下一步去哪里点导入。
---

# 新增词汇 Skill

## 触发条件

- 用户输入 `/add-vocab` 后跟主题、数量、词包、难度等参数
- 例：`/add-vocab 主题:机场入境 数量:30 词包:biz 难度:beginner`
- 参数可以中文也可以英文 key；如果用户没说全，先用 AskUserQuestion 补齐再开始

## 必备参数

| 参数 | 说明 | 取值 |
|------|------|------|
| 主题 | 词汇的语义场景 | 任意中文描述，如「机场入境」「采购询价」 |
| 数量 | 一次生成多少条 | 推荐 20-50，超过 50 要分批 |
| 词包 packId | 归属的词包 | `biz` / `meeting` / `logistics` / `investment` / `legal` |
| 难度 levelId | 难度等级 | `intro` / `beginner` / `intermediate` / `advanced` |

如果用户没指明，按以下默认：
- 数量：30
- 词包：根据主题推断（商务谈判→biz；会议→meeting；物流→logistics；投融资→investment；法务→legal；其余默认 biz）
- 难度：默认 beginner

## 执行流程

### 第 1 步：确认参数

如果参数缺关键的（主题或数量），用 AskUserQuestion 一次问全。不要逐条问。

### 第 2 步：找下一个可用 ID

读 `content-input/excel/vocabulary_words.tsv`，取最后一行的 id（形如 `v2024`），下一个就是 `v2025`。新生成的词汇 id 从这个值开始递增。

### 第 3 步：生成词汇行

按 TSV 字段规范每条生成一行，字段顺序固定：

```
id	packId	levelId	word	meaning	rootLetters	rootMeaning	context	extendNote	audioSrc
```

字段质量要求（严格按这个写，否则下游会出错）：

- `word`：完整带元音符的阿语（用 ـَ ـِ ـُ ـْ ـّ 等正确标符号），不要只给词根
- `meaning`：中文释义简洁，1-12 字，不要写整句话
- `rootLetters`：三辅音词根用 ` - ` 分隔（注意是英文短横线两侧带空格），如 `ك - ت - ب`；没有明确词根写 `-`
- `rootMeaning`：词根核心义，中文 2-8 字，如 `工作、行动`
- `context`：1-2 句中文，写**学习/使用场景**，不要写词典释义
- `extendNote`：1 句中文，写语法提醒/固定搭配/近义辨析，可留空
- `audioSrc`：统一写 `/assets/audio/vocab/{id}.mp3`，**不要写实际路径**（音频之后跑 tts 自动生成）
- 字段之间用**单个 Tab** 分隔，不能用空格
- 阿语和中文都不要带前后空格

### 第 4 步：追加到 TSV

用 Edit 工具把生成的行**追加到 vocabulary_words.tsv 末尾**（不要覆盖已有内容）。如果生成的词数 > 50，分批写避免一次 edit 太大。

### 第 5 步：校验

跑 `npm run check:content`（dry-run），如果报错就修。

### 第 6 步：构建

跑 `npm run build:content`，输出"词汇: XXXX"行，确认词汇数等于原数量+新增数量。

### 第 6.5 步：自动专家自审（强制，新内容必做）

> 用户要求：**生成新内容后必须自动审查**，审完无误才交付。统一走 `review-content` skill，别在这里另起炉灶。

1. 跑体检脚本，只扫本批新增 id 前缀：

   ```bash
   node .claude/skills/review-content/check.mjs vocab vXXXX
   ```

   报告写在 `content-input/generated/content-review-report.txt`。重复 id / 漏标元音 / 词根格式 / 空字段 必须归零（"词根↔词"宽松匹配若是弱音/外来词误报可跳过）。

2. 再按 `review-content` SKILL「阶段 1」的**通用阿语核心 + 词汇附则**逐条复核本批新增词：
   - 元音 تشكيل、词根 جذر（弱根还原 قال→ق و ل、增母剔除 مكتب→ك ت ب、真有根别填 `-`）、词形/词性、`meaning`/`context` 释义贴语境、`rootMeaning` 是根义。
   - `rootLetters` 用 ` - ` 分隔；不与已有词重复。

3. 发现问题就地改 TSV，改完重跑 `npm run check:content && npm run build:content`，再跑一次 check.mjs，全绿才进下一步。

### 第 7 步：告诉用户下一步操作

打印一段简明操作指南，让用户：
1. 打开微信开发者工具
2. 右键 `cloudfunctions/contentImporter` → 上传并部署
3. 进小程序「我的 → 设置 → 资源导入（管理员）」
4. 点「仅导入词汇」按钮（不需要全量，单类导入更快）
5. 完成后在小程序里就能看到新词

强调：不要让用户手动改 TSV、不要让用户跑 npm 命令——这些 Claude 已经做了。

## 质量门槛

每批生成的词都要满足：

- 阿语必须带完整元音符号（فَتْحَة كَسْرَة ضَمَّة سُكُون شَدَّة 等），用于 TTS 发音准确
- 主题相关性高：30 条里至少 25 条是当前主题强相关的高频词
- 词根尽量准确；不确定时宁可写 `-`，不要瞎编
- 中文翻译用现代汉语，避免文言/方言
- 不要重复已有词（如果生成的词在 TSV 已存在，跳过并继续生成补足数量）

## 输出格式

最终给用户一段简短汇报：

```
✅ 已生成 XX 条「<主题>」词汇（id 范围：vXXXX–vYYYY）
✅ 已追加到 vocabulary_words.tsv 并构建完成
📊 全表词汇总数：YYYY 条（原 XXXX + 新增 XX）

下一步操作（约 2 分钟）：
1. 打开微信开发者工具
2. 右键 cloudfunctions/contentImporter → 上传并部署
3. 小程序里：我的 → 设置 → 资源导入（管理员） → 仅导入词汇
4. 完成后，新词在「学习 → 词汇」对应难度里可见
```

## 不要做

- ❌ 不要建议用户去编辑 .tsv 或 .ts 文件
- ❌ 不要让用户跑 npm 命令——你自己跑
- ❌ 不要生成英文字段名以外的列；列必须严格按字段顺序
- ❌ 不要在 audioSrc 写实际云存储地址
- ❌ 不要在词内嵌任何 markdown / html 字符
