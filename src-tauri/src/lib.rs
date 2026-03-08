mod commands;
mod db;

use sqlx::{Pool, Sqlite, sqlite::SqlitePoolOptions};
use tauri::Manager;

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
            commands::get_projects,
            commands::add_project,
            commands::delete_project,
            commands::toggle_favourite,
            commands::get_goals,
            commands::add_goal,
            commands::update_goal_progress,
            commands::update_goal_amount,
            commands::delete_goal,
            commands::get_goal_notes,
            commands::add_goal_note,
            commands::delete_goal_note,
            commands::get_milestones,
            commands::add_milestone,
            commands::toggle_milestone,
            commands::delete_milestone,
            commands::get_captures,
            commands::add_capture,
            commands::update_capture_status,
            commands::delete_capture,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}