use sqlx::{Pool, Sqlite};

/// Creates all tables if they don't already exist.
/// Called once on every app launch — safe to run multiple times.
pub async fn run_migrations(pool: &Pool<Sqlite>) -> Result<(), sqlx::Error> {
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

    Ok(())
}