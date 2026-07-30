import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Briefcase,
  CalendarDays,
  BarChart3,
  Settings as SettingsIcon,
  Moon,
  Sun,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useApplicationsStore } from "@/store/useApplications";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/useAuth";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/applications", label: "Applications", icon: Briefcase },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

export function Sidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const theme = useApplicationsStore((s) => s.theme);
  const setTheme = useApplicationsStore((s) => s.setTheme);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.signOut);

  return (
    <aside className="hidden md:flex md:w-60 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 border-b px-5">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground font-bold shadow-sm">
          J
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold tracking-tight">JobTrack</span>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Applications</span>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 space-y-0.5 p-3">
        {nav.map((item) => {
          const active = item.exact
            ? pathname === item.to
            : pathname === item.to || pathname.startsWith(item.to + "/");
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="space-y-1 border-t p-3">
        {user && (
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-2 mb-1">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {user.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium">{user.name}</div>
              <div className="truncate text-[10px] text-muted-foreground">{user.email}</div>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          <span className="text-sm">{theme === "dark" ? "Light mode" : "Dark mode"}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
          onClick={() => void logout()}
        >
          <LogOut className="h-4 w-4" />
          <span className="text-sm">Sign out</span>
        </Button>
      </div>
    </aside>
  );
}
