mod commands;
mod db;

use sqlx::{Pool, Sqlite, sqlite::SqlitePoolOptions};
use tauri::Manager; // ← provides .path() and .manage()

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let app_dir = app.path().app_data_dir()
                .expect("Could not resolve app data dir");

            std::fs::create_dir_all(&app_dir)
                .expect("Could not create app data dir");

            let db_path = app_dir.join("taskflow.db");
            let db_url  = format!("sqlite://{}?mode=rwc", db_path.display());

            let pool: Pool<Sqlite> = tauri::async_runtime::block_on(async {
                SqlitePoolOptions::new()
                    .max_connections(5)
                    .connect(&db_url)
                    .await
                    .expect("Failed to connect to SQLite")
            });

            tauri::async_runtime::block_on(async {
                db::setup::run_migrations(&pool)
                    .await
                    .expect("Failed to run migrations");
            });

            app.manage(pool);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_tasks,
            commands::add_task,
            commands::toggle_task,
            commands::delete_task,
            commands::reset_database,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}