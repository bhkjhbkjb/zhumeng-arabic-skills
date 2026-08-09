// review-content 通用自动结构体检脚本（覆盖所有内容模块）
// 用法：node .claude/skills/review-content/check.mjs <模块> [id前缀过滤]
//   模块：reading | vocab | listening | shadowing | walkman | all
//   例：
//     node .claude/skills/review-content/check.mjs vocab          # 全量词汇
//     node .claude/skills/review-content/check.mjs vocab v18      # 只看 v18xx
//     node .claude/skills/review-content/check.mjs reading a2     # 阅读中级 a2xx
//     node .claude/skills/review-content/check.mjs reading a201   # 阅读单篇
//     node .claude/skills/review-content/check.mjs shadowing      # 跟读
//     node .claude/skills/review-content/check.mjs all            # 全部模块
// 只读，不改任何文件。输出到终端 + content-input/generated/content-review-report.txt
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const dir = path.join(root, 'content-input', 'excel')
const MODULES = ['reading', 'vocab', 'listening', 'shadowing', 'walkman']
const moduleArg = (process.argv[2] || '').trim().toLowerCase()
const filter = (process.argv[3] || '').trim()

if (!moduleArg || (moduleArg !== 'all' && !MODULES.includes(moduleArg))) {
  console.error('用法: node .claude/skills/review-content/check.mjs <模块> [id前缀]')
  console.error('模块: ' + MODULES.join(' / ') + ' / all')
  process.exit(1)
}

// ---------- 共享工具 ----------
function readTSV(name) {
  const text = fs.readFileSync(path.join(dir, name), 'utf8').replace(/^﻿/, '')
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  const headers = lines[0].split('\t')
  return lines.slice(1).map((line) => {
    const cells = line.split('\t')
    const row = {}
    headers.forEach((h, i) => (row[h] = (cells[i] ?? '').trim()))
    return row
  })
}

const HARAKAT = /[ً-ْٰ]/ // tanwin/harakat/shadda/sukun + dagger alif
const ARABIC_LETTER = /[ء-ي]/
function stripTashkeel(s) {
  return String(s || '').replace(/[ً-ْٰـ]/g, '')
}
// 归一化弱音/همزة，用于"词根字母是否出现在词里"的宽松匹配
function normalize(s) {
  return stripTashkeel(s)
    .replace(/[أإآ]/g, 'ا')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ء/g, '')
}
function hasBareArabicWord(text) {
  // 文本里是否存在"含 2+ 阿语字母却完全无 harakat"的词（漏标元音）
  const tokens = String(text || '').split(/[\s،.؛:!؟?\-—()"'«»\[\]|]+/).filter(Boolean)
  const bad = []
  for (const tk of tokens) {
    const letters = (tk.match(/[ء-ي]/g) || []).length
    if (letters >= 2 && !HARAKAT.test(tk)) bad.push(tk)
  }
  return bad
}

const report = []
const log = (line = '') => report.push(line)
const section = (title) => { log(''); log('========== ' + title + ' ==========') }
let GRAND = 0
const tally = (n, label) => { log(`小计：${n} ${label}`); GRAND += n }

const inScope = (id) => !filter || String(id || '').startsWith(filter)

// 通用：漏标元音
function bareVowels(label, rows, getId, getText) {
  let n = 0
  for (const r of rows) {
    if (!inScope(getId(r))) continue
    const bad = hasBareArabicWord(getText(r))
    if (bad.length) { log(`${label} ${getId(r)}: 「${bad.join('、')}」 ← ${getText(r)}`); n++ }
  }
  return n
}
// 通用：重复主键
function dupKey(label, rows, getKey) {
  let n = 0
  const seen = new Set()
  for (const r of rows) {
    if (!inScope(getKey(r))) continue
    const k = getKey(r)
    if (seen.has(k)) { log(`${label} 重复键 ${k}`); n++ }
    seen.add(k)
  }
  return n
}
// 通用：空字段
function emptyFields(label, rows, getId, fields) {
  let n = 0
  for (const r of rows) {
    if (!inScope(getId(r))) continue
    for (const f of fields) if (!r[f]) { log(`${label} ${getId(r)} 缺字段 ${f}`); n++ }
  }
  return n
}
// 通用：词根（按分隔符）—— 返回 {ok, parts}
function parseRoot(raw, sep) {
  const parts = String(raw || '').split(sep).map((p) => p.trim()).filter(Boolean)
  // '-' 视为"无三辅音根"
  if (parts.length === 1 && parts[0] === '-') return { none: true, parts: [] }
  const cleaned = parts.filter((p) => p !== '-')
  return { none: cleaned.length === 0, parts: cleaned }
}
// 通用：词根格式（2-5 个单字母）
function rootFormat(label, rows, getId, getRoot, getArabic, sep) {
  let n = 0
  for (const r of rows) {
    if (!inScope(getId(r))) continue
    const { none, parts } = parseRoot(getRoot(r), sep)
    if (none) continue
    const ok = parts.length >= 2 && parts.length <= 5 &&
      parts.every((p) => stripTashkeel(p).length === 1 && ARABIC_LETTER.test(p))
    if (!ok) { log(`${getId(r)} 词根可疑：「${getRoot(r)}」(${getArabic(r)})`); n++ }
  }
  return n
}
// 通用：词根字母是否出现在词里（宽松，弱音会误报）
function rootMatch(label, rows, getId, getRoot, getArabic, sep) {
  let n = 0
  for (const r of rows) {
    if (!inScope(getId(r))) continue
    const { none, parts } = parseRoot(getRoot(r), sep)
    if (none) continue
    const np = parts.map((p) => normalize(p)).filter(Boolean)
    if (np.length < 3) continue
    const w = normalize(getArabic(r))
    let miss = 0
    for (const p of np) if (p && !w.includes(p)) miss++
    if (miss >= 2) { log(`${getId(r)} 词根「${getRoot(r)}」与词「${getArabic(r)}」缺 ${miss} 个字母`); n++ }
  }
  return n
}

// ==================================================================
// 模块：阅读 reading（8 张表，保留原 7 类检查）
// ==================================================================
function checkReading() {
  const articles = readTSV('reading_articles.tsv')
  const details = readTSV('reading_article_details.tsv')
  const sentences = readTSV('reading_sentences.tsv')
  const words = readTSV('reading_words.tsv')
  const wordAnalysis = readTSV('reading_word_analysis.tsv')
  const derivatives = readTSV('reading_word_derivatives.tsv')
  const sentAnalysis = readTSV('reading_sentence_analysis.tsv')
  const components = readTSV('reading_sentence_components.tsv')

  log('')
  log('################ 模块：阅读 reading（范围：' + (filter || '全部') + '）################')

  // 1. 引用完整性
  section('阅读 1. 引用完整性 / 孤儿引用')
  const detailIds = new Set(details.map((d) => d.id))
  let n = 0
  for (const a of articles) if (inScope(a.id) && !detailIds.has(a.id)) { log(`articles 有 ${a.id} 但 details 缺详情`); n++ }
  const wordKey = new Set(words.map((w) => `${w.articleId}::${w.wordId}`))
  for (const wa of wordAnalysis) {
    if (!inScope(wa.articleId)) continue
    if (!wordKey.has(`${wa.articleId}::${wa.wordId}`)) { log(`word_analysis 引用了不存在的词：${wa.articleId}/${wa.wordId} (${wa.arabic})`); n++ }
  }
  const sentKey = new Set(sentences.map((s) => `${s.articleId}::${s.sentenceId}`))
  for (const c of components) {
    if (!inScope(c.articleId)) continue
    if (!sentKey.has(`${c.articleId}::${c.sentenceId}`)) { log(`sentence_components 引用了不存在的句子：${c.articleId}/${c.sentenceId}`); n++ }
  }
  for (const sa of sentAnalysis) {
    if (!inScope(sa.articleId)) continue
    if (!sentKey.has(`${sa.articleId}::${sa.sentenceId}`)) { log(`sentence_analysis 引用了不存在的句子：${sa.articleId}/${sa.sentenceId}`); n++ }
  }
  tally(n, '处引用问题')

  // 2. 漏标元音
  section('阅读 2. 漏标元音（含 2+ 字母却无任何 harakat 的词）')
  n = 0
  n += bareVowels('words.arWithVowel', words, (r) => r.articleId, (r) => r.arWithVowel)
  n += bareVowels('word_analysis.arabic', wordAnalysis, (r) => r.articleId, (r) => r.arabic)
  n += bareVowels('components.text', components, (r) => r.articleId, (r) => r.text)
  n += bareVowels('derivatives.arabic', derivatives, (r) => r.articleId, (r) => r.arabic)
  tally(n, '处疑似漏标元音')

  // 3. 词根格式
  section('阅读 3. 词根格式异常（应为 2-5 个单字母，空格分隔）')
  n = rootFormat('word_analysis', wordAnalysis, (r) => r.articleId, (r) => r.root, (r) => r.arabic, /\s+/)
  tally(n, '处词根格式异常')

  // 4. 词根 ↔ 词
  section('阅读 4. 词根与词不匹配（宽松匹配，可能有弱音误报，需人工复核）')
  n = rootMatch('word_analysis', wordAnalysis, (r) => r.articleId, (r) => r.root, (r) => r.arabic, /\s+/)
  tally(n, '处词根/词疑似不符（需人工判断弱音）')

  // 5. 派生词 ↔ 词根
  section('阅读 5. 派生词与所属词根不匹配（宽松）')
  n = 0
  const rootByWord = new Map(wordAnalysis.map((wa) => [`${wa.articleId}::${wa.wordId}`, wa.root]))
  for (const d of derivatives) {
    if (!inScope(d.articleId)) continue
    const rt = rootByWord.get(`${d.articleId}::${d.wordId}`)
    if (!rt) continue
    const parts = rt.split(/\s+/).map((p) => normalize(p)).filter(Boolean)
    if (parts.length < 3) continue
    const w = normalize(d.arabic)
    let miss = 0
    for (const p of parts) if (p && !w.includes(p)) miss++
    if (miss >= 2) { log(`${d.articleId}/${d.wordId} 派生词「${d.arabic}」与词根「${rt}」缺 ${miss} 个字母`); n++ }
  }
  tally(n, '处派生词疑似不符')

  // 6. 空字段
  section('阅读 6. 关键字段空缺')
  n = 0
  n += emptyFields('word_analysis', wordAnalysis, (r) => r.articleId, ['arabic', 'chinese', 'root', 'rootMeaning', 'partOfSpeech', 'contextMeaning'])
  for (const s of sentences) {
    if (!inScope(s.articleId)) continue
    if (!s.translation) { log(`${s.articleId}/${s.sentenceId} 句子缺译文`); n++ }
  }
  tally(n, '处空字段')

  // 7. 重复
  section('阅读 7. 重复键')
  n = dupKey('word_analysis', wordAnalysis, (r) => `${r.articleId}::${r.wordId}`)
  tally(n, '处重复')

  log('')
  log(`阅读规模：文章 ${articles.length} | 句子 ${sentences.length} | 词 ${words.length} | 词分析 ${wordAnalysis.length} | 派生 ${derivatives.length} | 句法成分 ${components.length}`)
}

// ==================================================================
// 模块：词汇 vocab（vocabulary_words.tsv，词根用 " - " 分隔）
// ==================================================================
function checkVocab() {
  const rows = readTSV('vocabulary_words.tsv')
  const scoped = rows.filter((r) => inScope(r.id))
  log('')
  log('################ 模块：词汇 vocab（范围：' + (filter || '全部') + '，命中 ' + scoped.length + ' 条）################')

  section('词汇 1. 重复 id')
  tally(dupKey('vocab', rows, (r) => r.id), '处重复')

  section('词汇 2. 漏标元音（word 字段）')
  tally(bareVowels('word', rows, (r) => r.id, (r) => r.word), '处疑似漏标元音')

  section('词汇 3. 词根格式异常（rootLetters，应 2-5 个单字母，- 分隔；纯 "-" 表示无根）')
  tally(rootFormat('vocab', rows, (r) => r.id, (r) => r.rootLetters, (r) => r.word, /[\s\-]+/), '处词根格式异常')

  section('词汇 4. 词根与词不匹配（宽松，弱音/外来语会误报）')
  tally(rootMatch('vocab', rows, (r) => r.id, (r) => r.rootLetters, (r) => r.word, /[\s\-]+/), '处词根/词疑似不符')

  section('词汇 5. 关键字段空缺（word/meaning/rootLetters/rootMeaning/context）')
  tally(emptyFields('vocab', rows, (r) => r.id, ['word', 'meaning', 'rootLetters', 'rootMeaning', 'context']), '处空字段')

  log('')
  log(`词汇规模：全表 ${rows.length} 条`)
}

// ==================================================================
// 模块：听力 listening（listening_training_sentences.tsv）
// ==================================================================
function checkListening() {
  const rows = readTSV('listening_training_sentences.tsv')
  const scoped = rows.filter((r) => inScope(r.id))
  log('')
  log('################ 模块：听力 listening（范围：' + (filter || '全部') + '，命中 ' + scoped.length + ' 条）################')

  section('听力 1. 重复 id')
  tally(dupKey('listening', rows, (r) => r.id), '处重复')

  section('听力 2. 漏标元音（arabic 字段）')
  tally(bareVowels('arabic', rows, (r) => r.id, (r) => r.arabic), '处疑似漏标元音')

  section('听力 3. 关键字段空缺（arabic/chinese/topic/scene/tips）')
  tally(emptyFields('listening', rows, (r) => r.id, ['arabic', 'chinese', 'topic', 'scene', 'tips']), '处空字段')

  section('听力 4. 同难度 order 重复')
  let n = 0
  const seen = new Set()
  for (const r of rows) {
    if (!inScope(r.id)) continue
    const k = `${r.level}::${r.order}`
    if (r.order && seen.has(k)) { log(`${r.id} 难度 ${r.level} 内 order=${r.order} 重复`); n++ }
    seen.add(k)
  }
  tally(n, '处 order 重复')

  log('')
  log(`听力规模：全表 ${rows.length} 句`)
}

// ==================================================================
// 模块：跟读 shadowing（scenarios + sentences）
// ==================================================================
function checkShadowing() {
  const scenarios = readTSV('speaking_shadowing_scenarios.tsv')
  const sentences = readTSV('speaking_shadowing_sentences.tsv')
  const scoped = sentences.filter((r) => inScope(r.id))
  log('')
  log('################ 模块：跟读 shadowing（范围：' + (filter || '全部') + '，命中 ' + scoped.length + ' 句）################')

  section('跟读 1. 孤儿引用（sentence.sceneId 必须存在于 scenarios）')
  let n = 0
  const sceneIds = new Set(scenarios.map((s) => s.id))
  for (const r of sentences) {
    if (!inScope(r.id)) continue
    if (!sceneIds.has(r.sceneId)) { log(`${r.id} 引用了不存在的场景 sceneId=${r.sceneId}`); n++ }
  }
  tally(n, '处孤儿引用')

  section('跟读 2. 重复句 id')
  tally(dupKey('shadowing', sentences, (r) => r.id), '处重复')

  section('跟读 3. 漏标元音（arabic 字段）')
  tally(bareVowels('arabic', sentences, (r) => r.id, (r) => r.arabic), '处疑似漏标元音')

  section('跟读 4. 关键字段空缺（sceneId/arabic/chinese）')
  tally(emptyFields('shadowing', sentences, (r) => r.id, ['sceneId', 'arabic', 'chinese']), '处空字段')

  section('跟读 5. 同场景内 order 重复')
  n = 0
  const seen = new Set()
  for (const r of sentences) {
    if (!inScope(r.id)) continue
    const k = `${r.sceneId}::${r.order}`
    if (r.order && seen.has(k)) { log(`${r.id} 场景 ${r.sceneId} 内 order=${r.order} 重复`); n++ }
    seen.add(k)
  }
  tally(n, '处 order 重复')

  log('')
  log(`跟读规模：场景 ${scenarios.length} 个 | 句子 ${sentences.length} 句`)
}

// ==================================================================
// 模块：随身听 walkman（books + tracks）
// ==================================================================
function checkWalkman() {
  const books = readTSV('walkman_books.tsv')
  const tracks = readTSV('walkman_tracks.tsv')
  const scoped = tracks.filter((r) => inScope(r.id))
  log('')
  log('################ 模块：随身听 walkman（范围：' + (filter || '全部') + '，命中 ' + scoped.length + ' 条）################')

  section('随身听 1. 重复 id')
  tally(dupKey('walkman', tracks, (r) => r.id), '处重复')

  section('随身听 2. 漏标元音（arabic 字段）')
  tally(bareVowels('arabic', tracks, (r) => r.id, (r) => r.arabic), '处疑似漏标元音')

  section('随身听 3. 关键字段空缺（arabic/chinese/audio/bookIds）')
  tally(emptyFields('walkman', tracks, (r) => r.id, ['arabic', 'chinese', 'audio', 'bookIds']), '处空字段')

  section('随身听 4. bookIds 必含 all，且每个 book 必须真实存在')
  let n = 0
  const bookIds = new Set(books.map((b) => b.id))
  for (const r of tracks) {
    if (!inScope(r.id)) continue
    const ids = (r.bookIds || '').split('|').map((s) => s.trim()).filter(Boolean)
    if (!ids.includes('all')) { log(`${r.id} bookIds 缺 all：「${r.bookIds}」`); n++ }
    for (const b of ids) if (b !== 'all' && !bookIds.has(b)) { log(`${r.id} bookIds 引用了不存在的词书 ${b}`); n++ }
  }
  tally(n, '处 bookIds 问题')

  log('')
  log(`随身听规模：词书 ${books.length} 本 | 句子 ${tracks.length} 条`)
}

// ---------- 分派 ----------
const RUN = {
  reading: checkReading,
  vocab: checkVocab,
  listening: checkListening,
  shadowing: checkShadowing,
  walkman: checkWalkman,
}

log('========== review-content 体检：模块=' + moduleArg + (filter ? ' 过滤=' + filter : '') + ' ==========')
const toRun = moduleArg === 'all' ? MODULES : [moduleArg]
for (const m of toRun) RUN[m]()

section('体检完成')
log(`总问题数：${GRAND}`)
log(GRAND === 0 ? '✅ 机械体检通过（0 处问题）—— 可进入人工专家复核' : `❌ 发现 ${GRAND} 处问题 —— 先修干净再进专家复核`)

const out = report.join('\n')
const outFile = path.join(root, 'content-input', 'generated', 'content-review-report.txt')
fs.mkdirSync(path.dirname(outFile), { recursive: true })
fs.writeFileSync(outFile, out + '\n', 'utf8')
console.log(out)
console.log('\n报告已写入：' + path.relative(root, outFile))
process.exit(GRAND === 0 ? 0 : 1)
