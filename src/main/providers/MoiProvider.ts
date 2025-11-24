import { Providers, ProviderType } from '@/entity/Providers';
import { BaseProvider, BaseProviderParams } from './BaseProvider';
import { Ollama } from 'ollama';
import { ChatOllama } from '@langchain/ollama';
import {
  BaseChatModel,
  BaseChatModelParams,
} from '@langchain/core/language_models/chat_models';
import { ChatOptions } from '@/entity/Chat';
import { OpenAI } from 'openai';
import settingsManager from '../settings';
import { HttpsProxyAgent } from 'https-proxy-agent';
import fs from 'fs';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { Embeddings } from '@langchain/core/embeddings';
import supabaseManager from '../supabase/supabaseManager';

export class MoiProvider extends BaseProvider {
  name: string = ProviderType.MOI;

  description: string;

  defaultApiBase: string = 'https://api.moi-tech.com/api/v1';

  httpProxy: HttpsProxyAgent | undefined;

  openaiClient: OpenAI;

  constructor(params?: BaseProviderParams) {
    super(params);
    this.httpProxy = settingsManager.getHttpAgent();
  }

  getChatModel(modelName: string, options: ChatOptions): BaseChatModel {
    if (!supabaseManager.session) {
      throw new Error('Please login first');
    }
    const llm = new ChatOpenAI({
      apiKey: supabaseManager.session.access_token,
      modelName: modelName,
      configuration: {
        apiKey: supabaseManager.session.access_token,
        baseURL: this.provider.api_base,
      },
      topP: options?.top_p,
      maxTokens: options?.maxTokens,
      temperature: options?.temperature,
      streaming: options?.streaming,
    });
    return llm;
  }

  getEmbeddings(modelName: string): Embeddings {
    const emb = new OpenAIEmbeddings({
      model: modelName,
      apiKey: this.provider.api_key,
      configuration: {
        baseURL: this.provider.api_base,
        httpAgent: settingsManager.getHttpAgent(),
      },
    });
    return emb;
  }

  async getModelList(): Promise<{ name: string; enable: boolean }[]> {
    const openaiClient = new OpenAI({
      baseURL: this.provider.api_base,
      apiKey: supabaseManager.session.access_token,
      httpAgent: this.httpProxy,
    });
    const models = (await openaiClient.models.list()).data;
    return models
      .map((x) => {
        return {
          name: x.id,
          enable:
            this.provider.models.find((z) => z.name == x.id)?.enable || false,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async getEmbeddingModels(): Promise<string[]> {
    const list = await this.openaiClient.models.list();
    return list.data
      .filter((x) => x.id.startsWith('text-'))
      .map((x) => x.id)
      .sort();
  }

  async getCredits(): Promise<{
    totalCredits: number;
    usedCredits: number;
    remainingCredits: number;
  }> {
    try {
      const options = {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.provider.api_key}`,
          accept: 'application/json',
          'content-type': 'application/json',
        },
      };

      const url = `${this.provider.api_base || this.defaultApiBase}/credits`;
      const res = await fetch(url, options);
      if (!res.ok) {
        throw new Error(res.statusText);
      }
      const json = await res.json();
      return {
        totalCredits: json.data.total_credits,
        usedCredits: json.data.total_usage,
        remainingCredits: json.data.total_credits - json.data.total_usage,
      };
    } catch (err) {
      console.log(err);

      return undefined;
    }
  }
}
