import { test, before, after } from 'node:test';
import { createClient } from '@supabase/supabase-js';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { admin, accounts, login, ok, url, publicKey, clientOptions } from '../../scripts/admin.mjs';
let users, clients, object, ownTask, otherTask;
const run = randomUUID();
before(async () => {
 users = Object.fromEntries((await accounts()).map(a => [a.name, a]));
 clients = Object.fromEntries(await Promise.all(Object.entries(users).map(async ([name, account]) => [name, await login(account)])));
 object = ok(await admin.from('objects').insert({ name: 'API test ' + run, address: 'Тестовый адрес', author_id: users.manager.id }).select().single());
 [ownTask, otherTask] = ok(await admin.from('tasks').insert([
  { object_id: object.id, title: 'Своя задача', assignee_id: users.executor1.id, author_id: users.manager.id },
  { object_id: object.id, title: 'Чужая задача', assignee_id: users.executor2.id, author_id: users.manager.id },
 ]).select());
});
after(async () => {
 if (object) {
  const ids = ok(await admin.from('tasks').select('id').eq('object_id', object.id)).map(t => t.id);
  if (ids.length) { ok(await admin.from('task_status_history').delete().in('task_id', ids)); ok(await admin.from('tasks').delete().in('id', ids)); }
  ok(await admin.from('objects').delete().eq('id', object.id));
 }
});

test('исполнитель читает свою задачу, но не чужую даже внутри общего объекта', async () => {
 const tasks = ok(await clients.executor1.from('tasks').select('*').eq('object_id', object.id));
 assert.deepEqual(tasks.map(t => t.id), [ownTask.id]);
 const hidden = ok(await clients.executor1.from('tasks').select('*').eq('id', otherTask.id));
 assert.deepEqual(hidden, []);
 const nested = ok(await clients.executor1.from('objects').select('id,tasks(id)').eq('id', object.id).single());
 assert.deepEqual(nested.tasks.map(t => t.id), [ownTask.id]);
 const visible = ok(await clients.manager2.from('tasks').select('id').eq('object_id', object.id));
 assert.equal(visible.length, 2);
});

test('постановщики создают и редактируют объект; исполнитель и устаревшая форма не могут его изменить', async () => {
 let created;
 try {
  created = ok(await clients.manager.rpc('save_object', { p_name: 'Новый объект', p_address: 'Адрес' }));
  assert.equal(created.author_id, users.manager.id); assert.equal(created.version, 1);
  const changed = ok(await clients.manager2.rpc('save_object', { p_id: created.id, p_expected_version: 1, p_name: 'Исправлено', p_address: 'Другой адрес' }));
  assert.equal(changed.name, 'Исправлено'); assert.equal(changed.version, 2);
  assert.equal((await clients.manager.rpc('save_object', { p_id: created.id, p_expected_version: 1, p_name: 'Устарело', p_address: 'Адрес' })).error?.code, 'PT409');
  assert.equal((await clients.executor1.rpc('save_object', { p_name: 'Нет прав', p_address: 'Адрес' })).error?.code, 'PT403');
  assert.equal((await clients.manager.rpc('save_object', { p_name: '  ', p_address: 'Адрес' })).error?.code, 'PT422');
  assert.equal((await clients.manager.from('objects').insert({ name: 'Обход', address: 'Адрес', author_id: users.manager.id })).error?.code, '42501');
 } finally { if (created) ok(await admin.from('objects').delete().eq('id', created.id)); }
});

test('создание задачи фиксирует автора и историю, редактирование сохраняет статус и не создаёт переход', async () => {
 const task = ok(await clients.manager.rpc('save_task', { p_title: 'Новая задача', p_description: '', p_object_id: object.id, p_assignee_id: users.executor1.id }));
 assert.equal(task.status, 'new'); assert.equal(task.author_id, users.manager.id);
 let history = ok(await clients.executor1.from('task_status_history').select('*').eq('task_id', task.id));
 assert.equal(history.length, 1); assert.equal(history[0].from_status, null); assert.equal(history[0].to_status, 'new'); assert.equal(history[0].actor_id, users.manager.id);
 const changed = ok(await clients.manager2.rpc('save_task', { p_id: task.id, p_expected_version: 1, p_title: 'Исправленная задача', p_description: 'Текст', p_object_id: object.id, p_assignee_id: users.executor2.id }));
 assert.equal(changed.status, 'new'); assert.equal(changed.author_id, users.manager.id); assert.equal(changed.version, 2);
 assert.deepEqual(ok(await clients.executor1.from('tasks').select('id').eq('id', task.id)), []);
 history = ok(await clients.executor2.from('task_status_history').select('*').eq('task_id', task.id)); assert.equal(history.length, 1);
 assert.equal((await clients.manager.rpc('save_task', { p_title: 'X', p_description: '', p_object_id: object.id, p_assignee_id: users.manager.id })).error?.code, 'PT422');
 assert.equal((await clients.executor1.rpc('save_task', { p_title: 'X', p_description: '', p_object_id: object.id, p_assignee_id: users.executor1.id })).error?.code, 'PT403');
 assert.equal((await clients.manager.from('tasks').update({ status: 'accepted', author_id: users.executor1.id }).eq('id', task.id)).error?.code, '42501');
});

test('база проводит полный цикл статусов, требует комментарий и сохраняет статус при переназначении', async () => {
 let task = ok(await clients.manager.rpc('save_task', { p_title: 'Цикл', p_description: '', p_object_id: object.id, p_assignee_id: users.executor1.id }));
 const change = async (client, status, comment) => client.rpc('change_task_status', { p_task_id: task.id, p_expected_version: task.version, p_status: status, p_comment: comment ?? null });
 assert.equal((await change(clients.manager, 'in_progress')).error?.code, 'PT403');
 assert.equal((await change(clients.executor2, 'in_progress')).error?.code, 'PT404');
 task = ok(await change(clients.executor1, 'in_progress'));
 task = ok(await clients.manager.rpc('save_task', { p_id: task.id, p_expected_version: task.version, p_title: task.title, p_description: '', p_object_id: object.id, p_assignee_id: users.executor2.id })); assert.equal(task.status, 'in_progress');
 assert.equal((await change(clients.executor1, 'in_review')).error?.code, 'PT404');
 task = ok(await change(clients.executor2, 'in_review'));
 assert.equal((await change(clients.manager2, 'rework', '   ')).error?.code, 'PT422');
 task = ok(await change(clients.manager2, 'rework', 'Исправить примыкание'));
 task = ok(await change(clients.executor2, 'in_progress'));
 task = ok(await change(clients.executor2, 'in_review'));
 task = ok(await change(clients.manager, 'accepted'));
 task = ok(await clients.manager2.rpc('save_task', { p_id: task.id, p_expected_version: task.version, p_title: task.title, p_description: '', p_object_id: object.id, p_assignee_id: users.executor1.id })); assert.equal(task.status, 'accepted');
 assert.equal((await change(clients.executor1, 'in_progress')).error?.code, 'PT422');
 const history = ok(await clients.executor1.from('task_status_history').select('*').eq('task_id', task.id).order('id'));
 assert.deepEqual(history.map(h => h.to_status), ['new','in_progress','in_review','rework','in_progress','in_review','accepted']);
 assert.equal(history[3].comment, 'Исправить примыкание'); assert.equal(history[3].actor_id, users.manager2.id);
 assert.equal((await clients.manager.from('task_status_history').update({ comment: 'Подделка' }).eq('id', history[3].id)).error?.code, '42501');
 assert.equal((await clients.manager.from('task_status_history').delete().eq('task_id', task.id)).error?.code, '42501');
 assert.equal((await clients.executor1.from('task_status_history').insert({ task_id: task.id, to_status: 'accepted', actor_id: users.manager.id, actor_name: 'Подделка' })).error?.code, '42501');
});

test('удаление задачи скрывает её, сохраняет историю и доступно только постановщику', async () => {
 const task = ok(await clients.manager.rpc('save_task', { p_title: 'Удалить', p_description: '', p_object_id: object.id, p_assignee_id: users.executor1.id }));
 assert.equal((await clients.executor1.rpc('delete_task', { p_id: task.id, p_expected_version: task.version })).error?.code, 'PT403');
 ok(await clients.manager2.rpc('delete_task', { p_id: task.id, p_expected_version: task.version }));
 assert.deepEqual(ok(await clients.manager.from('tasks').select('id').eq('id', task.id)), []);
 assert.equal(ok(await clients.manager.from('task_status_history').select('id').eq('task_id', task.id)).length, 1);
 assert.deepEqual(ok(await clients.executor1.from('task_status_history').select('id').eq('task_id', task.id)), []);
 assert.equal((await clients.executor1.rpc('change_task_status', { p_task_id: task.id, p_expected_version: task.version, p_status: 'in_progress' })).error?.code, 'PT404');
});

test('удаление объекта атомарно скрывает его задачи, проверяет число задач и сохраняет историю', async () => {
 const parent = ok(await clients.manager.rpc('save_object', { p_name: 'Удаление объекта', p_address: 'Адрес' }));
 let task;
 try {
  task = ok(await clients.manager.rpc('save_task', { p_title: 'Дочерняя', p_description: '', p_object_id: parent.id, p_assignee_id: users.executor1.id }));
  assert.equal((await clients.manager.rpc('delete_object', { p_id: parent.id, p_expected_version: parent.version, p_expected_task_count: 0 })).error?.code, 'PT409');
  assert.equal(ok(await clients.manager.from('objects').select('id').eq('id', parent.id)).length, 1);
  ok(await clients.manager2.rpc('delete_object', { p_id: parent.id, p_expected_version: parent.version, p_expected_task_count: 1 }));
  assert.deepEqual(ok(await clients.manager.from('objects').select('id').eq('id', parent.id)), []);
  assert.deepEqual(ok(await clients.executor1.from('tasks').select('id').eq('id', task.id)), []);
  assert.equal(ok(await clients.manager.from('task_status_history').select('id').eq('task_id', task.id)).length, 1);
 } finally {
  if (task) { ok(await admin.from('task_status_history').delete().eq('task_id', task.id)); ok(await admin.from('tasks').delete().eq('id', task.id)); }
  ok(await admin.from('objects').delete().eq('id', parent.id));
 }
});
test('два одновременных перехода дают один результат и одну запись истории', async () => {
 const task = ok(await clients.manager.rpc('save_task', { p_title: 'Гонка', p_description: '', p_object_id: object.id, p_assignee_id: users.executor1.id }));
 const args = { p_task_id: task.id, p_expected_version: task.version, p_status: 'in_progress' };
 const responses = await Promise.all([clients.executor1.rpc('change_task_status', args), clients.executor1.rpc('change_task_status', args)]);
 assert.equal(responses.filter(r => !r.error).length, 1); assert.equal(responses.find(r => r.error)?.error.code, 'PT409');
 assert.equal(ok(await clients.manager.from('task_status_history').select('id').eq('task_id', task.id)).length, 2);
});

test('анонимный доступ, открытая регистрация и повышение роли через metadata запрещены', async () => {
 const anonymous = createClient(url, publicKey, clientOptions);
 assert.equal((await anonymous.from('tasks').select('id')).error?.code, '42501');
 assert.equal((await anonymous.rpc('save_object', {p_name:'Обход',p_address:'Адрес'})).error?.code, '42501');
 const signup = await anonymous.auth.signUp({email:'blocked-' + run + '@example.com',password:'Test-only-strong-password-23!'});
 assert.equal(signup.error?.code, 'signup_disabled'); assert.equal(signup.data.user, null);
 assert.equal((await clients.executor1.from('profiles').update({role:'manager'}).eq('id', users.executor1.id)).error?.code, '42501');
 const metadata = await clients.executor1.auth.updateUser({data:{role:'manager'}}); if(metadata.error)throw metadata.error;
 try {
  assert.equal((await clients.executor1.rpc('save_object', {p_name:'Подмена роли',p_address:'Адрес'})).error?.code, 'PT403');
  const profile = ok(await clients.executor1.from('profiles').select('role').eq('id',users.executor1.id).single()); assert.equal(profile.role, 'executor');
 } finally { const cleared = await clients.executor1.auth.updateUser({data:{role:null}}); if(cleared.error)throw cleared.error; }
});

test('объект и история доступны только текущему исполнителю его активной задачи', async () => {
 const parent = ok(await clients.manager.rpc('save_object', {p_name:'Изолированный объект ' + run,p_address:'Тестовый адрес'}));
 let task;
 try {
  task = ok(await clients.manager.rpc('save_task',{p_title:'Изолированная задача',p_description:'',p_object_id:parent.id,p_assignee_id:users.executor2.id}));
  assert.deepEqual(ok(await clients.executor1.from('objects').select('id').eq('id',parent.id)),[]);
  assert.equal(ok(await clients.manager.from('task_status_history').select('id').eq('task_id',task.id)).length,1);
  assert.deepEqual(ok(await clients.executor1.from('task_status_history').select('id').eq('task_id',task.id)),[]);
  assert.equal(ok(await clients.executor2.from('objects').select('id').eq('id',parent.id)).length,1);
  task = ok(await clients.manager.rpc('save_task',{p_id:task.id,p_expected_version:task.version,p_title:task.title,p_description:'',p_object_id:parent.id,p_assignee_id:users.executor1.id}));
  assert.deepEqual(ok(await clients.executor2.from('objects').select('id').eq('id',parent.id)),[]);
  assert.equal(ok(await clients.executor1.from('objects').select('id').eq('id',parent.id)).length,1);
  assert.equal(ok(await clients.executor1.from('task_status_history').select('id').eq('task_id',task.id)).length,1);
  ok(await clients.manager.rpc('delete_task',{p_id:task.id,p_expected_version:task.version}));
  assert.deepEqual(ok(await clients.executor1.from('objects').select('id').eq('id',parent.id)),[]);
 } finally {
  if(task){ok(await admin.from('task_status_history').delete().eq('task_id',task.id));ok(await admin.from('tasks').delete().eq('id',task.id));}
  ok(await admin.from('objects').delete().eq('id',parent.id));
 }
});
