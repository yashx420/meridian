import { createClient } from 'npm:@supabase/supabase-js@2.38.4';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
const supabase = createClient(supabaseUrl, supabaseKey);

Deno.serve(async (req) => {
  try {
    // Extract auth token from cookie
    const cookieHeader = req.headers.get('cookie');
    const authToken = cookieHeader
      ?.split(';')
      .find(c => c.trim().startsWith('auth_token='))
      ?.split('=')[1];

    if (!authToken) {
      return Response.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    // Verify token with Supabase
    const { data, error } = await supabase.auth.getUser(authToken);

    if (error || !data.user) {
      return Response.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    // Fetch user role
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('id', data.user.id)
      .single();

    if (roleError) {
      return Response.json({ success: false, error: 'Failed to fetch user role' }, { status: 500 });
    }

    return Response.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        role: roleData?.role || 'client',
      },
    });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});