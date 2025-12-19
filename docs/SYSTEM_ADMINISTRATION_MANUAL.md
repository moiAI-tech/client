# 系统维护与管理手册

> **版本**: 1.0  
> **最后更新**: 2025-01-XX  
> **维护者**: 系统管理员

## 目录

1. [项目概述](#项目概述)
2. [技术栈详解](#技术栈详解)
3. [项目结构](#项目结构)
4. [环境配置](#环境配置)
5. [部署流程](#部署流程)
6. [日常维护任务](#日常维护任务)
7. [监控与日志](#监控与日志)
8. [故障排查](#故障排查)
9. [与开发者交接问题清单](#与开发者交接问题清单)
10. [安全与备份](#安全与备份)

---

## 项目概述

### 系统定位

`moiai-service` 是一个后端服务，主要功能包括：

1. **API 代理服务**：接收主应用的 API 调用，转发到 Azure OpenAI
2. **积分管理系统**：记录和计算用户 Token 使用情况，进行积分扣减
3. **用户认证**：基于 Supabase 的身份认证和会话管理
4. **支付集成**：Stripe Webhook 处理（待完善）

### 核心业务流程

```
主应用请求 
  → 身份验证 (Supabase)
  → 积分余额检查
  → 转发到 Azure OpenAI
  → 记录使用量
  → 积分扣减
  → 返回响应
```

---

## 技术栈详解

### 1. 核心框架

#### Next.js 15 (App Router)
- **版本**: 15.5.2
- **用途**: 
  - Web 框架和 API 路由
  - 服务端渲染 (SSR)
  - 中间件处理
- **关键配置**: `next.config.ts` 中启用 `standalone` 输出模式
- **文档**: https://nextjs.org/docs

#### TypeScript
- **版本**: ^5
- **用途**: 类型安全的 JavaScript
- **配置**: `tsconfig.json`
- **严格模式**: 当前为 `false`（可考虑启用以提高代码质量）

### 2. 运行时环境

#### Node.js
- **版本要求**: 20.x (LTS)
- **包管理器**: npm
- **运行模式**: 
  - 开发: `npm run dev` (使用 Turbopack)
  - 生产: `node server.js` 或 `next start`

### 3. 数据库与认证

#### Supabase
- **用途**: 
  - PostgreSQL 数据库
  - 用户认证和会话管理
  - Row Level Security (RLS) 策略
- **客户端库**:
  - `@supabase/ssr`: ^0.7.0 (服务端渲染支持)
  - `@supabase/supabase-js`: ^2.57.2 (核心客户端)
- **客户端类型**:
  1. **浏览器/SSR 客户端** (`createClient`): 使用 anon key
  2. **服务端客户端** (`createClientWithAccessToken`): 使用 access token
  3. **管理员客户端** (`createAdminClient`): 使用 service role key（绕过 RLS）

#### 数据库表结构

| 表名 | 用途 | 关键字段 |
|------|------|---------|
| `credit_accounts` | 用户积分账户 | `user_id`, `account_type`, `balance` |
| `credit_grants` | 积分发放记录 | `user_id`, `account_id`, `amount`, `remaining`, `expires_at` |
| `credit_transactions` | 积分交易明细 | `user_id`, `account_id`, `action_type`, `amount` |
| `chat_messages` | 聊天消息记录 | `user_id`, `input_messages`, `output_messages`, `usage` |
| `users` | 用户表（Supabase Auth） | `id`, `email` |

### 4. 第三方服务集成

#### Azure OpenAI
- **用途**: AI 模型服务（Chat Completions）
- **环境变量**:
  - `MSOPENAI_BASE_URL`: Azure OpenAI 实例 URL
  - `MSOPENAI_API_KEY`: API 密钥
  - `MSOPENAI_DEFAULT_MODEL`: 默认模型名称
- **API 端点**: `/api/v1/chat/completions`
- **特性**: 支持流式响应 (SSE)

#### Stripe
- **用途**: 支付处理和订阅管理
- **环境变量**:
  - `STRIPE_SECRET_KEY`: Stripe API 密钥
  - `STRIPE_WEBHOOK_SECRET`: Webhook 签名密钥
- **API 端点**: `/api/webhooks/stripe`
- **状态**: 骨架已实现，事件处理逻辑待完善

### 5. 工具库

| 库名 | 版本 | 用途 |
|------|------|------|
| `uuid` | ^13.0.0 | 生成唯一 ID |
| `js-tiktoken` | ^1.0.21 | Token 计数（当 Azure 未返回 usage 时） |
| `stripe` | ^18.5.0 | Stripe SDK |
| `react` | 19.1.0 | UI 框架（前端组件） |
| `react-dom` | 19.1.0 | React DOM 渲染 |

### 6. 开发工具

| 工具 | 版本 | 用途 |
|------|------|------|
| `eslint` | ^9 | 代码检查 |
| `tailwindcss` | ^4 | CSS 框架 |
| `supabase` CLI | ^2.39.2 | Supabase 本地开发和迁移 |

### 7. 部署工具

#### PM2
- **用途**: 进程管理和监控
- **配置文件**: `ecosystem.config.cjs`
- **运行模式**: fork（单实例）

#### Docker
- **用途**: 容器化部署
- **配置文件**: `Dockerfile`
- **基础镜像**: `node:20-bookworm-slim`
- **构建模式**: 多阶段构建（deps → builder → runner）

#### GitHub Actions
- **用途**: CI/CD 自动化部署
- **工作流文件**: `.github/workflows/deploy.yml`
- **触发方式**: 手动触发 (`workflow_dispatch`)

---

## 项目结构

```
moiai-service/
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI/CD 部署配置
├── docs/                       # 文档目录
│   ├── BACKEND_SERVICE_OVERVIEW.md
│   ├── SYSTEM_DOCUMENTATION.md
│   ├── GITHUB_SECRETS_SETUP.md
│   └── GITHUB_SECRETS_SECURITY.md
├── public/                     # 静态资源
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # API 路由
│   │   │   ├── credits/        # 积分查询
│   │   │   ├── v1/             # API v1
│   │   │   │   ├── chat/completions/  # 聊天接口
│   │   │   │   ├── embeddings/        # 嵌入（占位）
│   │   │   │   ├── models/            # 模型列表
│   │   │   │   └── rerank/            # 重排序（占位）
│   │   │   └── webhooks/stripe/      # Stripe Webhook
│   │   ├── auth/callback/      # 认证回调
│   │   ├── layout.tsx          # 根布局
│   │   └── page.tsx           # 首页
│   ├── components/             # React 组件
│   ├── lib/                    # 核心库
│   │   ├── eventBus.ts        # 事件总线
│   │   ├── services/
│   │   │   └── eventService.ts # 事件处理服务
│   │   ├── supabase/          # Supabase 客户端
│   │   │   ├── admin.ts       # 管理员客户端
│   │   │   ├── client.ts      # 浏览器客户端
│   │   │   ├── server.ts       # 服务端客户端
│   │   │   ├── middleware.ts  # 中间件
│   │   │   └── database.types.ts # 数据库类型定义
│   │   └── type/
│   │       └── events.ts      # 事件类型定义
│   ├── instrumentation.ts     # 应用启动初始化
│   └── middleware.ts          # Next.js 中间件
├── supabase/
│   ├── config.toml            # Supabase 本地配置
│   └── migrations/           # 数据库迁移文件
│       ├── 20250908065352_remote_schema.sql
│       └── 20250910021606_credits_change.sql
├── .gitignore                # Git 忽略文件
├── Dockerfile               # Docker 配置
├── ecosystem.config.cjs     # PM2 配置
├── env.example              # 环境变量模板
├── eslint.config.mjs        # ESLint 配置
├── next.config.ts           # Next.js 配置
├── package.json             # 项目依赖
├── postcss.config.mjs       # PostCSS 配置
├── README.md                # 项目说明
└── tsconfig.json            # TypeScript 配置
```

---

## 环境配置

### 必需的环境变量

#### Supabase 配置
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

#### Azure OpenAI 配置
```bash
MSOPENAI_BASE_URL=https://your-instance.openai.azure.com
MSOPENAI_API_KEY=your_api_key
MSOPENAI_DEFAULT_MODEL=gpt-4
```

#### Stripe 配置
```bash
STRIPE_SECRET_KEY=sk_test_... 或 sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 环境变量配置位置

1. **本地开发**: `.env.local` 文件（不提交到 git）
2. **GitHub Actions**: Repository Secrets
3. **生产服务器**: `~/moi-ai/shared/.env` 文件

### 配置检查清单

- [ ] 所有必需的环境变量已配置
- [ ] Supabase URL 和密钥正确
- [ ] Azure OpenAI 配置正确且可访问
- [ ] Stripe 密钥匹配当前环境（test/live）
- [ ] 文件权限设置正确（`.env` 文件应为 600）

---

## 部署流程

### 1. GitHub Actions 自动部署

#### 触发方式
1. 访问: https://github.com/moiAI-tech/moi-ai/actions/workflows/deploy.yml
2. 点击 "Run workflow" 按钮
3. 选择分支（通常是 `main` 或 `master`）
4. 点击 "Run workflow"

#### 部署步骤
1. **构建阶段**
   - 安装依赖 (`npm ci`)
   - 构建 Next.js 应用 (`npm run build`)
   - 准备发布包（standalone + static + public）

2. **环境变量准备**
   - 从 GitHub Secrets 创建 `.env` 文件

3. **文件传输**
   - 通过 SCP 上传 `.env` 文件到服务器
   - 通过 SCP 上传 `release.tgz` 到服务器

4. **服务器端部署**
   - 解压发布包到 `~/moi-ai/releases/<timestamp>`
   - 移动 `.env` 到 `~/moi-ai/shared/.env`
   - 设置文件权限
   - 使用 PM2 重启应用

### 2. 手动部署

#### 本地构建
```bash
# 安装依赖
npm ci

# 构建应用
npm run build

# 准备发布包
rm -rf release && mkdir -p release/.next release/public
cp -r .next/standalone release/.next/standalone
cp -r .next/static release/.next/static
cp -r public release/public
cp ecosystem.config.cjs release/ecosystem.config.cjs
tar -C release -czf release.tgz .
```

#### 上传到服务器
```bash
# 上传发布包
scp -i <your.pem> release.tgz <user>@<host>:~/moi-ai/

# 上传 .env 文件（如果更新了）
scp -i <your.pem> .env.local <user>@<host>:~/moi-ai/shared/.env
```

#### 服务器端部署
```bash
ssh -i <your.pem> <user>@<host>

# 进入部署目录
cd ~/moi-ai

# 创建新版本目录
ts=$(date +%Y%m%d%H%M%S)
rel=~/moi-ai/releases/$ts
mkdir -p "$rel"

# 解压发布包
tar -xzf release.tgz -C "$rel"

# 创建符号链接
ln -sfn "$rel" ~/moi-ai/current

# 加载环境变量并重启
cd ~/moi-ai/current
if [ -f ~/moi-ai/shared/.env ]; then
  set -a; . ~/moi-ai/shared/.env; set +a
fi

# 重启 PM2
pm2 delete moi-ai || true
pm2 start ecosystem.config.cjs --env production
pm2 save
```

### 3. Docker 部署

#### 构建镜像
```bash
docker build -t moi-ai:latest .
```

#### 运行容器
```bash
docker run -d \
  --name moi-ai \
  -p 3000:3000 \
  --env-file .env.production \
  moi-ai:latest
```

---

## 日常维护任务

### 每日任务

- [ ] **检查应用状态**
  ```bash
  pm2 status
  pm2 logs moi-ai --lines 50
  ```

- [ ] **检查错误日志**
  ```bash
  tail -f ~/moi-ai/shared/logs/pm2.err.log
  ```

- [ ] **检查系统资源**
  ```bash
  pm2 monit
  # 或
  htop
  ```

### 每周任务

- [ ] **检查数据库连接**
  - 验证 Supabase 连接正常
  - 检查数据库性能

- [ ] **检查第三方服务**
  - Azure OpenAI API 可用性
  - Stripe Webhook 状态

- [ ] **审查日志**
  - 查找错误模式
  - 检查异常请求

- [ ] **备份检查**
  - 验证数据库备份
  - 检查备份文件完整性

### 每月任务

- [ ] **依赖更新检查**
  ```bash
  npm outdated
  ```

- [ ] **安全审计**
  - 检查 GitHub Secrets 使用情况
  - 审查访问日志
  - 轮换密钥（如需要）

- [ ] **性能优化**
  - 分析慢查询
  - 优化数据库索引
  - 检查缓存策略

- [ ] **文档更新**
  - 更新部署记录
  - 记录配置变更

### 按需任务

- [ ] **数据库迁移**
  ```bash
  # 应用新迁移
  npx supabase migration up
  
  # 生成类型定义
  npx supabase gen types typescript --local --schema public > src/lib/supabase/database.types.ts
  ```

- [ ] **环境变量更新**
  - 在 GitHub Secrets 中更新
  - 在服务器上更新 `.env` 文件
  - 重启应用

- [ ] **代码部署**
  - 通过 GitHub Actions 或手动部署

---

## 监控与日志

### PM2 监控

#### 查看状态
```bash
pm2 status
pm2 describe moi-ai
```

#### 查看日志
```bash
# 实时日志
pm2 logs moi-ai

# 错误日志
pm2 logs moi-ai --err

# 输出日志
pm2 logs moi-ai --out

# 查看最后 N 行
pm2 logs moi-ai --lines 100
```

#### 监控面板
```bash
pm2 monit
```

### 日志文件位置

- **PM2 日志**: `~/moi-ai/shared/logs/`
  - `pm2.out.log`: 标准输出
  - `pm2.err.log`: 错误输出

- **应用日志**: 通过 `console.log` 输出到 PM2 日志

### 关键指标监控

#### 应用健康
- PM2 进程状态
- 内存使用
- CPU 使用
- 响应时间

#### 业务指标
- API 请求量
- 错误率
- 积分扣减成功率
- 数据库查询性能

### 告警设置

建议设置以下告警：

1. **应用崩溃**: PM2 进程停止
2. **高错误率**: 错误日志超过阈值
3. **资源耗尽**: 内存/CPU 使用过高
4. **数据库连接失败**: Supabase 连接异常
5. **第三方服务失败**: Azure OpenAI API 错误

---

## 故障排查

### 常见问题

#### 1. 应用无法启动

**症状**: PM2 显示应用状态为 `errored` 或 `stopped`

**排查步骤**:
```bash
# 1. 查看错误日志
pm2 logs moi-ai --err --lines 100

# 2. 检查环境变量
cat ~/moi-ai/shared/.env

# 3. 检查文件权限
ls -la ~/moi-ai/current/.next/standalone/server.js

# 4. 手动测试启动
cd ~/moi-ai/current
node .next/standalone/server.js
```

**常见原因**:
- 环境变量缺失或错误
- 端口被占用
- 文件权限问题
- Node.js 版本不匹配

#### 2. API 返回 401/403 错误

**症状**: 客户端收到认证错误

**排查步骤**:
```bash
# 1. 检查 Supabase 配置
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY

# 2. 检查 Supabase 服务状态
curl https://status.supabase.com/

# 3. 查看认证相关日志
pm2 logs moi-ai | grep -i auth
```

**常见原因**:
- Supabase URL 或密钥错误
- Supabase 服务不可用
- 会话过期

#### 3. 积分扣减失败

**症状**: 用户使用服务但积分未扣减

**排查步骤**:
```bash
# 1. 检查 eventService 日志
pm2 logs moi-ai | grep -i "credit\|积分"

# 2. 检查数据库连接
# 在 Supabase Dashboard 中查看 credit_transactions 表

# 3. 检查 eventService 是否正常初始化
pm2 logs moi-ai | grep -i "eventService"
```

**常见原因**:
- eventService 未正确初始化
- 数据库连接失败
- 事务处理错误

#### 4. Azure OpenAI API 调用失败

**症状**: 聊天接口返回错误

**排查步骤**:
```bash
# 1. 检查环境变量
echo $MSOPENAI_BASE_URL
echo $MSOPENAI_API_KEY
echo $MSOPENAI_DEFAULT_MODEL

# 2. 测试 API 连接
curl -X POST "$MSOPENAI_BASE_URL/openai/v1/chat/completions" \
  -H "api-key: $MSOPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4","messages":[{"role":"user","content":"test"}]}'

# 3. 查看错误日志
pm2 logs moi-ai | grep -i "openai\|azure"
```

**常见原因**:
- API 密钥无效或过期
- 配额用尽
- 网络连接问题
- 模型名称错误

#### 5. 部署失败

**症状**: GitHub Actions 部署失败

**排查步骤**:
1. 查看 GitHub Actions 日志
2. 检查 GitHub Secrets 是否配置
3. 验证 SSH 连接
4. 检查服务器磁盘空间

**常见原因**:
- GitHub Secrets 缺失
- SSH 密钥错误
- 服务器磁盘空间不足
- 构建错误

### 故障恢复流程

1. **识别问题**: 查看日志和监控指标
2. **定位原因**: 使用排查步骤确定根本原因
3. **临时修复**: 如需要，回滚到上一个版本
4. **永久修复**: 修复问题并重新部署
5. **验证**: 确认问题已解决
6. **记录**: 更新故障记录文档

### 回滚流程

```bash
# 1. 列出所有版本
ls -1t ~/moi-ai/releases

# 2. 选择要回滚的版本（例如：20250101120000）
cd ~/moi-ai
ln -sfn ~/moi-ai/releases/20250101120000 ~/moi-ai/current

# 3. 重启应用
cd ~/moi-ai/current
pm2 reload moi-ai
```

---

## 与开发者交接问题清单

### 技术架构问题

- [ ] **代码库访问**
  - GitHub 仓库地址和权限
  - 分支策略（main/dev）
  - 代码审查流程

- [ ] **技术栈确认**
  - Next.js 版本和特性使用情况
  - TypeScript 配置和类型定义
  - 数据库架构和迁移策略

- [ ] **架构设计**
  - 为什么使用事件总线而非直接调用？
  - 积分扣减的并发控制机制？
  - 为什么使用 standalone 模式？

### 配置和环境

- [ ] **环境变量管理**
  - 所有必需的环境变量列表
  - 环境变量的获取方式（Supabase、Azure、Stripe）
  - 不同环境的配置差异

- [ ] **第三方服务账户**
  - Supabase 项目访问权限
  - Azure OpenAI 订阅信息
  - Stripe 账户和 Webhook 配置

- [ ] **密钥和凭证**
  - 所有 API 密钥的位置
  - 密钥轮换策略
  - 紧急情况下的密钥重置流程

### 数据库

- [ ] **数据库结构**
  - 所有表的用途和关系
  - 关键索引和约束
  - RLS 策略说明

- [ ] **数据迁移**
  - 迁移文件的创建和应用流程
  - 类型定义生成命令
  - 回滚迁移的方法

- [ ] **数据备份**
  - 备份策略和频率
  - 备份文件位置
  - 恢复流程

### 部署和运维

- [ ] **部署流程**
  - 自动部署触发条件
  - 手动部署步骤
  - 部署前的检查清单

- [ ] **服务器信息**
  - 服务器 IP 和访问方式
  - SSH 密钥管理
  - PM2 配置说明

- [ ] **监控和日志**
  - 日志文件位置和格式
  - 监控指标和告警设置
  - 性能基准值

### 业务逻辑

- [ ] **积分系统**
  - 积分扣减规则和算法
  - 积分类型和优先级
  - 积分过期处理

- [ ] **API 接口**
  - 所有 API 端点的用途
  - 请求/响应格式
  - 错误处理机制

- [ ] **待完成功能**
  - Stripe Webhook 事件处理
  - Embeddings 和 Rerank 接口实现
  - 其他计划中的功能

### 安全和合规

- [ ] **安全措施**
  - 认证和授权机制
  - 数据加密方式
  - 安全审计流程

- [ ] **合规要求**
  - 数据隐私政策
  - 日志保留策略
  - 用户数据删除流程

### 文档和知识

- [ ] **文档位置**
  - 所有文档的位置
  - API 文档
  - 架构图

- [ ] **联系方式**
  - 开发团队联系方式
  - 紧急情况联系人
  - 第三方服务支持

### 紧急情况

- [ ] **应急预案**
  - 服务中断处理流程
  - 数据丢失恢复流程
  - 安全事件响应流程

- [ ] **回滚计划**
  - 代码回滚步骤
  - 数据库回滚方法
  - 配置回滚流程

---

## 安全与备份

### 安全措施

#### 1. 密钥管理
- ✅ 所有密钥存储在 GitHub Secrets
- ✅ 服务器上的 `.env` 文件权限为 600
- ✅ 定期轮换密钥（建议每 90 天）

#### 2. 访问控制
- ✅ 限制服务器 SSH 访问
- ✅ 使用 SSH 密钥而非密码
- ✅ 定期审查 GitHub 仓库权限

#### 3. 数据保护
- ✅ 使用 HTTPS 传输
- ✅ Supabase RLS 策略保护数据
- ✅ 敏感信息不记录在日志中

### 备份策略

#### 数据库备份
- **频率**: 每日自动备份（Supabase 提供）
- **保留期**: 30 天
- **位置**: Supabase Dashboard → Database → Backups

#### 代码备份
- **方式**: Git 仓库（GitHub）
- **频率**: 每次提交
- **保留期**: 永久

#### 配置备份
- **内容**: `.env` 文件、PM2 配置
- **频率**: 每次配置变更
- **位置**: 安全存储（密码管理器或加密存储）

### 恢复测试

建议每季度进行一次恢复测试：

1. **数据库恢复测试**
   - 从备份恢复测试数据库
   - 验证数据完整性

2. **代码回滚测试**
   - 测试回滚到上一个版本
   - 验证功能正常

3. **配置恢复测试**
   - 从备份恢复配置
   - 验证服务正常启动

---

## 附录

### A. 常用命令速查

```bash
# PM2 管理
pm2 status                    # 查看状态
pm2 logs moi-ai               # 查看日志
pm2 restart moi-ai            # 重启
pm2 stop moi-ai               # 停止
pm2 delete moi-ai             # 删除
pm2 monit                     # 监控面板

# 部署相关
cd ~/moi-ai/current           # 进入当前版本
pm2 reload moi-ai             # 热重载
pm2 save                      # 保存配置

# 日志查看
tail -f ~/moi-ai/shared/logs/pm2.out.log
tail -f ~/moi-ai/shared/logs/pm2.err.log

# 环境变量
cat ~/moi-ai/shared/.env      # 查看环境变量
source ~/moi-ai/shared/.env   # 加载环境变量

# 数据库
npx supabase migration up     # 应用迁移
npx supabase gen types typescript --local --schema public > src/lib/supabase/database.types.ts
```

### B. 重要链接

- **GitHub 仓库**: https://github.com/moiAI-tech/moi-ai
- **部署工作流**: https://github.com/moiAI-tech/moi-ai/actions/workflows/deploy.yml
- **GitHub Secrets**: https://github.com/moiAI-tech/moi-ai/settings/secrets/actions
- **Supabase Dashboard**: https://app.supabase.com
- **Azure OpenAI**: https://portal.azure.com
- **Stripe Dashboard**: https://dashboard.stripe.com

### C. 联系信息

- **开发团队**: [待填写]
- **运维团队**: [待填写]
- **紧急联系人**: [待填写]

### D. 变更记录

| 日期 | 版本 | 变更内容 | 变更人 |
|------|------|---------|--------|
| 2025-01-XX | 1.0 | 初始版本 | 系统管理员 |

---

**文档维护**: 本文档应随系统变更及时更新。建议每次重大变更后更新相关章节。

