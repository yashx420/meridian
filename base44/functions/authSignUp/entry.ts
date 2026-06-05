import { createClient } from 'npm:@supabase/supabase-js@2.39.1';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_KEY')
);

const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('SUPABASE_ANON_KEY')
);

Deno.serve(async (req) => {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return Response.json({ error: 'Email and password required' }, { status: 400 });
    }

    const { data: existingUsers, error: fetchError } = await supabaseAdmin.auth.admin.listUsers();
    
    const userExists = existingUsers?.users?.some(u => u.email === email);
    if (userExists) {
      return Response.json({ error: 'Email already exists' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false
    });

    if (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    // Send confirmation email using client
    const { error: sendError } = await supabaseClient.auth.resend({
      type: 'signup',
      email: email
    });

    if (sendError) {
      return Response.json({ error: sendError.message }, { status: 400 });
    }

    return Response.json({
      success: true,
      message: 'Confirmation link sent',
      user: data.user
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});