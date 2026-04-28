# Hotstrip AI Desktop

这是一个基于 **Vite + Vue + Electron** 的桌面版项目骨架，用来把你当前的单文件 HTML 原型迁移成更适合继续开发、并能打包成 Windows EXE 的完整项目。

## 已保留的核心功能

- 文生图 / 图生图
- Comfly / OpenAI 兼容图片接口
- Gemini / Nano Banana 图片接口
- 多图参考上传（最多 10 张）
- 聊天助手（Comfly / Gemini）
- 聊天图片上传与带上当前生成图分析
- 图片历史记录（localStorage）
- 对话历史记录（localStorage）
- 比例 / 分辨率 / size 自动计算

## 技术栈

- Vue 3
- Vite
- Electron
- electron-builder（NSIS）

## 目录结构

```text
hotstrip-vue-electron/
├─ electron/
│  ├─ main.cjs
│  └─ preload.cjs
├─ src/
│  ├─ components/
│  │  ├─ ChatWorkspace.vue
│  │  ├─ HeaderHero.vue
│  │  ├─ HistoryPanel.vue
│  │  ├─ ImageWorkspace.vue
│  │  ├─ PreviewPanel.vue
│  │  └─ UploadSlots.vue
│  ├─ composables/
│  │  ├─ useChatStudio.js
│  │  └─ useImageStudio.js
│  ├─ config/
│  │  └─ constants.js
│  ├─ utils/
│  │  ├─ format.js
│  │  ├─ media.js
│  │  └─ storage.js
│  ├─ App.vue
│  ├─ main.js
│  └─ styles.css
├─ index.html
├─ package.json
├─ vite.config.js
└─ README.md
```

## 本地开发

```bash
npm install
npm run electron:dev
```

这会同时启动：

- Vite 开发服务器
- Electron 桌面窗口

## 仅构建前端

```bash
npm run build
```

输出目录：

```text
dist/
```

## 打包 Windows EXE

> 建议在 **Windows 本机** 上执行，不建议在 WSL 里打包。

```bash
npm install
npm run dist:win
```

输出目录：

```text
release/
```

你会得到 NSIS 安装包（`.exe`）。

## 说明

1. 这是 **纯前端逻辑 + Electron 外壳** 的桌面版，不包含你自己的代理后端。
2. API Key 目前仍然由前端直接发出请求，所以更适合本地自用。
3. 如果你后面要商业化或对外分发，建议把图片/聊天请求改成你自己的服务端中转。
4. 目前项目已经完成“结构化迁移”，后续更适合继续拆模块、补设置页、补多窗口和自动更新。

## 下一步建议

如果你准备继续升级，我建议优先加：

- 设置页（保存 API Key / 默认模型 / 默认接口）
- 多窗口与任务队列
- 自动更新
- 日志面板
- 本地导入导出历史记录
- 系统托盘
