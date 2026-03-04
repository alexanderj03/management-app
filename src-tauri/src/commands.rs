use serde::{Deserialize, Serialize};
use sqlx::{Pool, Row, Sqlite};
use tauri::State;

// ─── Structs ──────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Task {
    pub id:          i64,
    pub name:        String,
    pub description: String,
    pub priority:    String,
    pub due:         String,
    pub done:        bool,
    pub project_id:  Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct NewTaskInput {
    pub name:        String,
    pub description: String,
    pub priority:    String,
    pub due:         String,
    pub project_id:  Option<i64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Project {
    pub id:          i64,
    pub name:        String,
    pub description: String,
    pub color:       String,
    pub favourite:   bool,
}

#[derive(Debug, Deserialize)]
pub struct NewProjectInput {
    pub name:        String,
    pub description: String,
    pub color:       String,
}

// ─── Task commands ────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_tasks(pool: State<'_, Pool<Sqlite>>) -> Result<Vec<Task>, String> {
    let rows = sqlx::query(
        "SELECT id, name, description, priority, due, done, project_id
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
        project_id:  row.get("project_id"),
    }).collect();

    Ok(tasks)
}

#[tauri::command]
pub async fn add_task(
    pool: State<'_, Pool<Sqlite>>,
    task: NewTaskInput,
) -> Result<Task, String> {
    let result = sqlx::query(
        "INSERT INTO tasks (name, description, priority, due, done, project_id)
         VALUES (?, ?, ?, ?, 0, ?)"
    )
    .bind(&task.name)
    .bind(&task.description)
    .bind(&task.priority)
    .bind(&task.due)
    .bind(task.project_id)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let new_id = result.last_insert_rowid();

    let row = sqlx::query(
        "SELECT id, name, description, priority, due, done, project_id FROM tasks WHERE id = ?"
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
        project_id:  row.get("project_id"),
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

#[tauri::command]
pub async fn reset_database(pool: State<'_, Pool<Sqlite>>) -> Result<(), String> {
    #[cfg(debug_assertions)]
    {
        sqlx::query("DELETE FROM tasks").execute(pool.inner()).await.map_err(|e| e.to_string())?;
        sqlx::query("DELETE FROM projects").execute(pool.inner()).await.map_err(|e| e.to_string())?;
        sqlx::query("DELETE FROM sqlite_sequence WHERE name IN ('tasks', 'projects')")
            .execute(pool.inner()).await.map_err(|e| e.to_string())?;
        return Ok(());
    }
    #[cfg(not(debug_assertions))]
    Err("Reset is not available in production builds.".to_string())
}

// ─── Project commands ─────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_projects(pool: State<'_, Pool<Sqlite>>) -> Result<Vec<Project>, String> {
    let rows = sqlx::query("SELECT id, name, description, color, favourite FROM projects ORDER BY favourite DESC, id DESC")
        .fetch_all(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    let projects = rows.iter().map(|row| Project {
        id:          row.get("id"),
        name:        row.get("name"),
        description: row.get("description"),
        color:       row.get("color"),
        favourite:   row.get::<i64, _>("favourite") != 0,
    }).collect();

    Ok(projects)
}

#[tauri::command]
pub async fn add_project(
    pool:    State<'_, Pool<Sqlite>>,
    project: NewProjectInput,
) -> Result<Project, String> {
    let result = sqlx::query(
        "INSERT INTO projects (name, description, color) VALUES (?, ?, ?)"
    )
    .bind(&project.name)
    .bind(&project.description)
    .bind(&project.color)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let new_id = result.last_insert_rowid();

    let row = sqlx::query(
        "SELECT id, name, description, color, favourite FROM projects WHERE id = ?"
    )
    .bind(new_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    Ok(Project {
        id:          row.get("id"),
        name:        row.get("name"),
        description: row.get("description"),
        color:       row.get("color"),
        favourite:   false,
    })
}

// Toggle favourite on a project
#[tauri::command]
pub async fn toggle_favourite(
    pool: State<'_, Pool<Sqlite>>,
    id:   i64,
    favourite: bool,
) -> Result<(), String> {
    sqlx::query("UPDATE projects SET favourite = ? WHERE id = ?")
        .bind(favourite as i64)
        .bind(id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn delete_project(
    pool: State<'_, Pool<Sqlite>>,
    id:   i64,
) -> Result<(), String> {
    // Tasks with this project_id are set to NULL via ON DELETE SET NULL
    sqlx::query("DELETE FROM projects WHERE id = ?")
        .bind(id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}