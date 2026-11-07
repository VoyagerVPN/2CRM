import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, App, Breadcrumb, Button, Card, Form, Input, Table, Typography } from 'antd';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { assertCurrent, getProfiles, supabase, unwrap, errorText, type History, type Task } from '../../shared/api/client';
import { EntityActions, listPath, LoadState, Missing, NoRows, requiredText, SaveDialog, Status, useListPage, useResource } from '../../shared/ui/common';
import { useAuth } from '../auth/Auth';
import { TaskForm } from './TaskForm';
import { TaskWorkspace } from './TaskWorkspace';
export function MyTasksPage() {
 const { profile } = useAuth(); const { page, setPage } = useListPage('/my-tasks');
 const load = useCallback(async () => { const result = await supabase.from('tasks').select('*,object:objects(id,name)', { count: 'exact' }).eq('assignee_id', profile!.id).order('created_at', { ascending: false }).order('id').range((page - 1) * 20, page * 20 - 1); return { rows: unwrap(result), count: result.count ?? 0 }; }, [page, profile?.id]);
 const resource = useResource(load);
 useEffect(() => { if (resource.data && page > Math.max(1, Math.ceil(resource.data.count / 20))) setPage(Math.max(1, Math.ceil(resource.data.count / 20))); }, [resource.data?.count, page]);
 if (profile?.role !== 'executor') return <Navigate to="/objects" replace />;
 if (!resource.data) return <LoadState error={resource.error} retry={resource.reload} />;
 return <>{resource.error && <Alert className="notice" type="error" title={errorText(resource.error)} action={<Button onClick={resource.reload}>Повторить</Button>} />}<Typography.Title level={2}>Мои задачи</Typography.Title><Card><Table rowKey="id" dataSource={resource.data.rows} loading={resource.pending} scroll={{ x: 560 }} locale={{ emptyText: <NoRows text="Назначенных задач пока нет" /> }} pagination={{ current: page, total: resource.data.count, pageSize: 20, showSizeChanger: false, onChange: setPage }} columns={[
 { title: 'Название', dataIndex: 'title', render: (title, row) => <Link to={'/tasks/' + row.id}>{title}</Link> },
 { title: 'Объект', key: 'object', render: (_, row) => row.object && <Link to={listPath('/objects/' + row.object.id)}>{row.object.name}</Link> },
 { title: 'Статус', dataIndex: 'status', render: value => <Status value={value} /> },
 ]} /></Card></>;
}
async function taskHistory(id: string) {
 const rows: History[] = [];
 for (let start = 0; ; start += 500) { const batch = unwrap(await supabase.from('task_status_history').select('*').eq('task_id', id).order('happened_at').order('id').range(start, start + 499)); rows.push(...batch); if (batch.length < 500) return rows; }
}
export function TaskPage() {
 const { id = '' } = useParams(); const { profile } = useAuth(); const navigate = useNavigate(); const { message } = App.useApp();
 const [editing, setEditing] = useState<Task | null>(null); const [rework, setRework] = useState<Task | null>(null); const [pending, setPending] = useState(false); const busy = useRef(false); const [error, setError] = useState<string>();
 const load = useCallback(async () => {
  if (!/^[a-f0-9-]{36}$/i.test(id)) return null;
  const task = unwrap(await supabase.from('tasks').select('*').eq('id', id).maybeSingle()); if (!task) return null;
  const [object, profiles, history] = await Promise.all([supabase.from('objects').select('*').eq('id', task.object_id).maybeSingle().then(unwrap), getProfiles(), taskHistory(id)]);
  return { task, object, profiles, history };
 }, [id]);
 const resource = useResource(load); const back = profile?.role === 'executor' ? listPath('/my-tasks') : listPath('/objects');
 const change = async (snapshot: Task, status: string, comment?: string) => {
  if (busy.current) return; busy.current = true; setPending(true); setError(undefined);
  try { await assertCurrent('tasks', snapshot.id, snapshot.version); unwrap(await supabase.rpc('change_task_status', { p_task_id: snapshot.id, p_expected_version: snapshot.version, p_status: status, p_comment: comment })); await resource.reload(); void message.success('Статус изменён'); }
  catch (failure) { setError(errorText(failure)); await resource.reload(); throw failure; }
  finally { busy.current = false; setPending(false); }
 };
 const runChange = async (task: Task, status: string) => { try { await change(task, status); } catch { /* Сообщение уже показано рядом с действиями. */ } };
 if (resource.data === undefined) return <LoadState error={resource.error} retry={resource.reload} />;
 if (!resource.data) return <Missing back={back} />;
 const { task, object, profiles, history } = resource.data;
 const manager = profile?.role === 'manager';
 const assigned = profile?.role === 'executor' && task.assignee_id === profile.id;
 const canStart = assigned && (task.status === 'new' || task.status === 'rework');
 const canSend = assigned && task.status === 'in_progress';
 const canReview = manager && task.status === 'in_review';
 const actions = <>
  {canStart && <Button type="primary" loading={pending} onClick={() => void runChange(task, 'in_progress')}>Взять в работу</Button>}
  {canSend && <Button type="primary" loading={pending} onClick={() => void runChange(task, 'in_review')}>Отправить на проверку</Button>}
  {canReview && <><Button type="primary" loading={pending} onClick={() => void runChange(task, 'accepted')}>Принять</Button><Button disabled={pending} onClick={() => setRework(task)}>Вернуть на доработку</Button></>}
 </>;
 const management = manager ? <EntityActions kind="task" id={task.id} version={task.version} name={task.title} disabled={pending} onEdit={() => setEditing(task)} onDeleted={() => navigate(object ? listPath('/objects/' + object.id) : back)} onRefresh={resource.reload} /> : undefined;
 return <>{resource.error && <Alert className="notice" type="error" title={errorText(resource.error)} action={<Button onClick={resource.reload}>Повторить</Button>} />}
  <Breadcrumb items={[{ title: <Link to={listPath('/objects')}>Объекты</Link> }, { title: object ? <Link to={listPath('/objects/' + object.id)}>{object.name}</Link> : 'Объект' }, { title: 'Задача' }]} />
  <Link className="task-back" to={back}>{profile?.role === 'executor' ? 'Вернуться к моим задачам' : 'Вернуться к списку объектов'}</Link>
  {error && <Alert className="notice" type="error" title={error} />}
  <TaskWorkspace task={task} object={object} profiles={profiles} history={history} actions={actions} hasActions={canStart || canSend || canReview} management={management} role={profile?.role ?? ''} />
  {editing && <TaskForm task={editing} onClose={() => setEditing(null)} onRefresh={resource.reload} />}
  {rework && <SaveDialog title="Вернуть на доработку" okText="Вернуть на доработку" initialValues={{ comment: '' }} onCancel={() => setRework(null)} onSaved={() => setRework(null)} save={async values => { await change(rework, 'rework', values.comment); }}><Form.Item label="Что нужно исправить" name="comment" rules={[requiredText]}><Input.TextArea autoSize={{ minRows: 3, maxRows: 8 }} /></Form.Item></SaveDialog>}
 </>;
}
