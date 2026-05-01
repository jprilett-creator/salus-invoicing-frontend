import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

export function Layout() {
  return (
    <div className="min-h-screen flex bg-page">
      <Sidebar />
      <main className="flex-1 min-w-0">
        <div className="mx-auto px-8 py-12 max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
