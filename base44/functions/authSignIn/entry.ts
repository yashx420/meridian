import { createClient } from 'npm:@supabase/supabase-js@2.39.1';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('SUPABASE_ANON_KEY')
);

Deno.serve(async (req) => {
  try {
    const { email, password } = await req.json();
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return Response.json({ error: error.message }, { status: 401 });
    }

    return Response.json({
      token: data.session.access_token,
      user: data.user
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});