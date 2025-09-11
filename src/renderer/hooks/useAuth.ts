import { useState, useEffect } from 'react';
import { supabase, User, Session, AuthError } from '@/lib/supabase';
import { AuthState } from '@/types/auth';

export const useAuth = () => {
  const [authState, setAuthState] = useState<
    AuthState & { loading: boolean; error: string | null }
  >({
    user: null,
    session: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    // 获取当前用户会话
    const getSession = async () => {
      const session = await window.electron.supabase.getSession();

      setAuthState({
        user: session?.user ?? null,
        session,
        loading: false,
        error: null,
      });
    };

    getSession();

    // 监听认证状态变化

    window.electron.ipcRenderer.on(
      'supabase:auth-state-changed',
      (data: { session: Session }) => {
        setAuthState({
          user: data.session?.user ?? null,
          session: data.session,
          loading: false,
          error: null,
        });
      },
    );

    return () => {
      window.electron.ipcRenderer.removeAllListeners(
        'supabase:auth-state-changed',
      );
    };

    // const {
    //   data: { subscription },
    // } = supabase.auth.onAuthStateChange(async (event, session) => {
    //   setAuthState({
    //     user: session?.user ?? null,
    //     session,
    //     loading: false,
    //     error: null,
    //   });
    // });

    // return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    setAuthState((prev) => ({ ...prev, loading: true, error: null }));

    const { data, error } = await await window.electron.supabase.signIn({
      email,
      password,
    });

    if (error) {
      setAuthState((prev) => ({
        ...prev,
        loading: false,
        error: error.message,
      }));
      return { success: false, error: error.message };
    }

    setAuthState({
      user: data.user,
      session: data.session,
      loading: false,
      error: null,
    });

    return { success: true, data };
  };

  const signUp = async (email: string, password: string) => {
    setAuthState((prev) => ({ ...prev, loading: true, error: null }));

    const { data, error } = await window.electron.supabase.signUp({
      email,
      password,
    });

    if (error) {
      setAuthState((prev) => ({
        ...prev,
        loading: false,
        error: error.message,
      }));
      return { success: false, error: error.message };
    }

    // 注册成功但可能需要邮箱验证
    if (data.user && !data.session) {
      setAuthState((prev) => ({
        ...prev,
        loading: false,
        error: null,
      }));
      return {
        success: true,
        data,
        message: '请检查您的邮箱以完成注册验证',
      };
    }

    setAuthState({
      user: data.user,
      session: data.session,
      loading: false,
      error: null,
    });

    return { success: true, data };
  };

  const signOut = async () => {
    setAuthState((prev) => ({ ...prev, loading: true }));

    const { error } = await window.electron.supabase.signOut();

    if (error) {
      setAuthState((prev) => ({
        ...prev,
        loading: false,
        error: error.message,
      }));
      return { success: false, error: error.message };
    }

    setAuthState({
      user: null,
      session: null,
      loading: false,
      error: null,
    });

    return { success: true };
  };

  return {
    ...authState,
    signIn,
    signUp,
    signOut,
  };
};
