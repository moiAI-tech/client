import React, { ReactNode, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { unified } from 'unified';
import remarkMath from 'remark-math';
import rehypeMath from 'rehype-math';
import remarkParse from 'remark-parse';
import rehypeStringify from 'rehype-stringify';
import remarkRehype from 'remark-rehype';
import remarkBreaks from 'remark-breaks';
import rehypeFormat from 'rehype-format';
import rehypeReact from 'rehype-react';
import rehypeMermaid from 'rehype-mermaid';
import * as prod from 'react/jsx-runtime';
import rehypeSanitize from 'rehype-sanitize';
import rehypeCodeTitles from 'rehype-code-titles';
import 'katex/dist/katex.min.css';
import { visit } from 'unist-util-visit';
import { SKIP } from 'unist-util-visit-parents';
import ChatAttachment from '../chat/ChatAttachment';
import { ChatInputAttachment } from '@/types/chat';
import { marked } from 'marked';

interface MyThinkProps {
  children: ReactNode;
  [key: string]: any;
}

export interface MarkdownProps {
  value?: string;
}
const production = {
  Fragment: prod.Fragment,
  jsx: prod.jsx,
  jsxs: prod.jsxs,
  //createElement: React.createElement,
};
export function Markdown(props: MarkdownProps) {
  const [renderedContent, setRenderedContent] = useState<string | null>(null);
  const [files, setFiles] = useState<ChatInputAttachment[]>([]);
  function splitContextAndFiles(input: string): {
    context: string;
    files: string[];
  } {
    const fileRegex = /<file>([\s\S]*?)<\/file>/g;
    const files: string[] = [];
    let match: RegExpExecArray | null;

    // 提取所有 <file>xxx</file> 内容
    while ((match = fileRegex.exec(input)) !== null) {
      files.push(match[1]);
    }

    // 去掉所有 <file>...</file> 后，剩下的就是 context
    const context = input.replace(fileRegex, '').trim();

    return { context, files };
  }
  function parseMarkdownFileLink(
    filePath: string,
  ): ChatInputAttachment | undefined {
    const fileName = filePath.split(/[\\/]/).pop();
    const ext = `.${fileName.split('.').pop()}`;
    return {
      name: fileName,
      path: filePath,
      type: 'file',
      ext: ext,
    };
  }
  useEffect(() => {
    const { context, files } = splitContextAndFiles(props?.value);

    const f = files
      .map((file) => parseMarkdownFileLink(file))
      .filter((x) => x !== undefined);
    setFiles(f);
    // setRenderedContent(context);

    unified()
      .use(remarkParse)
      .use(rehypeReact, production)
      .use(remarkGfm)
      .use(remarkMath)
      .use(remarkBreaks)
      .use(remarkRehype, { allowDangerousHtml: true })

      .use(rehypeRaw)
      .use(rehypeCodeTitles)
      .use(rehypeFormat)

      .use(rehypeMath)
      .use(rehypeKatex)
      //.use(rehypeSanitize)
      .use(rehypeHighlight)

      .use(rehypeMermaid, { strategy: 'inline-svg' })

      .use(rehypeStringify)

      //.use(rehypeSanitize)

      .process(context)
      .then((res) => {
        setRenderedContent(res.toString());

        return null;
      })
      .catch((err) => {});
  }, [props?.value]);
  return renderedContent ? (
    <>
      <div
        className="overflow-auto w-full max-w-max break-words prose dark:prose-invert dark prose-hr:m-0 prose-td:whitespace-pre-line"
        dangerouslySetInnerHTML={{ __html: renderedContent }}
        key={props?.value}
      />
      <div className="flex flex-wrap gap-2 p-1">
        {files.map((file) => {
          return (
            <>
              <ChatAttachment value={file} key={file.path}></ChatAttachment>
            </>
          );
        })}
      </div>
    </>
  ) : null;
}
