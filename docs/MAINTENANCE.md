# MAINTENANCE & OPERATIONS MANUAL

适用对象：系统管理员、运维与接手开发者

本文档概览项目的技术栈、运行/构建流程、日常维护任务、备份与恢复、日志与监控、常见故障排查，以及与开发者交接时应准备的资料和问题清单。

## 项目概述
- 项目名：moi（本地 AI 桌面助手）
- 类型：Electron 桌面应用（主进程 Node.js + 渲染进程 React/TypeScript）
- 主要功能：对话/智能体、知识库（向量检索）、多供应商 LLM 集成、工具生态、TTS/STT、文件处理

代码位置与关键目录：
- `src/main/` - 主进程逻辑（DB、providers、llm、tools、ipc）
- `src/renderer/` - 渲染进程（React 页面、组件、state）
- `src/entity/` - TypeORM 实体（数据库表结构）
- `src/i18n/locales/` - 多语言资源
- `release/build` - 打包输出目录

## 技术栈（要点）
- Electron（桌面框架）
- 前端：React + TypeScript、Ant Design、Tailwind CSS
- 状态管理：Redux Toolkit
- 国际化：i18next
- 后端（主进程）：Node.js + TypeScript、IPC via `preload.ts`
- 数据库：SQLite + TypeORM（实体在 `src/entity/`）
- 向量数据库：LanceDB
- AI 集成：LangChain.js + 各供应商 SDK（OpenAI、Anthropic、Ollama、Groq 等）
- 打包：electron-builder（NSIS target；可选 MSIX）

## 运行与开发（常用命令）
- 安装依赖：
```
npm install
```
- 本地开发（启动 Electron + 前端）：
```
npm run start
```
- 打包（Windows NSIS）：
```
npm run package
```
- 注意：`package.json` 中的 `version` 字段会用于构建产物版本号，请在发布前检查并更新。

## 启动检查清单（排障第一步）
1. 是否能启动应用（`npm run start`）？检查终端输出与主进程日志。
2. 主进程初始化是否失败（`dbManager.init()`、`providersManager.init()` 等）。
3. SQLite 文件是否存在且可读写（通常在 `app.getPath('userData')` 下）。
4. 关键 IPC 是否可用：在渲染进程查看控制台是否有 `window.electron` 报错。

## 配置与敏感信息管理
- LLM Keys / Provider 配置存储在 `Providers` 表（TypeORM 实体 `src/entity/Providers.ts`）。
- 不要将生产密钥提交到代码仓库。发布与 CI 的 secret 请存放在安全的 secret 管理（GitHub Actions Secrets / Azure KeyVault / Vault）。

## 备份与恢复
- 需要备份项：SQLite 数据库文件、LanceDB 向量数据目录、用户上传的 assets/plugins
- 备份频率建议：每日增量或每日全备（视数据重要性）+ 保留 30 天
- 恢复步骤（高层）：停止应用 → 恢复文件（覆盖）→ 启动并验证关键功能

## 日志与监控
- 日志库：`electron-log`（主进程日志），渲染进程日志输出到控制台
- 建议：配置日志轮替；考虑接入 Sentry 或其他错误追踪以便崩溃上报
- 监控项：应用是否在线、LLM 调用失败率、磁盘空间、向量库大小

## 打包与发布注意（Windows）
- 默认使用 NSIS 生成可执行安装包；输出在 `release/build`。
- MSIX/Appx: 若需要 MSIX 发布，请注意 AppxManifest 中 `desktop7:Shortcut` 重复与 `rescap:Capability Name="runFullTrust"` 的问题，可能导致 Microsoft Store 审核被拒。
- 签名证书：发布时需要代码签名证书（.pfx），请记录证书存放与 CI 集成方法。

## 数据库与迁移
- 使用 TypeORM，实体定义在 `src/entity/`。
- 建议使用显式迁移脚本管理 schema 变更，避免在生产自动同步导致意外数据结构变更。

## 常见问题与排查（示例）
- 启动失败：检查主进程日志，确认 Node 版本、依赖安装成功、数据库文件权限。
- Providers 获取/模型拉取失败：检查 `Providers` 表中 `api_key` 与 `api_base` 配置，网络代理设置（settings）是否生效。
- 登录/注册问题：检查 `useAuth` 与 `window.electron.supabase` 的 IPC；邮件验证可能需要外部邮件服务配置。
- 打包后 MSIX 被拒：查看 AppxManifest，删除重复 shortcut 或准备 runFullTrust 说明/替换为不需 runFullTrust 的实现。
- 本地模型加载慢或失败：检查本地模型目录、磁盘 I/O、以及 LanceDB 索引状态

## 与开发者交接时需要准备的问题清单（建议）
1. 构建与发布
  - CI/CD: 是否存在构建服务器/流程（GitHub Actions/GitLab CI/其他）？构建脚本位置？如何触发 release？
  - 证书: 代码签名证书与密码在哪里存放？谁有访问权限？是否在 CI Secret 中？
  - MSIX/NSIS: 生产环境发布使用哪个 target？是否需要 Microsoft Store 提交？是否已有 Store 应用 ID？
2. 运行时/环境
  - Node/TypeScript 运行版本要求（推荐 Node LTS）
  - 本地数据库文件路径与备份位置（`dbManager` 返回的路径）
  - 启动参数或环境变量（例如 DEV/PROD 标志、UPDATER 配置）
3. 凭据与密钥
  - supabase credentials、第三方 LLM keys、向量库访问密钥（如有）放在哪里？如何轮换/撤销？
4. 日志与监控
  - 日志文件位置、保留策略、是否启用远程日志/错误追踪（如 Sentry）？
5. 数据迁移
  - 有无已记录的数据库迁移流程？TypeORM 使用同步还是 migrations？
6. 特殊功能/本地依赖
  - 应用是否依赖本地二进制（OCR、Office、ComfyUI 等）？这些二进制如何分发与更新？
7. 安全/合规
  - 是否存在敏感数据处理或日志中可能泄露 PII 的地方？有没有数据清理策略？
8. 支持流程
  - 常见故障的目前解决方法是什么？是否有现成的 FAQ 或运行手册？

## 建议交接材料（开发者应提供）
- 运行环境说明（Node 版本、依赖清单/lockfile）
- CI/CD 文件（workflow、secret 使用说明）
- Code signing 证书位置与使用说明
- 数据库/向量存储位置说明及备份脚本
- 重要配置项清单（包括 `settings` 表含义、`Providers` 的约定字段含义）
- 已知问题列表与对应解决步骤
- 发布步骤文档（从 bump version 到构建、签名、上传）
- 核心联系人信息与支持时间窗口

## 建议优先级与后续工作
- 高优先级：备份脚本、证书管理、日志上报接入
- 中优先级：CI 安全扫描与自动化测试
- 低优先级：界面上对敏感 key 的掩码、分离 MSIX/NSIS 流程

---
维护手册初稿 — 请结合团队安全策略与运行环境补充并确认。
