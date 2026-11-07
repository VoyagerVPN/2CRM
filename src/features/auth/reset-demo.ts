import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../shared/api/database.types';
import { fetchWithTimeout } from '../../shared/api/request';

export async function resetDemoData(credentials: { email: string; password: string }) {
 // Отдельная сессия не заменяет вход пользователя и не сохраняется в браузере.
 const client = createClient<Database>(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: '2crm-demo-reset' },
  global: { fetch: fetchWithTimeout },
 });
 try {
  const signedIn = await client.auth.signInWithPassword(credentials);
  if (signedIn.error) throw signedIn.error;
  const reset = await client.rpc('reset_demo_data');
  if (reset.error) throw reset.error;
 } finally {
  await client.auth.signOut({ scope: 'local' });
 }
}
