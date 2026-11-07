import { admin, accounts, login, ok } from './admin.mjs';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const manifest = resolve(root, '.cache/private/demo.json');
try { const data = JSON.parse(await readFile(manifest, 'utf8')); console.log('Демонстрационные данные уже подготовлены: ' + data.objects.length + ' объекта'); process.exit(0); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const users = Object.fromEntries((await accounts()).map(a => [a.name, a]));
const manager = await login(users.manager);
const executors = { executor1: await login(users.executor1), executor2: await login(users.executor2) };
const objects = [];
for (const [name, address] of [['ЖК «Северный»','Демонстрационный адрес: Северная улица, 12'],['Школа на Парковой','Демонстрационный адрес: Парковая улица, 7'],['Бизнес-центр «Маяк»','Демонстрационный адрес: Приморский проспект, 24']]) objects.push(ok(await manager.rpc('save_object', { p_name: name, p_address: address })));
const tasks = [];
const descriptions = {
 'Проверить разметку перегородок': 'Сверить положение перегородок и дверных проёмов с планом этажа. Указать расхождения перед началом монтажа.',
 'Подготовить проёмы под двери': 'Проверить размеры дверных проёмов, выровнять откосы и убрать остатки раствора перед установкой коробок.',
 'Смонтировать освещение в коридоре': 'Установить светильники в коридоре, проверить крепления и работу всех линий освещения.',
 'Устранить замечания по отделке': 'Исправить примыкание отделки у дверного проёма и проверить соседние участки. После исправления отправить результат на проверку.',
 'Проверить систему вентиляции': 'Проверить крепления воздуховодов и герметичность соединений на втором этаже.',
 'Подготовить схему подключения': 'Описать подключение оборудования к существующим линиям, обозначить точки подключения и порядок проверки.',
};
for (const [index, title, executor, target] of [[0,'Проверить разметку перегородок','executor1','new'],[0,'Подготовить проёмы под двери','executor2','in_progress'],[1,'Смонтировать освещение в коридоре','executor1','in_review'],[1,'Устранить замечания по отделке','executor2','rework'],[2,'Проверить систему вентиляции','executor1','accepted'],[2,'Подготовить схему подключения','executor2','new']]) {
 let task = ok(await manager.rpc('save_task', { p_title: title, p_description: descriptions[title], p_object_id: objects[index].id, p_assignee_id: users[executor].id }));
 const transitions = target === 'new' ? [] : target === 'in_progress' ? ['in_progress'] : target === 'in_review' ? ['in_progress','in_review'] : ['in_progress','in_review',target];
 for (const status of transitions) {
  const caller = status === 'accepted' || status === 'rework' ? manager : executors[executor];
  task = ok(await caller.rpc('change_task_status', { p_task_id: task.id, p_expected_version: task.version, p_status: status, p_comment: status === 'rework' ? 'Исправить примыкание отделки у дверного проёма и повторно отправить на проверку.' : null }));
 }
 tasks.push(task);
}
await writeFile(manifest, JSON.stringify({ objects, tasks }, null, 2));
console.log('Подготовлены 3 демонстрационных объекта и 6 задач во всех пяти статусах.');
