-- ソース設定テーブル（Chatworkルーム、Slackチャンネル）
CREATE TABLE IF NOT EXISTS sources (
    id              TEXT PRIMARY KEY,
    source_type     TEXT NOT NULL,
    external_id     TEXT NOT NULL,
    name            TEXT NOT NULL,
    metadata        TEXT,
    is_active       INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(source_type, external_id)
);

-- プロジェクト/案件テーブル
CREATE TABLE IF NOT EXISTS projects (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    description     TEXT,
    color           TEXT,
    icon            TEXT,
    keywords        TEXT,
    is_archived     INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- メッセージテーブル
CREATE TABLE IF NOT EXISTS messages (
    id              TEXT PRIMARY KEY,
    source_id       TEXT NOT NULL,
    external_id     TEXT NOT NULL,
    project_id      TEXT,
    sender_name     TEXT NOT NULL,
    sender_id       TEXT,
    sender_avatar   TEXT,
    body            TEXT NOT NULL,
    body_plain      TEXT NOT NULL,
    sent_at         TEXT NOT NULL,
    thread_id       TEXT,
    classification  TEXT,
    confidence      REAL,
    metadata        TEXT,
    fetched_at      TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
    UNIQUE(source_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_messages_project_id ON messages(project_id);
CREATE INDEX IF NOT EXISTS idx_messages_source_id ON messages(source_id);
CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON messages(sent_at);
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id);

-- 同期状態テーブル
CREATE TABLE IF NOT EXISTS sync_states (
    id              TEXT PRIMARY KEY,
    source_id       TEXT NOT NULL UNIQUE,
    last_synced_at  TEXT,
    last_message_id TEXT,
    cursor          TEXT,
    status          TEXT NOT NULL DEFAULT 'idle',
    error_message   TEXT,
    FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE
);

-- AI分類ジョブテーブル
CREATE TABLE IF NOT EXISTS classification_jobs (
    id              TEXT PRIMARY KEY,
    status          TEXT NOT NULL DEFAULT 'pending',
    total_messages  INTEGER NOT NULL DEFAULT 0,
    processed       INTEGER NOT NULL DEFAULT 0,
    error_message   TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at    TEXT
);
