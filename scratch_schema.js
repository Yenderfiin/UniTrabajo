import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hwoplnihoirbofihobpn.supabase.co';
const supabaseKey = 'sb_publishable_j7zW4Xa1DxzWsroS4_f9ew_EMpfbbQK';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  const { data, error } = await supabase.rpc('get_schema'); // Not standard
  // Instead, let's just insert a dummy and see what happens, or check what keys are returned.
  console.log("Fetching 1 user to see keys...");
  const { data: users, error: err } = await supabase.from('users').select('*').limit(1);
  console.log(users);
}
checkSchema();
