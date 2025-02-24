import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://djdgitqpcjpnigatdadq.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqZGdpdHFwY2pwbmlnYXRkYWRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk5NjU3OTAsImV4cCI6MjA1NTU0MTc5MH0.sg9_wZ4RJN7n-88G3F-3xXQs8Ky9q2-L5d_fvar_l9M'

console.log('Using Supabase URL:', supabaseUrl);
console.log('Supabase Key exists:', !!supabaseAnonKey);

try {
  // בדיקה שה-URL תקין
  new URL(supabaseUrl);
} catch (error) {
  console.error('Invalid Supabase URL:', supabaseUrl);
  throw error;
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
