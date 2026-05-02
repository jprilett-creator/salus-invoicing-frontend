import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

export function Layout() {
  return (
    <div className="min-h-screen flex bg-page">
      <Sidebar />
      <main className="flex-1 min-w-0 flex flex-col">
        <div className="flex-1">
          <Outlet />
        </div>
        <footer className="px-10 py-6 text-xs text-ink-muted">
          © 2026, Salus Global Platform Pte Ltd. All rights reserved.
        </footer>
      </main>
    </div>
  );
}
