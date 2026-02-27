-- FTS5テーブル: trigram トークナイザーで日本語対応
CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
    body_plain,
    sender_name,
    content='messages',
    content_rowid='rowid',
    tokenize='trigram'
);

-- FTSテーブルを自動同期するトリガー
CREATE TRIGGER IF NOT EXISTS messages_ai AFTER INSERT ON messages BEGIN
    INSERT INTO messages_fts(rowid, body_plain, sender_name)
    VALUES (new.rowid, new.body_plain, new.sender_name);
END;

CREATE TRIGGER IF NOT EXISTS messages_ad AFTER DELETE ON messages BEGIN
    INSERT INTO messages_fts(messages_fts, rowid, body_plain, sender_name)
    VALUES ('delete', old.rowid, old.body_plain, old.sender_name);
END;

CREATE TRIGGER IF NOT EXISTS messages_au AFTER UPDATE ON messages BEGIN
    INSERT INTO messages_fts(messages_fts, rowid, body_plain, sender_name)
    VALUES ('delete', old.rowid, old.body_plain, old.sender_name);
    INSERT INTO messages_fts(rowid, body_plain, sender_name)
    VALUES (new.rowid, new.body_plain, new.sender_name);
END;
