import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import type { Goal, GoalType, NewGoalInput } from "../types";
import { getGoals, addGoal, deleteGoal, updateGoalProgress, updateGoalAmount, addMilestone } from "../lib/db";

// ─── Constants ────────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  "#7c6af7", "#a78bfa", "#f76a8a", "#fb923c",
  "#f5a623", "#37c98a", "#2dd4bf", "#5b9cf6",
  "#e879f9", "#f43f5e", "#84cc16", "#60a5fa",
];

const TYPE_META: Record<GoalType, { label: string; icon: string; accent: string }> = {
  longterm:  { label: "Long Term",  icon: "🎯", accent: "#7c6af7" },
  financial: { label: "Financial",  icon: "💰", accent: "#37c98a" },
  personal:  { label: "Personal",   icon: "🌱", accent: "#5b9cf6" },
};

const SECTIONS: GoalType[] = ["longterm", "financial", "personal"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const tint = (hex: string) => hex + "22";

// For personal goals: % of time elapsed between start and end date
const timeProgress = (start: string, end: string): number => {
  if (!start || !end) return 0;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const now = Date.now();
  if (now <= s) return 0;
  if (now >= e) return 100;
  return Math.round(((now - s) / (e - s)) * 100);
};

// Days remaining until end date
const daysRemaining = (end: string): number => {
  if (!end) return 0;
  const diff = new Date(end).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

const formatCurrency = (n: number): string =>
  n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toLocaleString()}`;

const formatDate = (d: string): string => {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};

// ─── Sub-Components ───────────────────────────────────────────────────────────

// Animated progress bar
function ProgressBar({ pct, color, rounded = false }: { pct: number; color: string; rounded?: boolean }) {
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <div className={`goal-bar-track ${rounded ? "rounded" : ""}`}>
      <div
        className="goal-bar-fill"
        style={{
          width: `${clamped}%`,
          background: `linear-gradient(90deg, ${color}, ${color}cc)`,
          borderRadius: rounded ? "999px" : "0 4px 4px 0",
          boxShadow: clamped > 0 ? `0 0 8px ${color}55` : "none",
        }}
      />
    </div>
  );
}

// ─── Long-Term Card ───────────────────────────────────────────────────────────
function LongtermCard({ goal, onDelete, onNavigate }: {
  goal: Goal;
  onDelete: (id: number) => void;
  onProgressChange: (id: number, p: number) => void;
  onNavigate: (id: number) => void;
}) {
  const localPct = goal.progress;

  return (
    <div className="goal-card goal-card-clickable" onClick={() => onNavigate(goal.id)}>
      <div className="goal-card-header">
        <div className="goal-card-dot" style={{ background: goal.color, boxShadow: `0 0 8px ${goal.color}66` }} />
        <div className="goal-card-info">
          <span className="goal-card-name">{goal.name}</span>
          {goal.description && <span className="goal-card-desc">{goal.description}</span>}
        </div>
        <span className="goal-card-pct" style={{ color: goal.color }}>{localPct}%</span>
        <button className="goal-card-delete" onClick={e => { e.stopPropagation(); onDelete(goal.id); }}>✕</button>
      </div>

      <ProgressBar pct={localPct} color={goal.color} />
      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
        {localPct === 100 ? "All milestones complete" : `${localPct}% of milestones done`}
      </div>
    </div>
  );
}

// ─── Financial Card ───────────────────────────────────────────────────────────
function FinancialCard({ goal, onDelete, onAmountChange, onNavigate }: {
  goal: Goal;
  onDelete: (id: number) => void;
  onAmountChange: (id: number, amount: number) => void;
  onNavigate: (id: number) => void;
}) {
  const pct = goal.target_amount > 0
    ? Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100))
    : 0;

  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState(String(goal.current_amount));

  const commitAmount = () => {
    const parsed = parseFloat(inputVal);
    if (!isNaN(parsed) && parsed >= 0) onAmountChange(goal.id, parsed);
    else setInputVal(String(goal.current_amount));
    setEditing(false);
  };

  return (
    <div className="goal-card goal-card-clickable" onClick={() => onNavigate(goal.id)}>
      <div className="goal-card-header">
        <div className="goal-card-dot" style={{ background: goal.color, boxShadow: `0 0 8px ${goal.color}66` }} />
        <div className="goal-card-info">
          <span className="goal-card-name">{goal.name}</span>
          {goal.description && <span className="goal-card-desc">{goal.description}</span>}
        </div>
        <span className="goal-card-pct" style={{ color: goal.color }}>{pct}%</span>
        <button className="goal-card-delete" onClick={e => { e.stopPropagation(); onDelete(goal.id); }}>✕</button>
      </div>

      <ProgressBar pct={pct} color={goal.color} rounded />

      <div className="goal-fin-row">
        {/* Editable current amount */}
        <div className="goal-fin-amount">
          <span className="goal-fin-label">Saved</span>
          {editing ? (
            <input
              className="goal-fin-input"
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onBlur={commitAmount}
              onKeyDown={e => e.key === "Enter" && commitAmount()}
              autoFocus
              style={{ borderColor: goal.color }}
            />
          ) : (
            <span
              className="goal-fin-value"
              style={{ color: goal.color }}
              onClick={e => { e.stopPropagation(); setInputVal(String(goal.current_amount)); setEditing(true); }}
              title="Click to update"
            >
              {formatCurrency(goal.current_amount)}
            </span>
          )}
        </div>

        <div className="goal-fin-divider" />

        <div className="goal-fin-amount goal-fin-target">
          <span className="goal-fin-label">Target</span>
          <span className="goal-fin-value" style={{ color: "var(--muted2)" }}>
            {formatCurrency(goal.target_amount)}
          </span>
        </div>

        <div className="goal-fin-remaining" style={{ background: tint(goal.color) }}>
          <span style={{ color: goal.color }}>
            {formatCurrency(Math.max(0, goal.target_amount - goal.current_amount))} to go
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Personal Card ────────────────────────────────────────────────────────────
function PersonalCard({ goal, onDelete, onNavigate }: {
  goal: Goal;
  onDelete: (id: number) => void;
  onNavigate: (id: number) => void;
}) {
  const pct  = timeProgress(goal.start_date, goal.end_date);
  const days = daysRemaining(goal.end_date);
  const isOverdue = goal.end_date && new Date(goal.end_date) < new Date();

  return (
    <div className="goal-card goal-card-clickable" onClick={() => onNavigate(goal.id)}>
      <div className="goal-card-header">
        <div className="goal-card-dot" style={{ background: goal.color, boxShadow: `0 0 8px ${goal.color}66` }} />
        <div className="goal-card-info">
          <span className="goal-card-name">{goal.name}</span>
          {goal.description && <span className="goal-card-desc">{goal.description}</span>}
        </div>
        <button className="goal-card-delete" onClick={e => { e.stopPropagation(); onDelete(goal.id); }}>✕</button>
      </div>

      <ProgressBar pct={pct} color={isOverdue ? "var(--pink)" : goal.color} />

      <div className="goal-date-row">
        <span className="goal-date-chip">{formatDate(goal.start_date)}</span>
        <div className="goal-date-middle">
          {isOverdue ? (
            <span style={{ color: "var(--pink)", fontSize: 12 }}>Deadline passed</span>
          ) : (
            <span style={{ color: goal.color, fontWeight: 600, fontSize: 13 }}>
              {days} {days === 1 ? "day" : "days"} left
            </span>
          )}
          <span style={{ color: "var(--muted)", fontSize: 11 }}>{pct}% of time elapsed</span>
        </div>
        <span className="goal-date-chip" style={{ borderColor: isOverdue ? "var(--pink)" : goal.color, color: isOverdue ? "var(--pink)" : "inherit" }}>
          {formatDate(goal.end_date)}
        </span>
      </div>
    </div>
  );
}

// ─── Goals Page ───────────────────────────────────────────────────────────────

export default function Goals() {
  const navigate = useNavigate();
  const [goals, setGoals]         = useState<Goal[]>([]);
  const [loading, setLoading]     = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<GoalType, boolean>>({
    longterm: false, financial: false, personal: false,
  });

  // Panel form state
  const [type, setType]           = useState<GoalType>("longterm");
  const [name, setName]           = useState("");
  const [description, setDesc]    = useState("");
  const [color, setColor]         = useState(PRESET_COLORS[0]);
  const [milestoneInputs, setMilestoneInputs] = useState<string[]>([""]);
  const [currentAmt, setCurrentAmt] = useState("");
  const [targetAmt, setTargetAmt]   = useState("");
  const [startDate, setStartDate]   = useState("");
  const [endDate, setEndDate]       = useState("");
  const [error, setError]           = useState("");

  // Calendar state for personal goal dates
  const todayD = new Date();
  const [startCalOpen, setStartCalOpen] = useState(false);
  const [endCalOpen,   setEndCalOpen]   = useState(false);
  const [startCalYear, setStartCalYear] = useState(todayD.getFullYear());
  const [startCalMonth,setStartCalMonth]= useState(todayD.getMonth());
  const [endCalYear,   setEndCalYear]   = useState(todayD.getFullYear());
  const [endCalMonth,  setEndCalMonth]  = useState(todayD.getMonth());
  const startCalRef = useRef<HTMLDivElement>(null);
  const endCalRef   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getGoals().then(setGoals).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (startCalRef.current && !startCalRef.current.contains(e.target as Node)) setStartCalOpen(false);
      if (endCalRef.current   && !endCalRef.current.contains(e.target as Node))   setEndCalOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ─── Calendar Helpers ─────────────────────────────────────────────────────────

  const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const DAY_NAMES   = ["Su","Mo","Tu","We","Th","Fr","Sa"];
  const toDateStr   = (y: number, m: number, d: number) =>
    `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  const todayStr    = toDateStr(todayD.getFullYear(), todayD.getMonth(), todayD.getDate());
  const formatDate  = (d: string) => { if (!d) return ""; const [y,m,day]=d.split("-"); return `${day}/${m}/${y}`; };

  const buildCells = (y: number, m: number) => {
    const days = new Date(y, m+1, 0).getDate();
    const first = new Date(y, m, 1).getDay();
    const cells: (number|null)[] = [...Array(first).fill(null), ...Array.from({length:days},(_,i)=>i+1)];
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  };

  const [startCalPos, setStartCalPos] = useState<React.CSSProperties>({});
  const [endCalPos,   setEndCalPos]   = useState<React.CSSProperties>({});
  const startTriggerRef = useRef<HTMLButtonElement | null>(null);
  const endTriggerRef   = useRef<HTMLButtonElement | null>(null);

  const calcPos = (trigRef: React.RefObject<HTMLButtonElement | null>): React.CSSProperties => {
    if (!trigRef.current) return {};
    const r = trigRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const pos: React.CSSProperties = spaceBelow < 320
      ? { bottom: window.innerHeight - r.top + 6 }
      : { top: r.bottom + 6 };
    if (window.innerWidth - r.left < 280) pos.right = window.innerWidth - r.right;
    else pos.left = r.left;
    return pos;
  };

  const CalendarPopover = ({
    year, month, selected, onPrevMonth, onNextMonth, onPick, style,
  }: {
    year: number; month: number; selected: string;
    onPrevMonth: () => void; onNextMonth: () => void; onPick: (d: string) => void;
    style?: React.CSSProperties;
  }) => (
    <div className="cal-popover" style={style}>
      <div className="cal-nav">
        <button className="cal-nav-btn" onClick={onPrevMonth} type="button">‹</button>
        <span className="cal-month-label">{MONTH_NAMES[month]} {year}</span>
        <button className="cal-nav-btn" onClick={onNextMonth} type="button">›</button>
      </div>
      <div className="cal-grid">
        {DAY_NAMES.map(d => <div key={d} className="cal-day-name">{d}</div>)}
        {buildCells(year, month).map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;
          const ds = toDateStr(year, month, day);
          return (
            <button key={day} type="button"
              className={`cal-day ${ds===todayStr?"today":""} ${ds===selected?"picked":""}`}
              onClick={() => onPick(ds)}
            >{day}</button>
          );
        })}
      </div>
      <div className="cal-footer">
        <button className="cal-today-btn" type="button"
          onClick={() => onPick(todayStr)}>Today</button>
      </div>
    </div>
  );

  // ─── Actions ──────────────────────────────────────────────────────────────────

  const resetForm = () => {
    setName(""); setDesc(""); setColor(PRESET_COLORS[0]);
    setMilestoneInputs([""]);
    setCurrentAmt(""); setTargetAmt(""); setStartDate(""); setEndDate(""); setError("");
    setStartCalOpen(false); setEndCalOpen(false);
    setStartCalYear(todayD.getFullYear()); setStartCalMonth(todayD.getMonth());
    setEndCalYear(todayD.getFullYear()); setEndCalMonth(todayD.getMonth());
  };

  const handleClose = () => { resetForm(); setPanelOpen(false); };

  const handleAdd = async () => {
    if (!name.trim()) { setError("Goal name is required."); return; }
    if (type === "financial" && (!targetAmt || isNaN(Number(targetAmt)))) {
      setError("Target amount is required."); return;
    }
    if (type === "personal" && (!startDate || !endDate)) {
      setError("Start and end dates are required."); return;
    }

    const input: NewGoalInput = {
      type,
      name: name.trim(),
      description: description.trim(),
      color,
      progress: 0,
      current_amount: type === "financial" ? Number(currentAmt) || 0 : 0,
      target_amount:  type === "financial" ? Number(targetAmt)  || 0 : 0,
      start_date: type === "personal" ? startDate : "",
      end_date:   type === "personal" ? endDate   : "",
    };

    try {
      const created = await addGoal(input);
      // Save milestones if longterm
      if (type === "longterm") {
        const filled = milestoneInputs.map(t => t.trim()).filter(Boolean);
        for (const text of filled) {
          await addMilestone(created.id, text);
        }
      }
      setGoals(gs => [created, ...gs]);
      resetForm(); setPanelOpen(false);
    } catch (e) {
      console.error(e);
      setError("Failed to save goal.");
    }
  };

  const handleDelete = async (id: number) => {
    setGoals(gs => gs.filter(g => g.id !== id));
    try { await deleteGoal(id); }
    catch (e) { console.error(e); getGoals().then(setGoals); }
  };

  const handleProgressChange = async (id: number, p: number) => {
    setGoals(gs => gs.map(g => g.id === id ? { ...g, progress: p } : g));
    try { await updateGoalProgress(id, p); }
    catch (e) { console.error(e); }
  };

  const handleAmountChange = async (id: number, amount: number) => {
    setGoals(gs => gs.map(g => g.id === id ? { ...g, current_amount: amount } : g));
    try { await updateGoalAmount(id, amount); }
    catch (e) { console.error(e); }
  };

  const toggleSection = (t: GoalType) =>
    setCollapsed(c => ({ ...c, [t]: !c[t] }));

  if (loading) return <div className="page-placeholder"><p>Loading goals...</p></div>;

  return (
    <div className="goals-page">

      {/* ── PANEL ───────────────────────────────────────────────────────────── */}
      {panelOpen && (
        <>
          <div className="panel-scrim" onClick={handleClose} />
          <div className="add-task-panel">
            <div className="panel-header">
              <span className="panel-title">New Goal</span>
              <button className="panel-close" onClick={handleClose}>✕</button>
            </div>

            <div className="panel-body">

              {/* Type selector */}
              <div className="panel-field">
                <label className="panel-label">Goal type</label>
                <div className="goal-type-group">
                  {SECTIONS.map(t => (
                    <button
                      key={t}
                      type="button"
                      className={`goal-type-btn ${type === t ? "selected" : ""}`}
                      style={type === t ? { borderColor: TYPE_META[t].accent, color: TYPE_META[t].accent, background: TYPE_META[t].accent + "18" } : {}}
                      onClick={() => setType(t)}
                    >
                      {TYPE_META[t].icon} {TYPE_META[t].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div className="panel-field">
                <label className="panel-label">Name <span className="panel-required">*</span></label>
                <input
                  className="panel-input"
                  placeholder={
                    type === "longterm"  ? "e.g. Launch my own business" :
                    type === "financial" ? "e.g. Emergency fund" :
                    "e.g. Run a marathon"
                  }
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
                  placeholder="Why is this goal important to you?"
                  value={description}
                  onChange={e => setDesc(e.target.value)}
                  rows={2}
                />
              </div>

              {/* Colour */}
              <div className="panel-field">
                <label className="panel-label">Colour</label>
                <div className="color-swatches">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      className={`color-swatch ${color === c ? "selected" : ""}`}
                      style={{ background: c }}
                      onClick={() => setColor(c)}
                    />
                  ))}
                </div>
              </div>

              {/* Type-specific fields */}

              {type === "longterm" && (
                <div className="panel-field">
                  <label className="panel-label">Milestones <span className="panel-optional">(optional)</span></label>
                  <div className="ms-builder">
                    {milestoneInputs.map((val, i) => (
                      <div key={i} className="ms-builder-row">
                        <div className="ms-builder-dot" />
                        <input
                          className="panel-input"
                          style={{ flex: 1 }}
                          placeholder={`e.g. ${["Get first client", "Launch MVP", "Hit $10k revenue", "Build a team"][i] ?? "Add milestone"}`}
                          value={val}
                          onChange={e => {
                            const next = [...milestoneInputs];
                            next[i] = e.target.value;
                            // auto-add new row when typing in last field
                            if (i === milestoneInputs.length - 1 && e.target.value) next.push("");
                            setMilestoneInputs(next);
                          }}
                          onKeyDown={e => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              if (val.trim()) setMilestoneInputs(prev => [...prev, ""]);
                            }
                            if (e.key === "Backspace" && !val && milestoneInputs.length > 1) {
                              setMilestoneInputs(prev => prev.filter((_, j) => j !== i));
                            }
                          }}
                        />
                        {milestoneInputs.length > 1 && (
                          <button
                            type="button"
                            className="ms-builder-remove"
                            onClick={() => setMilestoneInputs(prev => prev.filter((_, j) => j !== i))}
                          >✕</button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {type === "financial" && (
                <>
                  <div className="panel-field">
                    <label className="panel-label">Target ($) <span className="panel-required">*</span></label>
                    <input
                      className="panel-input"
                      type="number" min={1} placeholder="10000"
                      value={targetAmt}
                      onChange={e => { setTargetAmt(e.target.value); setError(""); }}
                    />
                  </div>
                  <div className="panel-field">
                    <label className="panel-label">Current saved ($)</label>
                    <input
                      className="panel-input"
                      type="number" min={0} placeholder="0"
                      value={currentAmt}
                      onChange={e => setCurrentAmt(e.target.value)}
                    />
                  </div>
                </>
              )}

              {type === "personal" && (
                <div className="panel-field-row">
                  <div className="panel-field">
                    <label className="panel-label">Start date <span className="panel-required">*</span></label>
                    <div className="cal-wrapper" ref={startCalRef}>
                      <button ref={startTriggerRef} type="button" className={`cal-trigger ${startDate ? "has-value" : ""}`}
                        onClick={() => { setStartCalPos(calcPos(startTriggerRef)); setStartCalOpen(o => !o); setEndCalOpen(false); }}>
                        <span className="cal-trigger-icon">📅</span>
                        <span>{startDate ? formatDate(startDate) : "Pick a date"}</span>
                        {startDate && <span className="cal-clear" onClick={e => { e.stopPropagation(); setStartDate(""); }}>✕</span>}
                      </button>
                      {startCalOpen && (
                        <CalendarPopover
                          year={startCalYear} month={startCalMonth} selected={startDate}
                          style={startCalPos}
                          onPrevMonth={() => startCalMonth===0 ? (setStartCalMonth(11),setStartCalYear(y=>y-1)) : setStartCalMonth(m=>m-1)}
                          onNextMonth={() => startCalMonth===11 ? (setStartCalMonth(0),setStartCalYear(y=>y+1)) : setStartCalMonth(m=>m+1)}
                          onPick={d => { setStartDate(d); setStartCalOpen(false); setError(""); }}
                        />
                      )}
                    </div>
                  </div>
                  <div className="panel-field">
                    <label className="panel-label">End date <span className="panel-required">*</span></label>
                    <div className="cal-wrapper" ref={endCalRef}>
                      <button ref={endTriggerRef} type="button" className={`cal-trigger ${endDate ? "has-value" : ""}`}
                        onClick={() => { setEndCalPos(calcPos(endTriggerRef)); setEndCalOpen(o => !o); setStartCalOpen(false); }}>
                        <span className="cal-trigger-icon">📅</span>
                        <span>{endDate ? formatDate(endDate) : "Pick a date"}</span>
                        {endDate && <span className="cal-clear" onClick={e => { e.stopPropagation(); setEndDate(""); }}>✕</span>}
                      </button>
                      {endCalOpen && (
                        <CalendarPopover
                          year={endCalYear} month={endCalMonth} selected={endDate}
                          style={endCalPos}
                          onPrevMonth={() => endCalMonth===0 ? (setEndCalMonth(11),setEndCalYear(y=>y-1)) : setEndCalMonth(m=>m-1)}
                          onNextMonth={() => endCalMonth===11 ? (setEndCalMonth(0),setEndCalYear(y=>y+1)) : setEndCalMonth(m=>m+1)}
                          onPick={d => { setEndDate(d); setEndCalOpen(false); setError(""); }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {error && <p className="panel-error">{error}</p>}
            </div>

            <div className="panel-footer">
              <button className="panel-btn-cancel" onClick={handleClose}>Cancel</button>
              <button className="panel-btn-submit" onClick={handleAdd}>Add Goal</button>
            </div>
          </div>
        </>
      )}

      {/* ── PAGE HEADER ─────────────────────────────────────────────────────── */}
      <div className="projects-header">
        <div>
          <h2 className="projects-title">Goals</h2>
          <p className="projects-sub">{goals.length} goal{goals.length !== 1 ? "s" : ""} tracked</p>
        </div>
        <button className="projects-add-btn" onClick={() => setPanelOpen(true)}>
          + New Goal
        </button>
      </div>

      {/* ── SECTIONS ────────────────────────────────────────────────────────── */}
      {SECTIONS.map(sectionType => {
        const meta        = TYPE_META[sectionType];
        const sectionGoals = goals.filter(g => g.type === sectionType);
        const isCollapsed = collapsed[sectionType];

        return (
          <div key={sectionType} className="goals-section">
            <div className="section-header" onClick={() => toggleSection(sectionType)}>
              <span className={`section-toggle ${isCollapsed ? "collapsed" : ""}`}>▼</span>
              <span className="section-title">
                {meta.icon} {meta.label}
              </span>
              <span style={{ color: "var(--muted)", fontSize: 12, marginLeft: 6 }}>
                {sectionGoals.length}
              </span>
              <button
                className="goals-section-add"
                onClick={e => { e.stopPropagation(); setType(sectionType); setPanelOpen(true); }}
                type="button"
              >
                +
              </button>
            </div>

            {!isCollapsed && (
              sectionGoals.length === 0 ? (
                <div className="goals-empty-section">
                  No {meta.label.toLowerCase()} goals yet
                </div>
              ) : (
                <div className="goals-grid">
                  {sectionGoals.map(goal => {
                    if (goal.type === "longterm") return (
                      <LongtermCard
                        key={goal.id} goal={goal}
                        onDelete={handleDelete}
                        onProgressChange={handleProgressChange}
                        onNavigate={id => navigate(`/goals/${id}`)}
                      />
                    );
                    if (goal.type === "financial") return (
                      <FinancialCard
                        key={goal.id} goal={goal}
                        onDelete={handleDelete}
                        onAmountChange={handleAmountChange}
                        onNavigate={id => navigate(`/goals/${id}`)}
                      />
                    );
                    return (
                      <PersonalCard
                        key={goal.id} goal={goal}
                        onDelete={handleDelete}
                        onNavigate={id => navigate(`/goals/${id}`)}
                      />
                    );
                  })}
                </div>
              )
            )}
          </div>
        );
      })}

    </div>
  );
}