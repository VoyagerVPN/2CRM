import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Alert, Button, Card, Divider, Form, Input, Space, Spin, Typography } from 'antd';
import { Navigate, useLocation } from 'react-router';
import { supabase, unwrap, errorText, type Profile } from '../../shared/api/client';
import { getDemoAccounts } from './demo-accounts';
import { publicDemo } from './public-demo';
const demoAccounts = getDemoAccounts(import.meta.env, publicDemo);
type AuthState = { session: Session | null; profile: Profile | null; loading: boolean; error: string | null; reload: () => void; signOut: () => Promise<void> };
const AuthContext = createContext<AuthState | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
 const [session, setSession] = useState<Session | null>(null);
 const [profile, setProfile] = useState<Profile | null>(null);
 const [checked, setChecked] = useState(false);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [attempt, retry] = useState(0);
 useEffect(() => {
  let alive = true;
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, value) => {
   if (!alive) return;
   setSession(value); setChecked(true);
   if (value) sessionStorage.setItem('2crm-had-session', '1');
  });
  supabase.auth.getSession().then(({ data, error: failure }) => { if (alive) { if (failure) setError(errorText(failure)); setSession(data.session); setChecked(true); } });
  return () => { alive = false; subscription.unsubscribe(); };
 }, [attempt]);
 useEffect(() => {
  if (!checked) return;
  let alive = true; setLoading(true); setProfile(null);
  if (!session) { setLoading(false); return; }
  supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle().then(result => {
   if (!alive) return;
   if (result.error) setError(errorText(result.error));
   else if (!result.data) setError('Для учётной записи не назначена роль. Обратитесь к руководителю');
   else { setProfile(result.data); setError(null); }
   setLoading(false);
  });
  return () => { alive = false; };
 }, [checked, session?.user.id, attempt]);
 const signOut = async () => { const { error: failure } = await supabase.auth.signOut(); if (failure) throw failure; sessionStorage.removeItem('2crm-had-session'); setProfile(null); };
 return <AuthContext.Provider value={{ session, profile, loading: loading || !checked, error, reload: () => { setError(null); retry(v => v + 1); }, signOut }}>{children}</AuthContext.Provider>;
}
export function useAuth() { const auth = useContext(AuthContext); if (!auth) throw Error('AuthProvider required'); return auth; }
export function AuthGate({ children }: { children: ReactNode }) {
 const auth = useAuth(); const location = useLocation();
 if (auth.loading) return <div className="loading"><Spin aria-label="Загрузка сессии" /></div>;
 if (auth.error) return <div className="login"><Card><Space orientation="vertical"><Alert type="error" title={auth.error} /><Button onClick={auth.reload}>Повторить</Button>{auth.session && <Button onClick={() => void auth.signOut()}>Выйти</Button>}</Space></Card></div>;
 if (!auth.session || !auth.profile) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
 return children;
}
export function LoginPage() {
 const auth = useAuth(); const location = useLocation(); const [error, setError] = useState<string | null>(null); const [pending, setPending] = useState(false); const busy = useRef(false); const [activeDemo, setActiveDemo] = useState<string | null>(null);
 const signIn = async (values: { email: string; password: string }, demoId: string | null = null) => {
  if (busy.current) return; busy.current = true; setPending(true); setActiveDemo(demoId); setError(null);
  try { const result = await supabase.auth.signInWithPassword({ email: values.email.trim(), password: values.password }); if (result.error) throw result.error; } catch (failure) { setError(errorText(failure)); } finally { busy.current = false; setPending(false); setActiveDemo(null); }
 };
 const from = (location.state as { from?: string } | null)?.from;
 if (auth.loading) return <div className="loading"><Spin /></div>;
 if (auth.profile) return <Navigate replace to={from?.startsWith('/') && !from.startsWith('//') && from !== '/login' ? from : auth.profile.role === 'manager' ? '/objects' : '/my-tasks'} />;
 return <main className="login"><Card className="login-card"><Typography.Title level={2}>Вход в 2CRM</Typography.Title><Typography.Paragraph type="secondary">{demoAccounts.length ? 'Выберите участника для входа в демо' : 'Учётную запись выдаёт руководитель'}</Typography.Paragraph>
 {sessionStorage.getItem('2crm-had-session') && <Alert className="notice" type="info" title="Сессия завершилась. Войдите снова, чтобы продолжить" />}
 {(error || auth.error) && <Alert className="notice" type="error" title={error || auth.error} />}
 {demoAccounts.length > 0 && <><div className="demo-logins">{demoAccounts.map(account => <Button key={account.id} block disabled={pending} loading={pending && activeDemo === account.id} onClick={() => void signIn(account, account.id)}>{account.label}</Button>)}</div><Divider>Вход по почте</Divider></>}
 <Form layout="vertical" requiredMark={false} onFinish={values => signIn(values)}>
 <Form.Item label="Email" name="email" rules={[{ required: true, message: 'Введите email' }, { type: 'email', message: 'Проверьте адрес email' }]}><Input autoComplete="username" type="email" disabled={pending} /></Form.Item>
 <Form.Item label="Пароль" name="password" rules={[{ required: true, message: 'Введите пароль' }]}><Input.Password autoComplete="current-password" disabled={pending} /></Form.Item>
 <Button type="primary" htmlType="submit" loading={pending && !activeDemo} disabled={pending} block>Войти</Button></Form></Card></main>;
}
