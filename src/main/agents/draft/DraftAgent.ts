import { RunnableConfig } from '@langchain/core/runnables';

import { CallbackManagerForToolRun } from '@langchain/core/callbacks/manager';
import { ChatOptions } from '@/entity/Chat';
import { AgentMessageEvent, BaseAgent } from '../BaseAgent';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { Embeddings } from '@langchain/core/embeddings';
import { FormSchema } from '@/types/form';
import { t } from 'i18next';
import { z } from 'zod';
import { toolsManager, ToolsManager } from '../../tools/index';
import { IterableReadableStream } from '@langchain/core/utils/stream';
import { getProviderModel } from '@/main/utils/providerUtil';
import settingsManager from '@/main/settings';
import { getChatModel } from '@/main/llm';
import fs from 'fs';

import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from '@langchain/core/messages';
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
  PromptTemplate,
} from '@langchain/core/prompts';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { MessagesAnnotation } from '@langchain/langgraph/dist/graph/messages_annotation';
import {
  Annotation,
  BaseStore,
  Command,
  CompiledStateGraph,
  InMemoryStore,
  StateGraph,
  StateType,
} from '@langchain/langgraph';
import { Tool, tool } from '@langchain/core/tools';
import { dbManager } from '@/main/db';
import { dispatchCustomEvent } from '@langchain/core/callbacks/dispatch';
import { getAssetsPath } from '@/main/utils/path';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { isNumber } from '@/main/utils/is';
import { DocxWrite } from '@/main/tools/DocxWrite';
import dayjs from 'dayjs';
import { Files } from '@/entity/Files';
import { Repository } from 'typeorm';
import { KnowledgeBase } from '@/entity/KnowledgeBase';
import { KnowledgeBaseQuery } from '@/main/tools/KnowledgeBaseQuery';
import { BaseTool } from '@/main/tools/BaseTool';
import { HeadingLevel } from 'docx';

export class DraftAgent extends BaseAgent {
  filesRepository: Repository<Files>;

  name: string = 'draft';

  description: string =
    'aime-manus, a friendly AI assistant developed by the Langmanus team. You specialize in handling greetings and small talk, while handing off complex tasks to a specialized planner';

  tags: string[] = [];

  hidden: boolean = true;

  // schema = z.object({
  //   task: z.string().describe('用户的任务'),
  // });

  model: BaseChatModel;

  configSchema: FormSchema[] = [
    {
      label: t('common.model'),
      field: 'model',
      component: 'ProviderSelect',
      componentProps: {
        type: 'llm',
      },
    },
  ];

  config: any = {};

  constructor(options: {
    provider: string;
    modelName: string;
    options: ChatOptions;
  }) {
    super(options);
    this.filesRepository = dbManager.dataSource.getRepository(Files);
  }

  async _call(
    input: z.infer<typeof this.schema> | string,
    runManager?: CallbackManagerForToolRun,
    config?: RunnableConfig,
  ): Promise<string> {
    const stream = await this.stream(input, config);
    let output = '';
    for await (const chunk of stream) {
      output += chunk;
    }
    return output;
  }

  async stream(
    input: z.infer<typeof this.schema> | string,
    options?: RunnableConfig,
  ): Promise<IterableReadableStream<any>> {
    const { provider, modelName } = getProviderModel(this.config.model);
    this.model = await getChatModel(provider, modelName, { temperature: 0 });
    const that = this;

    async function* generateStream() {}
    const stream = IterableReadableStream.fromAsyncGenerator(generateStream());
    return stream;
  }

  async createAgent(
    store?: BaseStore,
    model?: BaseChatModel,
    messageEvent?: AgentMessageEvent,
    chatOptions?: ChatOptions,
    signal?: AbortSignal,
  ) {
    const StateAnnotation = Annotation.Root({
      title: Annotation<string>,
      schemas: Annotation<{ index: string; title: string }[]>,
      messages: Annotation<BaseMessage[]>,
    });

    const config = await this.getConfig();
    this.model = model;
    let _provider = 'draft';
    if (config.model) {
      const { provider, modelName } = getProviderModel(config.model);
      this.model = await getChatModel(provider, modelName, {
        temperature: 0,
      });
      _provider = provider;
    }
    this.model['temperature'] = 0;
    const that = this;

    async function schemasNode({
      messages,
      schemas,
    }: typeof StateAnnotation.State) {
      const language = await settingsManager.getSettings().language;
      const prompt = fs.readFileSync(
        path.join(getAssetsPath(), 'prompts', `draft-${language}.md`),
        'utf-8',
      );

      const promptTemplate2 = ChatPromptTemplate.fromMessages([
        ['system', prompt],
        ['human', 'Example Output:'],
        new AIMessage({
          content: '',
          tool_calls: [
            {
              id: '1',
              name: 'generate_schemas',
              args: {
                schemas: [
                  '1. 标题',
                  '1.1 标题',
                  '1.2 标题',
                  '1.2.1 标题',
                  '2. 标题',
                ],
                title: 'xx与xx的购车合同',
              },
            },
          ],
        }),
        new ToolMessage('', '1'),
        new MessagesPlaceholder('messages'),
      ]);
      const llmWithStructured = that.model.withStructuredOutput(
        z.object({
          title: z.string().describe('文件标题,不要出现路径不支持的字符'),
          schemas: z
            .array(z.string())
            .describe(
              '大纲列表 必须为 1. 标题 1.2 标题 1.2.1 标题 这种格式开头',
            ),
          // z.object({
          //   title: z.string().describe('大纲标题'),
          //   sub_title: z.array(z.string()).describe('子标题'),
          // }),
        }),
        { name: 'generate_schemas' },
      );
      const msg = new AIMessage('');
      msg.id = uuid();
      msg.additional_kwargs = {
        model: that.model.model,
        provider: _provider,
      };

      await messageEvent?.created?.([msg]);
      const chain = promptTemplate2.pipe(llmWithStructured);
      const response = await chain.invoke(
        { messages: messages },
        { tags: ['ignore'], signal },
      );

      // for await (const chunk of response) {
      //   msg.content += chunk.content;
      //   await messageEvent?.updated?.([msg]);
      // }

      msg.content = `# ${response.title}\n${response.schemas
        .map((x) => `### ${x}`)
        .join('\n')}`;
      msg.content += `\n\n---\n> **需要开始生成明细的话可以跟我说“开始生成”,如果对大纲不满意的话可以跟我说需要调整的地方**`;
      await messageEvent?.finished?.([msg]);

      const _schemas = response.schemas.map((x) => {
        return {
          index: x.split(' ')[0].endsWith('.')
            ? x.split(' ')[0].slice(0, -1)
            : x.split(' ')[0],
          title: x.substring(x.split(' ')[0].length + 1),
        };
      });

      return new Command({
        update: {
          messages: [...messages],
          schemas: _schemas,
          title: response.title,
        },
        goto: '__end__',
      });
    }

    async function generateNode({
      messages,
      schemas,
      title,
    }: typeof StateAnnotation.State) {
      const language = await settingsManager.getSettings().language;
      const _prompt = fs.readFileSync(
        path.join(getAssetsPath(), 'prompts', `draft-detail-${language}.md`),
        'utf-8',
      );
      const start_prompt = fs.readFileSync(
        path.join(getAssetsPath(), 'prompts', `draft-start-${language}.md`),
        'utf-8',
      );
      const end_prompt = fs.readFileSync(
        path.join(getAssetsPath(), 'prompts', `draft-end-${language}.md`),
        'utf-8',
      );
      const exmaple_prompt = fs.readFileSync(
        path.join(
          getAssetsPath(),
          'prompts',
          `draft-detail-example-${language}.md`,
        ),
        'utf-8',
      );

      const msg = new AIMessage('');
      msg.id = uuid();
      msg.additional_kwargs = {
        model: that.model.model,
        provider: _provider,
      };
      let content = `# ${title}\n`;
      await messageEvent?.created?.([msg]);
      msg.content = content;
      await messageEvent?.updated?.([msg]);

      const tools: BaseTool[] = [];
      const kbIds = chatOptions?.kbList || [];

      if (kbIds.length > 0) {
        const kbq = new KnowledgeBaseQuery({
          knowledgebaseIds: kbIds,
          limit: 5,
        });
        tools.push(kbq);
      }
      let _model = that.model;
      if (tools.length > 0) {
        _model = that.model.bindTools(tools);
      }

      const indexs = schemas
        .filter((x) => !x.index.includes('.') && /^-?\d+$/.test(x.index))
        .map((x) => parseInt(x.index))
        .sort((a, b) => a - b);
      const docxWrite = new DocxWrite();
      const docxWriteData = [];
      docxWriteData.push({ type: 'title', content: title });
      let history = '';
      let c_index = 1;
      const last_message = messages[messages.length - 1];
      for (const index of indexs) {
        const schema_content = schemas
          .filter(
            (x) =>
              x.index === index.toString() ||
              x.index.startsWith(`${index.toString()}.`),
          )
          .map((x) => `${x.index} ${x.title}`)
          .join('\n');
        const input_messages = [
          ['system', _prompt],
          new HumanMessage('Example Output:'),
          new AIMessage(
            exmaple_prompt ||
              `<title>第三条 大标题</title>
<content>
[3.1]第 3.1 条 标题
正文内容
[3.1.1]第 3.1.1 条 标题
正文内容
</content>
<comment>
摘自《模板名称》第X.Y条 (如有)

完整条款正文(包括所有分级编号和但书条款)
</comment>`,
          ),
          new HumanMessage(
            `[已生成的历史大纲 START]\n${history}\n[已生成的历史大纲 END]`,
          ),
          new HumanMessage(
            `文件标题:${title}\n当前大纲:\n${schema_content}\n\n---\n根据以上大纲,开始生成明细,未知内容请用中括号"[]"包裹等我填写\n当前日期:${dayjs().format('YYYY-MM-DD HH:mm')}\n当前生成进度: ${index} / ${indexs.length}`,
          ),
          last_message,
        ];
        c_index++;
        //const prompt = await promptTemplate.format({ title, schema_content });
        // const llmWithStructured = that.model.withStructuredOutput(
        //   z.object({
        //     content: z.array(z.string()).describe('条款明细'),
        //   }),
        // );
        let response = await _model.invoke(input_messages, {
          tags: ['ignore'],
          signal,
        });

        let kb_content = '';
        if (response.tool_calls && response.tool_calls.length > 0) {
          messages.push(response);
          input_messages.push(response);
          for (const tool_call of response.tool_calls) {
            const tool_name = tool_call.name;
            const tool_id = tool_call.id;
            const tool_args = tool_call.args;
            const tool_result = await tools
              .find((x) => x.name === tool_name)
              ?.invoke(tool_args);
            if (tool_result) {
              kb_content += `${tool_result}\n\n---\n`;
              const tool_msg = new ToolMessage(tool_result, tool_id);
              messages.push(tool_msg);
              input_messages.push(tool_msg);
            }
          }
          response = await that.model.invoke(input_messages, {
            tags: ['ignore'],
            signal,
          });
        }

        let _content = response.text.trim();
        console.log(_content);
        history += `---\n${schema_content}\n`;
        // for await (const chunk of response) {
        //   _content += chunk.content;
        //   msg.content += chunk.content;
        //   await messageEvent?.updated?.([msg]);
        // }
        let extraHeader = '';
        let extraFoot = '';
        if (
          !_content.startsWith('<title>') &&
          _content.indexOf('<title>') > 1
        ) {
          extraHeader = `${_content.substring(0, _content.indexOf('<title>'))}\n`;
          if (extraHeader) {
            docxWriteData.push({
              type: 'paragraph',
              content: extraHeader,
            });
          }
        }

        if (!_content.endsWith('</comment>')) {
          extraFoot = `\n${_content.substring(_content.indexOf('</comment>') + '</comment>'.length)}\n`;
        }

        const titleRegex = /<title>([\s\S]*?)<\/title>/g;

        const titleRegexEx = titleRegex.exec(_content as string);
        if (titleRegexEx.length < 2) {
        }

        const commentRegex = /<comment>([\s\S]*?)<\/comment>/g;
        let comment: string | undefined;
        const ss = commentRegex.exec(_content as string);
        if (ss) {
          comment = ss[1]?.trim();
        }

        const schema_title: string = titleRegexEx[1]?.trim();
        docxWriteData.push({
          type: 'paragraph',
          content: schema_title,
          comment: comment,
          headingLevel: 1,
          author: 'MOI AI',
        });
        if (index == 1 && start_prompt) {
          docxWriteData.push({
            type: 'paragraph',
            content: start_prompt,
          });
        }
        const contentRegex = /<content>([\s\S]*?)<\/content>/g;

        const content: string = contentRegex
          .exec(_content as string)[1]
          ?.trim();

        let _c = '';

        _c = content
          .split('\n')
          .map((x) => {
            const matchResult = x.match(/^\[(.+?)\](.+)$/);
            if (matchResult) {
              const version = matchResult[1]; // "1.1"
              const xx_content = matchResult[2]; // "xxxxx"
              _c += xx_content;
              docxWriteData.push({
                type: 'paragraph',
                content: xx_content,
                headingLevel: 3,
              });

              return `### ${xx_content}`;
            } else {
              docxWriteData.push({
                type: 'paragraph',
                content: x,
              });
              return x;
            }
          })
          .join('\n');

        const __content = `${index == 1 && start_prompt ? `${start_prompt}\n` : ''}${extraHeader}## ${schema_title}\n${_c}${comment ? `\n\n---\n*${comment}*` : ''}${extraFoot}`;

        msg.content += `${__content}\n\n`;
        await messageEvent?.updated?.([msg]);

        if (extraFoot) {
          docxWriteData.push({
            type: 'paragraph',
            content: extraFoot,
          });
        }

        docxWriteData.push({
          type: 'paragraph',
          content: '\n\n',
        });
      }
      if (end_prompt) {
        msg.content += `${end_prompt}`;
        await messageEvent?.updated?.([msg]);
        docxWriteData.push({
          type: 'paragraph',
          content: end_prompt,
        });
      }
      const fileName = `${title}_${dayjs().format('YYYYMMDDHHmmss')}.docx`;
      const filePath = path.join(
        settingsManager.getSettings().defaultFileSavePath,
        fileName,
      );
      await new DocxWrite().invoke({
        path: filePath,
        data: docxWriteData,
      });

      const file = new Files();
      file.name = fileName;
      file.path = filePath;
      file.type = 'file';
      file.createdAt = new Date();
      file.size = fs.statSync(filePath).size;
      //file.chatId = chatId;
      await that.filesRepository.save(file);

      msg.content += `\n\n---\n<file>[${fileName}](${filePath.replaceAll('\\', '/')})</file>`;
      await messageEvent?.updated?.([msg]);

      // for (let index = 0; index < schemas.length; index++) {
      //   const schema = schemas[index];
      //   content += `## ${schema.title}\n`;
      //   msg.content = content;
      //   messageEvent?.updated?.([msg]);

      //   const prompt = await promptTemplate.format({
      //     title: title,
      //     schema_title: schema.title,
      //     schema_sub_title: schema.sub_title.map((x) => `- ${x}`).join('\n'),
      //   });
      //   const llmWithStructured = that.model.withStructuredOutput(
      //     z.object({
      //       content: z.array(z.string()).describe('条款明细'),
      //     }),
      //   );

      //   const response = await llmWithStructured.invoke(prompt, {
      //     tags: ['ignore'],
      //   });

      //   for (let i = 0; i < schema.sub_title.length; i++) {
      //     content += `### ${schema.sub_title[i]}\n`;
      //     content += `${response.content[i]}\n`;
      //   }
      //   msg.content = content;
      //   messageEvent?.updated?.([msg]);
      //   console.log(response);
      // }
      await messageEvent?.finished?.([msg]);

      return new Command({
        update: {
          messages: [...messages],
        },
        goto: '__end__',
      });
    }
    async function hostNode({
      messages,
      schemas,
      title,
    }: typeof StateAnnotation.State) {
      const language = await settingsManager.getSettings().language;
      const action = ['__end__', 'generate-schemas'];
      let prompt = `你将判断用户是否需要生成大纲或者生成内容\n- 如果需要生成大纲，则使用generate-schemas${(schemas && schemas.length > 0) || title ? '\n- 如果需要生成详细内容，则使用generate-detail' : ''}\n- 如果都不是，则使用__end__`;
      if ((schemas && schemas.length > 0) || title) {
        // prompt += `### 当前已生成大纲\n\`\`\`\n# ${title}\n${schemas
        //   .map((x) => `## ${x.index} ${x.title}`)
        //   .join('\n')}\n\`\`\`\n`;
        action.push('generate-detail');
      }
      const promptTemplate2 = ChatPromptTemplate.fromMessages([
        ['system', prompt],
        new MessagesPlaceholder('messages'),
      ]);

      const llmWithStructured = that.model.withStructuredOutput(
        z.object({
          action: z.enum(action),
        }),
      );
      const chain = promptTemplate2.pipe(llmWithStructured);

      try {
        const response = await chain.invoke(
          { messages: messages },
          { tags: ['ignore'], signal },
        );
        const goto = response.action;

        return new Command({
          // update: {
          //   messages: [...messages],
          // },
          goto: goto,
        });
      } catch (err) {
        console.error(err);

        const msg = new AIMessage('');
        msg.id = uuid();
        msg.additional_kwargs = {
          model: that.model.model,
          provider: _provider,
        };

        await messageEvent?.created?.([msg]);
        msg.content = '';
        msg.additional_kwargs['error'] = err.message;
        // await new Promise((resolve) => {
        //   setTimeout(() => {
        //     resolve(true);
        //   }, 1000);
        // });
        await messageEvent?.finished?.([msg]);

        return new Command({
          // update: {
          //   messages: [...messages],
          // },
          goto: '__end__',
        });
      }
    }

    const workflow = new StateGraph(StateAnnotation)
      .addNode('host', hostNode, {
        ends: ['generate-schemas', 'generate-detail', '__end__'],
      })
      .addNode('generate-schemas', schemasNode, {
        ends: ['__end__'],
      })
      .addNode('generate-detail', generateNode, {
        ends: ['__end__'],
      })
      .addEdge('__start__', 'host');

    // Finally, we compile it into a LangChain Runnable.
    const app = workflow.compile({
      store: store,
      checkpointer: dbManager.langgraphSaver,
    });

    return app;
  }
}
