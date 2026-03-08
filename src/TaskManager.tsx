import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import "./style/main.css";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import Home from "./pages/Home";
import Inbox from "./pages/Inbox";
import Portfolios from "./pages/Portfolios";
import ProjectDetail from "./pages/ProjectDetail";
import GoalDetail from "./pages/GoalDetail";
import Goals from "./pages/Goals";

export default function TaskManager() {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  return (
    <div className="app">
      <Sidebar
        sidebarOpen={sidebarOpen}
        onCloseSidebar={() => setSidebarOpen(false)}
      />

      <main className="main">
        <Topbar
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(o => !o)}
        />

        <div className="content">
          <Routes>
            <Route path="/"           element={<Navigate to="/home" replace />} />
            <Route path="/home"       element={<Home />} />
            <Route path="/inbox"      element={<Inbox />} />
            <Route path="/portfolios" element={<Portfolios />} />
            <Route path="/projects/:id"  element={<ProjectDetail />} />
            <Route path="/goals/:id"      element={<GoalDetail />} />
            <Route path="/goals"      element={<Goals />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}