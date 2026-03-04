export type TagName = "Dev" | "Design" | "Research" | "Marketing" | "Personal";
export type Priority = "high" | "medium" | "low";

export interface TagColor {
  bg: string;
  color: string;
}

export interface Task {
  id: number;
  name: string;
  description: string;      // added
  priority: Priority;
  due: string;              // "YYYY-MM-DD"
  done: boolean;
  tags?: TagName[];         // now optional
}

// What the Add Task panel collects — id and done are assigned automatically
export type NewTaskInput = Omit<Task, "id" | "done">;

export interface Project {
  name: string;
  sub: string;
  color: string;
  color2: string;
  icon: string;
  progress: number;
}

export interface NavItem {
  icon: string;
  label: string;
  path: string;
}

export interface AddTaskPanelProps {
  onClose: () => void;
  onAdd: (task: NewTaskInput) => void;
}

export interface TaskTableProps {
  rows: Task[];
  showAdd: boolean;
  onToggle: (id: number) => void;
  onOpenPanel: () => void;
}

export interface SidebarProps {
  sidebarOpen: boolean;
  onCloseSidebar: () => void;
}

export interface TopbarProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}