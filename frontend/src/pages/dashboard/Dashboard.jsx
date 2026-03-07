// src/pages/dashboard/Dashboard.jsx
import { useEffect, useState } from "react";
import { Link }                from "react-router-dom";
import { useSelector }         from "react-redux";
import api                     from "../../api/axios.js";

const StatCard = ({ label, value, sub, color }) => (
  <div className={`card border-l-4 ${color}`}>
    <p className="text-xs text-slate-500 uppercase tracking-widest font-medium">{label}</p>
    <p className="font-display text-3xl font-bold text-slate-800 mt-1">{value ?? "—"}</p>
    {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
  </div>
);

export default function Dashboard() {
  const { librarian } = useSelector((s) => s.auth);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    // In a real app, one dedicated /api/dashboard/stats endpoint
    // Here we demo the pattern with parallel calls
    Promise.allSettled([
      api.get("/books?limit=1"),
      api.get("/members"),
      api.get("/transactions/overdue"),
    ]).then(([books, members, overdue]) => {
      setStats({
        books:   books.value?.data?.meta?.total   ?? 0,
        members: members.value?.data?.data?.length ?? 0,
        overdue: overdue.value?.data?.data?.length ?? 0,
      });
    });
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl text-slate-900">
          Good {new Date().getHours() < 12 ? "morning" : "afternoon"},{" "}
          {librarian?.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-slate-500 mt-1 text-sm">
          Here's what's happening in the library today.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Books"       value={stats?.books}   color="border-indigo-400" sub="Unique titles in catalog" />
        <StatCard label="Active Members"    value={stats?.members} color="border-emerald-400" sub="Students & Faculty" />
        <StatCard label="Overdue Returns"   value={stats?.overdue} color="border-amber-400"  sub="Require follow-up" />
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="font-display text-lg text-slate-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { to: "/books",        label: "Browse Catalog",    icon: "📚", color: "bg-indigo-50  text-indigo-700" },
            { to: "/members",      label: "View Members",      icon: "👥", color: "bg-emerald-50 text-emerald-700" },
            { to: "/transactions", label: "Issue / Return",    icon: "↔",  color: "bg-violet-50  text-violet-700" },
            { to: "/overdue",      label: "Overdue Report",    icon: "⚠",  color: "bg-amber-50   text-amber-700" },
          ].map(({ to, label, icon, color }) => (
            <Link
              key={to}
              to={to}
              className={`${color} rounded-xl p-4 flex flex-col gap-2 hover:opacity-80
                          transition-opacity font-medium text-sm`}
            >
              <span className="text-2xl">{icon}</span>
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}