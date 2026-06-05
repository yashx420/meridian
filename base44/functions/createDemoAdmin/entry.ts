import { createClient } from 'npm:@supabase/supabase-js@2.39.1';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_KEY');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

Deno.serve(async (req) => {
  try {
    // Create demo user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'demo@meridian.test',
      password: 'Demo123!@#',
      email_confirm: true
    });

    if (authError) {
      return Response.json({ error: authError.message }, { status: 400 });
    }

    return Response.json({
      success: true,
      message: 'Demo admin account created',
      email: 'demo@meridian.test',
      password: 'Demo123!@#',
      userId: authData.user.id
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});