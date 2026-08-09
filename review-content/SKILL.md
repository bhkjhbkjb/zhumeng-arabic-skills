---
name: review-content
description: 以阿拉伯语语法/词法专家视角，审核「逐梦阿语」所有内容模块的准确性——词汇 / 听力 / 跟读 / 随身听 / 阅读。核查元音标注(تشكيل)、词根(جذر)、词形(صرف/وزن)、词性、句法成分(إعراب)、译文/词义，以及各表结构(孤儿引用 / 重复键 / 空字段 / order 连续 / bookIds 含 all)。当用户要求"检查/审核/校对内容""保证内容准确性"时触发；也被 add-vocab / add-listening / add-walkman / add-reading 等生成 skill 在交付前强制调用。先跑自动体检脚本(按模块)，再按批次做人工专家复核与修订。
---

# 内容模块专家审核 Skill（通用）

目标：把任意内容模块的阿语内容审到「母语语法老师不挑错」的水平。重点是**准确性**：元音、词根、词形、词性、译文、句法、以及表与表之间的结构一致。

> 这是「逐梦阿语」唯一的内容审查入口。所有 `add-*` 生成 skill 在交付前都必须回到这里跑体检 + 专家复核。公众号文章（sync-wechat，纯中文无阿语）不在本 skill 范围内。

## 适用模块一览（数据在哪 / 怎么体检 / 改完导哪）

源文件全在 `content-input/excel/`，**只改 TSV，别碰生成物**。

| 模块 | 生成 skill | 主要 TSV | 含阿语字段 | 体检命令模块名 | 改完导入按钮 |
|------|-----------|----------|-----------|---------------|-------------|
| 词汇 | add-vocab | `vocabulary_words.tsv` | `word` | `vocab` | 仅导入词汇 |
| 听力 | add-listening(听力) | `listening_training_sentences.tsv` | `arabic` | `listening` | 仅导入听力 |
| 跟读 | add-listening(跟读) | `speaking_shadowing_scenarios.tsv` + `speaking_shadowing_sentences.tsv` | `arabic` | `shadowing` | 仅导入口语 |
| 随身听 | add-walkman | `walkman_books.tsv` + `walkman_tracks.tsv` | `arabic` | `walkman` | 仅导入随身听 |
| 阅读 | add-reading | `reading_*.tsv`（8 张关联表） | 多处 | `reading` | 仅导入阅读 |

> ⚠️ `miniprogram/resources/*.ts`、`reading-detail-chunks/`、`cloud-import-bundle.json` 都是构建产物，**永不手改**，改完跑 `npm run build:content` 重新生成。

## 审核三阶段

### 阶段 0 —— 跑自动体检（必做，先粗筛）

体检脚本只读、按模块分派，详单写到 `content-input/generated/content-review-report.txt`：

```bash
node .claude/skills/review-content/check.mjs vocab          # 全量词汇
node .claude/skills/review-content/check.mjs vocab v2050    # 只看本批 id 前缀
node .claude/skills/review-content/check.mjs listening      # 听力
node .claude/skills/review-content/check.mjs shadowing      # 跟读
node .claude/skills/review-content/check.mjs walkman        # 随身听
node .claude/skills/review-content/check.mjs reading a2     # 阅读中级（按文章 id 前缀过滤）
node .claude/skills/review-content/check.mjs all            # 全部模块
```

脚本会查这些机械问题（各模块取适用项）：

1. **引用完整性 / 孤儿引用**：阅读 word_analysis.wordId / components.sentenceId 必须真存在；跟读 sentence.sceneId 必须在 scenarios；随身听 bookIds 里的词书必须真实。**孤儿 = 改过内容却没同步关联，必须修。**
2. **漏标元音**：含 2+ 字母却完全无 harakat 的词。
3. **词根格式**：必须 2-5 个单字母分隔（阅读用空格，词汇用 ` - `）；`-` 视为"无三辅音根"，需人工判断是否合理。
4. **词根 ↔ 词** 宽松匹配、**派生词 ↔ 词根** 宽松匹配：⚠️ **弱音/همزة/外来词会误报，这两类不是硬性归零项，要人工判断**（如 مَاء 根 م و ه 会被报"缺 2 字母"，其实正确）。
5. **关键字段空缺**、**重复键**、**bookIds 必含 all**、**order 重复**。

> 体检过不了的（除第 4 类合理的弱音误报与合理的 `-` 词根外），先修干净再进阶段 1。脚本退出码非 0 只是提示有命中，最终以人工判读报告为准。

### 阶段 1 —— 人工专家复核（按批次，逐条/逐篇）

一次审一批（词汇/听力/跟读/随身听建议每批 ≤ 30 条；阅读每批 5-10 篇，按 level `a1xx/a2xx/a3xx`）。

#### 通用阿语核心（所有模块的阿语字段都要过这四关）

**A. 元音标注 تشكيل**
- 每个实词都要带完整 harakat；功能词（فِي، إِلَى، مِنْ…）也要标。
- همزة 写法：词首 أ/إ/ا 的区分（اِسْم 是 hamzat waṣl 写 ا+کسرة，不是 أ）；中/末 همزة 的载体 ؤ/ئ/ء 是否正确。
- 太阳字母同化：الشَّمْس 类要在首字母上加 shadda（الشَّرِكَة 而非 الشرِكَة）。
- 月亮字母：الْقَمَر 的 ل 带 sukun。
- tanwin：مَرْحَبًا = ألف + فتحتان；阴性 ة 上的 tanwin 别加 ألف。
- 词尾格位（إعراب）与句法角色一致：主格 ُ/ٌ、宾格 َ/ً、属格 ِ/ٍ。
- ة vs ه、ى vs ي 末尾别混。

**B. 词根 جذر**（词汇 rootLetters / 阅读 root）
- 三辅音根优先；四辅音根（如 ج د و ل، ت ر ج م）按实际写。
- 弱根要还原本字母：قَالَ→ق و ل、دَعَا→د ع و、رَمَى→ر م ي、وَصَلَ→و ص ل。
- 增母（ا و ي ت ن م س ه ء…）不算根字母：اِسْتِقْبَال 根是 ق ب ل，مُسْتَشْفَى 根是 ش ف ي。
- 派生外来词 / 虚词 / 多词短语无三辅音根：استراتيجية、قانون、دفتر、لكن、إلى → 词根填 `-` 合理；但**真有根的别偷懒填 `-`**（عميل→ع م ل，ساعة→س و ع，مكتب→ك ت ب）。
- rootMeaning 要贴该根的核心义，不是该词的义。

**C. 词形 صرف / وزن 与词性**
- 认准词型 Form I–X，主动/被动分词（اسم فاعل / اسم مفعول）、مصدر、صفة مشبهة、اسم مكان/زمان、اسم آلة。
- 例：مُوَظَّف = Form II 被动分词作职业名；مَكْتَب = اسم مكان（ك ت ب）；اِسْتِخْدَام = Form X مصدر（خ د م）。
- partOfSpeech 要和 wordForm 自洽，别"形容词"配"被动分词"互相打架。

**D. 译文 / 词义**
- 句子译文（chinese / translation）：意译通顺、术语准确、不漏不增、不翻译腔。
- 词义（meaning / contextMeaning）：贴语境，不是词典义堆砌。

#### 各模块附则（在通用核心之外额外核对）

**词汇 vocab**
- `rootLetters` 用 ` - `（短横线两侧带空格）分隔，如 `ك - ت - ب`；多词短语词条（如 اتِّفَاقُ العَمَلِ）填 `-` 合理。
- `context` 写**学习/使用场景**，不是词典释义；`extendNote` 写搭配/近义辨析，可空。
- 与已有词不重复。

**听力 listening**
- `tips` 是核心价值：必须给真发音/听辨提示（连读、喉音、元音过渡、重读位置），不能写"加油"这类废话。
- `arabic` 句长 6-15 词；`topic` 大类、`scene` 子场景层级合理；同难度 order 连续不重复。

**跟读 shadowing**
- `arabic` 句短 4-10 词，口语自然；`durationMs` 按词数粗估（每词约 400-500ms + 800ms 缓冲），不能拍脑袋。
- `sceneId` 指向真实场景；同场景 order 连续不重复。

**随身听 walkman**
- `arabic` 4-12 词、口语生活化，同一词书成套覆盖一个场景。
- `bookIds` 用 `|` 连接且**必含 `all`**；引用的词书 id 真实存在。

**阅读 reading**
- **E. 派生词 derivatives**：每个派生词必须**同根**、是真实存在的词、元音正确、type 合理（مصدر/اسم فاعل/اسم مفعول/فعل/صفة…）。常见坑：把近义但**异根**的词当派生词（مُسَاعَدَة 根 س ع د，不是 ع و ن 的 مُعَاوَنَة）。
- **F. 句法成分 components**：text 要能在该句中找到；role/state/sign/desc 不自相矛盾；声称的格位与元音一致（مضاف 不带 tanwin、不带 ال；مضاف إليه 属格）；形容词与被修饰名词在性/数/定指/格四方面一致。
- 孤儿解析行：要么改 wordId/sentenceId 指到正确的现有项，要么（若整篇被重写）删除旧行并按现文重写解析。

### 阶段 2 —— 记录 + 修订 + 回归

1. 把问题按「模块/id/字段/原值/应为/依据」记成清单，先给用户看高风险项。
2. 在对应 TSV 用 Edit 精确改（保持 Tab 分隔，行内别引入空格列错位）。
3. 回归（必做）：
   ```bash
   npm run check:content     # 必须绿
   npm run build:content     # 重新生成资源 + 云导入包
   node .claude/skills/review-content/check.mjs <模块>   # 确认机械问题归零
   ```
4. 告诉用户：改完内容存云端，需 **管理员 → 资源导入 → 对应模块的"仅导入 XX"** 才在真机生效（云函数若没动可不重部署；阅读句子、词汇等内容类必须走导入）。

## 严重度分级（先修高的）

- 🔴 高：词根错、词形/词性错、译文错义、孤儿引用、همزة/太阳字母等会改变词义的元音错、bookIds 漏 all（整条句子在"全部词书"里消失）。
- 🟡 中：派生词异根或伪词、contextMeaning/context 不贴、格位元音与句法不符、order 重复、tips/durationMs 糊弄。
- 🟢 低：rootMeaning 措辞、风格、可省略的解释啰嗦。

## 质量门槛

- 每条结论都要有**语法依据**（根、型、格、同化规则），不能凭感觉。
- 弱根、همزة、增母这些最容易错的，逐个还原验证，别套机械匹配下结论。
- 不确定的（如外来词是否有根）标"存疑待定"，不要硬填。

## 不要做

- ❌ 不手改任何 `*.ts` / chunks / bundle（构建会覆盖）。
- ❌ 不为了凑数把异根近义词塞进派生词。
- ❌ 不把真有三辅音根的词偷懒标 `-`。
- ❌ 不把体检脚本第 4/5 类宽松匹配的弱音误报当成必须"修"的错——那是要人工判断的。
- ❌ 改完不跑 check + build + 复跑 check.mjs 就收工。
- ❌ 一次性硬啃整模块——按批次审，每批审完即修、即回归。
