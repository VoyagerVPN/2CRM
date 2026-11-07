import { loadEnvFile } from 'node:process';

loadEnvFile('.env.local');
const url = process.env.VITE_SUPABASE_URL;
const headers = { apikey: process.env.VITE_SUPABASE_PUBLISHABLE_KEY };
const rest = await fetch(`${url}/rest/v1/__connection_probe__?select=id`, { headers, signal: AbortSignal.timeout(15000) });
const restBody = await rest.json();
// В пустой базе ожидаем отсутствие проверочной таблицы после проверки публичного ключа.
if (rest.status !== 404 || restBody.code !== 'PGRST205') throw new Error(`REST API: HTTP ${rest.status}, ${restBody.code ?? 'unknown'}`);
const auth = await fetch(`${url}/auth/v1/settings`, { headers, signal: AbortSignal.timeout(15000) });
if (!auth.ok) throw new Error(`Auth API: HTTP ${auth.status}`);
const settings = await auth.json();
console.log(JSON.stringify({ restApi: 'reachable', emptySchemaProbe: restBody.code, authApi: auth.status, emailAuth: settings.external?.email, signupDisabled: settings.disable_signup }, null, 2));
