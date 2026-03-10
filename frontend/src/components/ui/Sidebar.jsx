import { useSelector, useDispatch } from "react-redux";
import { NavLink, useNavigate } from "react-router-dom";
// import { logout } from "../../store/slices/authSlice"; // If you have a logout action

export default function Sidebar() {
  const { librarian } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Define menu items with role restrictions
  const menuItems = [
    { to: "/dashboard", label: "Dashboard", icon: "⊞", roles: ["admin", "staff", "student", "faculty"] },
    { to: "/books", label: "Catalog", icon: "📚", roles: ["admin", "staff", "student", "faculty"] },
    { to: "/members", label: "Members", icon: "👥", roles: ["admin", "staff"] },
    { to: "/transactions", label: "Transactions", icon: "↔", roles: ["admin", "staff"] },
    { to: "/overdue", label: "Overdue", icon: "⚠", roles: ["admin"] },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-100 shadow-sm flex flex-col lg:relative lg:translate-x-0">
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-100">
        <span className="text-2xl">📖</span>
        <div>
          <p className="font-display font-semibold text-slate-800 leading-tight">LibraryOS</p>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest">University System</p>
        </div>
      </div>

      {/* Dynamic Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {menuItems
          .filter(item => item.roles.includes(librarian?.role))
          .map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => 
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive 
                    ? "bg-indigo-50 text-indigo-600" // active style
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`
              }
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
      </nav>

      {/* User Profile Section */}
      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-sm">
            {librarian?.name?.[0] || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">{librarian?.name || "User"}</p>
            <p className="text-xs text-slate-400 capitalize">{librarian?.role || "guest"}</p>
          </div>
          <button 
            onClick={() => { /* dispatch(logout()); navigate("/login"); */ }}
            className="text-slate-400 hover:text-red-500 transition-colors text-xs" 
            title="Logout"
          >
            ⎋
          </button>
        </div>
      </div>
    </aside>
  );
}