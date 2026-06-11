import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hwoplnihoirbofihobpn.supabase.co';
const supabaseKey = 'sb_publishable_j7zW4Xa1DxzWsroS4_f9ew_EMpfbbQK';
const supabase = createClient(supabaseUrl, supabaseKey);

async function listAllTables() {
  // Try to query postgres metadata
  const { data, error } = await supabase.from('information_schema.tables').select('table_name').eq('table_schema', 'public');
  if (data) {
    console.log("Public tables:", data.map(t => t.table_name));
  } else {
    console.log("Could not query information_schema. Error:", error?.message);
    
    // Alternative: Maybe the user created a table and I can ask the user.
  }
}
listAllTables();
