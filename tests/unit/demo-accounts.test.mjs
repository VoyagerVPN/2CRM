import test from 'node:test';
import assert from 'node:assert/strict';
import { getDemoAccounts } from '../../src/features/auth/demo-accounts.ts';

test('demo login offers the four agreed identities with their own credentials', () => {
 const accounts = getDemoAccounts({ VITE_DEMO_LOGIN_ENABLED: 'true', VITE_DEMO_IVAN_PASSWORD: 'ivan-demo', VITE_DEMO_ANNA_PASSWORD: 'anna-demo', VITE_DEMO_ALEXEY_PASSWORD: 'alexey-demo', VITE_DEMO_MARIA_PASSWORD: 'maria-demo' });
 assert.deepEqual(accounts.map(({label, email, password}) => [label, email, password]), [
  ['Войти как постановщик Иван', 'manager2@2crm.example.com', 'ivan-demo'],
  ['Войти как постановщик Анна', 'manager@2crm.example.com', 'anna-demo'],
  ['Войти как исполнитель Алексей', 'executor1@2crm.example.com', 'alexey-demo'],
  ['Войти как исполнитель Мария', 'executor2@2crm.example.com', 'maria-demo'],
 ]);
});

test('demo login stays off unless explicitly enabled and fully configured', () => {
 assert.deepEqual(getDemoAccounts({}), []);
 const passwords = { VITE_DEMO_IVAN_PASSWORD: 'i', VITE_DEMO_ANNA_PASSWORD: 'a', VITE_DEMO_ALEXEY_PASSWORD: 'x', VITE_DEMO_MARIA_PASSWORD: 'm' };
 assert.deepEqual(getDemoAccounts(passwords), []);
 assert.deepEqual(getDemoAccounts({ ...passwords, VITE_DEMO_LOGIN_ENABLED: 'false' }), []);
 assert.deepEqual(getDemoAccounts({ ...passwords, VITE_DEMO_LOGIN_ENABLED: 'true', VITE_DEMO_MARIA_PASSWORD: '' }), []);
});

test('public demo defaults apply only to their own Supabase project and allow explicit opt-out', () => {
 const publicDemo = { VITE_SUPABASE_URL: 'https://demo.supabase.co', VITE_DEMO_LOGIN_ENABLED: 'true', VITE_DEMO_IVAN_PASSWORD: 'i', VITE_DEMO_ANNA_PASSWORD: 'a', VITE_DEMO_ALEXEY_PASSWORD: 'x', VITE_DEMO_MARIA_PASSWORD: 'm' };
 assert.equal(getDemoAccounts({ VITE_SUPABASE_URL: 'https://demo.supabase.co' }, publicDemo).length, 4);
 assert.deepEqual(getDemoAccounts({ VITE_SUPABASE_URL: 'https://other.supabase.co' }, publicDemo), []);
 assert.deepEqual(getDemoAccounts({ VITE_SUPABASE_URL: 'https://demo.supabase.co', VITE_DEMO_LOGIN_ENABLED: 'false' }, publicDemo), []);
});
