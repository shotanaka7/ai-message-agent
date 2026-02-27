import { getDb } from './index';
import type { Source, SourceType } from '../../types';

export async function getAllSources(): Promise<Source[]> {
  const db = await getDb();
  return db.select<Source[]>('SELECT * FROM sources ORDER BY name');
}

export async function getActiveSources(): Promise<Source[]> {
  const db = await getDb();
  return db.select<Source[]>('SELECT * FROM sources WHERE is_active = 1 ORDER BY name');
}

export async function getSourcesByType(sourceType: SourceType): Promise<Source[]> {
  const db = await getDb();
  return db.select<Source[]>(
    'SELECT * FROM sources WHERE source_type = ? ORDER BY name',
    [sourceType]
  );
}

export async function upsertSource(source: Omit<Source, 'created_at' | 'updated_at'>): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO sources (id, source_type, external_id, name, metadata, is_active)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(source_type, external_id) DO UPDATE SET
       name = excluded.name,
       metadata = excluded.metadata,
       is_active = excluded.is_active,
       updated_at = datetime('now')`,
    [source.id, source.source_type, source.external_id, source.name, source.metadata, source.is_active]
  );
}

export async function toggleSourceActive(id: string, isActive: boolean): Promise<void> {
  const db = await getDb();
  await db.execute(
    'UPDATE sources SET is_active = ?, updated_at = datetime(\'now\') WHERE id = ?',
    [isActive ? 1 : 0, id]
  );
}
