import { useCallback, useEffect, useState } from 'react';
import { Alert, Breadcrumb, Button, Card, Space, Table, Typography } from 'antd';
import { Link, useNavigate, useParams } from 'react-router';
import { errorText, getProfiles, supabase, unwrap, type CrmObject } from '../../shared/api/client';
import { EntityActions, listPath, LoadState, Missing, NoRows, Status, useListPage, useResource } from '../../shared/ui/common';
import { useAuth } from '../auth/Auth';
import { TaskForm } from '../tasks/TaskForm';
import { ObjectForm } from './ObjectForm';
export function ObjectsPage() {
 const { profile } = useAuth(); const { page, setPage } = useListPage('/objects'); const [editing, setEditing] = useState<CrmObject | 'new' | null>(null);
 const load = useCallback(async () => { const result = await supabase.from('objects').select('*', { count: 'exact' }).order('created_at', { ascending: false }).order('id').range((page - 1) * 20, page * 20 - 1); return { rows: unwrap(result), count: result.count ?? 0 }; }, [page]);
 const resource = useResource(load);
 useEffect(() => { if (resource.data && page > Math.max(1, Math.ceil(resource.data.count / 20))) setPage(Math.max(1, Math.ceil(resource.data.count / 20))); }, [resource.data?.count, page]);
 if (!resource.data) return <LoadState error={resource.error} retry={resource.reload} />;
 const manager = profile?.role === 'manager';
 return <>{resource.error && <Alert className="notice" type="error" title={errorText(resource.error)} action={<Button onClick={resource.reload}>Повторить</Button>} />}<div className="page-heading"><Typography.Title level={2}>Объекты</Typography.Title>{manager && <Button type="primary" onClick={() => setEditing('new')}>Создать объект</Button>}</div>
 <Card><Table<CrmObject> rowKey="id" loading={resource.pending} dataSource={resource.data.rows} scroll={{ x: 620 }} locale={{ emptyText: <NoRows text={manager ? 'Объектов пока нет' : 'Доступных объектов пока нет'} /> }} pagination={{ current: page, total: resource.data.count, pageSize: 20, showSizeChanger: false, onChange: setPage }} columns={[
 { title: 'Название', dataIndex: 'name', render: (name, row) => <Link to={listPath('/objects/' + row.id)}>{name}</Link> },
 { title: 'Адрес', dataIndex: 'address' },
 ...(manager ? [{ title: 'Действия', key: 'actions', width: 130, render: (_: unknown, row: CrmObject) => <EntityActions kind="object" id={row.id} version={row.version} name={row.name} onEdit={() => setEditing(row)} onDeleted={resource.reload} onRefresh={resource.reload} /> }] : []),
 ]} /></Card>
 {editing && <ObjectForm object={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} onRefresh={resource.reload} />}</>;
}
export function ObjectPage() {
 const { id = '' } = useParams(); const { profile } = useAuth(); const navigate = useNavigate(); const { page, setPage } = useListPage('/objects/' + id);
 const [editing, setEditing] = useState<CrmObject | null>(null); const [creatingTask, setCreatingTask] = useState(false);
 const load = useCallback(async () => {
  if (!/^[a-f0-9-]{36}$/i.test(id)) return null;
  const object = unwrap(await supabase.from('objects').select('*').eq('id', id).maybeSingle()); if (!object) return null;
  const [result, profiles] = await Promise.all([supabase.from('tasks').select('*', { count: 'exact' }).eq('object_id', id).order('created_at', { ascending: false }).order('id').range((page - 1) * 20, page * 20 - 1), getProfiles()]);
  return { object, tasks: unwrap(result), count: result.count ?? 0, profiles };
 }, [id, page]);
 const resource = useResource(load); const manager = profile?.role === 'manager';
 useEffect(() => { if (resource.data && page > Math.max(1, Math.ceil(resource.data.count / 20))) setPage(Math.max(1, Math.ceil(resource.data.count / 20))); }, [resource.data?.count, page]);
 if (resource.data === undefined) return <LoadState error={resource.error} retry={resource.reload} />;
 if (!resource.data) return <Missing back={listPath('/objects')} />;
 const { object, profiles } = resource.data;
 return <>{resource.error && <Alert className="notice" type="error" title={errorText(resource.error)} action={<Button onClick={resource.reload}>Повторить</Button>} />}<Breadcrumb items={[{ title: <Link to={listPath('/objects')}>Объекты</Link> }, { title: object.name }]} /><div className="page-heading"><Typography.Title level={2}>{object.name}</Typography.Title>{manager && <EntityActions kind="object" id={object.id} version={object.version} name={object.name} onEdit={() => setEditing(object)} onDeleted={() => navigate(listPath('/objects'))} onRefresh={resource.reload} />}</div>
 <Typography.Paragraph>{object.address}</Typography.Paragraph><p><Link to={listPath('/objects')}>Вернуться к списку объектов</Link></p>
 <Card title="Задачи" extra={manager && <Button type="primary" onClick={() => setCreatingTask(true)}>Создать задачу</Button>}><Table rowKey="id" loading={resource.pending} dataSource={resource.data.tasks} scroll={{ x: 560 }} locale={{ emptyText: <NoRows text={manager ? 'Задач пока нет' : 'Назначенных задач пока нет'} /> }} pagination={{ current: page, total: resource.data.count, pageSize: 20, showSizeChanger: false, onChange: setPage }} columns={[
 { title: 'Название', dataIndex: 'title', render: (title, row) => <Link to={'/tasks/' + row.id}>{title}</Link> },
 { title: 'Исполнитель', dataIndex: 'assignee_id', render: value => profiles.find(p => p.id === value)?.display_name ?? 'Пользователь' },
 { title: 'Статус', dataIndex: 'status', render: value => <Status value={value} /> },
 ]} /></Card>
 {editing && <ObjectForm object={editing} onClose={() => setEditing(null)} onRefresh={resource.reload} />}
 {creatingTask && <TaskForm objectId={id} onClose={() => setCreatingTask(false)} onRefresh={resource.reload} />}</>;
}
