export type TagName = "Dev" | "Design" | "Research" | "Marketing" | "Personal";
export type Priority = "high" | "medium" | "low";

export interface TagColor {
  bg: string;
  color: string;
}

export interface Task {
  id:          number;
  name:        string;
  description: string;
  priority:    Priority;
  due:         string;       // "YYYY-MM-DD"
  done:        boolean;
  tags?:       TagName[];    // optional
  project_id?: number | null;
}

// What the Add Task panel collects — id and done assigned automatically
export type NewTaskInput = Omit<Task, "id" | "done">;

// DB-backed project (replaces the old static Project interface)
export interface Project {
  id:          number;
  name:        string;
  description: string;
  color:       string;       // hex e.g. "#7c6af7"
  favourite:   boolean;
}

export type NewProjectInput = Omit<Project, "id">;

export interface NavItem {
  icon:  string;
  label: string;
  path:  string;
}

export interface SidebarProps {
  sidebarOpen:    boolean;
  onCloseSidebar: () => void;
}

export interface TopbarProps {
  sidebarOpen:     boolean;
  onToggleSidebar: () => void;
}

// ─── Goals ────────────────────────────────────────────────────────────────────

export type GoalType = "longterm" | "financial" | "personal";

export interface Goal {
  id:             number;
  type:           GoalType;
  name:           string;
  description:    string;
  color:          string;
  progress:       number;       // 0–100, used by longterm
  current_amount: number;       // used by financial
  target_amount:  number;       // used by financial
  start_date:     string;       // YYYY-MM-DD, used by personal
  end_date:       string;       // YYYY-MM-DD, used by personal
  created_at:     string;
}

export type NewGoalInput = Omit<Goal, "id" | "created_at">;

export interface GoalNote {
  id:         number;
  goal_id:    number;
  content:    string;
  created_at: string;
}

export interface Milestone {
  id:       number;
  goal_id:  number;
  text:     string;
  done:     boolean;
  position: number;
}