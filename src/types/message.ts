export type ClassificationType = 'auto' | 'manual';

export interface Message {
  id: string;
  source_id: string;
  external_id: string;
  project_id: string | null;
  sender_name: string;
  sender_id: string | null;
  sender_avatar: string | null;
  body: string;
  body_plain: string;
  sent_at: string;
  thread_id: string | null;
  classification: ClassificationType | null;
  confidence: number | null;
  metadata: string | null;
  fetched_at: string;
}

export interface NormalizedMessage {
  id: string;
  source_id: string;
  external_id: string;
  project_id: string | null;
  sender_name: string;
  sender_id: string | null;
  sender_avatar: string | null;
  body: string;
  body_plain: string;
  sent_at: string;
  thread_id: string | null;
  classification: ClassificationType | null;
  confidence: number | null;
  metadata: string | null;
}
