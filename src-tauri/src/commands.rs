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
        sqlx::query("DELETE FROM captures").execute(pool.inner()).await.map_err(|e| e.to_string())?;
        sqlx::query("DELETE FROM goal_notes").execute(pool.inner()).await.map_err(|e| e.to_string())?;
        sqlx::query("DELETE FROM goal_milestones").execute(pool.inner()).await.map_err(|e| e.to_string())?;
        sqlx::query("DELETE FROM goals").execute(pool.inner()).await.map_err(|e| e.to_string())?;
        sqlx::query("DELETE FROM tasks").execute(pool.inner()).await.map_err(|e| e.to_string())?;
        sqlx::query("DELETE FROM projects").execute(pool.inner()).await.map_err(|e| e.to_string())?;
        sqlx::query("DELETE FROM sqlite_sequence WHERE name IN ('tasks', 'projects', 'goals', 'goal_notes', 'goal_milestones', 'captures')")
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

// ─── Goal commands ────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Goal {
    pub id:             i64,
    pub r#type:         String,
    pub name:           String,
    pub description:    String,
    pub color:          String,
    pub progress:       i64,
    pub current_amount: f64,
    pub target_amount:  f64,
    pub start_date:     String,
    pub end_date:       String,
    pub created_at:     String,
}

#[derive(Debug, Deserialize)]
pub struct NewGoalInput {
    pub r#type:         String,
    pub name:           String,
    pub description:    String,
    pub color:          String,
    pub progress:       i64,
    pub current_amount: f64,
    pub target_amount:  f64,
    pub start_date:     String,
    pub end_date:       String,
}

fn row_to_goal(row: &sqlx::sqlite::SqliteRow) -> Goal {
    use sqlx::Row;
    Goal {
        id:             row.get("id"),
        r#type:         row.get("type"),
        name:           row.get("name"),
        description:    row.get("description"),
        color:          row.get("color"),
        progress:       row.get("progress"),
        current_amount: row.get("current_amount"),
        target_amount:  row.get("target_amount"),
        start_date:     row.get("start_date"),
        end_date:       row.get("end_date"),
        created_at:     row.get("created_at"),
    }
}

#[tauri::command]
pub async fn get_goals(pool: State<'_, Pool<Sqlite>>) -> Result<Vec<Goal>, String> {
    let rows = sqlx::query(
        "SELECT id, type, name, description, color, progress,
                current_amount, target_amount, start_date, end_date, created_at
         FROM goals ORDER BY id DESC"
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    Ok(rows.iter().map(row_to_goal).collect())
}

#[tauri::command]
pub async fn add_goal(
    pool: State<'_, Pool<Sqlite>>,
    goal: NewGoalInput,
) -> Result<Goal, String> {
    let result = sqlx::query(
        "INSERT INTO goals (type, name, description, color, progress,
                            current_amount, target_amount, start_date, end_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&goal.r#type)
    .bind(&goal.name)
    .bind(&goal.description)
    .bind(&goal.color)
    .bind(goal.progress)
    .bind(goal.current_amount)
    .bind(goal.target_amount)
    .bind(&goal.start_date)
    .bind(&goal.end_date)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let row = sqlx::query(
        "SELECT id, type, name, description, color, progress,
                current_amount, target_amount, start_date, end_date, created_at
         FROM goals WHERE id = ?"
    )
    .bind(result.last_insert_rowid())
    .fetch_one(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    Ok(row_to_goal(&row))
}

#[tauri::command]
pub async fn update_goal_progress(
    pool:     State<'_, Pool<Sqlite>>,
    id:       i64,
    progress: i64,
) -> Result<(), String> {
    sqlx::query("UPDATE goals SET progress = ? WHERE id = ?")
        .bind(progress).bind(id)
        .execute(pool.inner()).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn update_goal_amount(
    pool:           State<'_, Pool<Sqlite>>,
    id:             i64,
    current_amount: f64,
) -> Result<(), String> {
    sqlx::query("UPDATE goals SET current_amount = ? WHERE id = ?")
        .bind(current_amount).bind(id)
        .execute(pool.inner()).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn delete_goal(
    pool: State<'_, Pool<Sqlite>>,
    id:   i64,
) -> Result<(), String> {
    sqlx::query("DELETE FROM goals WHERE id = ?")
        .bind(id).execute(pool.inner()).await.map_err(|e| e.to_string())?;
    Ok(())
}

// ─── Goal Note commands ───────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GoalNote {
    pub id:         i64,
    pub goal_id:    i64,
    pub content:    String,
    pub created_at: String,
}

#[tauri::command]
pub async fn get_goal_notes(
    pool:    State<'_, Pool<Sqlite>>,
    goal_id: i64,
) -> Result<Vec<GoalNote>, String> {
    let rows = sqlx::query(
        "SELECT id, goal_id, content, created_at
         FROM goal_notes WHERE goal_id = ? ORDER BY id DESC"
    )
    .bind(goal_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    Ok(rows.iter().map(|r| {
        use sqlx::Row;
        GoalNote {
            id:         r.get("id"),
            goal_id:    r.get("goal_id"),
            content:    r.get("content"),
            created_at: r.get("created_at"),
        }
    }).collect())
}

#[tauri::command]
pub async fn add_goal_note(
    pool:    State<'_, Pool<Sqlite>>,
    goal_id: i64,
    content: String,
) -> Result<GoalNote, String> {
    let result = sqlx::query(
        "INSERT INTO goal_notes (goal_id, content) VALUES (?, ?)"
    )
    .bind(goal_id)
    .bind(&content)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let row = sqlx::query(
        "SELECT id, goal_id, content, created_at FROM goal_notes WHERE id = ?"
    )
    .bind(result.last_insert_rowid())
    .fetch_one(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    use sqlx::Row;
    Ok(GoalNote {
        id:         row.get("id"),
        goal_id:    row.get("goal_id"),
        content:    row.get("content"),
        created_at: row.get("created_at"),
    })
}

#[tauri::command]
pub async fn delete_goal_note(
    pool: State<'_, Pool<Sqlite>>,
    id:   i64,
) -> Result<(), String> {
    sqlx::query("DELETE FROM goal_notes WHERE id = ?")
        .bind(id).execute(pool.inner()).await.map_err(|e| e.to_string())?;
    Ok(())
}

// ─── Milestone commands ───────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Milestone {
    pub id:       i64,
    pub goal_id:  i64,
    pub text:     String,
    pub done:     bool,
    pub position: i64,
}

#[tauri::command]
pub async fn get_milestones(
    pool:    State<'_, Pool<Sqlite>>,
    goal_id: i64,
) -> Result<Vec<Milestone>, String> {
    let rows = sqlx::query(
        "SELECT id, goal_id, text, done, position
         FROM goal_milestones WHERE goal_id = ? ORDER BY position ASC, id ASC"
    )
    .bind(goal_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    use sqlx::Row;
    Ok(rows.iter().map(|r| Milestone {
        id:       r.get("id"),
        goal_id:  r.get("goal_id"),
        text:     r.get("text"),
        done:     r.get::<i64, _>("done") != 0,
        position: r.get("position"),
    }).collect())
}

#[tauri::command]
pub async fn add_milestone(
    pool:    State<'_, Pool<Sqlite>>,
    goal_id: i64,
    text:    String,
) -> Result<Milestone, String> {
    // position = current count so it goes to the end
    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM goal_milestones WHERE goal_id = ?"
    )
    .bind(goal_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let result = sqlx::query(
        "INSERT INTO goal_milestones (goal_id, text, done, position) VALUES (?, ?, 0, ?)"
    )
    .bind(goal_id).bind(&text).bind(count)
    .execute(pool.inner()).await.map_err(|e| e.to_string())?;

    let row = sqlx::query(
        "SELECT id, goal_id, text, done, position FROM goal_milestones WHERE id = ?"
    )
    .bind(result.last_insert_rowid())
    .fetch_one(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    use sqlx::Row;
    Ok(Milestone {
        id:       row.get("id"),
        goal_id:  row.get("goal_id"),
        text:     row.get("text"),
        done:     row.get::<i64, _>("done") != 0,
        position: row.get("position"),
    })
}

#[tauri::command]
pub async fn toggle_milestone(
    pool: State<'_, Pool<Sqlite>>,
    id:   i64,
    done: bool,
) -> Result<(), String> {
    sqlx::query("UPDATE goal_milestones SET done = ? WHERE id = ?")
        .bind(done as i64).bind(id)
        .execute(pool.inner()).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn delete_milestone(
    pool: State<'_, Pool<Sqlite>>,
    id:   i64,
) -> Result<(), String> {
    sqlx::query("DELETE FROM goal_milestones WHERE id = ?")
        .bind(id).execute(pool.inner()).await.map_err(|e| e.to_string())?;
    Ok(())
}

// ─── Capture commands ─────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Capture {
    pub id:         i64,
    pub text:       String,
    pub status:     String,   // "inbox" | "converted" | "dismissed"
    pub created_at: String,
}

#[tauri::command]
pub async fn get_captures(pool: State<'_, Pool<Sqlite>>) -> Result<Vec<Capture>, String> {
    let rows = sqlx::query(
        "SELECT id, text, status, created_at FROM captures ORDER BY id DESC"
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    use sqlx::Row;
    Ok(rows.iter().map(|r| Capture {
        id:         r.get("id"),
        text:       r.get("text"),
        status:     r.get("status"),
        created_at: r.get("created_at"),
    }).collect())
}

#[tauri::command]
pub async fn add_capture(
    pool: State<'_, Pool<Sqlite>>,
    text: String,
) -> Result<Capture, String> {
    let result = sqlx::query(
        "INSERT INTO captures (text, status) VALUES (?, 'inbox')"
    )
    .bind(&text)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let row = sqlx::query(
        "SELECT id, text, status, created_at FROM captures WHERE id = ?"
    )
    .bind(result.last_insert_rowid())
    .fetch_one(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    use sqlx::Row;
    Ok(Capture {
        id:         row.get("id"),
        text:       row.get("text"),
        status:     row.get("status"),
        created_at: row.get("created_at"),
    })
}

#[tauri::command]
pub async fn update_capture_status(
    pool:   State<'_, Pool<Sqlite>>,
    id:     i64,
    status: String,
) -> Result<(), String> {
    sqlx::query("UPDATE captures SET status = ? WHERE id = ?")
        .bind(&status).bind(id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn delete_capture(
    pool: State<'_, Pool<Sqlite>>,
    id:   i64,
) -> Result<(), String> {
    sqlx::query("DELETE FROM captures WHERE id = ?")
        .bind(id).execute(pool.inner()).await.map_err(|e| e.to_string())?;
    Ok(())
}