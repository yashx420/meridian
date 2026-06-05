import { createClient } from 'npm:@supabase/supabase-js@2.38.4';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
const supabase = createClient(supabaseUrl, supabaseKey);

Deno.serve(async (req) => {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return Response.json({ success: false, error: 'Email and password required' }, { status: 400 });
    }

    // Sign up user with Supabase
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${new URL(req.url).origin}/`,
      },
    });

    if (error) {
      return Response.json({ success: false, error: error.message }, { status: 400 });
    }

    // Create user profile with default role 'client'
    if (data.user) {
      await supabase.from('user_roles').insert({
        id: data.user.id,
        email: data.user.email,
        role: 'client',
        created_at: new Date().toISOString(),
      }).single();
    }

    return Response.json({ 
      success: true, 
      message: 'Sign up successful. Check your email for verification link.' 
    });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});