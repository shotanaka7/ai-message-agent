import { getDb } from './index';
import type { SyncState, SyncStatus } from '../../types';

export async function getSyncState(sourceId: string): Promise<SyncState | null> {
  const db = await getDb();
  const results = await db.select<SyncState[]>(
    'SELECT * FROM sync_states WHERE source_id = ?',
    [sourceId]
  );
  return results[0] || null;
}

export async function getAllSyncStates(): Promise<SyncState[]> {
  const db = await getDb();
  return db.select<SyncState[]>('SELECT * FROM sync_states');
}

export async function upsertSyncState(sourceId: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO sync_states (id, source_id, status)
     VALUES (?, ?, 'idle')
     ON CONFLICT(source_id) DO NOTHING`,
    [crypto.randomUUID(), sourceId]
  );
}

export async function updateSyncStatus(
  sourceId: string,
  status: SyncStatus,
  errorMessage?: string
): Promise<void> {
  const db = await getDb();
  await db.execute(
    'UPDATE sync_states SET status = ?, error_message = ? WHERE source_id = ?',
    [status, errorMessage || null, sourceId]
  );
}

export async function updateLastSynced(sourceId: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    'UPDATE sync_states SET last_synced_at = datetime(\'now\') WHERE source_id = ?',
    [sourceId]
  );
}

export async function updateLastMessageId(sourceId: string, messageId: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    'UPDATE sync_states SET last_message_id = ? WHERE source_id = ?',
    [messageId, sourceId]
  );
}

export async function updateCursor(sourceId: string, cursor: string | null): Promise<void> {
  const db = await getDb();
  await db.execute(
    'UPDATE sync_states SET cursor = ? WHERE source_id = ?',
    [cursor, sourceId]
  );
}
