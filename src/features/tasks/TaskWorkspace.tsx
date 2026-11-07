import type { ReactNode } from 'react';
import { Typography } from 'antd';
import { Link } from 'react-router';
import type { CrmObject, History, Profile, Task } from '../../shared/api/client';
import { dateText, listPath, NoRows, Status, statusLabels } from '../../shared/ui/common';
import { initials, taskProgress, taskSteps } from './task-presentation';

function TaskProgress({ status }: { status: string }) {
 const progress = taskProgress(status);
 if (!progress) return null;
 return <section className="task-progress" aria-label="Ход работы задачи">
  <ol className="task-progress-track">{taskSteps.map((stage, index) => {
   const returned = progress.returned && index === progress.step;
   const done = progress.complete || index < progress.step;
   const current = !progress.complete && !progress.returned && index === progress.step;
   return <li key={stage.status} data-status={returned ? 'rework' : stage.status} className={['task-progress-step', done ? 'is-done' : '', current ? 'is-current' : '', returned ? 'is-returned' : ''].join(' ')} aria-current={current || returned || (progress.complete && index === 3) ? 'step' : undefined}>
    <span className="phase-line" aria-hidden="true" />
    <div><span className="phase-marker" aria-hidden="true">{returned ? '↶' : done ? '✓' : index + 1}</span><span className="phase-label">{stage.label}</span></div>
    {(current || returned || (progress.complete && index === 3)) && <small>{returned ? 'Возврат' : progress.complete ? 'Завершено' : 'Сейчас'}</small>}
   </li>;
  })}</ol>
  {!progress.complete && <div className={progress.returned ? 'task-loop is-current' : 'task-loop'}><span aria-hidden="true">↶</span><span>{progress.returned ? 'Возврат в работу: ' : 'При замечании: '}<span data-status="rework">На доработке</span> → <span data-status="in_progress">В работе</span></span></div>}
 </section>;
}

export function TaskWorkspace({ task, object, profiles, history, actions, hasActions, management, role }: {
 task: Task; object: CrmObject | null; profiles: Profile[]; history: History[]; actions: ReactNode; hasActions: boolean; management?: ReactNode; role: string;
}) {
 const person = (id: string) => profiles.find(profile => profile.id === id)?.display_name ?? 'Пользователь';
 const assignee = person(task.assignee_id);
 const waiting = task.status === 'accepted' ? 'Работа завершена' : role === 'executor' && task.status === 'in_review' ? 'Ожидает проверки постановщика' : null;
 return <div className="task-workspace"><div className="task-layout">
  <aside className="task-work-panel" data-status={task.status} aria-label="Текущий статус и исполнитель">
   <div className="task-status-head"><span className="task-status-title">{statusLabels[task.status] ?? task.status}</span></div>
   <div className="task-assignee"><span className="person-caption">Ответственный</span><div className="task-person"><span className="person-avatar" aria-hidden="true">{initials(assignee)}</span><strong>{assignee}</strong></div></div>
   {(hasActions || waiting) && <div className="task-workflow">{hasActions ? actions : <Typography.Text className="waiting-text">{waiting}</Typography.Text>}</div>}
  </aside>
  <section className="task-main">
   <header className="task-heading"><div className="task-title-row"><Typography.Title level={2}>{task.title}</Typography.Title>{management}</div>
    {object && <Link className="task-object-link" to={listPath('/objects/' + object.id)}><span aria-hidden="true">▦</span>{object.name}</Link>}
    <div className="task-byline"><span>Автор <strong>{person(task.author_id)}</strong></span><span>Создана <time dateTime={task.created_at}>{dateText(task.created_at)}</time></span></div>
   </header>
   <TaskProgress status={task.status} />
   <section className="task-description plain-text" aria-label="Описание задачи">{task.description || 'Описание не добавлено'}</section>
   <section className="task-history-section"><div className="history-heading"><Typography.Title level={3}>История</Typography.Title><Typography.Text type="secondary" className="history-timezone">Часовой пояс: {Intl.DateTimeFormat().resolvedOptions().timeZone}</Typography.Text></div>
    {history.length ? <ol className="task-history">{history.map((item, index) => <li key={item.id} data-status={item.to_status} className={index === history.length - 1 ? 'is-latest' : ''}>
     <div className="history-person-time"><Typography.Text strong>{item.actor_name}</Typography.Text><time dateTime={item.happened_at}>{dateText(item.happened_at)}</time></div>
     <div className="history-transition">{item.from_status ? <Status value={item.from_status} /> : <span className="history-created">Создание</span>}<span className="history-arrow" aria-label="переход в">→</span><Status value={item.to_status} /></div>
     {item.comment && <div className="history-comment plain-text">{item.comment}</div>}
    </li>)}</ol> : <NoRows text="Изменений статуса пока нет" />}
   </section>
  </section>
 </div></div>;
}
