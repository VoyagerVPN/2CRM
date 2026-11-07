export function getDemoAccounts(env: Record<string, string | undefined>, publicDemo?: Record<string, string>) {
 if (publicDemo && env.VITE_SUPABASE_URL === publicDemo.VITE_SUPABASE_URL) env = { ...publicDemo, ...env };
 if (env.VITE_DEMO_LOGIN_ENABLED !== 'true') return [];
 const accounts = [
  { id: 'ivan', label: 'Войти как постановщик Иван', email: 'manager2@2crm.example.com', password: env.VITE_DEMO_IVAN_PASSWORD || '' },
  { id: 'anna', label: 'Войти как постановщик Анна', email: 'manager@2crm.example.com', password: env.VITE_DEMO_ANNA_PASSWORD || '' },
  { id: 'alexey', label: 'Войти как исполнитель Алексей', email: 'executor1@2crm.example.com', password: env.VITE_DEMO_ALEXEY_PASSWORD || '' },
  { id: 'maria', label: 'Войти как исполнитель Мария', email: 'executor2@2crm.example.com', password: env.VITE_DEMO_MARIA_PASSWORD || '' },
 ];
 return accounts.every(account => account.password) ? accounts : [];
}
