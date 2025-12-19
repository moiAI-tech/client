# 项目技术说明（TECH OVERVIEW）

日期：2025年11月3日


## 高层技术栈

- 平台/运行时：Electron（桌面应用）
- 前端：React 19 + TypeScript
- UI：Ant Design（antd）
- 样式：Tailwind CSS + Sass
- 国际化：i18next + react-i18next
- 状态管理：Redux Toolkit
- 构建工具：Webpack (5), ts-node, webpack-dev-server
- 后端/服务（主进程）：Node.js + Express、Supabase 客户端
- AI/LLM：LangChain 生态、HuggingFace、Anthropic、OpenAI、Replicate 等 SDK
- 向量数据库/检索：LanceDB、本地向量处理模块

## 技术架构概述

- Electron 双进程架构：
  - 主进程（`src/main`）负责应用生命周期、原生功能、模型/后端调用、数据库接入等。
  - 预加载脚本（`src/main/preload.ts`）通过安全的 IPC 接口将能力暴露给渲染进程（例如 `window.electron.supabase.signIn`）。
  - 渲染进程（`src/renderer`）使用 React 构建 UI，并通过 i18next 本地化文本。

## 关键文件位置（示例）

- i18n 初始化：`src/i18n/index.ts`
- 多语言资源：`src/i18n/locales/zh-cn.json`, `en-us.json`, `ja-jp.json`
- 登录 UI：`src/renderer/components/common/LoginModal.tsx`
- 登录 Hook：`src/renderer/hooks/useAuth.ts`
- 主进程预加载：`src/main/preload.ts`
- 主进程 Supabase：`src/main/supabase/supabaseManager.ts`

## 如何修改登录页面显示文字（快速指引）

1. 修改中文文本：编辑 `src/i18n/locales/zh-cn.json` 中的键，例如 `auth.loginButton`、`auth.loginTab`、`signin` 等。
2. 如果需要同时修改英文/日文，请编辑 `src/i18n/locales/en-us.json` 与 `src/i18n/locales/ja-jp.json`。
3. 保存后在开发模式下（webpack dev server）通常会热更新；如果不生效，请重启桌面应用或刷新渲染进程窗口。

## 建议与注意事项

- 该项目为 Electron 应用，渲染进程不是 Next.js，因此不支持 Next.js 的 SSR/页面路由特性。若需要 SSR 或更复杂的路由预渲染，需要额外改造或迁移至 Next.js。
- 主进程暴露的 IPC 接口应使用严格的类型（TS）与输入校验以增强安全性。
- 大体积依赖（transformers、playwright、sharp 等）会显著增大打包体积，建议按需懒加载或将可选依赖单独处理。

---

以上为简要技术说明。如需我把文档生成到其他路径、添加架构图（Mermaid）、或生成更加详细的“模块 -> 文件映射表”，请告诉我你的偏好。
