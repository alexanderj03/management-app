import { invoke } from "@tauri-apps/api/core";
import type { Task, NewTaskInput } from "../types";

/**
 * Fetch all tasks from SQLite.
 * Returns pending tasks first (done=0), newest first within each group.
 */
export const getTasks = (): Promise<Task[]> =>
  invoke<Task[]>("get_tasks");

/**
 * Insert a new task. Returns the created Task with its DB-assigned id.
 */
export const addTask = (task: NewTaskInput): Promise<Task> =>
  invoke<Task>("add_task", { task });

/**
 * Flip the done state of a task by id.
 */
export const toggleTask = (id: number, done: boolean): Promise<void> =>
  invoke<void>("toggle_task", { id, done });

/**
 * Permanently delete a task by id.
 */
export const deleteTask = (id: number): Promise<void> =>
  invoke<void>("delete_task", { id });

/**
 * DEV ONLY — wipes all tasks and resets autoincrement.
 * The Rust side blocks this in release builds automatically.
 */
export const resetDatabase = (): Promise<void> => {
  if (!import.meta.env.DEV) return Promise.resolve();
  return invoke<void>("reset_database");
};