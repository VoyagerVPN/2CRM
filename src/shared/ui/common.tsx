import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Alert, App, Button, Dropdown, Empty, Form, Modal, Result, Spin, Tag } from 'antd';
import { Link, useBlocker, useSearchParams } from 'react-router';
import { assertCurrent, errorText, supabase, unwrap } from '../api/client';
export const statusLabels: Record<string, string> = { new: 'Новая', in_progress: 'В работе', in_review: 'На проверке', rework: 'На доработке', accepted: 'Принята' };
export function Status({ value }: { value: string }) { return <Tag className="status-tag" data-status={value}>{statusLabels[value] ?? value}</Tag>; }
export const dateText = (value: string) => new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
export function useResource<T>(loader: () => Promise<T>) {
 const [data, setData] = useState<T>(); const [error, setError] = useState<unknown>(null); const [pending, setPending] = useState(true); const generation = useRef(0);
 const reload = useCallback(async () => {
  const current = ++generation.current; setPending(true); setError(null);
  try { const value = await loader(); if (current === generation.current) setData(value); }
  catch (failure) { if (current === generation.current) setError(failure); }
  finally { if (current === generation.current) setPending(false); }
 }, [loader]);
 useEffect(() => { void reload(); const focus = () => void reload(); window.addEventListener('focus', focus); return () => { ++generation.current; window.removeEventListener('focus', focus); }; }, [reload]);
 return { data, error, pending, reload };
}
export function LoadState({ error, retry }: { error: unknown; retry: () => void }) { return error ? <Alert type="error" title={errorText(error)} action={<Button onClick={retry}>Повторить</Button>} /> : <div className="loading"><Spin aria-label="Загрузка данных" /></div>; }
export function Missing({ back }: { back: string }) { return <Result status="404" title="Запись не найдена или недоступна" extra={<Link to={back}>Вернуться к списку</Link>} />; }
export function NoRows({ text }: { text: string }) { return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={text} />; }
export function listPath(path: string) { return path + '?page=' + (sessionStorage.getItem('2crm-page:' + path) ?? '1'); }
export function useListPage(path: string) {
 const [search, setSearch] = useSearchParams(); const raw = Number(search.get('page') ?? 1); const page = Number.isSafeInteger(raw) && raw > 0 ? raw : 1;
 useEffect(() => { sessionStorage.setItem('2crm-page:' + path, String(page)); }, [path, page]);
 return { page, setPage: (value: number) => setSearch({ page: String(value) }) };
}
export const requiredText = { required: true, whitespace: true, message: 'Заполните поле' };
export function SaveDialog<T extends object>({ title, initialValues, children, save, onSaved, onCancel, onFailure, okText = 'Сохранить' }: { okText?: string; title: string; initialValues: T; children: ReactNode; save: (values: T) => Promise<void>; onSaved: () => void; onCancel: () => void; onFailure?: () => void }) {
 const [form] = Form.useForm<T>(); const [dirty, setDirty] = useState(false); const [pending, setPending] = useState(false); const busy = useRef(false); const [error, setError] = useState<string>(); const { modal } = App.useApp();
 const blocker = useBlocker(dirty); const prompting = useRef(false);
 const confirmDiscard = () => modal.confirm({ title: 'Отменить изменения?', content: 'Введённые данные не будут сохранены', okText: 'Отменить изменения', cancelText: 'Продолжить редактирование' });
 useEffect(() => {
  const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
 }, [dirty]);
 useEffect(() => {
  if (blocker.state !== 'blocked' || prompting.current) return;
  if (busy.current) { blocker.reset(); return; }
  prompting.current = true; void confirmDiscard().then(confirmed => { prompting.current = false; if (confirmed) blocker.proceed(); else blocker.reset(); }, () => { prompting.current = false; blocker.reset(); });
 }, [blocker.state]);
 const cancel = async () => { if (busy.current) return; if (!dirty || await confirmDiscard()) onCancel(); };
 return <Modal open title={title} okText={okText} cancelText="Отмена" confirmLoading={pending} cancelButtonProps={{ disabled: pending }} closable={!pending} keyboard={!pending} onCancel={() => void cancel()} onOk={() => form.submit()}>
 {error && <Alert className="notice" type="error" title={error} />}
 <Form<T> form={form} layout="vertical" initialValues={initialValues} disabled={pending} onValuesChange={() => setDirty(true)} onFinish={async values => {
  if (busy.current) return; busy.current = true; setPending(true); setError(undefined);
  try { await save(values); setDirty(false); onSaved(); }
  catch (failure) { setError(errorText(failure)); onFailure?.(); }
  finally { busy.current = false; setPending(false); }
 }}>{children}</Form></Modal>;
}

export function EntityActions({ kind, id, version, name, onEdit, onDeleted, onRefresh, disabled = false }: { disabled?: boolean; kind: 'object' | 'task'; id: string; version: number; name: string; onEdit: () => void; onDeleted: () => void; onRefresh: () => void }) {
 const [count, setCount] = useState<number | null>(null); const [pending, setPending] = useState(false); const busy = useRef(false); const [error, setError] = useState<string>(); const { message } = App.useApp();
 const prepare = async () => {
  if (busy.current) return; busy.current = true; setPending(true); setError(undefined);
  try { await assertCurrent(kind === 'object' ? 'objects' : 'tasks', id, version); let total = 0;
   if (kind === 'object') { const result = await supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('object_id', id); if (result.error) throw result.error; total = result.count ?? 0; }
   setCount(total);
  } catch (failure) { void message.error(errorText(failure)); onRefresh(); } finally { busy.current = false; setPending(false); }
 };
 return <><Dropdown menu={{ items: [{ key: 'edit', label: 'Редактировать' }, { key: 'delete', label: 'Удалить', danger: true }], onClick: ({ key }) => { if (key === 'edit') onEdit(); else void prepare(); } }} trigger={['click']} disabled={pending || disabled}><Button disabled={disabled} loading={pending} aria-label={'Действия: ' + name}>Действия</Button></Dropdown>
 <Modal open={count !== null} title={kind === 'object' ? 'Удалить объект?' : 'Удалить задачу?'} okText="Удалить" cancelText="Отмена" okButtonProps={{ danger: true }} confirmLoading={pending} cancelButtonProps={{ disabled: pending }} closable={!pending} keyboard={!pending} onCancel={() => { if (!busy.current) setCount(null); }} onOk={async () => {
  if (busy.current) return; busy.current = true; setPending(true); setError(undefined);
  try { await assertCurrent(kind === 'object' ? 'objects' : 'tasks', id, version);
   if (kind === 'object') unwrap(await supabase.rpc('delete_object', { p_id: id, p_expected_version: version, p_expected_task_count: count ?? 0 }));
   else unwrap(await supabase.rpc('delete_task', { p_id: id, p_expected_version: version }));
   setCount(null); void message.success(kind === 'object' ? 'Объект удалён' : 'Задача удалена'); onDeleted();
  } catch (failure) { setError(errorText(failure)); onRefresh(); } finally { busy.current = false; setPending(false); }
 }}>
 {error && <Alert className="notice" type="error" title={error} />}
 {kind === 'object' ? <><p>Удалить объект «{name}» и его задачи? Они исчезнут из рабочих списков. История задач сохранится.</p><p>Активных задач: {count}</p></> : <p>Удалить задачу «{name}»? Она исчезнет из рабочих списков. История сохранится.</p>}
 </Modal></>;
}
