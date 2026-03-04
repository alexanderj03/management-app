import { invoke } from "@tauri-apps/api/core";
import type { Task, NewTaskInput, Project, NewProjectInput } from "../types";

// ─── Tasks ────────────────────────────────────────────────────────────────────

export const getTasks   = (): Promise<Task[]>       => invoke<Task[]>("get_tasks");
export const addTask    = (task: NewTaskInput)       => invoke<Task>("add_task", { task });
export const toggleTask = (id: number, done: boolean) => invoke<void>("toggle_task", { id, done });
export const deleteTask = (id: number)               => invoke<void>("delete_task", { id });

export const resetDatabase = (): Promise<void> => {
  if (!import.meta.env.DEV) return Promise.resolve();
  return invoke<void>("reset_database");
};

// ─── Projects ─────────────────────────────────────────────────────────────────

export const getProjects      = (): Promise<Project[]>              => invoke<Project[]>("get_projects");
export const addProject       = (project: NewProjectInput)           => invoke<Project>("add_project", { project });
export const deleteProject    = (id: number)                         => invoke<void>("delete_project", { id });
export const toggleFavourite = async (id: number, favourite: boolean): Promise<void> => {
  await invoke<void>("toggle_favourite", { id, favourite });
  window.dispatchEvent(new CustomEvent("favourites-changed"));
};