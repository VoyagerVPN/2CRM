import { createClient } from '@supabase/supabase-js';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
process.loadEnvFile(resolve(root, '.env.local'));
process.loadEnvFile(resolve(root, '.cache/private/admin.env'));
export const url = process.env.VITE_SUPABASE_URL;
export const publicKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const clientOptions = { global: { fetch: async (input, init) => { const started = Date.now(); const route = new URL(typeof input === 'string' ? input : input.url ?? input.toString()).pathname; if (process.env.CRM_TRACE) console.log('API start', init?.method ?? 'GET', route); const response = await fetch(input, { ...init, signal: init?.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(10000)]) : AbortSignal.timeout(10000) }); if (process.env.CRM_TRACE) console.log('API done', response.status, route, Date.now() - started); return response; } }, auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
export const admin = createClient(url, process.env.SUPABASE_SECRET_KEY, clientOptions);
export const accountFile = resolve(root, '.cache/private/test-accounts.json');
export async function accounts() { return JSON.parse(await readFile(accountFile, 'utf8')); }
export async function login(account) {
 const client = createClient(url, publicKey, clientOptions);
 const { error } = await client.auth.signInWithPassword({ email: account.email, password: account.password });
 if (error) throw error;
 return client;
}
export function ok(result) { if (result.error) throw result.error; return result.data; }
export async function provision() {
 await mkdir(resolve(root, '.cache/private'), { recursive: true });
 let records = []; try { records = await accounts(); } catch (e) { if (e.code !== 'ENOENT') throw e; }
 for (const [name, role, label] of [
 ['manager','manager','Анна Морозова'], ['manager2','manager','Иван Петров'],
 ['executor1','executor','Алексей Крылов'], ['executor2','executor','Мария Соколова'],
 ]) {
  let record = records.find(a => a.name === name);
  if (!record) {
   const email = name + '@2crm.example.com'; const password = randomBytes(24).toString('base64url');
   const user = ok(await admin.auth.admin.createUser({ email, password, email_confirm: true })).user;
   record = { name, role, display_name: label, email, password, id: user.id };
   records.push(record); await writeFile(accountFile, JSON.stringify(records, null, 2));
  }
  record.display_name = label;
  await writeFile(accountFile, JSON.stringify(records, null, 2));
  ok(await admin.from('profiles').upsert({ id: record.id, role, display_name: label }));
 }
 console.log('Подготовлены аккаунты: ' + records.map(a => a.name).join(', ') + '. Пароли сохранены только локально.');
}
