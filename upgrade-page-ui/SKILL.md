---
name: upgrade-page-ui
description: 把小程序任意页面升级到统一陶土色系（Terracotta Modern Vanguard）。当用户输入 /upgrade-page-ui 后跟页面路径或页面名称时触发，自动对齐 wxml + less 到设计规范。
---

# 升级页面 UI → Terracotta 陶土色系

## 触发条件

- 用户输入 `/upgrade-page-ui` 后跟页面路径，如：
  - `/upgrade-page-ui reading-detail`
  - `/upgrade-page-ui pages/learn/reading-detail`
- 用户说"把 XX 页升级到陶土主题""XX 页统一配色"等

## 设计系统规范

### 颜色变量（写入 less 文件顶部）

```less
@accent: #A55D45;
@accent-light: #C47A5E;
@accent-deep: #8B3A2A;
@accent-tint: #FDF8F6;
@page-bg: #FDFBF9;
@card-base: #FFFFFF;
@card-warm: #FEFAF8;
@text-1: #3F2D24;
@text-2: #6B5D55;
@text-3: #9B8D85;
@border: rgba(165, 93, 69, 0.12);
@border-light: rgba(165, 93, 69, 0.06);
@shadow-soft: 0 4rpx 20rpx rgba(165, 93, 69, 0.06);
@shadow-lift: 0 8rpx 32rpx rgba(165, 93, 69, 0.1);
```

### 页面容器

```less
.page-container {
  min-height: 100vh;
  background: @page-bg;
}
```

### 导航栏（wxml）

```html
<navigation-bar title="..." back="{{true}}" color="#3F2D24" background="#FDFBF9" />
```

### Hero 卡片（页面顶部信息区）

wxml 结构：
```html
<view class="hero-card">
  <view class="hero-edge" aria-hidden="true" />
  <view class="hero-deco arabic-font" dir="rtl" aria-hidden="true">أَبْجَدِيَّة</view>
  <view class="hero-tag-row">
    <view class="hero-tag-bar" aria-hidden="true" />
    <text class="hero-tag">ENGLISH · 中文副标题</text>
  </view>
  <text class="hero-title">主标题</text>
  <text class="hero-desc">描述文本</text>
</view>
```

less：
```less
.hero-card {
  position: relative;
  margin: 20rpx 28rpx 0;
  padding: 34rpx 36rpx 30rpx;
  background: radial-gradient(circle at 100% 10%, rgba(165, 93, 69, 0.06) 0%, transparent 60%), @card-base;
  border-radius: 24rpx;
  border: 1rpx solid @border;
  box-shadow: @shadow-soft;
  overflow: hidden;
}
.hero-edge {
  position: absolute; left: 0; top: 36rpx; bottom: 36rpx;
  width: 3rpx; background: @accent; border-radius: 0 2rpx 2rpx 0;
}
.hero-deco {
  position: absolute; right: -10rpx; bottom: -22rpx;
  font-size: 96rpx; font-weight: 700; color: @accent; opacity: 0.04;
  line-height: 1; pointer-events: none; white-space: nowrap;
}
.hero-tag-row { display: flex; align-items: center; gap: 12rpx; margin-bottom: 12rpx; }
.hero-tag-bar { width: 24rpx; height: 2rpx; background: @accent; border-radius: 1rpx; }
.hero-tag { font-size: 20rpx; color: @accent; letter-spacing: 2rpx; font-weight: 600; }
.hero-title { display: block; font-size: 38rpx; font-weight: 700; color: @text-1; margin-bottom: 8rpx; }
.hero-desc { display: block; font-size: 26rpx; color: @text-3; line-height: 1.6; }
.hero-stat { margin-top: 22rpx; padding-top: 18rpx; border-top: 1rpx solid @border; display: flex; gap: 8rpx; align-items: baseline; }
.hero-statNum { font-size: 40rpx; font-weight: 800; color: @accent; }
.hero-statLabel { font-size: 22rpx; color: @text-3; }
```

### 内容卡片（列表项）

less：
```less
.card {
  position: relative;
  background: radial-gradient(circle at 100% 0%, rgba(165, 93, 69, 0.05) 0%, transparent 55%), @card-base;
  border-radius: 20rpx;
  border: 1rpx solid @border;
  padding: 30rpx 28rpx 28rpx 32rpx;
  margin-bottom: 14rpx;
  box-shadow: @shadow-soft;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}
.card--active { transform: translateY(-2rpx); box-shadow: @shadow-lift; }
.card-edge {
  position: absolute; left: 0; top: 30rpx; bottom: 28rpx;
  width: 3rpx; background: @accent; border-radius: 0 2rpx 2rpx 0;
}
```

### 阿语文本

```less
.arabic-text {
  display: block;
  text-align: right;
  line-height: 2.0;
  padding: 8rpx 24rpx 4rpx 0;
  font-weight: 700;
  color: @accent-deep;
}
```

wxml 必须加 `arabic-font` class 和 `dir="rtl"`：
```html
<text class="arabic-text arabic-font" dir="rtl">{{item.arabic}}</text>
```

### 标签/Action 按钮

```less
.tag {
  font-size: 18rpx; color: @accent; font-weight: 600;
  letter-spacing: 1rpx; padding: 4rpx 12rpx;
  border-radius: 999rpx; background: @accent-tint;
}
.btn-primary {
  background: linear-gradient(135deg, @accent, @accent-light);
  color: #fff; border-radius: 999rpx; padding: 14rpx 32rpx;
  font-size: 26rpx; font-weight: 600;
  box-shadow: 0 8rpx 24rpx rgba(165, 93, 69, 0.22);
}
.btn-ghost {
  background: transparent; color: @accent;
  border: 1rpx solid @border; border-radius: 999rpx;
  padding: 12rpx 28rpx; font-size: 24rpx;
}
```

### Segment/Level 选择器

```less
.level-row {
  display: flex; gap: 14rpx; padding: 0 28rpx; margin-bottom: 18rpx;
}
.level-chip {
  flex: 1; text-align: center; padding: 16rpx 0; border-radius: 14rpx;
  font-size: 24rpx; color: @text-3; background: @card-base;
  border: 1rpx solid @border-light; transition: all 0.15s;
}
.level-chip--active {
  background: @accent-tint; color: @accent; font-weight: 600;
  border-color: @accent; box-shadow: @shadow-soft;
}
```

### 状态卡片（加载/空态）

```less
.state-card {
  margin: 80rpx 28rpx; padding: 60rpx 40rpx; text-align: center;
  background: @card-base; border-radius: 24rpx;
  border: 1rpx solid @border; box-shadow: @shadow-soft;
}
.state-title { display: block; font-size: 30rpx; color: @text-2; margin-bottom: 10rpx; }
.state-desc { display: block; font-size: 24rpx; color: @text-3; line-height: 1.6; }
```

### 空间

```less
.list-spacer { height: 80rpx; }
.bottom-safe { height: calc(40rpx + env(safe-area-inset-bottom)); }
```

## 执行流程

### 第 1 步：读取目标页面

读取目标页面的 wxml、less、ts 三个文件，理解当前结构和组件。

### 第 2 步：识别需要改的地方

逐项检查：
- [ ] less 顶部有没有 Terracotta 颜色变量？没有就加
- [ ] 页面容器有没有 `background: @page-bg`？
- [ ] 导航栏 color/background 是否 `#3F2D24` / `#FDFBF9`？
- [ ] 卡片有没有 edge bar？有没有渐变背景 + border + shadow？
- [ ] 阿语文本有没有 `arabic-font` class + `dir="rtl"`？
- [ ] 阿语 less 有没有 `text-align: right` + `line-height ≥ 2.0`？
- [ ] 按钮颜色是否在陶土色系内？
- [ ] 旧颜色（`#F4F0EA`, `#A65E44`, `#2C2A29`, `#666666`）是否已替换？

### 第 3 步：改写文件

按优先级改：
1. less 文件：变量 + 卡片样式 + 颜色替换
2. wxml 文件：导航栏属性 + 卡片结构 + 阿语 class/dir
3. ts 文件：一般不碰，除非导航栏逻辑需要调

**重要**：保留原有功能逻辑，只改视觉层。不改 ts 里的数据流、事件处理。

### 第 4 步：输出变更摘要

```
✅ reading-detail 页 UI 升级完成

less 变更：
- 新增 12 个颜色变量
- 替换 18 处旧颜色 → Terracotta 系
- 3 张卡片 .xxx-card 加 edge bar + 渐变背景
- 4 段阿语文本 line-height → 2.0

wxml 变更：
- 导航栏 color="#3F2D24" background="#FDFBF9"
- 3 处 text 补 arabic-font + dir="rtl"
```

## 不要做

- ❌ 不要改变页面布局/结构——只统一配色和质感
- ❌ 不要删除或改变数据绑定 `{{}}`
- ❌ 不要改 ts 文件除非导航栏有硬编码颜色
- ❌ 不要用 emoji 替代 CSS 图形元素（edge bar、tag bar 等）
- ❌ 不要引入新依赖
