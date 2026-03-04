use serde::{Deserialize, Serialize};
use sqlx::{Pool, Row, Sqlite};
use tauri::State;

/// Mirrors the Task interface in src/types/index.ts
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Task {
    pub id:          i64,
    pub name:        String,
    pub description: String,
    pub priority:    String,
    pub due:         String,
    pub done:        bool,
}

/// What the frontend sends when creating a new task
#[derive(Debug, Deserialize)]
pub struct NewTaskInput {
    pub name:        String,
    pub description: String,
    pub priority:    String,
    pub due:         String,
}

// ─── Commands ────────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_tasks(pool: State<'_, Pool<Sqlite>>) -> Result<Vec<Task>, String> {
    let rows = sqlx::query(
        "SELECT id, name, description, priority, due, done
         FROM tasks
         ORDER BY done ASC, id DESC"
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let tasks = rows.iter().map(|row| Task {
        id:          row.get("id"),
        name:        row.get("name"),
        description: row.get("description"),
        priority:    row.get("priority"),
        due:         row.get("due"),
        done:        row.get::<i64, _>("done") != 0,
    }).collect();

    Ok(tasks)
}

#[tauri::command]
pub async fn add_task(
    pool: State<'_, Pool<Sqlite>>,
    task: NewTaskInput,
) -> Result<Task, String> {
    let result = sqlx::query(
        "INSERT INTO tasks (name, description, priority, due, done) VALUES (?, ?, ?, ?, 0)"
    )
    .bind(&task.name)
    .bind(&task.description)
    .bind(&task.priority)
    .bind(&task.due)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let new_id = result.last_insert_rowid();

    let row = sqlx::query(
        "SELECT id, name, description, priority, due, done FROM tasks WHERE id = ?"
    )
    .bind(new_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    Ok(Task {
        id:          row.get("id"),
        name:        row.get("name"),
        description: row.get("description"),
        priority:    row.get("priority"),
        due:         row.get("due"),
        done:        row.get::<i64, _>("done") != 0,
    })
}

#[tauri::command]
pub async fn toggle_task(
    pool: State<'_, Pool<Sqlite>>,
    id:   i64,
    done: bool,
) -> Result<(), String> {
    sqlx::query("UPDATE tasks SET done = ? WHERE id = ?")
        .bind(done as i64)
        .bind(id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn delete_task(
    pool: State<'_, Pool<Sqlite>>,
    id:   i64,
) -> Result<(), String> {
    sqlx::query("DELETE FROM tasks WHERE id = ?")
        .bind(id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// DEV ONLY — stripped out in release builds by the compiler
#[tauri::command]
pub async fn reset_database(pool: State<'_, Pool<Sqlite>>) -> Result<(), String> {
    #[cfg(debug_assertions)]
    {
        sqlx::query("DELETE FROM tasks")
            .execute(pool.inner())
            .await
            .map_err(|e| e.to_string())?;

        sqlx::query("DELETE FROM sqlite_sequence WHERE name = 'tasks'")
            .execute(pool.inner())
            .await
            .map_err(|e| e.to_string())?;

        return Ok(());
    }

    #[cfg(not(debug_assertions))]
    Err("Reset is not available in production builds.".to_string())
}