# OPERATION & QUICK CHECK CARD

一页速查，便于值班与应急使用。

## 启动 / 构建（常用命令）
- 安装依赖：`npm install`
- 本地开发：`npm run start`
- 打包（Windows）：`npm run package`（输出：`release/build`）

## 关键路径（快速定位）
- 主进程入口：`src/main/main.ts`
- IPC / Preload：`src/main/preload.ts`（`window.electron.*`）
- Providers 管理：主进程 `src/main/providers/index.ts`，前端页面 `src/renderer/pages/Providers.tsx`
- 数据实体：`src/entity/`（例如 `Providers.ts`、`Chat.ts`、`Settings.ts`）
- 向量库：`src/main/db/vectorstores/`（LanceDB）

## 日常检查（值班流程）
1. 应用是否能启动？若否：查看主进程日志（electron-log）→ `release/build` 中的运行日志或开发控制台
2. 是否有数据库错误？检查 SQLite 文件是否存在且权限正确
3. LLM 调用错误：检查 `Providers` 表中 api_key / api_base 与网络代理设置

## 紧急恢复（快速步骤）
1. 停止应用（在任务管理器或通过进程终止）
2. 从最近备份恢复 SQLite 文件与 LanceDB 目录（覆盖当前文件）
3. 启动应用并验证：打开主页面、检查聊天与知识库是否可用

## 快速日志位置
- 主进程：electron-log 默认路径（在用户数据目录下）或 `release/build` 输出的日志
- 渲染进程：开发者工具控制台

## 备份命令示例（Windows PowerShell）
```powershell
# 停止应用后运行
$userData = Join-Path $env:APPDATA "moi"
$dbFile = Join-Path $userData "database.sqlite"
$backupDir = "C:\backups\moi\$(Get-Date -Format yyyy-MM-dd)"
New-Item -ItemType Directory -Force -Path $backupDir
Copy-Item -Path $dbFile -Destination $backupDir
# 若有 LanceDB 目录：Copy-Item -Path "C:\path\to\lancedb" -Destination $backupDir -Recurse
```

## 联系与快速问答
- 第一联系人（开发）：请记录在交接清单中
- 常见问答：见 `docs/MAINTENANCE.md` 中“常见问题”部分

保持此卡打印或放在运维控制台显眼位置，便于快速响应。
