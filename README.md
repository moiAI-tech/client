
# Moi

### 项目结构说明
- 提示词配置存放目录 `assets\prompts`
- 多国语言配置目录 `src\i18n`
- 数据库基类 `src\entity`
- 智能体核心逻辑 `src\main\agents`
  - `src\main\agents\draft` 文书生成
  - `src\main\agents\summary` 总结
  - `src\main\agents\review` 批注
- 知识库管理核心逻辑 `src\main\knowledgebase`
- 设置核心逻辑 `src\main\settings`
- 工具 `src\main\tools`
- 大模型供应商逻辑 `src\main\providers`
- 渲染层 `src\renderer`
  - 路由配置 `src\renderer\App.tsx`
  - 各页面 `src\renderer\pages` 
  - 组件 `src\renderer\components`

## 🏗️ **技术架构详解**

### 核心技术栈
本项目基于现代化的桌面应用技术栈构建，各技术间紧密协作形成完整的AI助手生态：

#### 🖥️ **应用框架层 (Electron)**
- **主进程** (`src/main/main.ts`): 应用入口，管理窗口生命周期和系统资源
- **渲染进程** (`src/renderer/`): React应用界面，负责用户交互和数据展示  
- **预载脚本** (`src/main/preload.ts`): 安全的IPC通信桥梁，暴露主进程API给渲染进程
- **IPC通信** (`src/main/ipc/`): 主进程与渲染进程间的消息传递机制

#### 🗄️ **数据存储层**
- **关系数据库**: TypeORM + SQLite (`src/main/db/index.ts`)
  - 配置表 (`Settings`): 存储应用设置和用户配置
  - 智能体表 (`Agent`): 智能体定义、提示词、工具配置
  - 对话表 (`Chat`, `ChatMessage`): 聊天记录和消息历史
  - 知识库表 (`KnowledgeBase`, `KnowledgeBaseItem`): 知识库元数据管理
  - 工具表 (`Tools`, `McpServers`): 工具配置和MCP服务器管理
  - 提供商表 (`Providers`): LLM服务商配置和API密钥
- **向量数据库**: LanceDB (`src/main/db/vectorstores/LanceDBStore.ts`)
  - 文档向量化存储，支持语义检索
  - 知识库文档的嵌入向量和元数据

#### 🤖 **AI框架层 (LangChain.js)**
- **智能体引擎** (`src/main/agents/index.ts`): 多种智能体类型支持
- **工具调用系统** (`src/main/tools/index.ts`): 丰富的工具生态
- **LLM集成** (`src/main/llm/index.ts`): 多供应商模型支持  
- **记忆管理** (`src/main/memory/`): 对话上下文和检查点管理

### 技术协作机制

#### 🔄 **数据流架构**
1. **用户输入** → 渲染进程收集用户操作
2. **IPC通信** → 通过预载脚本安全传递到主进程
3. **业务处理** → 主进程调用相应管理器处理业务逻辑
4. **AI推理** → LangChain框架调用LLM和工具执行任务
5. **数据持久化** → TypeORM将结果存储到SQLite数据库
6. **结果返回** → 通过IPC将处理结果返回渲染进程展示

#### 🧩 **模块化管理**
- **管理器模式**: 每个功能域都有专门的管理器类
  - `dbManager`: 数据库连接和操作管理
  - `agentManager`: 智能体生命周期管理  
  - `toolsManager`: 工具注册和调用管理
  - `chatManager`: 对话流程和消息管理
  - `kbManager`: 知识库构建和检索管理
  - `settingsManager`: 配置管理和持久化

## 📋 **功能模块详解**

### 🤖 **智能体系统** (`src/main/agents/`)
负责各种AI任务的执行和编排，支持多种智能体架构：

#### 专业智能体
- **文书生成** (`draft/DraftAgent.ts`): 自动化文档起草和格式化
- **内容总结** (`summary/SummaryAgent.ts`): 文档摘要和要点提取  
- **文档批注** (`review/ReviewAgent.ts`): 文档审阅和建议生成
- **信息搜索** (`search/SearchAgent.ts`): 智能网络搜索和信息聚合

**配置位置**: 智能体的配置和提示词存储在数据库`Agent`表中，可通过界面进行管理

### 🛠️ **工具生态系统** (`src/main/tools/`)  
为智能体提供丰富的能力扩展，包含三大类工具：

#### 内置工具 (Built-in Tools)
- **文件操作**: 读写文件、目录管理、文件搜索 (`FileSystemTool.ts`)
- **图像处理**: OCR识别 (`RapidOcr.ts`)
- **办公文档**: Word文档操作 (`OfficeTool.ts`)


#### 自定义工具
- 用户可通过插件系统添加自定义工具
- 基于`BaseTool`类的标准化接口

**配置位置**: 工具配置存储在数据库`Tools`表中，MCP服务器配置在`McpServers`表

### 📚 **知识库管理** (`src/main/knowledgebase/`)
提供企业级文档管理和智能检索能力：

#### 文档处理流程
1. **文档加载** (`loaders/`): 支持PDF、Word、文本等多种格式
2. **内容分块**: 智能文档分割和结构化处理
3. **向量化**: 使用嵌入模型生成文档向量
4. **存储管理**: LanceDB向量数据库存储和索引
5. **智能检索**: 语义搜索和相关性排序

#### 核心功能
- **多格式支持**: PDF、DOCX、TXT、Markdown等文档类型
- **向量存储**: 基于LanceDB的高性能向量检索  
- **重排序**: 使用Reranker模型提升检索准确性
- **增量更新**: 支持文档增量添加和更新
- **权限管理**: 知识库访问控制和共享

**配置位置**: 知识库元数据在`KnowledgeBase`表，文档信息在`KnowledgeBaseItem`表，向量数据在LanceDB

### 💬 **对话管理** (`src/main/chat/`)
核心的用户交互和对话流程管理：

#### 对话类型
- **普通对话**: 直接与LLM模型交互
- **智能体对话**: 通过智能体处理复杂任务
- **知识库问答**: 基于私有知识库的RAG对话
- **文件对话**: 针对特定文件的分析和问答

#### 核心功能
- **多轮对话**: 维护对话上下文和历史记录
- **流式响应**: 实时流式输出提升用户体验
- **消息管理**: 消息编辑、删除、重新生成
- **对话导出**: 支持多种格式的对话记录导出
- **附件处理**: 支持图像、文档等附件上传和分析

**配置位置**: 对话数据存储在`Chat`、`ChatMessage`等表

### ⚙️ **设置管理** (`src/main/settings/`)
统一的配置管理和系统设置：

#### 配置类型  
- **模型配置**: 默认模型选择和参数设置
- **代理设置**: 网络代理和连接配置
- **界面设置**: 主题、语言等用户偏好
- **功能开关**: 各种功能模块的启用状态
- **本地模型**: 本地部署模型的管理和下载

#### 数据存储
- 所有设置以键值对形式存储在`Settings`表
- 支持JSON格式的复杂配置结构
- 实时配置热更新，无需重启应用

**配置位置**: 所有设置存储在数据库`Settings`表中

### 🔌 **供应商集成** (`src/main/providers/`)
多厂商LLM服务的统一接入：

#### 支持的供应商
- **OpenAI**: GPT系列模型  
- **Anthropic**: Claude系列模型
- **Google**: Gemini系列模型
- **国内厂商**: 通义千问、智谱AI、深度求索等
- **开源模型**: Ollama本地部署、Together AI等

#### 统一接口
- 标准化的模型调用接口
- 自动化的API密钥管理
- 模型能力发现和参数适配
- 错误处理和重试机制

**配置位置**: 供应商配置存储在`Providers`表，包含API密钥和连接参数

### 🎨 **用户界面** (`src/renderer/`)
基于React的现代化桌面应用界面：

#### 页面结构
- **聊天页面** (`pages/Chat/`): 主要的对话交互界面
- **智能体管理** (`pages/Agent/`): 智能体配置和管理
- **知识库管理** (`pages/KnowledgeBase/`): 文档上传和知识库配置
- **工具管理** (`pages/Tools.tsx`): 工具启用和参数配置
- **设置页面** (`pages/Settings/`): 系统设置和偏好配置
- **供应商管理** (`pages/Providers.tsx`): LLM服务商配置

#### 组件体系
- **通用组件** (`components/common/`): Markdown渲染、文档查看等
- **表单组件** (`components/form/`): 动态表单生成和验证
- **聊天组件** (`components/chat/`): 消息展示、输入框等
- **布局组件** (`components/layout/`): 侧边栏、内容区域等

### 🔧 **开发和调试指南**

#### 快速定位功能代码
1. **智能体功能**: 查看 `src/main/agents/` 下对应的智能体实现
2. **工具功能**: 在 `src/main/tools/` 中找到具体工具的实现
3. **界面问题**: 检查 `src/renderer/pages/` 和 `src/renderer/components/`
4. **数据问题**: 查看 `src/entity/` 中的表结构定义
5. **配置问题**: 检查 `src/main/settings/` 和数据库 `Settings` 表

#### 常见修改场景
- **添加新智能体**: 在 `src/main/agents/` 创建新类，注册到 `index.ts`
- **集成新工具**: 在 `src/main/tools/` 实现工具类，在 `index.ts` 注册
- **修改界面**: 编辑 `src/renderer/` 下的相应组件
- **调整配置**: 修改 `src/main/settings/` 或直接操作数据库
- **自定义提示词**: 编辑 `assets/prompts/` 下的提示词文件

### 🔌 **技术栈**
感谢以下开源项目的支持
- [electron-react-boilerplate](https://github.com/electron-react-boilerplate/electron-react-boilerplate) 用于electron开发的react框架模板
- [langchainjs](https://github.com/langchain-ai/langchainjs) agent框架
- [lancedb](https://lancedb.github.io/lancedb/) 本地向量知识库
- [sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx) 语音识别和语音合成等
- [@huggingface/transformers](https://github.com/huggingface/transformers) 本地运行onnx模型库

如有缺漏请联系作者补充



### 🐞 **Dev**
```sh
npm install
npm run start
```

### 💼 **Build**
```sh
# window
npm run package
```

### 🌐 **About**
author: 781172480@qq.com

### ChangeLog
[CHANGELOG](./CHANGELOG.md)

## License

This project is licensed under the Apache License 2.0. See the [LICENSE](LICENSE) file for details.

