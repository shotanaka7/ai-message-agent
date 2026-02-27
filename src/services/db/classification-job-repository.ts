import { getDb } from './index';
import type { ClassificationJob } from '../../types';

export async function createJob(id: string, totalMessages: number): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO classification_jobs (id, status, total_messages, processed)
     VALUES (?, 'pending', ?, 0)`,
    [id, totalMessages]
  );
}

export async function updateJobStatus(id: string, status: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    'UPDATE classification_jobs SET status = ? WHERE id = ?',
    [status, id]
  );
}

export async function updateJobProcessed(id: string, processed: number): Promise<void> {
  const db = await getDb();
  await db.execute(
    'UPDATE classification_jobs SET processed = ? WHERE id = ?',
    [processed, id]
  );
}

export async function completeJob(id: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    "UPDATE classification_jobs SET status = 'completed', completed_at = datetime('now') WHERE id = ?",
    [id]
  );
}

export async function failJob(id: string, errorMessage: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    "UPDATE classification_jobs SET status = 'failed', error_message = ?, completed_at = datetime('now') WHERE id = ?",
    [errorMessage, id]
  );
}

export async function getLatestJob(): Promise<ClassificationJob | null> {
  const db = await getDb();
  const results = await db.select<ClassificationJob[]>(
    'SELECT * FROM classification_jobs ORDER BY created_at DESC LIMIT 1'
  );
  return results[0] || null;
}
