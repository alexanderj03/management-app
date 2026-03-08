import { useState, useEffect, useRef } from "react";
import type { Capture, Priority, NewGoalInput } from "../types";
import {
  getCaptures, addCapture, updateCaptureStatus, deleteCapture,
  getProjects, addTask, addGoal,
} from "../lib/db";
import type { Project } from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const timeAgo = (dt: string): string => {
  const diff = Date.now() - new Date(dt.endsWith("Z") ? dt : dt + "Z").getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return "just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

const PRIORITIES: Priority[] = ["high", "medium", "low"];
const priorityColor: Record<Priority, string> = {
  high: "var(--pink)", medium: "var(--orange)", low: "var(--green)",
};

// ─── Convert-to-Task inline form ──────────────────────────────────────────────

// ─── Shared calendar helpers ──────────────────────────────────────────────────

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const CAL_DAYS    = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function buildCells(y: number, m: number) {
  const days  = new Date(y, m + 1, 0).getDate();
  const first = new Date(y, m, 1).getDay();
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function CalPop({ year, month, selected, todayStr, onPrev, onNext, onPick, style }: {
  year: number; month: number; selected: string; todayStr: string;
  onPrev: () => void; onNext: () => void; onPick: (d: string) => void;
  style?: React.CSSProperties;
}) {
  return (
    <div className="cal-popover" style={style}>
      <div className="cal-nav">
        <button className="cal-nav-btn" type="button" onClick={onPrev}>‹</button>
        <span className="cal-month-label">{MONTH_NAMES[month]} {year}</span>
        <button className="cal-nav-btn" type="button" onClick={onNext}>›</button>
      </div>
      <div className="cal-grid">
        {CAL_DAYS.map(d => <div key={d} className="cal-day-name">{d}</div>)}
        {buildCells(year, month).map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;
          const ds = toDateStr(year, month, day);
          return (
            <button key={day} type="button"
              className={`cal-day ${ds === todayStr ? "today" : ""} ${ds === selected ? "picked" : ""}`}
              onClick={() => onPick(ds)}
            >{day}</button>
          );
        })}
      </div>
      <div className="cal-footer">
        <button className="cal-today-btn" type="button" onClick={() => onPick(todayStr)}>Today</button>
      </div>
    </div>
  );
}

function formatDue(d: string) {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function ConvertTaskForm({ capture, projects, onDone, onCancel }: {
  capture: Capture;
  projects: Project[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [name, setName]           = useState(capture.text);
  const [priority, setPriority]   = useState<Priority>("medium");
  const [due, setDue]             = useState("");
  const [projectId, setProjectId] = useState<number | null>(null);
  const [saving, setSaving]       = useState(false);

  const todayD   = new Date();
  const todayStr = toDateStr(todayD.getFullYear(), todayD.getMonth(), todayD.getDate());
  const [calOpen, setCalOpen]   = useState(false);
  const [calYear, setCalYear]   = useState(todayD.getFullYear());
  const [calMonth, setCalMonth] = useState(todayD.getMonth());
  const [calPos, setCalPos]     = useState<React.CSSProperties>({});
  const calRef    = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (calRef.current && !calRef.current.contains(e.target as Node) &&
          triggerRef.current && !triggerRef.current.contains(e.target as Node)) setCalOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const openCal = () => {
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - r.bottom;
      const pos: React.CSSProperties = spaceBelow < 320
        ? { bottom: window.innerHeight - r.top + 6 }
        : { top: r.bottom + 6 };
      if (window.innerWidth - r.left < 280) pos.right = window.innerWidth - r.right;
      else pos.left = r.left;
      setCalPos(pos);
    }
    setCalOpen(o => !o);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await addTask({ name: name.trim(), description: "", priority, due, project_id: projectId });
      await updateCaptureStatus(capture.id, "converted");
      onDone();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  return (
    <div className="capture-convert-form">
      <div className="ccf-label">Convert to Task</div>

      <input className="panel-input" value={name} onChange={e => setName(e.target.value)} autoFocus />

      <div className="ccf-row">
        <div className="ccf-group">
          <span className="ccf-sublabel">Priority</span>
          <div style={{ display: "flex", gap: 6 }}>
            {PRIORITIES.map(p => (
              <button key={p} type="button"
                className={`ccf-pill ${priority === p ? "selected" : ""}`}
                style={priority === p ? { borderColor: priorityColor[p], color: priorityColor[p], background: priorityColor[p] + "18" } : {}}
                onClick={() => setPriority(p)}
              >
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: priorityColor[p], display: "inline-block", marginRight: 5 }} />
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="ccf-group">
          <span className="ccf-sublabel">Due date</span>
          <div className="cal-wrapper" ref={calRef}>
            <button ref={triggerRef} type="button" className={`cal-trigger ${due ? "has-value" : ""}`}
              onClick={openCal}>
              <span className="cal-trigger-icon">📅</span>
              <span>{due ? formatDue(due) : "Pick a date"}</span>
              {due && <span className="cal-clear" onClick={e => { e.stopPropagation(); setDue(""); }}>✕</span>}
            </button>
            {calOpen && (
              <div ref={calRef}>
                <CalPop
                  year={calYear} month={calMonth} selected={due} todayStr={todayStr}
                  style={calPos}
                  onPrev={() => calMonth === 0 ? (setCalMonth(11), setCalYear(y => y - 1)) : setCalMonth(m => m - 1)}
                  onNext={() => calMonth === 11 ? (setCalMonth(0), setCalYear(y => y + 1)) : setCalMonth(m => m + 1)}
                  onPick={d => { setDue(d); setCalOpen(false); }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {projects.length > 0 && (
        <div className="ccf-group">
          <span className="ccf-sublabel">Project</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button type="button"
              className={`ccf-pill ${projectId === null ? "selected" : ""}`}
              onClick={() => setProjectId(null)}
            >None</button>
            {projects.map(p => (
              <button key={p.id} type="button"
                className={`ccf-pill ${projectId === p.id ? "selected" : ""}`}
                style={projectId === p.id ? { borderColor: p.color, color: p.color, background: p.color + "18" } : {}}
                onClick={() => setProjectId(p.id)}
              >
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: p.color, display: "inline-block", marginRight: 5 }} />
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="ccf-actions">
        <button className="panel-btn-cancel" onClick={onCancel}>Cancel</button>
        <button className="panel-btn-submit" style={{ padding: "8px 20px" }} onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Create Task"}
        </button>
      </div>
    </div>
  );
}

// ─── Convert-to-Goal inline form ─────────────────────────────────────────────

function ConvertGoalForm({ capture, onDone, onCancel }: {
  capture: Capture;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [name, setName]         = useState(capture.text);
  const [description, setDesc]  = useState("");
  const [type, setType]         = useState<"longterm" | "financial" | "personal">("longterm");
  const [currentAmt, setCurrentAmt] = useState("");
  const [targetAmt, setTargetAmt]   = useState("");
  const [startDate, setStartDate]   = useState("");
  const [endDate, setEndDate]       = useState("");
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState("");

  // Calendar state
  const todayD   = new Date();
  const todayStr = toDateStr(todayD.getFullYear(), todayD.getMonth(), todayD.getDate());
  const [startCalOpen, setStartCalOpen] = useState(false);
  const [endCalOpen,   setEndCalOpen]   = useState(false);
  const [startCalYear, setStartCalYear] = useState(todayD.getFullYear());
  const [startCalMonth,setStartCalMonth]= useState(todayD.getMonth());
  const [endCalYear,   setEndCalYear]   = useState(todayD.getFullYear());
  const [endCalMonth,  setEndCalMonth]  = useState(todayD.getMonth());
  const [startCalPos,  setStartCalPos]  = useState<React.CSSProperties>({});
  const [endCalPos,    setEndCalPos]    = useState<React.CSSProperties>({});
  const startTrigRef = useRef<HTMLButtonElement | null>(null);
  const endTrigRef   = useRef<HTMLButtonElement | null>(null);
  const startCalRef  = useRef<HTMLDivElement>(null);
  const endCalRef    = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (startCalRef.current && !startCalRef.current.contains(e.target as Node) &&
          startTrigRef.current && !startTrigRef.current.contains(e.target as Node)) setStartCalOpen(false);
      if (endCalRef.current && !endCalRef.current.contains(e.target as Node) &&
          endTrigRef.current && !endTrigRef.current.contains(e.target as Node)) setEndCalOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const openCal = (
    which: "start" | "end",
    trigRef: React.RefObject<HTMLButtonElement | null>
  ) => {
    if (trigRef.current) {
      const r = trigRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - r.bottom;
      const pos: React.CSSProperties = spaceBelow < 320
        ? { bottom: window.innerHeight - r.top + 6 }
        : { top: r.bottom + 6 };
      if (window.innerWidth - r.left < 280) pos.right = window.innerWidth - r.right;
      else pos.left = r.left;
      if (which === "start") { setStartCalPos(pos); setStartCalOpen(o => !o); setEndCalOpen(false); }
      else                   { setEndCalPos(pos);   setEndCalOpen(o => !o);   setStartCalOpen(false); }
    }
  };

  const formatDate = (d: string) => {
    if (!d) return "";
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  };

  const handleSave = async () => {
    if (!name.trim()) { setError("Name is required."); return; }
    if (type === "financial" && !targetAmt) { setError("Target amount is required."); return; }
    if (type === "personal" && (!startDate || !endDate)) { setError("Start and end dates are required."); return; }
    setSaving(true);
    try {
      const input: NewGoalInput = {
        type, name: name.trim(), description: description.trim(), color: "#7c6af7",
        progress: 0,
        current_amount: type === "financial" ? Number(currentAmt) || 0 : 0,
        target_amount:  type === "financial" ? Number(targetAmt)  || 0 : 0,
        start_date: type === "personal" ? startDate : "",
        end_date:   type === "personal" ? endDate   : "",
      };
      await addGoal(input);
      await updateCaptureStatus(capture.id, "converted");
      onDone();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  return (
    <div className="capture-convert-form">
      <div className="ccf-label">Convert to Goal</div>
      <input className="panel-input" value={name} onChange={e => { setName(e.target.value); setError(""); }} autoFocus />

      <textarea
        className="panel-textarea"
        placeholder="Why is this goal important to you?"
        value={description}
        onChange={e => setDesc(e.target.value)}
        rows={2}
      />

      <div className="ccf-group">
        <span className="ccf-sublabel">Goal type</span>
        <div style={{ display: "flex", gap: 6 }}>
          {(["longterm","financial","personal"] as const).map(t => (
            <button key={t} type="button"
              className={`ccf-pill ${type === t ? "selected" : ""}`}
              style={type === t ? { borderColor: "var(--accent)", color: "var(--accent)", background: "var(--accent)18" } : {}}
              onClick={() => { setType(t); setError(""); }}
            >
              {t === "longterm" ? "Long Term" : t === "financial" ? "Financial" : "Personal"}
            </button>
          ))}
        </div>
      </div>

      {/* Financial fields */}
      {type === "financial" && (
        <div className="ccf-row">
          <div className="ccf-group">
            <span className="ccf-sublabel">Target ($) *</span>
            <input className="panel-input" type="number" min={0} placeholder="10000"
              value={targetAmt} onChange={e => { setTargetAmt(e.target.value); setError(""); }} />
          </div>
          <div className="ccf-group">
            <span className="ccf-sublabel">Current saved ($)</span>
            <input className="panel-input" type="number" min={0} placeholder="0"
              value={currentAmt} onChange={e => setCurrentAmt(e.target.value)} />
          </div>
        </div>
      )}

      {/* Personal fields */}
      {type === "personal" && (
        <div className="ccf-row">
          <div className="ccf-group">
            <span className="ccf-sublabel">Start date *</span>
            <div className="cal-wrapper">
              <button ref={startTrigRef} type="button"
                className={`cal-trigger ${startDate ? "has-value" : ""}`}
                onClick={() => openCal("start", startTrigRef)}>
                <span className="cal-trigger-icon">📅</span>
                <span>{startDate ? formatDate(startDate) : "Pick a date"}</span>
                {startDate && <span className="cal-clear" onClick={e => { e.stopPropagation(); setStartDate(""); }}>✕</span>}
              </button>
              {startCalOpen && (
                <div ref={startCalRef}>
                  <CalPop year={startCalYear} month={startCalMonth} selected={startDate}
                    todayStr={todayStr} style={startCalPos}
                    onPrev={() => startCalMonth===0 ? (setStartCalMonth(11),setStartCalYear(y=>y-1)) : setStartCalMonth(m=>m-1)}
                    onNext={() => startCalMonth===11 ? (setStartCalMonth(0),setStartCalYear(y=>y+1)) : setStartCalMonth(m=>m+1)}
                    onPick={d => { setStartDate(d); setStartCalOpen(false); setError(""); }}
                  />
                </div>
              )}
            </div>
          </div>
          <div className="ccf-group">
            <span className="ccf-sublabel">End date *</span>
            <div className="cal-wrapper">
              <button ref={endTrigRef} type="button"
                className={`cal-trigger ${endDate ? "has-value" : ""}`}
                onClick={() => openCal("end", endTrigRef)}>
                <span className="cal-trigger-icon">📅</span>
                <span>{endDate ? formatDate(endDate) : "Pick a date"}</span>
                {endDate && <span className="cal-clear" onClick={e => { e.stopPropagation(); setEndDate(""); }}>✕</span>}
              </button>
              {endCalOpen && (
                <div ref={endCalRef}>
                  <CalPop year={endCalYear} month={endCalMonth} selected={endDate}
                    todayStr={todayStr} style={endCalPos}
                    onPrev={() => endCalMonth===0 ? (setEndCalMonth(11),setEndCalYear(y=>y-1)) : setEndCalMonth(m=>m-1)}
                    onNext={() => endCalMonth===11 ? (setEndCalMonth(0),setEndCalYear(y=>y+1)) : setEndCalMonth(m=>m+1)}
                    onPick={d => { setEndDate(d); setEndCalOpen(false); setError(""); }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {error && <p className="panel-error">{error}</p>}

      <div className="ccf-actions">
        <button className="panel-btn-cancel" onClick={onCancel}>Cancel</button>
        <button className="panel-btn-submit" style={{ padding: "8px 20px" }} onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Create Goal"}
        </button>
      </div>
    </div>
  );
}

// ─── Single capture item ──────────────────────────────────────────────────────

function CaptureItem({ capture, projects, onStatusChange, onDelete }: {
  capture: Capture;
  projects: Project[];
  onStatusChange: (id: number, status: string) => void;
  onDelete: (id: number) => void;
}) {
  const [mode, setMode] = useState<"idle" | "task" | "goal">("idle");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mode === "idle") return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setMode("idle");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [mode]);

  const handleKeep = async () => {
    await updateCaptureStatus(capture.id, "dismissed");
    onStatusChange(capture.id, "dismissed");
  };

  if (mode === "task") return (
    <div ref={containerRef}>
      <ConvertTaskForm
        capture={capture} projects={projects}
        onDone={() => onStatusChange(capture.id, "converted")}
        onCancel={() => setMode("idle")}
      />
    </div>
  );

  if (mode === "goal") return (
    <div ref={containerRef}>
      <ConvertGoalForm
        capture={capture}
        onDone={() => onStatusChange(capture.id, "converted")}
        onCancel={() => setMode("idle")}
      />
    </div>
  );

  return (
    <div className="capture-item">
      <div className="capture-item-top">
        <span className="capture-item-dot">💭</span>
        <span className="capture-item-text">{capture.text}</span>
        <span className="capture-item-time">{timeAgo(capture.created_at)}</span>
      </div>
      <div className="capture-item-actions">
        <button className="capture-action-btn task" onClick={() => setMode("task")}>→ Task</button>
        <button className="capture-action-btn goal" onClick={() => setMode("goal")}>→ Goal</button>
        <button className="capture-action-btn keep" onClick={handleKeep}>📌 Keep</button>
        <button className="capture-action-btn dismiss" onClick={() => onDelete(capture.id)}>✕</button>
      </div>
    </div>
  );
}

// ─── Main Inbox Page ──────────────────────────────────────────────────────────

export default function Inbox() {
  const [captures, setCaptures]   = useState<Capture[]>([]);
  const [projects, setProjects]   = useState<Project[]>([]);
  const [loading, setLoading]     = useState(true);
  const [input, setInput]         = useState("");
  const [showProcessed, setShowProcessed] = useState(false);
  const inputRef                  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    Promise.all([getCaptures(), getProjects()])
      .then(([cs, ps]) => { setCaptures(cs); setProjects(ps); })
      .catch(console.error)
      .finally(() => setLoading(false));

    // Focus input on mount
    inputRef.current?.focus();
  }, []);

  const handleCapture = async () => {
    if (!input.trim()) return;
    try {
      const created = await addCapture(input.trim());
      setCaptures(cs => [created, ...cs]);
      setInput("");
      inputRef.current?.focus();
    } catch (e) { console.error(e); }
  };

  const handleStatusChange = (id: number, status: string) => {
    setCaptures(cs => cs.map(c => c.id === id ? { ...c, status: status as any } : c));
  };

  const handleDelete = async (id: number) => {
    setCaptures(cs => cs.filter(c => c.id !== id));
    try { await deleteCapture(id); }
    catch (e) { console.error(e); }
  };

  const inbox     = captures.filter(c => c.status === "inbox");
  const processed = captures.filter(c => c.status !== "inbox");

  if (loading) return <div className="page-placeholder"><p>Loading...</p></div>;

  return (
    <div className="inbox-page">

      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <div className="projects-header">
        <div>
          <h2 className="projects-title">Inbox</h2>
          <p className="projects-sub">
            {inbox.length} item{inbox.length !== 1 ? "s" : ""} to triage
          </p>
        </div>
      </div>

      {/* ── CAPTURE INPUT ───────────────────────────────────────────────────── */}
      <div className="inbox-compose">
        <textarea
          ref={inputRef}
          className="inbox-input"
          placeholder="What's on your mind? Capture it and decide later..."
          value={input}
          rows={3}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleCapture();
            }
          }}
        />
        <div className="inbox-compose-footer">
          <button
            className="inbox-capture-btn"
            onClick={handleCapture}
            disabled={!input.trim()}
          >
            Capture
          </button>
        </div>
      </div>


      {/* ── INBOX ITEMS ─────────────────────────────────────────────────────── */}
      {inbox.length === 0 ? (
        <div className="inbox-empty">
          <div className="inbox-empty-icon">📭</div>
          <p className="inbox-empty-title">Inbox zero</p>
          <p className="inbox-empty-sub">Everything's been triaged. Nice work.</p>
        </div>
      ) : (
        <div className="capture-list">
          {inbox.map(c => (
            <CaptureItem
              key={c.id} capture={c} projects={projects}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* ── PROCESSED ───────────────────────────────────────────────────────── */}
      {processed.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <div className="section-header" onClick={() => setShowProcessed(s => !s)}>
            <span className={`section-toggle ${showProcessed ? "" : "collapsed"}`}>▼</span>
            <span className="section-title" style={{ color: "var(--muted)" }}>
              Processed · {processed.length}
            </span>
          </div>
          {showProcessed && (
            <div className="capture-list processed">
              {processed.map(c => (
                <div key={c.id} className="capture-item processed">
                  <div className="capture-item-top">
                    <span style={{ fontSize: 13 }}>{c.status === "converted" ? "✓" : "📌"}</span>
                    <span className="capture-item-text">{c.text}</span>
                    <span className="capture-item-time">{timeAgo(c.created_at)}</span>
                    <span className={`capture-status-badge ${c.status}`}>
                      {c.status === "converted" ? "Converted" : "Kept"}
                    </span>
                  </div>
                  <button
                    className="capture-action-btn dismiss"
                    style={{ marginLeft: "auto", marginTop: 4 }}
                    onClick={() => handleDelete(c.id)}
                  >Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}