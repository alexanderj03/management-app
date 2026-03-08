import { invoke } from "@tauri-apps/api/core";
import type { Task, NewTaskInput, Project, NewProjectInput, Goal, NewGoalInput, GoalNote, Milestone } from "../types";

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
  // Notify any listeners (e.g. Sidebar) that favourites changed
  window.dispatchEvent(new CustomEvent("favourites-changed"));
};

// ─── Goals ────────────────────────────────────────────────────────────────────

export const getGoals            = (): Promise<Goal[]>           => invoke<Goal[]>("get_goals");
export const addGoal             = (goal: NewGoalInput)          => invoke<Goal>("add_goal", { goal });
export const updateGoalProgress  = (id: number, progress: number) => invoke<void>("update_goal_progress", { id, progress });
export const updateGoalAmount    = (id: number, currentAmount: number) => invoke<void>("update_goal_amount", { id, currentAmount });
export const deleteGoal          = (id: number)                  => invoke<void>("delete_goal", { id });

// ─── Goal Notes ───────────────────────────────────────────────────────────────

export const getGoalNotes   = (goalId: number): Promise<GoalNote[]> => invoke<GoalNote[]>("get_goal_notes", { goalId });
export const addGoalNote    = (goalId: number, content: string)     => invoke<GoalNote>("add_goal_note", { goalId, content });
export const deleteGoalNote = (id: number)                          => invoke<void>("delete_goal_note", { id });

// ─── Milestones ───────────────────────────────────────────────────────────────

export const getMilestones     = (goalId: number): Promise<Milestone[]> => invoke<Milestone[]>("get_milestones", { goalId });
export const addMilestone      = (goalId: number, text: string)         => invoke<Milestone>("add_milestone", { goalId, text });
export const toggleMilestone   = (id: number, done: boolean)            => invoke<void>("toggle_milestone", { id, done });
export const deleteMilestone   = (id: number)                           => invoke<void>("delete_milestone", { id });