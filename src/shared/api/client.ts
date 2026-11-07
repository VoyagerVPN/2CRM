import { createClient, type PostgrestSingleResponse } from '@supabase/supabase-js';
import { fetchWithTimeout } from './request';
import type { Database } from './database.types';
export const supabase = createClient<Database>(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, { global: { fetch: fetchWithTimeout } });
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type CrmObject = Database['public']['Tables']['objects']['Row'];
export type Task = Database['public']['Tables']['tasks']['Row'];
export type History = Database['public']['Tables']['task_status_history']['Row'];
export function errorText(error: unknown): string {
 const value = error as { code?: string; status?: number; message?: string };
 if (value?.code === 'PT409') return 'Данные уже изменились. Карточка обновлена; проверьте изменения перед повторным действием.';
 if (value?.code === 'PT404') return 'Запись не найдена или недоступна';
 if (value?.code === 'PT403' || value?.code === '42501') return 'Это действие недоступно для вашей роли';
 if (value?.code === 'PT422') return value.message ?? 'Проверьте заполненные поля';
 if (value?.code === 'invalid_credentials') return 'Неверный email или пароль';
 if (value?.status === 429) return 'Слишком много попыток. Повторите немного позже';
 return 'Не удалось выполнить запрос. Проверьте подключение и попробуйте ещё раз';
}
export function unwrap<T>(result: PostgrestSingleResponse<T>): T { if (result.error) throw result.error; return result.data; }
export async function getProfiles() { return unwrap(await supabase.from('profiles').select('*').order('display_name')); }
export async function assertCurrent(table: 'objects' | 'tasks', id: string, version: number) {
 const row = unwrap(await supabase.from(table).select('version').eq('id', id).maybeSingle());
 if (!row) throw { code: 'PT404' };
 if (row.version !== version) throw { code: 'PT409' };
}
