import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { Goal, GoalNote, Milestone } from "../types";
import {
  getGoals, updateGoalProgress, updateGoalAmount,
  deleteGoal, getGoalNotes, addGoalNote, deleteGoalNote,
  getMilestones, addMilestone, toggleMilestone, deleteMilestone,
} from "../lib/db";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const timeProgress = (start: string, end: string): number => {
  if (!start || !end) return 0;
  const s = new Date(start).getTime(), e = new Date(end).getTime(), now = Date.now();
  if (now <= s) return 0;
  if (now >= e) return 100;
  return Math.round(((now - s) / (e - s)) * 100);
};

const daysRemaining = (end: string): number => {
  if (!end) return 0;
  return Math.max(0, Math.ceil((new Date(end).getTime() - Date.now()) / 86400000));
};

const formatCurrency = (n: number) =>
  n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toLocaleString()}`;

const formatDate = (d: string) => {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};

const formatDateTime = (dt: string) => {
  if (!dt) return "";
  const d = new Date(dt.endsWith("Z") ? dt : dt + "Z");
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) +
    " · " + d.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" });
};

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ pct, color, rounded = false }: { pct: number; color: string; rounded?: boolean }) {
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <div className={`goal-bar-track ${rounded ? "rounded" : ""}`} style={{ height: 12 }}>
      <div
        className="goal-bar-fill"
        style={{
          width: `${clamped}%`,
          background: `linear-gradient(90deg, ${color}, ${color}cc)`,
          borderRadius: rounded ? "999px" : "0 4px 4px 0",
          boxShadow: clamped > 0 ? `0 0 10px ${color}55` : "none",
        }}
      />
    </div>
  );
}

// ─── GoalDetail ───────────────────────────────────────────────────────────────

export default function GoalDetail() {
  const { id }    = useParams<{ id: string }>();
  const navigate  = useNavigate();
  const goalId    = Number(id);

  const [goal, setGoal]     = useState<Goal | null>(null);
  const [notes, setNotes]         = useState<GoalNote[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [newMilestone, setNewMilestone] = useState("");
  const [loading, setLoading] = useState(true);

  // Edit state
  const [localProgress, setLocalProgress] = useState(0);
  const [editingAmount, setEditingAmount] = useState(false);
  const [amountInput, setAmountInput]     = useState("");

  // Note input
  const [noteText, setNoteText] = useState("");
  const [saving, setSaving]     = useState(false);
  const textareaRef             = useRef<HTMLTextAreaElement>(null);

  // ── Load ─────────────────────────────────────────────────────────────────────

  useEffect(() => {
    Promise.all([getGoals(), getGoalNotes(goalId), getMilestones(goalId)])
      .then(([goals, goalNotes, ms]) => {
        const found = goals.find(g => g.id === goalId) ?? null;
        setGoal(found);
        if (found) setLocalProgress(found.progress);
        setNotes(goalNotes);
        setMilestones(ms);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [goalId]);

  // ── Actions ──────────────────────────────────────────────────────────────────

  const commitAmount = async () => {
    const parsed = parseFloat(amountInput);
    if (!isNaN(parsed) && parsed >= 0 && goal) {
      setGoal(g => g ? { ...g, current_amount: parsed } : g);
      try { await updateGoalAmount(goalId, parsed); }
      catch (e) { console.error(e); }
    }
    setEditingAmount(false);
  };

  const handleAddMilestone = async () => {
    if (!newMilestone.trim()) return;
    try {
      const ms = await addMilestone(goalId, newMilestone.trim());
      setMilestones(prev => [...prev, ms]);
      setNewMilestone("");
      // auto-update progress
      const next = [...milestones, ms];
      const pct = next.length ? Math.round((next.filter(m => m.done).length / next.length) * 100) : 0;
      setLocalProgress(pct);
      await updateGoalProgress(goalId, pct);
    } catch (e) { console.error(e); }
  };

  const handleToggleMilestone = async (id: number, current: boolean) => {
    const updated = milestones.map(m => m.id === id ? { ...m, done: !current } : m);
    setMilestones(updated);
    const pct = updated.length ? Math.round((updated.filter(m => m.done).length / updated.length) * 100) : 0;
    setLocalProgress(pct);
    setGoal(g => g ? { ...g, progress: pct } : g);
    try {
      await toggleMilestone(id, !current);
      await updateGoalProgress(goalId, pct);
    } catch (e) { console.error(e); }
  };

  const handleDeleteMilestone = async (id: number) => {
    const updated = milestones.filter(m => m.id !== id);
    setMilestones(updated);
    const pct = updated.length ? Math.round((updated.filter(m => m.done).length / updated.length) * 100) : 0;
    setLocalProgress(pct);
    try {
      await deleteMilestone(id);
      await updateGoalProgress(goalId, pct);
    } catch (e) { console.error(e); }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setSaving(true);
    try {
      const note = await addGoalNote(goalId, noteText.trim());
      setNotes(ns => [note, ...ns]);
      setNoteText("");
      textareaRef.current?.focus();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const handleDeleteNote = async (noteId: number) => {
    setNotes(ns => ns.filter(n => n.id !== noteId));
    try { await deleteGoalNote(noteId); }
    catch (e) { console.error(e); getGoalNotes(goalId).then(setNotes); }
  };

  const handleDeleteGoal = async () => {
    if (!window.confirm("Delete this goal and all its notes?")) return;
    try { await deleteGoal(goalId); navigate(-1); }
    catch (e) { console.error(e); }
  };

  // ── Derived ───────────────────────────────────────────────────────────────────

  if (loading) return <div className="page-placeholder"><p>Loading...</p></div>;
  if (!goal)   return (
    <div className="page-placeholder">
      <p>Goal not found.</p>
      <button className="panel-btn-submit" style={{ marginTop: 12 }} onClick={() => navigate("/goals")}>
        Back to Goals
      </button>
    </div>
  );

  const isFinancial = goal.type === "financial";
  const isPersonal  = goal.type === "personal";
  const isLongterm  = goal.type === "longterm";

  const pct = isFinancial
    ? (goal.target_amount > 0 ? Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100)) : 0)
    : isPersonal ? timeProgress(goal.start_date, goal.end_date)
    : localProgress;

  const isOverdue = isPersonal && goal.end_date && new Date(goal.end_date) < new Date();
  const barColor  = isOverdue ? "var(--pink)" : goal.color;

  const TYPE_LABEL: Record<string, string> = {
    longterm: "Long Term", financial: "Financial", personal: "Personal",
  };

  return (
    <div className="gd-page">

      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <div className="gd-header">
        <button className="pd-back" onClick={() => navigate(-1)}>← Back</button>

        <div className="gd-title-row">
          <div className="gd-dot" style={{ background: goal.color, boxShadow: `0 0 12px ${goal.color}66` }} />
          <div>
            <div className="gd-type-badge" style={{ background: goal.color + "22", color: goal.color }}>
              {TYPE_LABEL[goal.type]}
            </div>
            <h2 className="gd-title">{goal.name}</h2>
            {goal.description && <p className="gd-desc">{goal.description}</p>}
          </div>
          <button className="gd-delete-btn" onClick={handleDeleteGoal}>Delete goal</button>
        </div>
      </div>

      <div className="gd-body">

        {/* ── PROGRESS PANEL ────────────────────────────────────────────────── */}
        <div className="gd-panel">
          <h3 className="gd-panel-title">Progress</h3>

          <div style={{ marginBottom: 8 }}>
            <ProgressBar pct={pct} color={barColor} rounded={isFinancial} />
          </div>

          {/* Long term — milestone checklist */}
          {isLongterm && (
            <div className="gd-milestones">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <span style={{ color: "var(--muted)", fontSize: 13 }}>
                  {milestones.filter(m => m.done).length} / {milestones.length} milestones
                </span>
                <span style={{ color: goal.color, fontWeight: 700, fontSize: 15 }}>{localProgress}%</span>
              </div>

              {/* Milestone list */}
              <div className="gd-milestone-list">
                {milestones.map(ms => (
                  <div key={ms.id} className="gd-milestone-item">
                    <div
                      className={`gd-milestone-check ${ms.done ? "done" : ""}`}
                      style={ms.done ? { background: goal.color, borderColor: goal.color } : { borderColor: goal.color + "88" }}
                      onClick={() => handleToggleMilestone(ms.id, ms.done)}
                    >
                      {ms.done && "✓"}
                    </div>
                    <span className={`gd-milestone-text ${ms.done ? "done" : ""}`}>{ms.text}</span>
                    <button className="gd-milestone-delete" onClick={() => handleDeleteMilestone(ms.id)}>✕</button>
                  </div>
                ))}
              </div>

              {/* Add milestone input */}
              <div className="gd-milestone-add">
                <input
                  className="panel-input"
                  placeholder="Add a milestone..."
                  value={newMilestone}
                  onChange={e => setNewMilestone(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleAddMilestone()}
                  style={{ flex: 1 }}
                />
                <button
                  className="panel-btn-submit"
                  style={{ padding: "9px 16px", fontSize: 13, flexShrink: 0 }}
                  onClick={handleAddMilestone}
                  disabled={!newMilestone.trim()}
                >Add</button>
              </div>
            </div>
          )}

          {/* Financial — amounts */}
          {isFinancial && (
            <div className="gd-fin-grid">
              <div className="gd-stat">
                <span className="gd-stat-label">Saved</span>
                {editingAmount ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      className="goal-fin-input"
                      value={amountInput}
                      onChange={e => setAmountInput(e.target.value)}
                      onBlur={commitAmount}
                      onKeyDown={e => e.key === "Enter" && commitAmount()}
                      autoFocus
                      style={{ borderColor: goal.color, fontSize: 18, width: 110 }}
                    />
                    <button
                      className="panel-btn-submit"
                      style={{ padding: "4px 10px", fontSize: 12 }}
                      onClick={commitAmount}
                    >✓</button>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="gd-stat-value" style={{ color: goal.color }}>
                      {formatCurrency(goal.current_amount)}
                    </span>
                    <button
                      className="gd-edit-btn"
                      style={{ borderColor: goal.color, color: goal.color }}
                      onClick={() => { setAmountInput(String(goal.current_amount)); setEditingAmount(true); }}
                    >Edit</button>
                  </div>
                )}
              </div>
              <div className="gd-stat">
                <span className="gd-stat-label">Target</span>
                <span className="gd-stat-value" style={{ color: "var(--muted2)" }}>
                  {formatCurrency(goal.target_amount)}
                </span>
              </div>
              <div className="gd-stat">
                <span className="gd-stat-label">Remaining</span>
                <span className="gd-stat-value" style={{ color: "var(--orange)" }}>
                  {formatCurrency(Math.max(0, goal.target_amount - goal.current_amount))}
                </span>
              </div>
              <div className="gd-stat">
                <span className="gd-stat-label">Complete</span>
                <span className="gd-stat-value" style={{ color: goal.color }}>{pct}%</span>
              </div>
            </div>
          )}

          {/* Personal — dates */}
          {isPersonal && (
            <div className="gd-fin-grid">
              <div className="gd-stat">
                <span className="gd-stat-label">Started</span>
                <span className="gd-stat-value">{formatDate(goal.start_date)}</span>
              </div>
              <div className="gd-stat">
                <span className="gd-stat-label">Deadline</span>
                <span className="gd-stat-value" style={{ color: isOverdue ? "var(--pink)" : "inherit" }}>
                  {formatDate(goal.end_date)}
                </span>
              </div>
              <div className="gd-stat">
                <span className="gd-stat-label">Days left</span>
                <span className="gd-stat-value" style={{ color: isOverdue ? "var(--pink)" : goal.color }}>
                  {isOverdue ? "Overdue" : daysRemaining(goal.end_date)}
                </span>
              </div>
              <div className="gd-stat">
                <span className="gd-stat-label">Elapsed</span>
                <span className="gd-stat-value" style={{ color: goal.color }}>{pct}%</span>
              </div>
            </div>
          )}
        </div>

        {/* ── NOTES PANEL ───────────────────────────────────────────────────── */}
        <div className="gd-panel">
          <h3 className="gd-panel-title">Notes & Updates</h3>

          {/* Compose */}
          <div className="gd-note-compose">
            <textarea
              ref={textareaRef}
              className="gd-note-textarea"
              placeholder="Write a note or update about this goal..."
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAddNote();
              }}
              rows={3}
            />
            <div className="gd-note-compose-footer">
              <button
                className="panel-btn-submit"
                style={{ padding: "7px 18px", fontSize: 13 }}
                onClick={handleAddNote}
                disabled={saving || !noteText.trim()}
              >
                {saving ? "Saving..." : "Add note"}
              </button>
            </div>
          </div>

          {/* Note list */}
          {notes.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 16 }}>
              No notes yet. Add your first update above.
            </p>
          ) : (
            <div className="gd-notes-list">
              {notes.map(note => (
                <div key={note.id} className="gd-note-item">
                  <div className="gd-note-bar" style={{ background: goal.color }} />
                  <div className="gd-note-content">
                    <p className="gd-note-text">{note.content}</p>
                    <div className="gd-note-meta">
                      <span>{formatDateTime(note.created_at)}</span>
                      <button
                        className="gd-note-delete"
                        onClick={() => handleDeleteNote(note.id)}
                      >✕</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}