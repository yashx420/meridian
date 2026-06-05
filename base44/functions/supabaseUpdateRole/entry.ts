import { createClient } from 'npm:@supabase/supabase-js@2.38.4';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
const supabase = createClient(supabaseUrl, supabaseKey);

Deno.serve(async (req) => {
  try {
    const { userId, newRole } = await req.json();

    if (!userId || !['admin', 'client'].includes(newRole)) {
      return Response.json({ success: false, error: 'Invalid userId or role' }, { status: 400 });
    }

    // Extract auth token from cookie
    const cookieHeader = req.headers.get('cookie');
    const authToken = cookieHeader
      ?.split(';')
      .find(c => c.trim().startsWith('auth_token='))
      ?.split('=')[1];

    if (!authToken) {
      return Response.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    // Verify requester is admin
    const { data: userData, error: userError } = await supabase.auth.getUser(authToken);
    if (userError || !userData.user) {
      return Response.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    const { data: requesterRole, error: requesterError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('id', userData.user.id)
      .single();

    if (requesterError || requesterRole?.role !== 'admin') {
      return Response.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    // Update user role
    const { error: updateError } = await supabase
      .from('user_roles')
      .update({ role: newRole })
      .eq('id', userId);

    if (updateError) {
      return Response.json({ success: false, error: updateError.message }, { status: 500 });
    }

    return Response.json({ success: true, message: 'Role updated successfully' });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});