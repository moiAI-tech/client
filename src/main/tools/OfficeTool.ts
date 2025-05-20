import { Tool, ToolParams } from '@langchain/core/tools';
import {
  exec,
  execSync,
  execFileSync,
  ExecSyncOptionsWithStringEncoding,
  execFile,
  spawn,
} from 'child_process';
import { isArray, isString } from '../utils/is';
import { z } from 'zod';
import iconv from 'iconv-lite';
import { runCommand } from '../utils/exec';
import { BaseTool } from './BaseTool';
import { platform } from 'process';
import { t } from 'i18next';
import { FormSchema } from '@/types/form';
import { Agent, Browser, BrowserConfig } from 'browser-use-js';
import { getProviderModel } from '../utils/providerUtil';
import fs from 'fs';
import path from 'path';
import { getAssetsPath, getModelsPath } from '../utils/path';
import dayjs from 'dayjs';
import { Files } from '@/entity/Files';
import { dbManager } from '../db';
import { Repository } from 'typeorm';

export interface OfficeToolParameters extends ToolParams {
  save_path?: string;
}

export class ReadDocxTool extends BaseTool {
  schema = z.object({
    file: z.string(),
  });

  name: string = 'read-docx';

  description: string = `read docx file`;

  configSchema: FormSchema[] = [];

  constructor(params?: OfficeToolParameters) {
    super();
  }

  async _call(
    input: z.infer<typeof this.schema>,
    runManager,
    config,
  ): Promise<string> {
    const json_res: string = await new Promise((resolve, reject) => {
      const exe = path.join(getAssetsPath(), 'office-cli', 'OfficeCli.exe');
      const isExsit = fs.existsSync(exe);
      if (!isExsit) {
        reject(new Error('OffceCli.exe not found'));
      }
      const ext = path.extname(input.file);
      if (ext.toLowerCase() != '.docx') {
        reject(new Error('only support docx file'));
        return;
      }

      const process = spawn(exe, ['-f', input.file]);
      let output = '';
      process.stdout.on('data', (data) => {
        const out = iconv.decode(data, 'cp936');
        output += out;
      });

      process.stderr.on('data', (data) => {
        process.kill();
      });

      process.on('close', (code) => {
        if (output && code == 0) {
          resolve(output);
        } else {
          reject(output);
        }
      });
    });
    return json_res;
  }
}

export class DocxCommentTool extends BaseTool {
  filesRepository: Repository<Files>;

  schema = z.object({
    file: z.string(),
    // save_path: z
    //   .string()
    //   .optional()
    //   .describe('保存路径,如没明确提供保存文件路径请勿随意填写'),
    comments: z.array(
      z.object({
        index: z.number(),
        comment: z
          .string()
          .describe(
            '批注内容 包含风险等级、理由、修改建议 如 风险：高\n理由：xxx\n修改建议：xxx',
          ),

        text: z.string(),
      }),
    ),
  });

  name: string = 'docx-comment';

  description: string = `comment docx file`;

  configSchema: FormSchema[] = [];

  save_path: string | undefined;

  constructor(params?: OfficeToolParameters) {
    super();
    this.save_path = params?.save_path;
    this.filesRepository = dbManager.dataSource.getRepository(Files);
  }

  async _call(
    input: z.infer<typeof this.schema>,
    runManager,
    config,
  ): Promise<any> {
    try {
      const json_res: { content: string; save_path: string } =
        await new Promise((resolve, reject) => {
          const exe = path.join(getAssetsPath(), 'office-cli', 'OfficeCli.exe');
          const isExsit = fs.existsSync(exe);
          if (!isExsit) {
            reject(new Error('OffceCli.exe not found'));
          }
          const comments = [];
          input.comments.forEach((x) => {
            const data = {
              index: x.index,
              comment: x.comment,
              text: x.text,
              author: 'MOI AI',
            };
            comments.push('-c');
            comments.push(`${JSON.stringify(data)}`);
            console.log(JSON.stringify(data));
          });

          let save_path = this.save_path;
          const stat = fs.statSync(save_path, { throwIfNoEntry: false });
          if (fs.existsSync(save_path) && stat.isDirectory()) {
            save_path = path.join(
              save_path,
              `${dayjs().format('YYYYMMDDHHmmss')}.docx`,
            );
          }

          const process = spawn(exe, [
            '-f',
            input.file,
            '-w',
            save_path,
            ...comments,
          ]);
          let output = '';
          let error = '';
          process.stdout.on('data', (data) => {
            const out = iconv.decode(data, 'cp936');
            output += out;
          });

          process.stderr.on('data', (data) => {
            const out = iconv.decode(data, 'cp936');
            error += out;
            // process.kill();
          });

          process.on('close', (code) => {
            if (output && code == 0) {
              const file = new Files();
              file.name = path.basename(save_path);
              file.path = save_path;
              file.type = 'file';
              file.createdAt = new Date();
              file.size = fs.statSync(save_path).size;
              this.filesRepository.save(file);
              resolve({ content: output, save_path: save_path });
            } else {
              reject(error);
            }
          });
        });
      return json_res.content;
    } catch (err) {
      return err;
    }
  }
}
