import { getDb } from './index';
import type { Message, NormalizedMessage } from '../../types';

export async function getMessagesBySource(sourceId: string, limit = 100, offset = 0): Promise<Message[]> {
  const db = await getDb();
  return db.select<Message[]>(
    'SELECT * FROM messages WHERE source_id = ? ORDER BY sent_at DESC LIMIT ? OFFSET ?',
    [sourceId, limit, offset]
  );
}

export async function getMessagesByProject(projectId: string, limit = 100, offset = 0): Promise<Message[]> {
  const db = await getDb();
  return db.select<Message[]>(
    'SELECT * FROM messages WHERE project_id = ? ORDER BY sent_at DESC LIMIT ? OFFSET ?',
    [projectId, limit, offset]
  );
}

export async function getUnclassifiedMessages(limit = 100, offset = 0): Promise<Message[]> {
  const db = await getDb();
  return db.select<Message[]>(
    'SELECT * FROM messages WHERE project_id IS NULL ORDER BY sent_at DESC LIMIT ? OFFSET ?',
    [limit, offset]
  );
}

export async function getAllMessages(limit = 100, offset = 0): Promise<Message[]> {
  const db = await getDb();
  return db.select<Message[]>(
    `SELECT m.*, s.source_type, s.name as source_name
     FROM messages m
     JOIN sources s ON m.source_id = s.id
     ORDER BY m.sent_at DESC LIMIT ? OFFSET ?`,
    [limit, offset]
  );
}

export async function upsertMessage(msg: NormalizedMessage): Promise<boolean> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO messages (id, source_id, external_id, project_id, sender_name, sender_id, sender_avatar, body, body_plain, sent_at, thread_id, classification, confidence, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(source_id, external_id) DO UPDATE SET
       body = excluded.body,
       body_plain = excluded.body_plain,
       metadata = excluded.metadata`,
    [msg.id, msg.source_id, msg.external_id, msg.project_id, msg.sender_name, msg.sender_id, msg.sender_avatar, msg.body, msg.body_plain, msg.sent_at, msg.thread_id, msg.classification, msg.confidence, msg.metadata]
  );
  return result.rowsAffected > 0;
}

export async function upsertMessages(messages: NormalizedMessage[]): Promise<number> {
  let inserted = 0;
  for (const msg of messages) {
    const wasInserted = await upsertMessage(msg);
    if (wasInserted) inserted++;
  }
  return inserted;
}

export async function updateClassification(
  messageId: string,
  projectId: string,
  classification: 'auto' | 'manual',
  confidence: number | null
): Promise<void> {
  const db = await getDb();
  await db.execute(
    'UPDATE messages SET project_id = ?, classification = ?, confidence = ? WHERE id = ?',
    [projectId, classification, confidence, messageId]
  );
}

export async function getMessageCount(): Promise<number> {
  const db = await getDb();
  const [result] = await db.select<[{ count: number }]>('SELECT COUNT(*) as count FROM messages');
  return result.count;
}

export async function getMessageCountByProject(projectId: string): Promise<number> {
  const db = await getDb();
  const [result] = await db.select<[{ count: number }]>(
    'SELECT COUNT(*) as count FROM messages WHERE project_id = ?',
    [projectId]
  );
  return result.count;
}

export async function getUnclassifiedCount(): Promise<number> {
  const db = await getDb();
  const [result] = await db.select<[{ count: number }]>(
    'SELECT COUNT(*) as count FROM messages WHERE project_id IS NULL'
  );
  return result.count;
}
