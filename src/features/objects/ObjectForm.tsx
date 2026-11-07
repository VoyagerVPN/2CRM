import { App, Form, Input } from 'antd';
import { assertCurrent, supabase, unwrap, type CrmObject } from '../../shared/api/client';
import { requiredText, SaveDialog } from '../../shared/ui/common';
export function ObjectForm({ object, onClose, onRefresh }: { object?: CrmObject; onClose: () => void; onRefresh: () => void }) {
 const { message } = App.useApp();
 return <SaveDialog title={object ? 'Редактировать объект' : 'Создать объект'} initialValues={{ name: object?.name ?? '', address: object?.address ?? '' }} onCancel={onClose} onFailure={onRefresh} onSaved={() => { void message.success(object ? 'Объект сохранён' : 'Объект создан'); onClose(); onRefresh(); }} save={async values => {
  if (object) await assertCurrent('objects', object.id, object.version);
  unwrap(await supabase.rpc('save_object', { p_name: values.name, p_address: values.address, p_id: object?.id, p_expected_version: object?.version }));
 }}><Form.Item label="Название" name="name" rules={[requiredText]}><Input /></Form.Item><Form.Item label="Адрес" name="address" rules={[requiredText]}><Input /></Form.Item></SaveDialog>;
}
