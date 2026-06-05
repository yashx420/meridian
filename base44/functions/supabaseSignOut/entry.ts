import { createClient } from 'npm:@supabase/supabase-js@2.38.4';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
const supabase = createClient(supabaseUrl, supabaseKey);

Deno.serve(async (req) => {
  try {
    // Clear HTTP-only cookie by setting Max-Age to 0
    const headers = new Headers();
    headers.set('Set-Cookie', 'auth_token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0');

    // Sign out from Supabase (optional, if session refresh token is needed)
    await supabase.auth.signOut();

    return Response.json(
      { success: true, message: 'Signed out successfully' },
      { status: 200, headers }
    );
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});