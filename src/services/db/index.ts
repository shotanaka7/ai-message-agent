import Database from '@tauri-apps/plugin-sql';

let db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (!db) {
    db = await Database.load('sqlite:ai-message-agent.db');
  }
  return db;
}

export async function closeDb(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
  }
}
