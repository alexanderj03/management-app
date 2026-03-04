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
  tags?:       TagName[];
  project_id?: number | null;
}
export type NewTaskInput = Omit<Task, "id" | "done">;

export interface Project {
  id:          number;
  name:        string;
  description: string;
  color:       string;
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