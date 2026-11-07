import { App, Form, Input } from 'antd';
import { supabase, unwrap, type CrmObject } from '../../shared/api/client';
import { requiredText, SaveDialog } from '../../shared/ui/common';
export function ObjectForm({ object, onClose, onRefresh }: { object?: CrmObject; onClose: () => void; onRefresh: () => void }) {
 const { message } = App.useApp();
 return <SaveDialog title={object ? 'Редактировать объект' : 'Создать объект'} initialVersion={object?.version}
 initialValues={{ name: object?.name ?? '', address: object?.address ?? '' }}
 loadLatest={object ? async () => { const latest = unwrap(await supabase.from('objects').select('*').eq('id', object.id).maybeSingle()); return latest ? { version: latest.version, values: { name: latest.name, address: latest.address } } : null; } : undefined}
 conflictFields={[{ name: 'name', label: 'Название' }, { name: 'address', label: 'Адрес' }]}
 onCancel={onClose} onFailure={onRefresh} onSaved={() => { void message.success(object ? 'Объект сохранён' : 'Объект создан'); onClose(); onRefresh(); }} save={async (values, version) => {
  unwrap(await supabase.rpc('save_object', { p_name: values.name, p_address: values.address, p_id: object?.id, p_expected_version: version }));
 }}><Form.Item label="Название" name="name" rules={[requiredText]}><Input /></Form.Item><Form.Item label="Адрес" name="address" rules={[requiredText]}><Input /></Form.Item></SaveDialog>;
}
