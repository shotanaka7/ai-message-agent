-- プロジェクトに自然言語による分類プロンプトを追加
ALTER TABLE projects ADD COLUMN classification_prompt TEXT;
