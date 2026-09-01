import { createClient } from 'npm:@supabase/supabase-js@2';
export async function requireAdmin(req: Request) {
  const auth = req.headers.get('Authorization');
  if (!auth) throw new Error('Authentication required');
  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) throw new Error('Authentication required');
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: member } = await db.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle();
  if (!member) throw new Error('Admin access required');
  return db;
}
