import { Suspense, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import SkeletonLoader from "../components/SkeletonLoader";
import "./mainlayout.css";

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="main">
        <Topbar onMenuToggle={() => setSidebarOpen(v => !v)} />

        <div key={location.key} className="content">
          <Suspense fallback={<div style={{ padding: 24 }}><SkeletonLoader variant="table" rows={5} /></div>}>
            <Outlet />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
