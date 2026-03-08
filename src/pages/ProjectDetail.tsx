import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { Task, Priority, NewTaskInput, Project } from "../types";
import { getTasks, addTask, toggleTask, deleteTask, getProjects } from "../lib/db";

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITIES: Priority[] = ["high", "medium", "low"];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_NAMES   = ["Su","Mo","Tu","We","Th","Fr","Sa"];

const priorityColor: Record<Priority, string> = {
  high:   "var(--pink)",
  medium: "var(--orange)",
  low:    "var(--green)",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const dueClass = (due: string) => {
  if (!due) return "";
  const today = new Date().toISOString().split("T")[0];
  if (due === today) return "today";
  if (due < today)  return "overdue";
  return "";
};

const formatDue = (due: string) => {
  if (!due) return "No date";
  const today = new Date().toISOString().split("T")[0];
  if (due === today) return "Today";
  const [y, m, d] = due.split("-");
  return `${d}/${m}/${y}`;
};

const priColor = (p: Priority) =>
  p === "high" ? "var(--pink)" : p === "medium" ? "var(--orange)" : "var(--green)";

const toDateStr = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

// ─── Project Detail Page ──────────────────────────────────────────────────────

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const projectId = Number(id);

  const [project, setProject]     = useState<Project | null>(null);
  const [tasks, setTasks]         = useState<Task[]>([]);
  const [loading, setLoading]     = useState(true);
  const [collDone, setCollDone]   = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  // Form state
  const [name, setName]           = useState("");
  const [description, setDesc]    = useState("");
  const [priority, setPriority]   = useState<Priority>("medium");
  const [due, setDue]             = useState("");
  const [error, setError]         = useState("");

  // Calendar state
  const today                     = new Date();
  const [calOpen, setCalOpen]     = useState(false);
  const [calYear, setCalYear]     = useState(today.getFullYear());
  const [calMonth, setCalMonth]   = useState(today.getMonth());
  const calRef                    = useRef<HTMLDivElement>(null);
  const calTriggerRef             = useRef<HTMLButtonElement>(null);
  const [calPos, setCalPos]       = useState<React.CSSProperties>({});

  // ─── Load ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    Promise.all([getProjects(), getTasks()])
      .then(([projects, allTasks]) => {
        const found = projects.find(p => p.id === projectId) ?? null;
        setProject(found);
        setTasks(allTasks.filter(t => t.project_id === projectId));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId]);

  // ─── Close Calendar on Outside Click ─────────────────────────────────────────

  useEffect(() => {
    if (!calOpen) return;
    const handler = (e: MouseEvent) => {
      if (calRef.current && !calRef.current.contains(e.target as Node))
        setCalOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [calOpen]);

  // ─── Calendar Helpers ─────────────────────────────────────────────────────────

  const getDaysInMonth     = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();

  const prevMonth = () => calMonth === 0 ? (setCalMonth(11), setCalYear(y => y - 1)) : setCalMonth(m => m - 1);
  const nextMonth = () => calMonth === 11 ? (setCalMonth(0), setCalYear(y => y + 1)) : setCalMonth(m => m + 1);

  const pickDate = (day: number) => {
    setDue(toDateStr(calYear, calMonth, day));
    setError("");
    setCalOpen(false);
  };

  const todayStr   = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());
  const daysInMonth  = getDaysInMonth(calYear, calMonth);
  const firstDay     = getFirstDayOfMonth(calYear, calMonth);
  const calCells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (calCells.length % 7 !== 0) calCells.push(null);

  // ─── Actions ──────────────────────────────────────────────────────────────────

  const toggle = async (taskId: number, currentDone: boolean) => {
    setTasks(ts => ts.map(t => t.id === taskId ? { ...t, done: !t.done } : t));
    try { await toggleTask(taskId, !currentDone); }
    catch (e) {
      console.error(e);
      setTasks(ts => ts.map(t => t.id === taskId ? { ...t, done: currentDone } : t));
    }
  };

  const handleDelete = async (taskId: number) => {
    setTasks(ts => ts.filter(t => t.id !== taskId));
    try { await deleteTask(taskId); }
    catch (e) { console.error(e); getTasks().then(all => setTasks(all.filter(t => t.project_id === projectId))); }
  };

  const resetForm = () => {
    setName(""); setDesc(""); setPriority("medium");
    setDue(""); setError(""); setCalOpen(false);
    setCalYear(today.getFullYear()); setCalMonth(today.getMonth());
  };

  const handleClosePanel = () => { resetForm(); setPanelOpen(false); };

  const handleAdd = async () => {
    if (!name.trim()) { setError("Task name is required."); return; }
    if (!due)         { setError("Due date is required."); return; }

    const input: NewTaskInput = {
      name: name.trim(), description: description.trim(),
      priority, due, project_id: projectId,
    };
    try {
      const created = await addTask(input);
      setTasks(ts => [created, ...ts]);
      resetForm(); setPanelOpen(false);
    } catch (e) {
      console.error(e);
      setError("Failed to save task.");
    }
  };

  const pending = tasks.filter(t => !t.done);
  const done    = tasks.filter(t =>  t.done);

  // ─── Render ───────────────────────────────────────────────────────────────────

  if (loading) return <div className="page-placeholder"><p>Loading...</p></div>;

  if (!project) return (
    <div className="page-placeholder">
      <p>Project not found.</p>
      <button className="panel-btn-submit" style={{ marginTop: 12 }} onClick={() => navigate("/portfolios")}>
        Back to Projects
      </button>
    </div>
  );

  return (
    <>
      {/* ── ADD TASK PANEL ──────────────────────────────────────────────────── */}
      {panelOpen && (
        <>
          <div className="panel-scrim" onClick={handleClosePanel} />
          <div className="add-task-panel">
            <div className="panel-header">
              <span className="panel-title">New Task</span>
              <button className="panel-close" onClick={handleClosePanel}>✕</button>
            </div>

            <div className="panel-body">
              {/* Project badge (read-only) */}
              <div className="panel-field">
                <label className="panel-label">Project</label>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span
                    className="tag"
                    style={{ background: project.color + "22", color: project.color, fontSize: 12 }}
                  >
                    {project.name}
                  </span>
                </div>
              </div>

              {/* Name */}
              <div className="panel-field">
                <label className="panel-label">Task name <span className="panel-required">*</span></label>
                <input
                  className="panel-input"
                  placeholder="e.g. Write release notes"
                  value={name}
                  onChange={e => { setName(e.target.value); setError(""); }}
                  autoFocus
                />
              </div>

              {/* Description */}
              <div className="panel-field">
                <label className="panel-label">Description</label>
                <textarea
                  className="panel-textarea"
                  placeholder="Add more detail..."
                  value={description}
                  onChange={e => setDesc(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Priority */}
              <div className="panel-field">
                <label className="panel-label">Priority <span className="panel-required">*</span></label>
                <div className="panel-priority-group">
                  {PRIORITIES.map(p => (
                    <button
                      key={p}
                      className={`panel-priority-btn ${priority === p ? "selected" : ""}`}
                      style={priority === p ? { borderColor: priorityColor[p], color: priorityColor[p] } : {}}
                      onClick={() => setPriority(p)}
                      type="button"
                    >
                      <span className="panel-priority-dot" style={{ background: priorityColor[p] }} />
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Due date */}
              <div className="panel-field">
                <label className="panel-label">Due date <span className="panel-required">*</span></label>
                <div className="cal-wrapper" ref={calRef}>
                  <button
                    ref={calTriggerRef}
                    className={`cal-trigger ${due ? "has-value" : ""}`}
                    onClick={() => {
                      if (calTriggerRef.current) {
                        const r = calTriggerRef.current.getBoundingClientRect();
                        const spaceBelow = window.innerHeight - r.bottom;
                        const pos: React.CSSProperties = spaceBelow < 320
                          ? { bottom: window.innerHeight - r.top + 6 }
                          : { top: r.bottom + 6 };
                        if (window.innerWidth - r.left < 280) pos.right = window.innerWidth - r.right;
                        else pos.left = r.left;
                        setCalPos(pos);
                      }
                      setCalOpen(o => !o);
                    }}
                    type="button"
                  >
                    <span className="cal-trigger-icon">📅</span>
                    <span>{due ? formatDue(due) : "Pick a date"}</span>
                    {due && (
                      <span className="cal-clear" onClick={e => { e.stopPropagation(); setDue(""); }}>✕</span>
                    )}
                  </button>

                  {calOpen && (
                    <div className="cal-popover" style={calPos}>
                      <div className="cal-nav">
                        <button className="cal-nav-btn" onClick={prevMonth}>‹</button>
                        <span className="cal-month-label">{MONTH_NAMES[calMonth]} {calYear}</span>
                        <button className="cal-nav-btn" onClick={nextMonth}>›</button>
                      </div>
                      <div className="cal-grid">
                        {DAY_NAMES.map(d => <div key={d} className="cal-day-name">{d}</div>)}
                        {calCells.map((day, i) => {
                          if (!day) return <div key={`e-${i}`} />;
                          const ds = toDateStr(calYear, calMonth, day);
                          return (
                            <button
                              key={day}
                              className={`cal-day ${ds === todayStr ? "today" : ""} ${ds === due ? "picked" : ""}`}
                              onClick={() => pickDate(day)}
                              type="button"
                            >{day}</button>
                          );
                        })}
                      </div>
                      <div className="cal-footer">
                        <button className="cal-today-btn" onClick={() => pickDate(today.getDate())} type="button">
                          Today
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {error && <p className="panel-error">{error}</p>}
            </div>

            <div className="panel-footer">
              <button className="panel-btn-cancel" onClick={handleClosePanel}>Cancel</button>
              <button className="panel-btn-submit" onClick={handleAdd}>Add Task</button>
            </div>
          </div>
        </>
      )}

      {/* ── PAGE HEADER ─────────────────────────────────────────────────────── */}
      <div className="pd-header">
        <button className="pd-back" onClick={() => navigate(-1)}>← Back</button>
        <div className="pd-title-row">
          <div className="pd-dot" style={{ background: project.color, boxShadow: `0 0 10px ${project.color}66` }} />
          <h2 className="pd-title" style={{ color: project.color }}>{project.name}</h2>
        </div>
        {project.description && <p className="pd-desc">{project.description}</p>}
        <div className="pd-meta">
          <span>{pending.length} open</span>
          <span>·</span>
          <span>{done.length} completed</span>
        </div>
      </div>

      {/* ── TASK TABLE ──────────────────────────────────────────────────────── */}
      <div className="task-table">
        <div className="task-table-header">
          <div /><div style={{ paddingLeft: 8 }}>Task name</div>
          <div>Priority</div><div>Due date</div>
        </div>

        {pending.length === 0 && done.length === 0 && (
          <div style={{ padding: "20px 16px", color: "var(--muted)", fontSize: 13 }}>
            No tasks yet for this project.
          </div>
        )}

        {pending.map(task => (
          <div key={task.id} className="task-row pd-task-row">
            <div className="check-circle" onClick={() => toggle(task.id, task.done)}>✓</div>
            <div className="task-row-name">
              {task.name}
              {task.description && <span className="task-row-desc">{task.description}</span>}
            </div>
            <div className="priority-cell">
              <div className="priority-dot" style={{ background: priColor(task.priority as Priority) }} />
              <span className="priority-label">{task.priority}</span>
            </div>
            <div className={`due-date ${dueClass(task.due)}`}>{formatDue(task.due)}</div>
            <button className="task-delete-btn" onClick={() => handleDelete(task.id)} aria-label="Delete">✕</button>
          </div>
        ))}

        <div className="add-task-row" onClick={() => setPanelOpen(true)}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Add task
        </div>
      </div>

      {/* ── COMPLETED ───────────────────────────────────────────────────────── */}
      {done.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div className="section-header" onClick={() => setCollDone(c => !c)}>
            <span className={`section-toggle ${collDone ? "collapsed" : ""}`}>▼</span>
            <span className="section-title">
              Completed <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 13 }}>· {done.length}</span>
            </span>
          </div>
          {!collDone && (
            <div className="task-table">
              <div className="task-table-header">
                <div /><div style={{ paddingLeft: 8 }}>Task name</div>
                <div>Priority</div><div>Due date</div>
              </div>
              {done.map(task => (
                <div key={task.id} className="task-row done pd-task-row">
                  <div className="check-circle checked" onClick={() => toggle(task.id, task.done)}>✓</div>
                  <div className="task-row-name">
                    {task.name}
                    {task.description && <span className="task-row-desc">{task.description}</span>}
                  </div>
                  <div className="priority-cell">
                    <div className="priority-dot" style={{ background: "var(--muted2)" }} />
                    <span className="priority-label">{task.priority}</span>
                  </div>
                  <div className="due-date">{formatDue(task.due)}</div>
                  <button className="task-delete-btn" onClick={() => handleDelete(task.id)} aria-label="Delete">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}