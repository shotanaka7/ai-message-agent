export interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  keywords: string | null; // JSON配列
  is_archived: number; // SQLite: 0 | 1
  created_at: string;
  updated_at: string;
}
