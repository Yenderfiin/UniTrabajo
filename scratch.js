import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hwoplnihoirbofihobpn.supabase.co';
const supabaseKey = 'sb_publishable_j7zW4Xa1DxzWsroS4_f9ew_EMpfbbQK';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testQuery() {
  console.log("Querying users...");
  const { data, error } = await supabase.from('users').select('*');
  console.log("Data:", data);
  if (error) console.log("Error:", error);
}

testQuery();
