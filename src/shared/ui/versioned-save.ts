export type VersionedValues<T> = { version: number; values: T };

export async function saveWithConflict<T>({ values, version, save, loadLatest }: {
 values: T;
 version?: number;
 save: (values: T, version?: number) => Promise<void>;
 loadLatest?: () => Promise<VersionedValues<T> | null>;
}): Promise<{ kind: 'saved' } | { kind: 'conflict'; latest: VersionedValues<T> }> {
 try {
  await save(values, version);
  return { kind: 'saved' };
 } catch (error) {
  if ((error as { code?: string } | null)?.code !== 'PT409' || !loadLatest) throw error;
  const latest = await loadLatest();
  if (!latest) throw { code: 'PT404' };
  return { kind: 'conflict', latest };
 }
}
