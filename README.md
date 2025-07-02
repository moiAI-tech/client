
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

