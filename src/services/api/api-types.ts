// Chatwork API 型定義
export interface ChatworkRoom {
  room_id: number;
  name: string;
  type: 'my' | 'direct' | 'group';
  icon_path: string;
  unread_num: number;
  mention_num: number;
}

export interface ChatworkMessage {
  message_id: string;
  account: {
    account_id: number;
    name: string;
    avatar_image_url: string;
  };
  body: string;
  send_time: number;
  update_time: number;
}

// Slack API 型定義
export interface SlackChannel {
  id: string;
  name: string;
  is_channel: boolean;
  is_private: boolean;
  num_members: number;
}

export interface SlackMessage {
  type: string;
  ts: string;
  user: string;
  text: string;
  thread_ts?: string;
  reply_count?: number;
}

export interface SlackPaginatedResponse<T> {
  ok: boolean;
  messages?: T[];
  channels?: T[];
  response_metadata?: {
    next_cursor: string;
  };
  error?: string;
}
