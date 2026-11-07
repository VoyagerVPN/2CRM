import { useState } from 'react';
import { App as AntdApp, Alert, Button, ConfigProvider, Drawer, Layout, Menu, Space, Typography } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import { createBrowserRouter, Link, Navigate, Outlet, RouterProvider, useLocation, useNavigate } from 'react-router';
import { AuthGate, AuthProvider, LoginPage, useAuth } from '../features/auth/Auth';
import { ObjectPage, ObjectsPage } from '../features/objects/ObjectPages';
import { MyTasksPage, TaskPage } from '../features/tasks/TaskPages';
import { errorText } from '../shared/api/client';
import { listPath, Missing } from '../shared/ui/common';
import './styles.css';
function Root() { return <ConfigProvider locale={ruRU} theme={{ components: { Menu: { itemSelectedBg: '#e8eee9', itemSelectedColor: '#284f42', itemHoverBg: '#f3f5f0' } }, token: { colorPrimary: '#284f42', colorText: '#20252b', colorBgLayout: '#f2f1ed', colorBorderSecondary: '#dfe5dc', borderRadius: 6, fontFamily: 'Segoe UI, -apple-system, BlinkMacSystemFont, sans-serif' } }}><AntdApp><AuthProvider><Outlet /></AuthProvider></AntdApp></ConfigProvider>; }
function Home() { const { profile } = useAuth(); return <Navigate to={profile?.role === 'manager' ? listPath('/objects') : listPath('/my-tasks')} replace />; }
function Shell() {
 const { profile, signOut } = useAuth(); const location = useLocation(); const navigate = useNavigate(); const [menuOpen, setMenuOpen] = useState(false); const [pending, setPending] = useState(false); const [error, setError] = useState<string>();
 const items = [...(profile?.role === 'executor' ? [{ key: '/my-tasks', label: <Link to={listPath('/my-tasks')}>Мои задачи</Link> }] : []), { key: '/objects', label: <Link to={listPath('/objects')}>Объекты</Link> }];
 const navigation = <><Typography.Title level={3} className="brand">2CRM</Typography.Title><Menu mode="inline" selectedKeys={[location.pathname.startsWith('/my-tasks') || (profile?.role === 'executor' && location.pathname.startsWith('/tasks/')) ? '/my-tasks' : '/objects']} items={items} onClick={() => setMenuOpen(false)} /><div className="account"><Typography.Text strong>{profile?.display_name}</Typography.Text><Typography.Text type="secondary">{profile?.role === 'manager' ? 'Постановщик' : 'Исполнитель'}</Typography.Text><Button loading={pending} onClick={async () => { setPending(true); try { await signOut(); navigate('/login', { replace: true }); } catch (failure) { setError(errorText(failure)); } finally { setPending(false); } }}>Выйти</Button></div></>;
 return <Layout className="app-layout"><Layout.Sider theme="light" width={232} breakpoint="lg" collapsedWidth={0} trigger={null} className="sidebar">{navigation}</Layout.Sider><Layout className="workspace"><header className="mobile-header"><Button onClick={() => setMenuOpen(true)}>Меню</Button><Typography.Text strong>2CRM</Typography.Text></header><Drawer title="Навигация" placement="left" open={menuOpen} onClose={() => setMenuOpen(false)}>{navigation}</Drawer><Layout.Content className="content">{error && <Alert className="notice" type="error" title={error} />}<Outlet /></Layout.Content></Layout></Layout>;
}
const router = createBrowserRouter([{ element: <Root />, children: [{ path: '/login', element: <LoginPage /> }, { path: '/', element: <AuthGate><Shell /></AuthGate>, children: [{ index: true, element: <Home /> }, { path: 'objects', element: <ObjectsPage /> }, { path: 'objects/:id', element: <ObjectPage /> }, { path: 'tasks/:id', element: <TaskPage /> }, { path: 'my-tasks', element: <MyTasksPage /> }, { path: '*', element: <Missing back="/" /> }] }] }]);
export default function App() { return <RouterProvider router={router} />; }
