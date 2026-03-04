import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import TaskManager from "./TaskManager";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <HashRouter>
      <TaskManager />
    </HashRouter>
  </React.StrictMode>
);