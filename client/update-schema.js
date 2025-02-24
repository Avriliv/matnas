import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://djdgitqpcjpnigatdadq.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqZGdpdHFwY2pwbmlnYXRkYWRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk5NjU3OTAsImV4cCI6MjA1NTU0MTc5MH0.sg9_wZ4RJN7n-88G3F-3xXQs8Ky9q2-L5d_fvar_l9M'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function updateSchema() {
  try {
    // Add parent_id and custom_type columns
    const { error: alterError } = await supabase.rpc('alter_table_tasks', {
      sql: `
        ALTER TABLE tasks 
        ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES tasks(id),
        ADD COLUMN IF NOT EXISTS custom_type TEXT;
      `
    })

    if (alterError) throw alterError
    console.log('Schema updated successfully!')
  } catch (error) {
    console.error('Error updating schema:', error)
  }
}

updateSchema()
