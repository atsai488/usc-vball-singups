import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, response } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return response({ error: 'Method not allowed' }, 405);
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return response({ error: 'Google sign-in required' }, 401);
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const authClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return response({ error: 'Google sign-in required' }, 401);
  const { signupId } = await req.json();
  if (!signupId) return response({ error: 'Signup is required' }, 400);
  const db = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: signup } = await db.from('signups').select('id').eq('id', signupId).eq('auth_user_id', user.id).maybeSingle();
  if (!signup) return response({ error: 'Signup not found for this account' }, 404);
  const { error } = await db.from('signups').delete().eq('id', signupId).eq('auth_user_id', user.id);
  if (error) return response({ error: error.message }, 500);
  return response({ ok: true });
});
