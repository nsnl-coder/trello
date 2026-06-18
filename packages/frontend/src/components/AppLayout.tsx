import { Link, Outlet } from "react-router-dom";
import { LayoutDashboard, LogOut } from "lucide-react";
import { useLogout } from "../hooks/useLogout";
import { Sidebar } from "./Sidebar";

// Shell for signed-in app pages: fixed-height row of [sidebar | content].
// Content scrolls on its own so the sidebar stays put while navigating.
export function AppLayout() {
  const logout = useLogout();

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 md:hidden">
          <Link to="/" className="flex items-center gap-1.5 font-semibold text-slate-900">
            <LayoutDashboard className="h-5 w-5 text-indigo-600" />
            Trello Clone
          </Link>
          <button
            type="button"
            onClick={logout.run}
            disabled={logout.pending}
            className="flex items-center gap-1.5 text-sm text-slate-600 disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </header>
        <Outlet />
      </div>
    </div>
  );
}
