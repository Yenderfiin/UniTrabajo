import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hwoplnihoirbofihobpn.supabase.co';
const supabaseKey = 'sb_publishable_j7zW4Xa1DxzWsroS4_f9ew_EMpfbbQK';
const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
  // There is no direct "list tables" in supabase-js anon key.
  // We can try to query a few guesses:
  const tables = ['profiles', 'skills', 'user_skills', 'user_descriptions', 'cv', 'freelancers'];
  for (const t of tables) {
    const { error } = await supabase.from(t).select('*').limit(1);
    if (!error) {
      console.log(`Table exists: ${t}`);
    } else {
      console.log(`Table ${t} check error:`, error.message);
    }
  }
}
listTables();
