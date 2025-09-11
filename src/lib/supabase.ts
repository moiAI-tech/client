import { createClient } from '@supabase/supabase-js';

// 这些需要在您的Supabase项目中获取
const supabaseUrl = 'https://bwrnadfdtwywrdgnljjl.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3cm5hZGZkdHd5d3JkZ25sampsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4MjI0NTIsImV4cCI6MjA2ODM5ODQ1Mn0.ufmeG2BMbPH7lT-gnSJLFoyp4qqPcIZc8ub4eS8KRKU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 导出认证相关的类型
export type {
  User,
  Session,
  AuthError,
  SupabaseClient,
} from '@supabase/supabase-js';
