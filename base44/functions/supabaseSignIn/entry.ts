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

    // Sign in with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return Response.json({ success: false, error: error.message }, { status: 401 });
    }

    // Fetch user role from user_roles table
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('id', data.user.id)
      .single();

    if (roleError) {
      return Response.json({ success: false, error: 'Failed to fetch user role' }, { status: 500 });
    }

    const role = roleData?.role || 'client';

    // Set HTTP-only cookie with JWT token
    const headers = new Headers();
    headers.set('Set-Cookie', `auth_token=${data.session.access_token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${data.session.expires_in}`);

    return Response.json(
      {
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
          role: role,
        },
      },
      { status: 200, headers }
    );
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});