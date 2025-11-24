import { BrowserWindow, ipcMain } from 'electron';
import settingsManager from '../settings';
import { toolsManager } from '../tools';
import { TextToSpeech } from '../tools/TextToSpeech';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { getAssetsPath } from '../utils/path';

export class AppManager {
  textToSpeech: TextToSpeech;

  offlineTts: any;

  constructor() {
    if (!ipcMain) return;
    ipcMain.on('app:tts', (event, text: string) => this.tts(text));
    ipcMain.handle('app:resetTTS', (event) => this.resetTTS());
    ipcMain.handle(
      'app:sendEmail',
      (
        event,
        options: {
          to: string[];
          subject: string;
          body: string;
          cc: string[];
          bcc: string[];
        },
      ) => this.sendEmail(options),
    );
  }

  sendEmail(options: {
    to: string[];
    subject: string;
    body: string;
    cc: string[];
    bcc: string[];
  }): any {
    let { to, subject, body, cc, bcc } = options;
    const lang = settingsManager.getSettings()?.language;
    const content = fs.readFileSync(
      path.join(getAssetsPath(), 'emails', `hireMore-${lang}.json`),
    );

    const emailData = JSON.parse(content.toString());
    to = emailData.to;
    subject = emailData.subject;
    body = emailData.body;
    cc = undefined;
    bcc = undefined;
    let mailtoUrl = `mailto:${encodeURIComponent(to[0])}`;
    const e = encodeURIComponent(body);
    const params = [];
    if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
    if (body) params.push(`body=${e.replace(/%0A/g, '%0D%0A')}`);
    if (cc) params.push(`cc=${encodeURIComponent(cc[0])}`);
    if (bcc) params.push(`bcc=${encodeURIComponent(bcc[0])}`);

    if (params.length > 0) {
      mailtoUrl += `?${params.join('&')}`;
    }

    // 根据操作系统打开默认邮件应用
    let command;
    if (process.platform === 'win32') {
      command = `start "" "${mailtoUrl}"`;
    } else if (process.platform === 'darwin') {
      command = `open "${mailtoUrl}"`;
    } else {
      command = `xdg-open "${mailtoUrl}"`;
    }

    exec(command, (error) => {
      if (error) {
        console.error('无法打开默认邮件应用:', error);
      }
    });
  }

  public async init() {
    const defaultTTS = settingsManager.getSettings()?.defaultTTS;
    if (defaultTTS) {
      const model = defaultTTS.split('@')[0];
      if (!this.textToSpeech || this.textToSpeech.model != model)
        this.textToSpeech = new TextToSpeech({ model });

      const config = this.textToSpeech.getConfig(model);
      if (!this.offlineTts) {
        if (config) {
          try {
            this.offlineTts = await this.textToSpeech.createTts(config);
            console.log(`tts引擎已初始化 model = ${model}`);
          } catch (error) {
            console.log(error);
          }
        }
      }
    }
  }

  public async resetTTS() {
    this.offlineTts = null;
    this.textToSpeech = null;
    const defaultTTS = settingsManager.getSettings()?.defaultTTS;
    if (defaultTTS) {
      const model = defaultTTS.split('@')[0];
      this.textToSpeech = new TextToSpeech({ model });
      const config = this.textToSpeech.getConfig(model);
      if (!this.offlineTts) {
        if (config) {
          this.offlineTts = await this.textToSpeech.createTts(config);
          console.log(`tts引擎已初始化 model = ${model}`);
        }
      }
    }
  }

  public async tts(text: string) {
    if (!text || !this.offlineTts) return;
    const audio = this.offlineTts?.generate({
      text: text,
      sid: 0,
      speed: 1.0,
      enableExternalBuffer: false,
    });
    if (audio.sampleRate) {
      await this.textToSpeech.play(audio);
    }
  }

  public async sendEvent(event: string, data: any) {
    const windows = BrowserWindow.getAllWindows();
    windows.forEach((window) => {
      window.webContents.send(event, data);
    });
  }
}

export const appManager = new AppManager();
