import { createClient } from '@supabase/supabase-js';

// הגדרת ערכי ברירת מחדל למקרה שמשתני הסביבה לא נטענים
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'https://djdgitqpcjpnigatdadq.supabase.co';
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqZGdpdHFwY2pwbmlnYXRkYWRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk5NjU3OTAsImV4cCI6MjA1NTU0MTc5MH0.sg9_wZ4RJN7n-88G3F-3xXQs8Ky9q2-L5d_fvar_l9M';

console.log('Using Supabase URL:', SUPABASE_URL);
console.log('Supabase Key exists:', !!SUPABASE_ANON_KEY);

try {
  // בדיקה שה-URL תקין
  new URL(SUPABASE_URL);
} catch (error) {
  console.error('Invalid Supabase URL:', SUPABASE_URL);
  throw error;
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
