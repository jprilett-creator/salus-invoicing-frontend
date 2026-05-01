import { NavLink } from "react-router-dom";
import { Building2, FileSpreadsheet, LogOut } from "lucide-react";
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
  { to: "/run-invoicing", label: "Run invoicing", icon: FileSpreadsheet },
];

export function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="w-64 shrink-0 bg-white border-r border-card-border flex flex-col">
      <div className="px-5 pt-7 pb-5">
        <SalusLogo />
      </div>

      <nav className="flex-1 px-3 py-2">
        <ul className="space-y-0.5">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "group flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors duration-150",
                      isActive
                        ? "bg-mint-dim text-mint-deep font-medium"
                        : "text-ink-dim hover:text-ink hover:bg-page"
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          isActive ? "text-mint-deep" : "text-ink-muted group-hover:text-ink-dim"
                        )}
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

      <div className="border-t border-card-border px-5 py-5">
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
