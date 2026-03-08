import { useLocation } from "react-router-dom";
import type { TopbarProps, NavItem } from "../types";

export default function Topbar({ sidebarOpen, onToggleSidebar }: TopbarProps) {

  const navMain: NavItem[] = [
    { icon: "🏠", label: "Home",       path: "/home" },
    { icon: "🔔", label: "Capture",      path: "/inbox" },
    { icon: "📁", label: "Portfolios", path: "/portfolios" },
    { icon: "🎯", label: "Goals",      path: "/goals" },
  ];

  const { pathname } = useLocation();
  const current = navMain.find(n => n.path === pathname);
  const pageTitle = current?.label ?? "Home";

  return (
    <div className="topbar">
      <button
        className="menu-btn"
        onClick={onToggleSidebar}
        aria-label={sidebarOpen ? "Close menu" : "Open menu"}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <line x1="2"  y1="4.5"  x2="16" y2="4.5" />
          <line x1="2"  y1="9"    x2="16" y2="9" />
          <line x1="2"  y1="13.5" x2="16" y2="13.5" />
        </svg>
      </button>

      <div className="page-title">{pageTitle}</div>
    </div>
  );
}