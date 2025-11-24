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
import fs from 'node:fs';

import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  SystemMessage,
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
} from '@langchain/langgraph';
import { tool } from '@langchain/core/tools';
import { dbManager } from '@/main/db';
import { dispatchCustomEvent } from '@langchain/core/callbacks/dispatch';
import path from 'node:path';
import { getAssetsPath } from '@/main/utils/path';
import { KnowledgeBaseQuery } from '@/main/tools/KnowledgeBaseQuery';
import { KnowledgeBase } from '@/entity/KnowledgeBase';

export class SearchAgent extends BaseAgent {
  name: string = 'search';

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
  ) {
    const StateAnnotation = Annotation.Root({
      schemas: Annotation<string[]>,
      messages: Annotation<BaseMessage[]>,
    });

    const config = await this.getConfig();
    this.model = model;
    if (config.model) {
      const { provider, modelName } = getProviderModel(config.model);
      this.model = await getChatModel(provider, modelName, {
        temperature: 0,
      });
    }
    const that = this;

    const language = await settingsManager.getSettings().language;
    const prompt = fs.readFileSync(
      path.join(getAssetsPath(), 'prompts', `search-${language}.md`),
      'utf-8',
    );
    const tools = [];
    const kb_repository = dbManager.dataSource.getRepository(KnowledgeBase);
    const kbs = await kb_repository.find();
    const kbIds = kbs.map((x) => x.id);

    const kbq = new KnowledgeBaseQuery({
      knowledgebaseIds: chatOptions?.kbList || kbIds,
    });
    tools.push(kbq);
    const promptTemplate2 = ChatPromptTemplate.fromMessages([
      ['system', prompt],
      new MessagesPlaceholder('messages'),
    ]);
    return createReactAgent({
      llm: this.model,
      tools: tools,
      name: 'search',
      store: store,
      prompt,
    });
  }
}
