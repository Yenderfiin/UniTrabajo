import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hwoplnihoirbofihobpn.supabase.co';
const supabaseKey = 'sb_publishable_j7zW4Xa1DxzWsroS4_f9ew_EMpfbbQK';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  try {
    const { data, error } = await supabase
      .from('aplications')
      .select(`
        id_offer,
        document,
        app_status,
        offers (
          id_offer,
          description,
          create_at,
          status,
          job_details ( category, payment, hours )
        )
      `)
      .limit(1);
    
    if (error) {
      console.error("Query error:", error);
    } else {
      console.log("Query success! Data length:", data.length);
      console.log("Sample:", JSON.stringify(data[0], null, 2));
    }
  } catch (err) {
    console.error("Exception:", err);
  }
}

run();
