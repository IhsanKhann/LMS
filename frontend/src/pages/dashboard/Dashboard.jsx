import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import api from "../../api/axios.js";

const StatCard = ({ label, value, sub, color }) => (
  <div className={`card border-l-4 ${color} p-4 bg-white shadow-sm rounded-lg`}>
    <p className="text-xs text-slate-500 uppercase tracking-widest font-medium">{label}</p>
    <p className="font-display text-3xl font-bold text-slate-800 mt-1">{value ?? "—"}</p>
    {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
  </div>
);

export default function Dashboard() {
  const { librarian } = useSelector((s) => s.auth);
  const [stats, setStats] = useState({ books: 0, members: 0, overdue: 0 });

  useEffect(() => {
    // Only fetch what the user is authorized to see to avoid 401/403 errors
    const fetchStats = async () => {
      try {
        const bookRes = await api.get("/books?limit=1");
        let memberCount = 0;
        let overdueCount = 0;

        if (["admin", "staff"].includes(librarian?.role)) {
          const res = await api.get("/members");
          memberCount = res.data?.data?.length || 0;
        }

        if (librarian?.role === "admin") {
          const res = await api.get("/transactions/overdue");
          overdueCount = res.data?.data?.length || 0;
        }

        setStats({
          books: bookRes.data?.meta?.total || 0,
          members: memberCount,
          overdue: overdueCount,
        });
      } catch (err) {
        console.error("Error fetching dashboard stats", err);
      }
    };

    fetchStats();
  }, [librarian]);

  // Define actions and filter by role
  const allActions = [
    { to: "/books", label: "Browse Catalog", icon: "📚", color: "bg-indigo-50 text-indigo-700", roles: ["admin", "staff", "student", "faculty"] },
    { to: "/books/manage", label: "Manage Books", icon: "⚙️", color: "bg-slate-50 text-slate-700", roles: ["admin", "staff"] },
    { to: "/members", label: "View Members", icon: "👥", color: "bg-emerald-50 text-emerald-700", roles: ["admin", "staff"] },
    { to: "/transactions", label: "Issue / Return", icon: "↔", color: "bg-violet-50 text-violet-700", roles: ["admin", "staff"] },
    { to: "/overdue", label: "Overdue Report", icon: "⚠", color: "bg-amber-50 text-amber-700", roles: ["admin"] },
  ];

  const filteredActions = allActions.filter(action => action.roles.includes(librarian?.role));

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="font-display text-3xl text-slate-900">
          Good {new Date().getHours() < 12 ? "morning" : "afternoon"}, {librarian?.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-slate-500 mt-1 text-sm">Library status: <strong>{librarian?.role}</strong> access.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Books" value={stats.books} color="border-indigo-400" sub="Unique titles" />
        {["admin", "staff"].includes(librarian?.role) && (
          <StatCard label="Active Members" value={stats.members} color="border-emerald-400" sub="Registered users" />
        )}
        {librarian?.role === "admin" && (
          <StatCard label="Overdue Returns" value={stats.overdue} color="border-amber-400" sub="Require follow-up" />
        )}
      </div>

      <div>
        <h2 className="font-display text-lg text-slate-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {filteredActions.map((action) => (
            <Link key={action.to} to={action.to} className={`${action.color} rounded-xl p-4 flex flex-col gap-2 hover:opacity-80 transition-opacity font-medium text-sm`}>
              <span className="text-2xl">{action.icon}</span>
              {action.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}