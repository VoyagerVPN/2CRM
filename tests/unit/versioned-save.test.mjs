import { test } from 'node:test';
import assert from 'node:assert/strict';
import { saveWithConflict } from '../../src/shared/ui/versioned-save.ts';

test('после конфликта черновик сохраняется, явное повторное сохранение использует показанную версию', async () => {
 const draft = { name: 'Мой объект', address: 'Мой адрес' };
 let server = { version: 2, values: { name: 'Изменено коллегой', address: 'Новый адрес' } };
 const save = async (values, version) => {
  if (version !== server.version) throw { code: 'PT409' };
  server = { version: version + 1, values: { ...values } };
 };
 const conflict = await saveWithConflict({ values: draft, version: 1, save, loadLatest: async () => server });
 assert.equal(conflict.kind, 'conflict');
 assert.deepEqual(conflict.latest, { version: 2, values: { name: 'Изменено коллегой', address: 'Новый адрес' } });
 assert.deepEqual(draft, { name: 'Мой объект', address: 'Мой адрес' });
 assert.deepEqual(server.values, { name: 'Изменено коллегой', address: 'Новый адрес' });
 const saved = await saveWithConflict({ values: draft, version: conflict.latest.version, save, loadLatest: async () => server });
 assert.equal(saved.kind, 'saved');
 assert.deepEqual(server, { version: 3, values: draft });
});

test('новое изменение после показа конфликта требует повторного выбора; пропавшая запись не перезаписывается', async () => {
 const draft = { title: 'Черновик' };
 const conflict = await saveWithConflict({ values: draft, version: 2, save: async () => { throw { code: 'PT409' }; }, loadLatest: async () => ({ version: 3, values: { title: 'Ещё одна правка' } }) });
 assert.equal(conflict.kind, 'conflict');
 assert.equal(conflict.latest.version, 3);
 await assert.rejects(saveWithConflict({ values: draft, version: 3, save: async () => { throw { code: 'PT409' }; }, loadLatest: async () => null }), error => error.code === 'PT404');
 await assert.rejects(saveWithConflict({ values: draft, version: 3, save: async () => { throw { code: 'PT403' }; }, loadLatest: async () => ({ version: 4, values: draft }) }), error => error.code === 'PT403');
});
