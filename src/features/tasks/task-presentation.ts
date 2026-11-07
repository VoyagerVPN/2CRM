export const taskSteps = [
 { status: 'new', label: 'Новая' },
 { status: 'in_progress', label: 'В работе' },
 { status: 'in_review', label: 'На проверке' },
 { status: 'accepted', label: 'Принята' },
] as const;

export function taskProgress(status: string): { step: number; returned: boolean; complete: boolean } | null {
 const target = status === 'rework' ? 'in_review' : status;
 const step = taskSteps.findIndex(stage => stage.status === target);
 return step < 0 ? null : { step, returned: status === 'rework', complete: status === 'accepted' };
}

export function initials(name: string): string {
 return name.split(',')[0].trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase();
}
