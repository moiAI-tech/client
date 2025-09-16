import { Session, supabase, SupabaseClient } from '@/lib/supabase';
import { AuthState } from '@/types/auth';
import { UserResponse } from '@supabase/supabase-js';
import { ipcMain, safeStorage, IpcMainInvokeEvent } from 'electron';
import { notificationManager } from '../app/NotificationManager';
import { Repository } from 'typeorm';
import Settings from '@/entity/Settings';
import { dbManager } from '../db';
import Store from 'electron-store';

export class SupabaseManager {
  supabase: SupabaseClient;
  session: Session;
  private readonly settingsRepository: Repository<Settings>;
  private readonly store: Store;

  constructor() {
    this.store = new Store();
    this.supabase = supabase;
    this.settingsRepository = dbManager.dataSource.getRepository(Settings);
  }

  public async initServer() {
    if (!ipcMain) return;
    ipcMain.handle(
      'supabase:signIn',
      async (
        event: IpcMainInvokeEvent,
        data: { email: string; password: string },
      ) => {
        return this.signIn(data);
      },
    );
    ipcMain.handle(
      'supabase:signUp',
      async (
        event: IpcMainInvokeEvent,
        data: { email: string; password: string },
      ) => {
        return await this.signUp(data);
      },
    );
    ipcMain.handle('supabase:signOut', async (event: IpcMainInvokeEvent) => {
      return await this.signOut();
    });
    ipcMain.handle('supabase:getUser', async (event: IpcMainInvokeEvent) => {
      return await this.getUser();
    });
    ipcMain.handle('supabase:getSession', async (event: IpcMainInvokeEvent) => {
      return await this.getSession();
    });
    ipcMain.handle('supabase:getCredits', async (event: IpcMainInvokeEvent) => {
      return await this.getCredits();
    });
  }

  async init() {
    await this.initServer();
    const encrypted = this.store.get('supabase_session');
    if (encrypted) {
      try {
        const res = safeStorage.decryptString(
          Buffer.from(encrypted as string, 'base64'),
        );
        const savedSession = JSON.parse(res as string);
        const { data, error } = await supabase.auth.setSession(savedSession);
        if (!error) {
          const encrypted = safeStorage
            .encryptString(JSON.stringify(data.session))
            .toString('base64');
          this.store.set('supabase_session', encrypted);

          // await this.settingsRepository.save({
          //   id: 'supabase_session',
          //   value: JSON.stringify({
          //     access_token: data.session.access_token,
          //     refresh_token: data.session.refresh_token,
          //   }),
          // });
        } else {
          this.store.delete('supabase_session');
        }
      } catch {
        this.store.delete('supabase_session');
      }
    }

    this.supabase.auth.onAuthStateChange(async (event, session) => {
      this.session = session;

      if (session) {
        const encrypted = safeStorage
          .encryptString(JSON.stringify(session))
          .toString('base64');
        this.store.set('supabase_session', encrypted);
      } else {
        this.store.delete('supabase_session');
      }

      if ((event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') && session) {
        // await this.settingsRepository.save({
        //   id: 'supabase_session',
        //   value: JSON.stringify({
        //     access_token: session.access_token,
        //     refresh_token: session.refresh_token,
        //   }),
        // });
      }

      if (event === 'SIGNED_OUT') {
        this.store.delete('supabase_session');
        // await this.settingsRepository.delete('supabase_session');
      }
      notificationManager
        .getMainWindow()
        .webContents.send('supabase:auth-state-changed', {
          session: session,
        });
      console.log('Supabase AuthStateChange: ' + event, session);
    });

    if (!ipcMain) return;
    await this.initServer();
  }

  async getUser(): Promise<UserResponse> {
    const res = await this.supabase.auth.getUser();
    return res;
  }

  async getSession(): Promise<Session | null> {
    const {
      data: { session },
      error,
    } = await this.supabase.auth.getSession();
    return session;
  }

  async signOut() {
    return await this.supabase.auth.signOut();
  }

  signIn(data: { email: string; password: string }) {
    return this.supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
  }

  signUp(data: { email: string; password: string }) {
    return this.supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });
  }

  getCredits() {
    return this.supabase.from('credit_accounts').select('*');
  }
}

const supabaseManager = new SupabaseManager();

export default supabaseManager;
