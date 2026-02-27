import type { ChatworkMessage, SlackMessage } from '../services/api/api-types';
import type { NormalizedMessage, Source } from '../types';

export function normalizeChatworkMessage(
  msg: ChatworkMessage,
  source: Source
): NormalizedMessage {
  return {
    id: crypto.randomUUID(),
    source_id: source.id,
    external_id: msg.message_id,
    project_id: null,
    sender_name: msg.account.name,
    sender_id: String(msg.account.account_id),
    sender_avatar: msg.account.avatar_image_url,
    body: msg.body,
    body_plain: stripChatworkMarkup(msg.body),
    sent_at: new Date(msg.send_time * 1000).toISOString(),
    thread_id: null,
    classification: null,
    confidence: null,
    metadata: null,
  };
}

export function normalizeSlackMessage(
  msg: SlackMessage,
  source: Source
): NormalizedMessage {
  return {
    id: crypto.randomUUID(),
    source_id: source.id,
    external_id: msg.ts,
    project_id: null,
    sender_name: msg.user,
    sender_id: msg.user,
    sender_avatar: null,
    body: msg.text,
    body_plain: stripSlackMarkup(msg.text),
    sent_at: new Date(parseFloat(msg.ts) * 1000).toISOString(),
    thread_id: msg.thread_ts || null,
    classification: null,
    confidence: null,
    metadata: msg.thread_ts
      ? JSON.stringify({ thread_ts: msg.thread_ts, reply_count: msg.reply_count })
      : null,
  };
}

function stripChatworkMarkup(body: string): string {
  return body
    .replace(/\[info\][\s\S]*?\[\/info\]/g, '')
    .replace(/\[To:(\d+)\][^\]]*\]/g, '')
    .replace(/\[piconname:(\d+)\][^\]]*?\]/g, '')
    .replace(/\[(\/?)(code|hr|qt)\]/g, '')
    .trim();
}

function stripSlackMarkup(text: string): string {
  return text
    .replace(/<@[A-Z0-9]+>/g, '')
    .replace(/<#[A-Z0-9]+\|([^>]+)>/g, '#$1')
    .replace(/<(https?:\/\/[^|>]+)\|([^>]+)>/g, '$2')
    .replace(/<(https?:\/\/[^>]+)>/g, '$1')
    .replace(/:[a-z_]+:/g, '')
    .trim();
}
