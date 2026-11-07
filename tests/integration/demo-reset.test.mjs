import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { admin, accounts, login, ok, url, publicKey, clientOptions } from '../../scripts/admin.mjs';

test('demo reset restores the original set, preserves old history and stays restricted to configured demo managers', async () => {
 const users = Object.fromEntries((await accounts()).map(a => [a.name, a]));
 const manager = await login(users.manager);
 const executor = await login(users.executor1);
 assert.equal((await executor.rpc('reset_demo_data')).error?.code, 'PT403');
 const anon = createClient(url, publicKey, clientOptions);
 assert.equal((await anon.rpc('reset_demo_data')).error?.code, '42501');
 const oldTasks = ok(await manager.from('tasks').select('id').is('deleted_at', null));
 const oldHistory = ok(await manager.from('task_status_history').select('*').in('task_id', oldTasks.map(t => t.id)).order('id'));
 const fixture = ok(await manager.rpc('save_object', { p_name: 'Изменения перед сбросом', p_address: 'Временные демо-данные' }));
 const first = ok(await manager.rpc('reset_demo_data'));
 assert.equal(first.objects, 3); assert.equal(first.tasks, 6);
 assert.deepEqual(ok(await manager.from('objects').select('id').eq('id', fixture.id).is('deleted_at', null)), []);
 assert.deepEqual(ok(await manager.from('task_status_history').select('*').in('task_id', oldTasks.map(t => t.id)).order('id')), oldHistory);
 const baseline = JSON.parse(await readFile(new URL('../../.cache/private/demo.json', import.meta.url), 'utf8'));
 const check = async () => {
  const objects = ok(await manager.from('objects').select('*').is('deleted_at', null));
  const tasks = ok(await manager.from('tasks').select('*').is('deleted_at', null));
  assert.deepEqual(objects.map(o=>[o.name,o.address]).sort(), baseline.objects.map(o=>[o.name,o.address]).sort());
  const titles = rows => rows.map(t=>[t.title,t.description,t.assignee_id,t.status,t.author_id]).sort();
  assert.deepEqual(titles(tasks), titles(baseline.tasks));
  assert.ok(tasks.every(t=>objects.some(o=>o.id===t.object_id)));
  assert.ok(tasks.every(t=>!oldTasks.some(old=>old.id===t.id)));
  const history = ok(await manager.from('task_status_history').select('*').in('task_id', tasks.map(t=>t.id)).order('id'));
  assert.equal(history.length, 15);
  for(const task of tasks) { const events=history.filter(h=>h.task_id===task.id); assert.equal(events[0].from_status, null); assert.equal(events.at(-1).to_status, task.status); }
  assert.equal(ok(await executor.from('tasks').select('id').is('deleted_at', null)).length, 3);
  return {tasks,history};
 };
 const restored = await check();
 const secondManager = await login(users.manager2);
 const second = ok(await secondManager.rpc('reset_demo_data'));
 assert.equal(second.generation, first.generation + 1);
 await check();
 assert.deepEqual(ok(await manager.from('task_status_history').select('*').in('task_id', restored.tasks.map(t=>t.id)).order('id')), restored.history);
 assert.equal((await manager.from('task_status_history').delete().eq('id', restored.history[0].id)).error?.code, '42501');
});

test('a manager outside the configured demo allowlist cannot reset data', async () => {
 const password = crypto.randomUUID() + 'aA1!';
 const created = ok(await admin.auth.admin.createUser({ email: 'reset-check-' + Date.now() + '@2crm.example.com', password, email_confirm: true }));
 try {
  ok(await admin.from('profiles').insert({ id: created.user.id, display_name: 'Проверка запрета сброса', role: 'manager' }));
  const session = await login({ email: created.user.email, password });
  assert.equal((await session.rpc('reset_demo_data')).error?.code, 'PT403');
 } finally {
  ok(await admin.from('profiles').delete().eq('id', created.user.id));
  ok(await admin.auth.admin.deleteUser(created.user.id));
 }
});
