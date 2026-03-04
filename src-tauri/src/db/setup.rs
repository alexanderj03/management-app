use sqlx::{Pool, Sqlite};

/// Runs on every launch — safe to call multiple times.
/// Each block is guarded so it won't fail if the table/column already exists.
pub async fn run_migrations(pool: &Pool<Sqlite>) -> Result<(), sqlx::Error> {

    // ── tasks table ───────────────────────────────────────────────
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS tasks (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT    NOT NULL,
            description TEXT    NOT NULL DEFAULT '',
            priority    TEXT    NOT NULL DEFAULT 'medium',
            due         TEXT    NOT NULL DEFAULT '',
            done        INTEGER NOT NULL DEFAULT 0
        )"
    )
    .execute(pool)
    .await?;

    // ── projects table ─────────────────────────────────────────────────
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS projects (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT    NOT NULL,
            description TEXT    NOT NULL DEFAULT '',
            color       TEXT    NOT NULL DEFAULT '#7c6af7'
        )"
    )
    .execute(pool)
    .await?;

    // ── add project_id to tasks if it doesn't exist yet ──────────────────────
    let _ = sqlx::query(
        "ALTER TABLE tasks ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL"
    )
    .execute(pool)
    .await;

    // ── add favourite to projects if it doesn't exist yet ────────────────────
    let _ = sqlx::query(
        "ALTER TABLE projects ADD COLUMN favourite INTEGER NOT NULL DEFAULT 0"
    )
    .execute(pool)
    .await;

    Ok(())
}