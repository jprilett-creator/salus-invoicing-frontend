import { NavLink } from "react-router-dom";
import { Bell, Building2, FileSpreadsheet, LogOut, Repeat } from "lucide-react";
import { SalusLogo } from "./SalusLogo";
import { useAuth } from "../lib/auth";
import { cn } from "../lib/cn";

interface NavItem {
  to: string;
  label: string;
  icon: typeof Building2;
}

const NAV: NavItem[] = [
  { to: "/counterparties", label: "Counterparties", icon: Building2 },
  { to: "/subscriptions", label: "Subscriptions", icon: Repeat },
  { to: "/run-invoicing", label: "Run invoicing", icon: FileSpreadsheet },
];

export function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="w-60 shrink-0 bg-white border-r border-card-border flex flex-col">
      <div className="px-5 pt-5 pb-4 flex items-center justify-between">
        <SalusLogo height={22} />
        <button
          type="button"
          aria-label="Notifications"
          className="text-ink-muted hover:text-ink transition-colors p-1 -mr-1"
        >
          <Bell className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>

      <nav className="flex-1 px-3 py-4">
        <p className="px-3 mb-1.5 text-[10px] font-medium uppercase tracking-wider text-ink-muted">
          Workflow
        </p>
        <ul className="space-y-0.5">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "group flex items-center gap-2.5 px-3 h-9 rounded-md text-sm transition-colors duration-150",
                      isActive
                        ? "bg-neutral-bg text-ink font-medium"
                        : "text-ink-muted hover:text-ink hover:bg-page"
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          isActive ? "text-ink" : "text-ink-muted group-hover:text-ink"
                        )}
                        strokeWidth={1.75}
                      />
                      <span>{item.label}</span>
                    </>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-card-border px-5 py-4">
        <div className="text-sm font-medium text-ink truncate">
          {user?.display_name ?? user?.username ?? "Signed in"}
        </div>
        <div className="mt-0.5 text-xs text-ink-muted truncate">
          {user?.email ?? user?.username}
        </div>
        <button
          type="button"
          onClick={logout}
          className="mt-3 inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink underline-offset-4 hover:underline transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
