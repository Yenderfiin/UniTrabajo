import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hwoplnihoirbofihobpn.supabase.co';
const supabaseKey = 'sb_publishable_j7zW4Xa1DxzWsroS4_f9ew_EMpfbbQK';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  const { data: cols, error: err } = await supabase.from('vehicles').insert({ type: 'Carro', plate: 'TEST12', capacity: 2, document: '2720484983' });
  console.log("Error on insert duplicate doc:", err);
  const { data: cols2, error: err2 } = await supabase.from('vehicles').insert({ type: 'Carro', plate: 'HET816', capacity: 2, document: 'dummy' });
  console.log("Error on insert duplicate plate:", err2);
  
  await supabase.from('vehicles').delete().eq('plate', 'TEST12');
}
checkSchema();
