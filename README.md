# zhumeng-arabic-skills · 逐梦阿语小程序配套 Skills

> 9 个 skill：内容生成 / 专家审核 / 公众号同步 / UI 升级 / 云函数部署 / 阿语字体修复。

「逐梦阿语」微信小程序（阿拉伯语学习工具）的配套 WorkBuddy skills 集合。覆盖内容生产（词汇/阅读/听力/跟读/随身听）、专家级准确性审核、公众号文章同步、页面 UI 规范化、云函数部署与阿语字体渲染修复。

## 📦 包含的 Skills

### `add-vocab`
批量新增阿拉伯语词汇：生成规范 TSV 行，追加到 vocabulary_words.tsv，跑校验与构建。

### `add-reading`
批量新增阅读文章 + 完整词法/句法解析，生成 8 张 TSV 表并强制专家审核。

### `add-listening`
新增听力/跟读训练内容（listening_training_sentences / speaking_shadowing）。

### `add-walkman`
为「随身听 / 耳朵模式」批量新增沉浸式整句听力内容。

### `review-content`
以阿语语法/词法专家视角审核全部内容模块准确性，交付前强制调用。

### `sync-wechat`
把公众号文章一键同步进小程序发现页（结构化字段 + 云导入包）。

### `upgrade-page-ui`
把任意页面升级到统一陶土色系（Terracotta Modern Vanguard）设计规范。

### `deploy-cloud`
云函数部署与云开发环境配置操作指引。

### `fix-arabic-font`
诊断并修复阿语文字渲染问题（元音裁切、贴边、RTL 方向错误等）。



## 🚀 安装与使用

这些 skills 面向 [WorkBuddy](https://www.codebuddy.cn) 的 skill 体系（亦兼容 Claude Code / Codex 等同类 skill 目录）。

```bash
git clone https://github.com/bhkjhbkjb/zhumeng-arabic-skills.git
# 把需要的 skill 文件夹复制到你的 skills 目录
cp -r zhumeng-arabic-skills/<skill-name> ~/.workbuddy/skills/
```

在 WorkBuddy 中直接以 skill 名称触发即可（如输入 `/<skill-name>` 或自然语言描述）。

## 📂 目录结构

```
zhumeng-arabic-skills/
├── add-vocab/  add-reading/  add-listening/  add-walkman/
├── review-content/  sync-wechat/  upgrade-page-ui/
├── deploy-cloud/  fix-arabic-font/
└── (各含 SKILL.md，部分含 scripts/)
```

## 🔒 安全说明

本仓库已去除敏感信息（服务器 IP、API 密钥、内部地址等），相关位置以占位符（如 `<DEPLOY_SERVER_IP>`、`<MOMENT_RESEARCH_HOST>`）标注，请按你自己的运行环境替换。

---

*由 **Hreed** 维护 · 欢迎 Star / 提 Issue*
