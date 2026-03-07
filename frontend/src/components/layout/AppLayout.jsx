// src/components/layout/AppLayout.jsx
import { useState }        from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useDispatch, useSelector }     from "react-redux";
import { logoutThunk }     from "../../store/slices/authSlice.js";

const NAV = [
  { to: "/dashboard",    label: "Dashboard",     icon: "⊞" },
  { to: "/books",        label: "Catalog",        icon: "📚" },
  { to: "/members",      label: "Members",        icon: "👥" },
  { to: "/transactions", label: "Transactions",   icon: "↔" },
  { to: "/overdue",      label: "Overdue",        icon: "⚠",  adminOnly: true },
];

export default function AppLayout() {
  const dispatch    = useDispatch();
  const navigate    = useNavigate();
  const { librarian } = useSelector((s) => s.auth);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await dispatch(logoutThunk());
    navigate("/login");
  };

  const filteredNav = NAV.filter(
    (n) => !n.adminOnly || librarian?.role === "admin"
  );

  return (
    <div className="flex h-screen bg-surface overflow-hidden font-body">
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-100
                    shadow-sm flex flex-col transform transition-transform duration-200
                    lg:relative lg:translate-x-0
                    ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Brand */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-100">
          <span className="text-2xl">📖</span>
          <div>
            <p className="font-display font-semibold text-slate-800 leading-tight">LibraryOS</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">University System</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {filteredNav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                 ${isActive
                   ? "bg-primary/10 text-primary"
                   : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`
              }
            >
              <span className="text-base w-5 text-center">{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
              {librarian?.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{librarian?.name}</p>
              <p className="text-xs text-slate-400 capitalize">{librarian?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-slate-400 hover:text-red-500 transition-colors text-xs"
              title="Logout"
            >
              ⎋
            </button>
          </div>
        </div>
      </aside>

      {/* Backdrop (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Main content ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-slate-100 flex items-center px-4 lg:px-6 gap-4 shrink-0">
          <button
            className="lg:hidden text-slate-500 hover:text-slate-800"
            onClick={() => setSidebarOpen(true)}
          >
            ☰
          </button>
          <div className="flex-1" />
          <span className="text-xs font-mono text-slate-400 hidden sm:block">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
          </span>
        </header>

        {/* Page */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}