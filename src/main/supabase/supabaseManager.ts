import { Session, supabase, SupabaseClient } from '@/lib/supabase';
import { AuthState } from '@/types/auth';
import { UserResponse } from '@supabase/supabase-js';
import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { notificationManager } from '../app/NotificationManager';

export class SupabaseManager {
  supabase: SupabaseClient;
  session: Session;

  constructor() {
    this.supabase = supabase;
  }

  public async initServer() {
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
  }

  async init() {
    this.supabase.auth.onAuthStateChange(async (event, session) => {
      this.session = session;
      notificationManager
        .getMainWindow()
        .webContents.send('supabase:auth-state-changed', { session: session });
      console.log('Supabase AuthStateChange', session);
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
}

const supabaseManager = new SupabaseManager();

export default supabaseManager;
