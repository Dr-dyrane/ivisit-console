import { supabase } from '../lib/supabase';

// Test function to check if tables exist
export const testDatabaseTables = async () => {
  try {
    console.log('Testing database tables...');
    
    // Test health_news table
    const { data: healthNewsData, error: healthNewsError } = await supabase
      .from('health_news')
      .select('id')
      .limit(1);
    
    console.log('health_news table:', healthNewsError ? '❌ Error' : '✅ OK');
    if (healthNewsError) console.log('Error:', healthNewsError);
    
    // Test support_tickets table
    const { data: ticketsData, error: ticketsError } = await supabase
      .from('support_tickets')
      .select('id')
      .limit(1);
    
    console.log('support_tickets table:', ticketsError ? '❌ Error' : '✅ OK');
    if (ticketsError) console.log('Error:', ticketsError);
    
    // Test insurance_policies table
    const { data: insuranceData, error: insuranceError } = await supabase
      .from('insurance_policies')
      .select('id')
      .limit(1);
    
    console.log('insurance_policies table:', insuranceError ? '❌ Error' : '✅ OK');
    if (insuranceError) console.log('Error:', insuranceError);
    
    return {
      healthNews: !healthNewsError,
      supportTickets: !ticketsError,
      insurancePolicies: !insuranceError
    };
  } catch (error) {
    console.error('Database test error:', error);
    return null;
  }
};
