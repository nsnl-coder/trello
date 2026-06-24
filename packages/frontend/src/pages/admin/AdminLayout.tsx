import { Link, NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  ShieldCheck,
  Users,
  Bug,
  DatabaseBackup,
  LineChart,
  Database,
  ExternalLink,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  type LucideIcon,
} from "lucide-react";
import { Permission } from "shared";
import { Can } from "../../features/rbac/components/Can";
import { config } from "../../config/env.config";
import { useAuthStore } from "../../hooks/useAuthStore";
import { useSidebarStore } from "../../hooks/useSidebarStore";
import { useLogout } from "../../hooks/useLogout";
import { NotificationBell } from "../../features/notification/components/NotificationBell";
import { ReportBugButton } from "../../features/bug-report/components/ReportBugButton";
import { ThemeToggle } from "../../components/ThemeToggle";
import { AccountMenu } from "../../components/AccountMenu";
import { ImpersonationBanner } from "../../components/ImpersonationBanner";

interface AdminNavItem {
  to: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  perm: Permission;
}

const NAV_ITEMS: AdminNavItem[] = [
  {
    to: "/admin/roles",
    label: "Roles",
    hint: "Permissions & access",
    icon: ShieldCheck,
    perm: Permission.AdminRolesRead,
  },
  {
    to: "/admin/users",
    label: "Users",
    hint: "Accounts & assignments",
    icon: Users,
    perm: Permission.AdminUsersRead,
  },
  {
    to: "/admin/bugs",
    label: "Bugs",
    hint: "Reports & triage",
    icon: Bug,
    perm: Permission.AdminBugsRead,
  },
  {
    to: "/admin/backup",
    label: "Backup",
    hint: "Snapshots & restore",
    icon: DatabaseBackup,
    perm: Permission.AdminBackupRead,
  },
];

interface OpsLink {
  href: string;
  label: string;
  hint: string;
  icon: LucideIcon;
}

// External admin consoles on sibling subdomains (admin SSO-gated). Empty on
// local, where these hosts don't exist.
function opsLinks(): OpsLink[] {
  if (!config.opsConsoles) return [];
  return [
    { href: config.opsConsoles.grafana, label: "Grafana", hint: "Metrics, logs & traces", icon: LineChart },
    { href: config.opsConsoles.redis, label: "RedisInsight", hint: "Cache & realtime bus", icon: Database },
  ];
}

const navItemClass = ({ isActive }: { isActive: boolean }) =>
  `group flex items-start gap-3 rounded-lg px-3 py-2 text-sm transition ${
    isActive
      ? "bg-indigo-50 font-medium text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
      : "text-foreground/70 hover:bg-surface-muted"
  }`;

function AdminSidebar() {
  const collapsed = useSidebarStore((s) => s.collapsed);
  const toggleCollapsed = useSidebarStore((s) => s.toggle);
  const isSuperuser = useAuthStore((s) => s.user?.isSuperuser ?? false);
  const ops = isSuperuser ? opsLinks() : [];
  const logout = useLogout();

  if (collapsed) {
    return (
      <aside className="hidden w-14 shrink-0 flex-col items-center border-r border-border bg-surface py-3 md:flex">
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label="Expand sidebar"
          title="Expand sidebar"
          className="rounded-lg p-2 text-muted hover:bg-surface-muted hover:text-foreground"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
        <Link
          to="/"
          aria-label="Home"
          className="mt-1 rounded-lg p-2 text-indigo-600 hover:bg-surface-muted"
        >
          <LayoutDashboard className="h-5 w-5" />
        </Link>
        {NAV_ITEMS.map((item) => (
          <Can key={item.to} perm={item.perm}>
            <NavLink
              to={item.to}
              aria-label={item.label}
              title={item.label}
              className={({ isActive }) =>
                `rounded-lg p-2 ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
                    : "text-muted hover:bg-surface-muted hover:text-foreground"
                }`
              }
            >
              <item.icon className="h-4 w-4" />
            </NavLink>
          </Can>
        ))}
        {ops.map((link) => (
          <a
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={link.label}
            title={link.label}
            className="rounded-lg p-2 text-muted hover:bg-surface-muted hover:text-foreground"
          >
            <link.icon className="h-4 w-4" />
          </a>
        ))}

        <div className="mt-auto flex flex-col items-center gap-1">
          <ThemeToggle compact />
          <ReportBugButton />
          <button
            type="button"
            onClick={logout.run}
            disabled={logout.pending}
            aria-label="Log out"
            className="rounded-lg p-2 text-muted hover:bg-surface-muted hover:text-foreground disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface md:flex">
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-1.5 font-semibold text-foreground">
            <LayoutDashboard className="h-5 w-5 text-indigo-600" />
            Trello Clone
          </Link>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
              className="rounded-lg p-1.5 text-muted hover:bg-surface-muted hover:text-foreground"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3">
        <span className="px-3 text-xs font-semibold uppercase tracking-wide text-muted">
          Administration
        </span>
        <nav className="mt-1 flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => (
            <Can key={item.to} perm={item.perm}>
              <NavLink to={item.to} className={navItemClass}>
                {({ isActive }) => (
                  <>
                    <item.icon
                      className={`mt-0.5 h-4 w-4 shrink-0 ${
                        isActive
                          ? "text-indigo-600 dark:text-indigo-300"
                          : "text-muted group-hover:text-foreground/70"
                      }`}
                    />
                    <span className="flex flex-col leading-tight">
                      <span>{item.label}</span>
                      <span className="text-xs text-muted">{item.hint}</span>
                    </span>
                  </>
                )}
              </NavLink>
            </Can>
          ))}
        </nav>

        {ops.length > 0 && (
          <>
            <span className="mt-4 px-3 text-xs font-semibold uppercase tracking-wide text-muted">
              Observability
            </span>
            <nav className="mt-1 flex flex-col gap-0.5">
              {ops.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-3 rounded-lg px-3 py-2 text-sm text-foreground/70 transition hover:bg-surface-muted"
                >
                  <link.icon className="mt-0.5 h-4 w-4 shrink-0 text-muted group-hover:text-foreground/70" />
                  <span className="flex flex-1 flex-col leading-tight">
                    <span className="flex items-center gap-1">
                      {link.label}
                      <ExternalLink className="h-3 w-3 text-muted" />
                    </span>
                    <span className="text-xs text-muted">{link.hint}</span>
                  </span>
                </a>
              ))}
            </nav>
          </>
        )}
      </div>

      <div className="flex items-center gap-1 border-t border-border p-3">
        <div className="min-w-0 flex-1">
          <AccountMenu />
        </div>
        <ReportBugButton />
      </div>
    </aside>
  );
}

export function AdminLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <AdminSidebar />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <ImpersonationBanner />
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-4 md:hidden">
          <Link to="/" className="flex items-center gap-1.5 font-semibold text-foreground">
            <LayoutDashboard className="h-5 w-5 text-indigo-600" />
            Trello Clone
          </Link>
          <NotificationBell />
        </header>

        <div className="min-w-0 flex-1 px-4 py-8 lg:px-8">
          {/* Mobile: horizontal nav fallback */}
          <nav className="mb-6 flex gap-2 overflow-x-auto md:hidden">
            {NAV_ITEMS.map((item) => (
              <Can key={item.to} perm={item.perm}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium ${
                      isActive
                        ? "bg-surface text-indigo-700 ring-1 ring-border"
                        : "text-foreground/70 hover:bg-surface/60"
                    }`
                  }
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              </Can>
            ))}
          </nav>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
