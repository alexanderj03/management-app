import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import type { Task, Priority, NewTaskInput, Project } from "../types";
import { getTasks, addTask, toggleTask, deleteTask, resetDatabase, getProjects } from "../lib/db";

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

const dueClass = (due: string): string => {
  if (!due) return "";
  const today = new Date().toISOString().split("T")[0];
  if (due === today) return "today";
  if (due < today)  return "overdue";
  return "";
};

const formatDue = (due: string): string => {
  if (!due) return "No date";
  const today = new Date().toISOString().split("T")[0];
  if (due === today) return "Today";
  const [y, m, d] = due.split("-"); return `${d}/${m}/${y}`;
};

const priColor = (p: Priority): string =>
  p === "high" ? "var(--pink)" : p === "medium" ? "var(--orange)" : "var(--green)";

// Pad to YYYY-MM-DD
const toDateStr = (y: number, m: number, d: number): string =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

// ─── Home Page ────────────────────────────────────────────────────────────────

export default function Home() {
  const [tasks, setTasks]         = useState<Task[]>([]);
  const navigate = useNavigate();
  const [favProjects, setFavProjects] = useState<Project[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [loading, setLoading]     = useState<boolean>(true);
  const [collDone, setCollDone]       = useState<boolean>(false);
  const [collPending, setCollPending] = useState<boolean>(false);
  const [collFavs, setCollFavs]       = useState<boolean>(false);
  const [panelOpen, setPanelOpen] = useState<boolean>(false);

  // Form state
  const [name, setName]           = useState<string>("");
  const [description, setDesc]    = useState<string>("");
  const [priority, setPriority]   = useState<Priority>("medium");
  const [due, setDue]             = useState<string>("");
  const [projectId, setProjectId] = useState<number | null>(null);
  const [error, setError]         = useState<string>("");

  // Calendar popover state
  const today                     = new Date();
  const [calOpen, setCalOpen]     = useState<boolean>(false);
  const [calYear, setCalYear]     = useState<number>(today.getFullYear());
  const [calMonth, setCalMonth]   = useState<number>(today.getMonth());
  const calRef                    = useRef<HTMLDivElement>(null);
  const calTriggerRef             = useRef<HTMLButtonElement | null>(null);
  const [calPos, setCalPos]       = useState<React.CSSProperties>({});

  // ─── Load on Mount ────────────────────────────────────────────────────────────

  useEffect(() => {
    Promise.all([
      getTasks(),
      getProjects(),
    ])
    .then(([t, ps]) => {
      setTasks(t);
      setAllProjects(ps);
      setFavProjects(ps.filter(p => p.favourite));
    })
    .catch(console.error)
    .finally(() => setLoading(false));
  }, []);

  // ─── Dev Reset ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const handler = async (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "R") {
        if (!window.confirm("Dev reset: wipe all tasks?")) return;
        try { await resetDatabase(); setTasks([]); }
        catch (err) { console.error(err); }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ─── Close Calendar on Outside Click ─────────────────────────────────────────

  useEffect(() => {
    if (!calOpen) return;
    const handler = (e: MouseEvent) => {
      if (calRef.current && !calRef.current.contains(e.target as Node)) {
        setCalOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [calOpen]);

  // ─── Calendar Helpers ─────────────────────────────────────────────────────────

  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  };

  const pickDate = (day: number) => {
    const picked = toDateStr(calYear, calMonth, day);
    setDue(picked);
    setError("");
    setCalOpen(false);
  };

  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  // Build calendar grid
  const daysInMonth  = getDaysInMonth(calYear, calMonth);
  const firstDay     = getFirstDayOfMonth(calYear, calMonth);
  const calCells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to full weeks
  while (calCells.length % 7 !== 0) calCells.push(null);

  // ─── Actions ──────────────────────────────────────────────────────────────────

  const toggle = async (id: number, currentDone: boolean): Promise<void> => {
    setTasks(ts => ts.map(t => t.id === id ? { ...t, done: !t.done } : t));
    try { await toggleTask(id, !currentDone); }
    catch (e) {
      console.error(e);
      setTasks(ts => ts.map(t => t.id === id ? { ...t, done: currentDone } : t));
    }
  };

  const resetForm = (): void => {
    setName(""); setDesc(""); setPriority("medium");
    setDue(""); setProjectId(null); setError(""); setCalOpen(false);
    setCalYear(today.getFullYear()); setCalMonth(today.getMonth());
  };

  const handleClosePanel = (): void => { resetForm(); setPanelOpen(false); };

  const handleAdd = async (): Promise<void> => {
    if (!name.trim()) { setError("Task name is required."); return; }
    if (!due)         { setError("Due date is required."); return; }
    const input: NewTaskInput = { name: name.trim(), description: description.trim(), priority, due, project_id: projectId };
    try {
      const created = await addTask(input);
      setTasks(ts => [created, ...ts]);
      resetForm(); setPanelOpen(false);
    } catch (e) {
      console.error(e);
      setError("Failed to save task. Please try again.");
    }
  };

  const handleDelete = async (id: number): Promise<void> => {
    setTasks(ts => ts.filter(t => t.id !== id));
    try { await deleteTask(id); }
    catch (e) {
      console.error(e);
      getTasks().then(setTasks);
    }
  };

  const pending = tasks.filter(t => !t.done);
  const done    = tasks.filter(t =>  t.done);

  // ─── Render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return <div className="page-placeholder"><p>Loading tasks...</p></div>;
  }

  return (
    <>

      {/* ── ADD TASK PANEL ──────────────────────────────────────────────────── */}
      {panelOpen && (
        <>
          <div className="panel-scrim" onClick={handleClosePanel} />

          <div className="add-task-panel">

            <div className="panel-header">
              <span className="panel-title">New Task</span>
              <button className="panel-close" onClick={handleClosePanel} aria-label="Close">✕</button>
            </div>

            <div className="panel-body">

              {/* Task name */}
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
                  placeholder="Add more detail about this task..."
                  value={description}
                  onChange={e => setDesc(e.target.value)}
                  rows={4}
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
                  {/* Trigger button */}
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
                      <span
                        className="cal-clear"
                        onClick={e => { e.stopPropagation(); setDue(""); }}
                      >✕</span>
                    )}
                  </button>

                  {/* Popover */}
                  {calOpen && (
                    <div className="cal-popover" style={calPos}>

                      {/* Month navigation */}
                      <div className="cal-nav">
                        <button className="cal-nav-btn" onClick={prevMonth}>‹</button>
                        <span className="cal-month-label">
                          {MONTH_NAMES[calMonth]} {calYear}
                        </span>
                        <button className="cal-nav-btn" onClick={nextMonth}>›</button>
                      </div>

                      {/* Day headers */}
                      <div className="cal-grid">
                        {DAY_NAMES.map(d => (
                          <div key={d} className="cal-day-name">{d}</div>
                        ))}

                        {/* Day cells */}
                        {calCells.map((day, i) => {
                          if (!day) return <div key={`empty-${i}`} />;
                          const dateStr  = toDateStr(calYear, calMonth, day);
                          const isToday  = dateStr === todayStr;
                          const isPicked = dateStr === due;
                          return (
                            <button
                              key={day}
                              className={`cal-day ${isToday ? "today" : ""} ${isPicked ? "picked" : ""}`}
                              onClick={() => pickDate(day)}
                              type="button"
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>

                      {/* Today shortcut */}
                      <div className="cal-footer">
                        <button
                          className="cal-today-btn"
                          onClick={() => pickDate(today.getDate())}
                          type="button"
                        >
                          Today
                        </button>
                      </div>

                    </div>
                  )}
                </div>
              </div>

              {/* Project */}
              <div className="panel-field">
                <label className="panel-label">Project <span className="panel-optional">(optional)</span></label>
                <div className="proj-selector">
                  <button
                    type="button"
                    className={`proj-selector-opt ${projectId === null ? "selected" : ""}`}
                    onClick={() => setProjectId(null)}
                  >
                    None
                  </button>
                  {allProjects.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      className={`proj-selector-opt ${projectId === p.id ? "selected" : ""}`}
                      style={projectId === p.id ? { borderColor: p.color, color: p.color, background: p.color + "22" } : {}}
                      onClick={() => setProjectId(p.id)}
                    >
                      <span className="proj-selector-dot" style={{ background: p.color }} />
                      {p.name}
                    </button>
                  ))}
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

      {/* ── TASKS DUE SOON ──────────────────────────────────────────────────── */}
      <div>
        <div className="section-header" onClick={() => setCollPending(c => !c)}>
          <span className={`section-toggle ${collPending ? "collapsed" : ""}`}>▼</span>
          <span className="section-title">Tasks Due Soon</span>
          <span className="section-action">ℹ See all my tasks</span>
        </div>

        {!collPending && <div className="task-table">
          <div className="task-table-header">
            <div /><div style={{ paddingLeft: 8 }}>Task name</div>
            <div>Tags</div><div>Priority</div><div>Due date</div>
          </div>

          {pending.map(task => (
            <div key={task.id} className="task-row">
              <div className="check-circle" onClick={() => toggle(task.id, task.done)}>✓</div>
              <div className="task-row-name">
                {task.name}
                {task.description && <span className="task-row-desc">{task.description}</span>}
              </div>
              <div className="tags">
                {(() => {
                  const proj = task.project_id ? allProjects.find(p => p.id === task.project_id) : null;
                  return proj ? (
                    <span className="tag" style={{ background: proj.color + "22", color: proj.color }}>
                      {proj.name}
                    </span>
                  ) : null;
                })()}
              </div>
              <div className="priority-cell">
                <div className="priority-dot" style={{ background: priColor(task.priority as Priority) }} />
                <span className="priority-label">{task.priority}</span>
              </div>
              <div className={`due-date ${dueClass(task.due)}`}>{formatDue(task.due)}</div>
              <button className="task-delete-btn" onClick={() => handleDelete(task.id)} aria-label="Delete task">✕</button>
            </div>
          ))}

          <div className="add-task-row" onClick={() => setPanelOpen(true)}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Add task
          </div>
        </div>}
      </div>

      {/* ── COMPLETED ───────────────────────────────────────────────────────── */}
      {done.length > 0 && (
        <div>
          <div className="section-header" onClick={() => setCollDone(c => !c)}>
            <span className={`section-toggle ${collDone ? "collapsed" : ""}`}>▼</span>
            <span className="section-title">
              Completed&nbsp;
              <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 13 }}>· {done.length}</span>
            </span>
          </div>

          {!collDone && (
            <div className="task-table">
              <div className="task-table-header">
                <div /><div style={{ paddingLeft: 8 }}>Task name</div>
                <div>Tags</div><div>Priority</div><div>Due date</div>
              </div>
              {done.map(task => (
                <div key={task.id} className="task-row done">
                  <div className="check-circle checked" onClick={() => toggle(task.id, task.done)}>✓</div>
                  <div className="task-row-name">
                    {task.name}
                    {task.description && <span className="task-row-desc">{task.description}</span>}
                  </div>
                  <div className="tags">
                    {(() => {
                      const proj = task.project_id ? allProjects.find(p => p.id === task.project_id) : null;
                      return proj ? (
                        <span className="tag" style={{ background: proj.color + "22", color: proj.color }}>
                          {proj.name}
                        </span>
                      ) : null;
                    })()}
                  </div>
                  <div className="priority-cell">
                    <div className="priority-dot" style={{ background: "var(--muted2)" }} />
                    <span className="priority-label">{task.priority}</span>
                  </div>
                  <div className="due-date">{formatDue(task.due)}</div>
                  <button className="task-delete-btn" onClick={() => handleDelete(task.id)} aria-label="Delete task">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── FAVORITES ───────────────────────────────────────────────────────── */}
      <div>
        <div className="section-header" onClick={() => setCollFavs(c => !c)}>
          <span className={`section-toggle ${collFavs ? "collapsed" : ""}`}>▼</span>
          <span className="section-title">Favorites</span>
          <span className="section-action" style={{ color: "var(--muted)" }}>⊞</span>
        </div>

        {!collFavs && (
          favProjects.length === 0 ? (
            <div style={{ padding: "16px", color: "var(--muted)", fontSize: 13 }}>
              No favourited projects yet. Star a project to pin it here.
            </div>
          ) : (
            <div className="project-grid">
              {favProjects.map(p => (
                <div
                  key={p.id}
                  className="project-card fav-project-card"
                  onClick={() => navigate(`/projects/${p.id}`)}
                >
                  <div
                    className="project-card-top"
                    style={{ background: `linear-gradient(135deg, ${p.color}, ${p.color}99)`, height: 72 }}
                  />
                  <div className="project-card-body">
                    <div className="project-name" style={{ color: p.color }}>{p.name}</div>
                    {p.description && <div className="project-meta">{p.description}</div>}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

    </>
  );
}