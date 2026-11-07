import { supabase, unwrap, type CrmObject } from '../../shared/api/client';
export async function objectOptions() {
 const rows: CrmObject[] = [];
 for (let start = 0; ; start += 500) {
  const batch = unwrap(await supabase.from('objects').select('*').order('name').order('id').range(start, start + 499)); rows.push(...batch);
  if (batch.length < 500) return rows;
 }
}
