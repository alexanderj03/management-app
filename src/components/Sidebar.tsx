import { NavLink } from "react-router-dom";
import type { SidebarProps } from "../types";
import { navMain, projects, favColors } from "../data/taskData";

export default function Sidebar({ sidebarOpen, onCloseSidebar }: SidebarProps) {
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
          {projects.map((p, i) => (
            <div key={p.name} className="nav-item">
              <span className="fav-dot" style={{ background: favColors[i % favColors.length] }} />
              {p.name}
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}