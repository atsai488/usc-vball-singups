import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, response } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return response({ error: 'Method not allowed' }, 405);
  const { signupId, pin } = await req.json();
  if (!signupId || !/^\d{4}$/.test(pin ?? '')) return response({ error: 'Invalid request' }, 400);
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: signup } = await db.from('signups').select('id,cancel_pin_hash').eq('id', signupId).single();
  if (!signup?.cancel_pin_hash) return response({ error: 'Not found' }, 404);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin));
  const hash = Array.from(new Uint8Array(digest)).map((x) => x.toString(16).padStart(2, '0')).join('');
  if (hash !== signup.cancel_pin_hash) return response({ error: 'Invalid PIN' }, 401);
  const { error } = await db.from('signups').delete().eq('id', signupId);
  if (error) return response({ error: error.message }, 500);
  return response({ ok: true });
});
