import { useState, useEffect, useRef } from "react";
import type { Project, NewProjectInput } from "../types";
import { getProjects, addProject, deleteProject, toggleFavourite } from "../lib/db";

const PRESET_COLORS = [
  "#7c6af7", "#a78bfa", "#f76a8a", "#fb923c",
  "#f5a623", "#37c98a", "#2dd4bf", "#5b9cf6",
  "#60a5fa", "#e879f9", "#f43f5e", "#84cc16",
];

const darken = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, (n >> 16) - 30);
  const g = Math.max(0, ((n >> 8) & 0xff) - 30);
  const b = Math.max(0, (n & 0xff) - 30);
  return `#${r.toString(16).padStart(2,"0")}${g.toString(16).padStart(2,"0")}${b.toString(16).padStart(2,"0")}`;
};

export default function Projects() {
  const [projects, setProjects]   = useState<Project[]>([]);
  const [loading, setLoading]     = useState<boolean>(true);
  const [panelOpen, setPanelOpen] = useState<boolean>(false);

  const [name, setName]           = useState<string>("");
  const [description, setDesc]    = useState<string>("");
  const [color, setColor]         = useState<string>(PRESET_COLORS[0]);
  const [customColor, setCustom]  = useState<string>("");
  const [error, setError]         = useState<string>("");

  const colorInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getProjects()
      .then(setProjects)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const resetForm = () => {
    setName(""); setDesc(""); setColor(PRESET_COLORS[0]); setCustom(""); setError("");
  };

  const handleClose = () => { resetForm(); setPanelOpen(false); };

  const handleAdd = async () => {
    if (!name.trim()) { setError("Project name is required."); return; }

    const input: NewProjectInput = {
      name:        name.trim(),
      description: description.trim(),
      color:       customColor || color,
      favourite: false,
    };

    try {
      const created = await addProject(input);
      setProjects(ps => [created, ...ps]);
      resetForm();
      setPanelOpen(false);
    } catch (e) {
      console.error(e);
      setError("Failed to save project.");
    }
  };

  const handleDelete = async (id: number) => {
    setProjects(ps => ps.filter(p => p.id !== id));
    try { await deleteProject(id); }
    catch (e) {
      console.error(e);
      getProjects().then(setProjects);
    }
  };

  const handleFavourite = async (id: number, current: boolean) => {
    setProjects(ps => ps.map(p => p.id === id ? { ...p, favourite: !current } : p));
    try { await toggleFavourite(id, !current); }
    catch (e) {
      console.error(e);
      setProjects(ps => ps.map(p => p.id === id ? { ...p, favourite: current } : p));
    }
  };

  const activeColor = customColor || color;

  if (loading) return <div className="page-placeholder"><p>Loading projects...</p></div>;

  return (
    <div className="projects-page">
      {panelOpen && (
        <>
          <div className="panel-scrim" onClick={handleClose} />

          <div className="add-task-panel">
            <div className="panel-header">
              <span className="panel-title">New Project</span>
              <button className="panel-close" onClick={handleClose}>✕</button>
            </div>

            <div className="panel-body">

              {/* Name */}
              <div className="panel-field">
                <label className="panel-label">Project name <span className="panel-required">*</span></label>
                <input
                  className="panel-input"
                  placeholder="e.g. Marketing Campaign"
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
                  placeholder="What is this project about?"
                  value={description}
                  onChange={e => setDesc(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Colour picker */}
              <div className="panel-field">
                <label className="panel-label">Colour</label>

                {/* Preset swatches */}
                <div className="color-swatches">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      className={`color-swatch ${color === c && !customColor ? "selected" : ""}`}
                      style={{ background: c }}
                      onClick={() => { setColor(c); setCustom(""); }}
                      type="button"
                      aria-label={c}
                    />
                  ))}

                  {/* Custom colour trigger */}
                  <button
                    className={`color-swatch color-swatch-custom ${customColor ? "selected" : ""}`}
                    style={{ background: customColor || "var(--surface2)" }}
                    onClick={() => colorInputRef.current?.click()}
                    type="button"
                    aria-label="Custom colour"
                    title="Custom colour"
                  >
                    {!customColor && <span style={{ fontSize: 14, color: "var(--muted)" }}>+</span>}
                  </button>
                  <input
                    ref={colorInputRef}
                    type="color"
                    style={{ display: "none" }}
                    value={customColor || color}
                    onChange={e => setCustom(e.target.value)}
                  />
                </div>

                {/* Preview */}
                <div className="color-preview">
                  <div className="color-preview-dot" style={{ background: activeColor }} />
                  <span style={{ color: activeColor, fontWeight: 600, fontSize: 13 }}>
                    {name.trim() || "Project name"}
                  </span>
                  <span style={{ color: "var(--muted)", fontSize: 12, marginLeft: 4 }}>
                    {activeColor}
                  </span>
                </div>
              </div>

              {error && <p className="panel-error">{error}</p>}
            </div>

            <div className="panel-footer">
              <button className="panel-btn-cancel" onClick={handleClose}>Cancel</button>
              <button className="panel-btn-submit" onClick={handleAdd}>Create Project</button>
            </div>
          </div>
        </>
      )}

      <div className="projects-header">
        <div>
          <h2 className="projects-title">Projects</h2>
          <p className="projects-sub">{projects.length} project{projects.length !== 1 ? "s" : ""}</p>
        </div>
        <button className="projects-add-btn" onClick={() => setPanelOpen(true)}>
          + New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="projects-empty">
          <div className="projects-empty-icon">📁</div>
          <p className="projects-empty-title">No projects yet</p>
          <p className="projects-empty-sub">Create your first project to get started</p>
          <button className="panel-btn-submit" style={{ marginTop: 16, padding: "10px 24px" }} onClick={() => setPanelOpen(true)}>
            + New Project
          </button>
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map(project => (
            <div key={project.id} className="project-card-db">

              {/* Coloured top bar */}
              <div
                className="project-card-db-bar"
                style={{ background: `linear-gradient(135deg, ${project.color}, ${darken(project.color)})` }}
              />

              <div className="project-card-db-body">
                <div className="project-card-db-top">
                  <div
                    className="project-card-db-dot"
                    style={{ background: project.color, boxShadow: `0 0 8px ${project.color}88` }}
                  />
                  <span className="project-card-db-name" style={{ color: project.color }}>
                    {project.name}
                  </span>
                  <button
                    className={`project-card-fav ${project.favourite ? "active" : ""}`}
                    onClick={() => handleFavourite(project.id, project.favourite)}
                    aria-label={project.favourite ? "Remove from favourites" : "Add to favourites"}
                    title={project.favourite ? "Remove from home" : "Pin to home"}
                  >{project.favourite ? "★" : "☆"}</button>
                  <button
                    className="project-card-delete"
                    onClick={() => handleDelete(project.id)}
                    aria-label="Delete project"
                  >✕</button>
                </div>

                {project.description && (
                  <p className="project-card-db-desc">{project.description}</p>
                )}
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
}