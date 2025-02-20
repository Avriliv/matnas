import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(`
    Supabase environment variables are missing!
    Make sure you have:
    REACT_APP_SUPABASE_URL
    REACT_APP_SUPABASE_ANON_KEY
    in your .env.local file and in Vercel environment variables
  `);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
