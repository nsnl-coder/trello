import { Link, Outlet } from "react-router-dom";
import { LayoutDashboard } from "lucide-react";

// Guest pages (login, register, password flows) share a slim branded header.
export function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="flex h-16 shrink-0 items-center border-b border-slate-200 bg-white px-4">
        <Link to="/" className="flex items-center gap-1.5 font-semibold text-slate-900">
          <LayoutDashboard className="h-5 w-5 text-indigo-600" />
          Trello Clone
        </Link>
      </header>
      <Outlet />
    </div>
  );
}
