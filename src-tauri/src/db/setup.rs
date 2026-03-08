use sqlx::{Pool, Sqlite};

/// Runs on every launch — safe to call multiple times.
pub async fn run_migrations(pool: &Pool<Sqlite>) -> Result<(), sqlx::Error> {

    // ── tasks ────────────────────────────────────────────────────────────────
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS tasks (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT    NOT NULL,
            description TEXT    NOT NULL DEFAULT '',
            priority    TEXT    NOT NULL DEFAULT 'medium',
            due         TEXT    NOT NULL DEFAULT '',
            done        INTEGER NOT NULL DEFAULT 0
        )"
    ).execute(pool).await?;

    // ── projects ─────────────────────────────────────────────────────────────
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS projects (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT    NOT NULL,
            description TEXT    NOT NULL DEFAULT '',
            color       TEXT    NOT NULL DEFAULT '#7c6af7'
        )"
    ).execute(pool).await?;

    let _ = sqlx::query(
        "ALTER TABLE tasks ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL"
    ).execute(pool).await;

    let _ = sqlx::query(
        "ALTER TABLE projects ADD COLUMN favourite INTEGER NOT NULL DEFAULT 0"
    ).execute(pool).await;

    // ── goals ─────────────────────────────────────────────────────────────────
    // type: 'longterm' | 'financial' | 'personal'
    //
    // longterm:  progress (0–100 integer, manually set)
    // financial: current_amount + target_amount (floats stored as TEXT for precision)
    // personal:  start_date + end_date (YYYY-MM-DD), progress auto-calculated from dates
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS goals (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            type           TEXT    NOT NULL DEFAULT 'longterm',
            name           TEXT    NOT NULL,
            description    TEXT    NOT NULL DEFAULT '',
            color          TEXT    NOT NULL DEFAULT '#7c6af7',
            progress       INTEGER NOT NULL DEFAULT 0,
            current_amount REAL    NOT NULL DEFAULT 0,
            target_amount  REAL    NOT NULL DEFAULT 0,
            start_date     TEXT    NOT NULL DEFAULT '',
            end_date       TEXT    NOT NULL DEFAULT '',
            created_at     TEXT    NOT NULL DEFAULT (date('now'))
        )"
    ).execute(pool).await?;

    // ── goal_milestones ──────────────────────────────────────────────────────
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS goal_milestones (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            goal_id    INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
            text       TEXT    NOT NULL,
            done       INTEGER NOT NULL DEFAULT 0,
            position   INTEGER NOT NULL DEFAULT 0
        )"
    ).execute(pool).await?;

    // ── goal_notes ───────────────────────────────────────────────────────────
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS goal_notes (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            goal_id    INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
            content    TEXT    NOT NULL,
            created_at TEXT    NOT NULL DEFAULT (datetime('now'))
        )"
    ).execute(pool).await?;

    Ok(())
}