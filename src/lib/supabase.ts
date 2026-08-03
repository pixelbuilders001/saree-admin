import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || supabaseUrl.includes('your-project-id') || !supabaseAnonKey || supabaseAnonKey.includes('...')) {
    console.warn(
        '⚠️ Warning: Supabase URL or Anon Key is using placeholder values. Please update your .env file with valid credentials.'
    );
}

export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key'
);
export default supabase;
