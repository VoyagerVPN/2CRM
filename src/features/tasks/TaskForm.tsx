import { Alert, App, Button, Form, Input, Modal, Select } from 'antd';
import { errorText, getProfiles, supabase, unwrap, type Task } from '../../shared/api/client';
import { LoadState, requiredText, SaveDialog, useResource } from '../../shared/ui/common';
import { objectOptions } from '../objects/api';
async function loadOptions() { const [objects, profiles] = await Promise.all([objectOptions(), getProfiles()]); return { objects, profiles }; }
export function TaskForm({ task, objectId, onClose, onRefresh }: { task?: Task; objectId?: string; onClose: () => void; onRefresh: () => void }) {
 const resource = useResource(loadOptions); const { message } = App.useApp();
 if (!resource.data) return <Modal open title={task ? 'Редактировать задачу' : 'Создать задачу'} onCancel={onClose} footer={<Button onClick={onClose}>Отмена</Button>}><LoadState error={resource.error} retry={resource.reload} /></Modal>;
 return <SaveDialog title={task ? 'Редактировать задачу' : 'Создать задачу'} initialVersion={task?.version} loadLatest={task ? async () => { const latest = unwrap(await supabase.from('tasks').select('*').eq('id', task.id).maybeSingle()); if (!latest) return null; await resource.reload(); return { version: latest.version, values: { title: latest.title, description: latest.description, object_id: latest.object_id, assignee_id: latest.assignee_id } }; } : undefined} conflictFields={[{ name: 'title', label: 'Название' }, { name: 'description', label: 'Описание' }, { name: 'object_id', label: 'Объект', format: value => resource.data?.objects.find(o => o.id === value)?.name ?? 'Объект недоступен' }, { name: 'assignee_id', label: 'Исполнитель', format: value => resource.data?.profiles.find(p => p.id === value)?.display_name ?? 'Пользователь' }]} initialValues={{ title: task?.title ?? '', description: task?.description ?? '', object_id: task?.object_id ?? objectId, assignee_id: task?.assignee_id }} onCancel={onClose} onFailure={onRefresh} onSaved={() => { void message.success(task ? 'Задача сохранена' : 'Задача создана'); onClose(); onRefresh(); }} save={async (values, version) => {
  unwrap(await supabase.rpc('save_task', { p_title: values.title, p_description: values.description, p_object_id: values.object_id!, p_assignee_id: values.assignee_id!, p_id: task?.id, p_expected_version: version }));
 }}>
 {!!resource.error && <Alert className="notice" type="error" title={errorText(resource.error)} action={<Button onClick={resource.reload}>Повторить</Button>} />}
 <Form.Item label="Название" name="title" rules={[requiredText]}><Input /></Form.Item>
 <Form.Item label="Описание" name="description"><Input.TextArea autoSize={{ minRows: 3, maxRows: 10 }} /></Form.Item>
 <Form.Item label="Объект" name="object_id" rules={[{ required: true, message: 'Выберите объект' }]}><Select options={resource.data.objects.map(o => ({ value: o.id, label: o.name }))} /></Form.Item>
 <Form.Item label="Исполнитель" name="assignee_id" rules={[{ required: true, message: 'Выберите исполнителя' }]}><Select options={resource.data.profiles.filter(p => p.role === 'executor').map(p => ({ value: p.id, label: p.display_name }))} /></Form.Item>
 </SaveDialog>;
}
