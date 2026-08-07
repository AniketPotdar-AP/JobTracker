import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Briefcase,
  Video,
  HelpCircle,
  CalendarDays,
  BarChart3,
  Settings as SettingsIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Home", icon: LayoutDashboard, exact: true },
  { to: "/applications", label: "Apps", icon: Briefcase },
  { to: "/interviews", label: "Interviews", icon: Video },
  { to: "/questions", label: "Questions", icon: HelpCircle },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/analytics", label: "Stats", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

export function MobileNav() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur-lg"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex items-center justify-between overflow-x-auto px-1 scrollbar-none">
        {items.map((it) => {
          const active = it.exact
            ? pathname === it.to
            : pathname === it.to || pathname.startsWith(it.to + "/");
          return (
            <li key={it.to}>
              <Link
                to={it.to}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 px-1 relative min-h-14 justify-center w-full",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                {/* Active indicator pill */}
                {active && (
                  <span className="absolute top-1.5 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-primary/20" />
                )}
                <it.icon
                  className={cn(
                    "h-5 w-5 transition-transform",
                    active && "scale-110",
                  )}
                />
                <span
                  className={cn(
                    "text-[10px] font-medium tracking-wide",
                    active && "font-semibold",
                  )}
                  title={it.label}
                >
                  {it.label.slice(0, 3)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
