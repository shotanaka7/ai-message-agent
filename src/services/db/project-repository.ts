import { getDb } from './index';
import type { Project } from '../../types';

export async function getAllProjects(): Promise<Project[]> {
  const db = await getDb();
  return db.select<Project[]>(
    'SELECT * FROM projects WHERE is_archived = 0 ORDER BY name'
  );
}

export async function createProject(project: Omit<Project, 'created_at' | 'updated_at'>): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO projects (id, name, description, color, icon, keywords, is_archived)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [project.id, project.name, project.description, project.color, project.icon, project.keywords, project.is_archived]
  );
}

export async function updateProject(id: string, updates: Partial<Pick<Project, 'name' | 'description' | 'color' | 'icon' | 'keywords'>>): Promise<void> {
  const db = await getDb();
  const fields: string[] = [];
  const values: unknown[] = [];

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (fields.length === 0) return;

  fields.push("updated_at = datetime('now')");
  values.push(id);

  await db.execute(
    `UPDATE projects SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
}

export async function archiveProject(id: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    "UPDATE projects SET is_archived = 1, updated_at = datetime('now') WHERE id = ?",
    [id]
  );
}
