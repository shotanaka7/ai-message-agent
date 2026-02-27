import { useEffect, useState } from "react";
import * as messageRepo from "../services/db/message-repository";
import type { Message } from "../types";

export function InboxPage() {
  const [messages, setMessages] = useState<(Message & { source_type?: string; source_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const msgs = await messageRepo.getAllMessages(200);
        setMessages(msgs);
      } catch {
        // DB未初期化
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        Inbox
        <span className="text-base font-normal text-gray-500 ml-2">
          ({messages.length} messages)
        </span>
      </h2>

      {messages.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
          <p className="text-gray-500">
            メッセージがありません。Settings から同期を実行してください。
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    msg.source_type === "chatwork"
                      ? "bg-green-100 text-green-700"
                      : "bg-purple-100 text-purple-700"
                  }`}
                >
                  {msg.source_type || "unknown"}
                </span>
                <span className="text-sm font-medium text-gray-700">
                  {msg.sender_name}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(msg.sent_at).toLocaleString("ja-JP")}
                </span>
              </div>
              <p className="text-sm text-gray-600 whitespace-pre-wrap line-clamp-3">
                {msg.body_plain}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
