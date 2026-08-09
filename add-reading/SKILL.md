---
name: add-reading
description: 给「逐梦阿语」小程序批量新增阿拉伯语阅读文章 + 完整词法/句法解析。当用户输入 /add-reading 后跟主题/数量/难度/语法重点时触发；同时生成 8 张相关 TSV 表（articles / details / sentences / words / word_analysis / derivatives / sentence_analysis / sentence_components），追加进各文件，跑构建，并强制用 review-content 自动审查（体检脚本 + 专家复核）后再提示下一步。
---

# 新增阅读文章 Skill

## 触发条件

- 用户输入 `/add-reading` 后跟参数
- 例：`/add-reading 主题:发货延误沟通 数量:3 难度:intermediate 语法:完成体动词与时间状语`

## 必备参数

| 参数 | 说明 | 取值 |
|------|------|------|
| 主题 | 文章语义场景 | 任意中文，如「办公室一天」 |
| 数量 | 生成几篇 | 推荐 **1-3 篇**，超过 3 篇分批 |
| 难度 level | 难度等级 | `intro` / `beginner` / `intermediate` / `advanced` |
| 语法 | 该文要突出的语法重点 | 任意中文，如「名词句、独立代词」 |
| 句数 | 每篇文章的句子数 | 默认 4-7 句，可让用户指定 |

如果用户没指明：
- 数量：1
- 难度：beginner
- 语法：根据主题推断
- 句数：5

## 执行流程

### 第 1 步：确认参数

参数不全用 AskUserQuestion 一次问全。**特别注意：1 篇阅读 = 8 张表关联数据，工作量大，先确认数量。**

### 第 2 步：分配 ID

- 文章 id：读 `reading_articles.tsv` 最后一行，下一个递增。当前规则是 `a101`、`a102` 这样三位数字。
- 句子 id：每篇文章内独立编号，`s1` `s2` `s3` ...
- 词 id：每篇文章内独立编号，`w1` `w2` `w3` ...
- 段落 id：默认每篇文章只有 1 段，用 `p1`。如果文章超过 6 句可分 `p1`、`p2`。

### 第 3 步：先写文章总体结构

每篇文章按下面顺序确定：

1. **标题（阿语 + 中文）**
2. **段落-句子拆分**：5 句一段，每句 4-12 个词
3. **核心词清单**：每句标出 1-3 个值得做词法解析的词（高频实词、有清晰词根的词）
4. **句法分析重点**：每句拆 2-5 个成分（起语/述语/动词核心/宾语/介词短语/状语...）

### 第 4 步：生成 8 张表的 TSV 行

**所有 TSV 字段都用 Tab 分隔，不能用空格。阿语带完整元音符号。**

#### 4.1 reading_articles.tsv（文章总览）
列：`id  level  titleArabic  titleChinese  tags  wordCount`
- tags 用 `|` 分隔，比如 `语法专题|采购询价|动词被动`
- wordCount 是这篇文章阿语总词数

#### 4.2 reading_article_details.tsv（详情头）
列：`id  title  titleChinese  sourceType  sourceLabel  originalUrl`
- id 必须和 articles 表一致
- sourceType 写 `manual`
- sourceLabel 写 `AI精校教案`
- originalUrl 留空

#### 4.3 reading_sentences.tsv（句子）
列：`articleId  paragraphId  sentenceId  order  translation`
- translation 写**中文意译**，通顺自然优先

#### 4.4 reading_words.tsv（句内逐词）
列：`articleId  sentenceId  wordId  order  arWithVowel  arNoVowel`
- arWithVowel 带元音
- arNoVowel 是去掉所有元音/塔什迪德后的形态（用 `ً-ٰٟ` 范围内的字符去掉），保留字母原型 + 必要标点（如句末 `.` 或问号 `？`）
- 必须把整句拆完，标点跟在词后面

#### 4.5 reading_word_analysis.tsv（词法分析，重点核心词）
列：`articleId  wordId  arabic  chinese  isFav  root  rootMeaning  partOfSpeech  contextMeaning  wordForm  usageNote`
- 不是每个词都要分析，只选每句 1-3 个核心词
- isFav 统一写 `false`
- root 用空格分隔的三辅音，如 `ر ح ب`；无明确词根写 `-`
- partOfSpeech：动词/名词/形容词/副词/介词/连词/代词/疑问词 等中文标注
- contextMeaning：该词在这句话里的具体意思（不是词典义）
- wordForm：词形说明，如「II 型动词的被动分词」「主格名词阴性」
- usageNote：1 句常见搭配/语法提示

#### 4.6 reading_word_derivatives.tsv（派生词）
列：`articleId  wordId  order  arabic  chinese  type`
- 每个核心词补 1-3 个派生词
- type 写 `动词`/`名词`/`形容词`/`副词`

#### 4.7 reading_sentence_analysis.tsv（句子分析头）
列：`articleId  sentenceId  arabic  chinese  isFav`
- arabic 写整句完整阿语（带元音 + 标点）
- chinese 写整句中文译文
- isFav `false`

#### 4.8 reading_sentence_components.tsv（句法成分）
列：`articleId  sentenceId  order  text  role  state  sign  desc`
- 每句拆 2-5 个成分
- role：例 `起语 / 主语`、`述语 / 谓语`、`动词核心`、`宾语`、`介词短语`、`定语`、`状语`
- state：例 `主格 (مرفوع)`、`属格结构`、`直陈式`、`虚拟式`、`独立代词`
- sign：句法标识，例 `合口符 (ضمة)`、`أن 使后接动词入虚拟式`、`介词 + 属格`
- desc：1-2 句中文解释为什么这样分析

### 第 5 步：追加到各 TSV

按顺序用 Edit 追加每张表，每张表都加在文件**末尾**。

### 第 6 步：校验 + 构建

```bash
npm run check:content
npm run build:content
```

`check:content` 报错就回头修：常见错误是引用了不存在的 articleId/sentenceId，仔细对 id。

### 第 6.5 步：自动专家自审（强制，新内容必做）

> 用户要求：**生成新内容后必须自动审查**，审完无误才算完成。绝不能生成完直接交付。

1. 跑 `review-content` 的体检脚本，**只扫本次新增的文章 id 前缀**：

   ```bash
   node .claude/skills/review-content/check.mjs reading aXXX   # 单篇
   node .claude/skills/review-content/check.mjs reading a2     # 或本批所属区间
   ```

   报告写在 `content-input/generated/content-review-report.txt`。引用完整性 / 漏标元音 / 词根格式 / 派生词同根 / 空字段 / 重复 这几类必须全部归零（合理的 `-` 词根、第 4/5 类弱音误报除外）。

2. 再按 `review-content` SKILL「阶段 1」清单对**每一篇新文章**做人工专家复核：
   - 元音 تشكيل（همزة 载体、太阳字母 shadda、tanwin、词尾格位与句法一致）
   - 词根 جذر（弱根还原、增母剔除，真有根别填 `-`）
   - 词形 صرف / 词性自洽
   - 译文信达、contextMeaning 贴语境
   - 派生词同根且为真词、元音正确
   - 句法成分 role/state/sign/desc 不自相矛盾

3. 发现问题**就地在 TSV 改**，改完重跑 `npm run check:content && npm run build:content`，再跑一次 check.mjs，直到干净。

只有这一步全绿，才进入第 7 步交付。

### 第 7 步：告诉用户下一步

```
✅ 已生成 X 篇阅读：
  - aXXX 标题1
  - aYYY 标题2
✅ 已写入 8 张关联 TSV 并构建完成
📊 阅读列表总数：YYY 篇

下一步操作：
1. 微信开发者工具 → 右键 cloudfunctions/contentImporter → 上传并部署
2. 小程序 → 我的 → 设置 → 资源导入（管理员） → 仅导入阅读
3. 进「学习 → 阅读」对应难度组即可看到新文章
```

## 质量门槛

- **阿语必须带完整元音符号** — TTS 离不开元音判断断句
- **句法/词法解析是亮点** — 不能敷衍，state/sign/desc 必须真实有教学价值
- **派生词要正确** — 不要瞎编（如果不确定某个词的派生族就跳过那个词，宁可少补也不能错）
- **句子 4-12 个词** — 不要超长，否则学生看不下去
- **同篇文章内 wordId 不能重名** — 每篇独立编号

## 不要做

- ❌ 不要让用户手改 TSV
- ❌ 不要把整篇文章写成一个大段落不拆句
- ❌ 不要把句法分析做得太浅（"主语 / 谓语 / 宾语"三件套不够；要标出 state 和 sign）
- ❌ 不要在 TSV 字段内嵌 Tab 或换行
- ❌ 不要写无中生有的派生词
