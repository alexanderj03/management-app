import { NavLink, useNavigate } from "react-router-dom";
import type { SidebarProps, Project } from "../types";
import { navMain } from "../data/taskData";
import { getProjects } from "../lib/db";
import { useState, useEffect } from "react";

export default function Sidebar({ sidebarOpen, onCloseSidebar }: SidebarProps) {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);

  const loadFavourites = () => {
    getProjects()
      .then(ps => setProjects(ps.filter(p => p.favourite)))
      .catch(console.error);
  };

  useEffect(() => {
    // Load on mount
    loadFavourites();

    // Re-fetch whenever a favourite is toggled anywhere in the app
    window.addEventListener("favourites-changed", loadFavourites);
    return () => window.removeEventListener("favourites-changed", loadFavourites);
  }, []);

  return (
    <>
      {sidebarOpen && (
        <div className="sidebar-scrim" onClick={onCloseSidebar} />
      )}

      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-top">
          <div className="workspace">
            <div className="ws-icon">T</div>
            <span className="ws-name">Taskbar</span>
            <span className="ws-chevron">⌄</span>
          </div>

          {navMain.map(n => (
            <NavLink
              key={n.label}
              to={n.path}
              className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
              onClick={onCloseSidebar}
            >
              <span className="nav-icon">{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </div>

        <div className="nav">
          <div className="nav-section-label">Favorites</div>
          {projects.length === 0 ? (
            <div style={{ padding: "6px 12px", fontSize: 12, color: "var(--muted2)" }}>
              No favourites yet
            </div>
          ) : (
            projects.map(project => (
              <div
                key={project.id}
                className="nav-item"
                style={{ cursor: "pointer" }}
                onClick={() => { navigate(`/projects/${project.id}`); onCloseSidebar(); }}
              >
                <span className="fav-dot" style={{ background: project.color }} />
                {project.name}
              </div>
            ))
          )}
        </div>
      </aside>
    </>
  );
}