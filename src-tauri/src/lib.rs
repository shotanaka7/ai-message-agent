use tauri_plugin_sql::{Builder as SqlBuilder, Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_core_tables",
            sql: include_str!("../migrations/001_core_tables.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "create_fts_tables",
            sql: include_str!("../migrations/002_fts_tables.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "add_project_classification_prompt",
            sql: include_str!("../migrations/003_project_classification_prompt.sql"),
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(
            SqlBuilder::default()
                .add_migrations("sqlite:ai-message-agent.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_http::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
