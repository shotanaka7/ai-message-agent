# AI Message Agent

## プロジェクト概要
ChatworkとSlackのメッセージを収集し、AIでプロジェクト/案件単位にまとめるTauriデスクトップアプリ。

## 技術スタック
- Tauri v2 + React 19 + TypeScript + Vite
- TailwindCSS v4
- Zustand (状態管理)
- SQLite (tauri-plugin-sql) + FTS5 (全文検索)
- tauri-plugin-http (外部API通信)
- Claude API (直接REST, Anthropic SDKはNode.js依存のため不可)

## 開発コマンド
```bash
npm run tauri dev    # 開発サーバー起動
npm run build        # フロントエンドビルド
npx tsc --noEmit     # 型チェック
```

## ディレクトリ構成
- `src/` — React フロントエンド
- `src/types/` — 共有型定義
- `src/services/db/` — SQLite Repository 層
- `src/services/api/` — 外部 API クライアント (Chatwork, Slack, Claude)
- `src/services/sync/` — 同期エンジン (レート制限キュー付き)
- `src/services/classification/` — AI 分類パイプライン
- `src/services/search/` — FTS5 検索エンジン
- `src-tauri/` — Rust バックエンド
- `src-tauri/migrations/` — SQLite マイグレーション SQL

## 重要な制約
- Slack API: 非Marketplaceアプリは1分1リクエスト制限 (2025/5〜)
- FTS5 trigram: 日本語対応だが3文字未満の検索には非対応
- APIキーは .env に保持（.gitignore済み）。本番はOSキーチェーンに移行予定
