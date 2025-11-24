import { ToolParams } from '@langchain/core/tools';
import { BaseTool } from './BaseTool';
import { z } from 'zod';
import fs from 'fs';
import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  TextRun,
  CommentRangeStart,
  CommentRangeEnd,
  CommentReference,
  Comment,
  Comments,
  ICommentsOptions,
  ICommentOptions,
  ISectionOptions,
  FileChild,
  AlignmentType,
  Break,
} from 'docx';
import { v4 as uuidv4 } from 'uuid';

export interface DocxWriteParameters extends ToolParams {}

export class DocxWrite extends BaseTool {
  schema = z.object({
    path: z.string(),
    data: z.array(
      z.object({
        type: z.enum(['title', 'paragraph']),
        headingLevel: z.number().optional(),
        content: z.string(),
        comment: z.string().optional(),
        author: z.string().optional(),
      }),
    ),
  });

  name = 'docx_write';

  description: string = 'create docx file and write';

  constructor(params?: DocxWriteParameters) {
    super(params);
  }

  async _call(
    input: z.infer<typeof this.schema>,
    runManager,
    config,
  ): Promise<string> {
    const sections: ISectionOptions[] = [];

    const children: FileChild[] = [];
    const comments: ICommentOptions[] = [];
    let commentId = 0;
    input.data.forEach((item) => {
      if (item.type === 'title') {
        const title = new Paragraph({
          text: item.content,
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
        });
        children.push(title);
      } else if (item.type === 'paragraph') {
        let paragraph;
        if (!item.headingLevel) {
          // paragraph = new Paragraph({
          //   children: [new TextRun(item.content)],
          // });
          const lines = item.content.split('\n');
          if (item.comment) {
            const commentStart = new CommentRangeStart(commentId);
            const commentEnd = new CommentRangeEnd(commentId);
            const commentRef = new CommentReference(commentId);
            const comment = {
              id: commentId,
              author: item.author,
              date: new Date(),
              children: [new Paragraph(item.comment)],
            } as ICommentOptions;
            comments.push(comment);
            commentId++;
            paragraph = new Paragraph({
              children: [
                commentStart,
                ...lines.flatMap((line, index) => {
                  const runs = [new TextRun(line)];
                  if (index < lines.length - 1) {
                    runs.push(new TextRun({ break: 1 }));
                  }
                  return runs;
                }),
                commentEnd,
                commentRef,
              ],
            });
          } else {
            paragraph = new Paragraph({
              children: lines.flatMap((line, index) => {
                const runs = [new TextRun(line)];
                if (index < lines.length - 1) {
                  runs.push(new TextRun({ break: 1 }));
                }
                return runs;
              }),
            });
          }
        } else {
          let heading: string | undefined;
          switch (item.headingLevel) {
            case 1:
              heading = HeadingLevel.HEADING_1;
              break;
            case 2:
              heading = HeadingLevel.HEADING_2;
              break;
            case 3:
              heading = HeadingLevel.HEADING_3;
              break;
            case 4:
              heading = HeadingLevel.HEADING_4;
              break;
            case 5:
              heading = HeadingLevel.HEADING_5;
              break;
            case 6:
              heading = HeadingLevel.HEADING_6;
              break;
            default:
              heading = undefined;
              break;
          }
          if (item.comment) {
            const commentStart = new CommentRangeStart(commentId);
            const commentEnd = new CommentRangeEnd(commentId);
            const commentRef = new CommentReference(commentId);
            const comment = {
              id: commentId,
              author: item.author,
              date: new Date(),
              children: [new Paragraph(item.comment)],
            } as ICommentOptions;
            comments.push(comment);
            commentId++;
            paragraph = new Paragraph({
              children: [
                commentStart,
                new TextRun({ text: item.content, color: '000000' }),
                commentEnd,
                commentRef,
              ],
              heading: heading as any,
            });
          } else {
            paragraph = new Paragraph({
              children: [new TextRun({ text: item.content, color: '000000' })],
              heading: heading as any,
            });
          }
        }

        children.push(paragraph);
      }
    });

    sections.push({
      children: children,
    });
    const doc = new Document({
      sections: sections,
      comments: {
        children: comments,
      },
    });

    // const title = new Paragraph({
    //   text: '这是大标题',
    //   heading: HeadingLevel.HEADING_1,
    // });

    // // 创建正文
    // const body = new Paragraph({
    //   children: [new TextRun('这是正文内容')],
    // });

    // // 创建批注
    // const commentStart = new CommentRangeStart({ id: 0 });
    // const commentEnd = new CommentRangeEnd({ id: 0 });
    // const commentRef = new CommentReference({ id: 0 });

    // const commentedText = new Paragraph({
    //   children: [
    //     commentStart,
    //     new TextRun('需要批注的文字'),
    //     commentEnd,
    //     commentRef,
    //   ],
    // });

    // const comments = new Comments({
    //   children: [
    //     {
    //       id: 0,
    //       // author: '作者名',
    //       date: new Date(),
    //       children: [new Paragraph('这是批注内容')],
    //     } as ICommentOptions,
    //   ] as ICommentOptions[],
    // });

    // const doc = new Document({
    //   sections: [
    //     {
    //       children: [title, body, commentedText],
    //     },
    //   ],
    //   comments,
    // });

    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(input.path, buffer);
    return 'file write is success';
  }
}
