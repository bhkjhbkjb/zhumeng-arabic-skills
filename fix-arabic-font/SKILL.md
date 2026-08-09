---
name: fix-arabic-font
description: 诊断并修复小程序页面中阿拉伯语文字渲染问题（元音符号裁切、贴边、字体不统一、RTL 方向错误）。当用户说"阿语被遮挡""阿语看不清""阿拉伯文显示有问题"等时触发。
---

# 修复阿语字体渲染

## 触发条件

- 用户说某个页面"阿语被裁了""阿语有遮挡""阿拉伯文显示不全"
- 用户说"阿语字体不对""阿语太小/太大"
- 用户提到 Arabic text 被 clipped / cut off / hidden
- `/fix-arabic-font <页面名>`

## 诊断清单（逐项自动检查）

对目标页面的 wxml + less 执行以下检查：

### 1. 父容器 overflow 检查（最常见原因）

```
✓ 正确: 包含阿语文本的卡片/容器没有 overflow: hidden
✗ 错误: overflow: hidden 会裁切元音符号（ـَ ـِ ـُ ـّ 等渲染在字符上方/下方）
```

修复：从卡片 less 中删除 `overflow: hidden`，同时增加 `padding-top` 和 `padding-bottom` 到 30rpx/28rpx 以补偿。

### 2. line-height 检查

```
✓ 正确: 所有阿语 text 元素的 line-height ≥ 2.0
✗ 错误: line-height < 1.9，元音符号被行盒裁切
```

修复：阿语元素的 `line-height` 统一设为 `2.0`。

### 3. 字体栈检查

```
✓ 正确: 使用 arabic-font class 或完整字体栈
✗ 错误: 只有 sans-serif / 没有 Noto Naskh Arabic / Traditional Arabic 回退
```

完整字体栈（app.less 已定义）：
```css
font-family: 'ArabicTextbook', 'Noto Naskh Arabic', 'Traditional Arabic', 'Scheherazade New', serif;
```

修复：在阿语 text 元素上加 `arabic-font` class，或直接写完整字体栈。

### 4. dir + text-align 检查

```
✓ 正确: wxml 有 dir="rtl"，less 有 text-align: right
✗ 错误: 缺少 RTL 属性，阿语从左到右渲染导致字母断开
```

修复：wxml 每个阿语 `<text>` 加 `dir="rtl"`，less 加 `text-align: right`。

### 5. padding-top / padding-bottom 检查

```
✓ 正确: 阿语元素有 padding-top ≥ 8rpx 和 padding-bottom ≥ 4rpx
✗ 错误: 没有垂直 padding，元音符号紧贴卡片边缘
```

修复：`padding: 8rpx 24rpx 4rpx 0;`（右侧 24rpx 让 RTL 文字不贴边）。

### 6. overflow-wrap / word-break 检查

```
✓ 正确: white-space: normal; word-break: break-word; overflow-wrap: anywhere;
✗ 错误: white-space: nowrap 或缺少换行属性，长阿语句子溢出
```

### 7. 卡片 padding 检查

```
✓ 正确: 卡片 padding-top ≥ 30rpx, padding-bottom ≥ 28rpx
✗ 错误: 卡片上下 padding 太小，阿语大字号（52rpx+）被卡片边界裁切
```

## 执行流程

### 第 1 步：扫描目标页面

读取 wxml 和 less，找出所有阿语文本元素。识别方式：
- class 名含 `arabic`、`ar-`、`sentence-` 的 text
- 有 `arabic-font` class 的 text
- less 中 `font-family` 含 `ArabicTextbook`/`Noto Naskh Arabic` 的规则

### 第 2 步：逐项检查 + 修复

对每个阿语元素跑上面 7 项检查，发现问题当场 Edit 修复。

### 第 3 步：检查全局 arabic-font 类

读 `app.less`，确认 `.arabic-font` 定义存在且字体栈完整。如果缺少回退字体，补齐。

### 第 4 步：输出诊断报告

```
🔍 阿语字体诊断：<页面名>

wxml 检查：
✅ 3 个 text 有 arabic-font + dir="rtl"
⚠️ 1 个 text 缺 dir="rtl" → 已补

less 检查：
✅ 4 个阿语元素 line-height ≥ 2.0
❌ .sentence-card 有 overflow: hidden → 已删除
❌ .root-arabic padding-top 为 0 → 已加 8rpx

修复完成：2 个问题已解决。
```

## 常见模式速查

| 症状 | 最可能原因 | 修复 |
|------|-----------|------|
| 元音符号顶部被切 | `overflow: hidden` 在父容器 | 删除 overflow，加 padding |
| 元音符号底部被切 | `line-height` < 1.9 | 设 line-height: 2.0 |
| 阿语字母断开/反转 | 缺 `dir="rtl"` | wxml 加 dir="rtl" |
| 字体大小不一致 | 没加 `arabic-font` class | wxml 加 class |
| 文字紧贴右边缘 | 缺 `padding-right` | 阿语元素加 padding-right: 24rpx |
| 长句子溢出屏幕 | 缺 word-break | 加 word-break: break-word |

## 不要做

- ❌ 不要在卡片上加 overflow: hidden 来"修复"——只会更糟
- ❌ 不要给阿语设 letter-spacing 超过 2rpx——会破坏连写
- ❌ 不要用 text-align: center 改阿语——保持 right 对齐
- ❌ 不要删除 font-family 里的回退字体——有些机型不装主字体
