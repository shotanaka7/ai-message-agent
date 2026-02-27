export type SourceType = 'chatwork' | 'slack';

export interface Source {
  id: string;
  source_type: SourceType;
  external_id: string;
  name: string;
  metadata: string | null;
  is_active: number; // SQLite: 0 | 1
  created_at: string;
  updated_at: string;
}
