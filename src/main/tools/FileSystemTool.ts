import { Tool, ToolParams, StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

import fs from 'fs';
import path from 'path';
import tree from 'tree-node-cli';
import { BaseTool } from './BaseTool';
import { PPTXLoader } from '@langchain/community/document_loaders/fs/pptx';
import { DocxLoader } from '@langchain/community/document_loaders/fs/docx';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { isString } from '../utils/is';
import settingsManager from '../settings';

export interface FileWriteParameters extends ToolParams {}
export interface FileReadParameters extends ToolParams {}
export interface FileContentSearchParameters extends ToolParams {
  embedding: string;
}
export class FileWrite extends BaseTool {
  schema = z.object({
    path: z.string().describe('local file path'),
    data: z.string().describe('file data'),
  });

  //output = und;

  name = 'file-write';

  description: string = 'create file and write';

  constructor(params?: FileWriteParameters) {
    super(params);
  }

  async _call(
    input: z.infer<typeof this.schema>,
    runManager,
    config,
  ): Promise<string> {
    fs.writeFileSync(input.path, input.data);
    return 'file write is success';
  }
}

export class FileRead extends BaseTool {
  schema = z.object({
    path: z.string(),
  });

  name: string = 'file-read';

  description: string = 'read file content return text';

  constructor(params?: FileReadParameters) {
    super(params);
  }

  async _call(
    input: z.infer<typeof this.schema>,
    runManager,
    config,
  ): Promise<string> {
    try {
      if (!isString(input.path)) {
        return 'input value is not filePath';
      }
      const ext = path.extname(input.path).toLowerCase();
      let content = '';
      if (ext.toLowerCase() == '.pdf') {
        const loader = new PDFLoader(input.path);
        const docs = await loader.load();
        content = docs.map((x) => x.pageContent).join('\n\n');
      } else if (ext.toLowerCase() == '.txt') {
        const loader = new TextLoader(input.path);
        const docs = await loader.load();
        content = docs.map((x) => x.pageContent).join('\n\n');
      } else if (ext.toLowerCase() == '.docx') {
        const loader = new DocxLoader(input.path, { type: 'docx' });
        const docs = await loader.load();
        return docs.map((x) => x.pageContent).join('\n\n');
      } else if (ext.toLowerCase() == '.doc') {
        const loader = new DocxLoader(input.path, { type: 'doc' });
        const docs = await loader.load();
        return docs.map((x) => x.pageContent).join('\n\n');
      } else if (ext.toLowerCase() == '.pptx') {
        const loader = new PPTXLoader(input.path);
        const docs = await loader.load();
        return docs.map((x) => x.pageContent).join('\n\n');
      } else {
        const loader = new TextLoader(input.path);
        const docs = await loader.load();
        content = docs.map((x) => x.pageContent).join('\n\n');
      }
      return content;
    } catch (err) {
      return JSON.stringify(err);
    }
  }
}

export class ListDirectory extends BaseTool {
  schema = z.object({
    path: z.string().describe('local dir path'),
    recursive: z
      .optional(z.boolean())
      .default(false)
      .describe('local file path'),
  });

  output = 'path\n├── file-1.mp4\n├── file-2.mp4\n├── ...';

  name: string = 'list_directory';

  description: string =
    'Get a detailed listing of all files and directories in a specified path. Results distinguish between files and directories with [FILE] and [DIR] prefixes. Only works within allowed directories.';

  constructor(params?: FileWriteParameters) {
    super(params);
  }

  async _call(
    input: z.infer<typeof this.schema>,
    runManager,
    config,
  ): Promise<string[] | string> {
    const treeOutput = tree(input.path, {
      maxDepth: input.recursive ? Number.POSITIVE_INFINITY : 1,
    });
    return treeOutput;
  }
}

export class CreateDirectory extends BaseTool {
  schema = z.object({
    paths: z.array(z.string()),
  });

  name: string = 'create_directory';

  description: string =
    'Create a new directory or ensure a directory exists.  Can create multiple nested directories in one operation.  Only works within allowed directories.';

  constructor(params?: FileWriteParameters) {
    super(params);
  }

  async _call(
    input: z.infer<typeof this.schema>,
    runManager,
    config,
  ): Promise<string> {
    if (input.paths && input.paths.length > 0) {
      for (const path of input.paths) {
        fs.mkdirSync(path, { recursive: true });
      }
      return 'Directory created successfully';
    } else {
      return 'No directory to create';
    }
  }
}

export class SearchFiles extends BaseTool {
  schema = z.object({
    path: z.string(),
    pattern: z.string(),
    recursive: z
      .optional(z.boolean())
      .default(true)
      .describe('是否递归搜索子目录'),
  });

  name: string = 'search_files';

  description: string =
    'Finds files by name using a case-insensitive matching. Supports wildcard patterns like *.md and ? for single character matching. Searches through all subdirectories from the starting path when recursive is true (default). Has a default timeout of 30 seconds which can be customized using the timeoutMs parameter. Only searches within allowed directories.';

  constructor(params?: FileWriteParameters) {
    super(params);
  }

  async _call(
    input: z.infer<typeof this.schema>,
    runManager,
    config,
  ): Promise<string> {
    const results: string[] = [];

    // 创建用于匹配的正则表达式
    // 将glob通配符转换为正则表达式
    const pattern = input.pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    const regex = new RegExp(pattern, 'i');

    // 递归搜索函数
    const searchRecursively = (dir: string) => {
      try {
        const files = fs.readdirSync(dir, { withFileTypes: true });

        for (const file of files) {
          const fullPath = path.join(dir, file.name);

          // 匹配文件名
          if (regex.test(file.name)) {
            results.push(fullPath);
          }

          // 如果是目录且启用了递归搜索，则递归搜索
          if (file.isDirectory() && input.recursive) {
            searchRecursively(fullPath);
          }
        }
      } catch (error) {
        // 忽略权限错误等
      }
    };

    searchRecursively(input.path);

    if (results.length === 0) {
      return '未找到匹配的文件';
    }

    return results.join('\n');
  }
}

export class MoveFile extends BaseTool {
  schema = z.object({
    source: z.string(),
    destination: z.string(),
  });

  name: string = 'move_file';

  description: string =
    'Move or rename files and directories. Can move files between directories and rename them in a single operation. Both source and destination must be within allowed directories.';

  constructor(params?: FileWriteParameters) {
    super(params);
  }

  async _call(
    input: z.infer<typeof this.schema>,
    runManager,
    config,
  ): Promise<string> {
    fs.renameSync(input.source, input.destination);
    return 'File moved successfully';
  }
}

export class FileContentSearch extends BaseTool {
  schema = z.object({
    paths: z.array(z.string()),
    search_content: z.string(),
    output_count: z.number().optional().default(3),
  });

  name: string = 'file_content_search';

  description: string = 'use vector search file content';

  embedding: string;

  constructor(params?: FileContentSearchParameters) {
    super(params);
    this.embedding =
      params?.embedding || settingsManager.getSettings().defaultEmbedding;
  }

  async _call(
    input: z.infer<typeof this.schema>,
    runManager,
    config,
  ): Promise<string> {
    return 'test';
  }
}
