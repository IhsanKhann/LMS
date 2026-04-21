// src/pages/dashboard/Dashboard.jsx
import { useEffect, useState } from "react";
import { Link }                from "react-router-dom";
import { useSelector }         from "react-redux";
import api                     from "../../api/axios.js";

const StatCard = ({ label, value, sub, color }) => (
  <div className={`card border-l-4 ${color} p-4 bg-white shadow-sm rounded-lg`}>
    <p className="text-xs text-slate-500 uppercase tracking-widest font-medium">{label}</p>
    <p className="font-display text-3xl font-bold text-slate-800 mt-1">{value ?? "—"}</p>
    {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
  </div>
);

export default function Dashboard() {
  const { librarian } = useSelector((s) => s.auth);
  const isAdmin = librarian?.role === "admin";
  const isStaff = ["admin", "staff"].includes(librarian?.role);

  const [stats, setStats] = useState({ books: 0, members: 0, overdue: 0, students: 0, faculty: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const bookRes = await api.get("/books", { params: { limit: 1 } });

        let memberCount  = 0;
        let overdueCount = 0;
        let studentCount = 0;
        let facultyCount = 0;

        if (isStaff) {
          const [memRes, stuRes, facRes] = await Promise.allSettled([
            api.get("/members"),
            api.get("/students", { params: { limit: 1 } }),
            api.get("/faculty",  { params: { limit: 1 } }),
          ]);

          memberCount  = memRes.data?.data?.length  || 0;

          // students and faculty use paginated responses — use meta.total
          studentCount = stuRes.data?.meta?.total   || 0;
          facultyCount = facRes.data?.meta?.total   || 0;
        }

        if (isAdmin) {
          const res    = await api.get("/transactions/overdue");
          overdueCount = res.data?.data?.length || 0;
        }

        setStats({
          books:   bookRes.data?.meta?.total || 0,
          members: memberCount,
          overdue: overdueCount,
          students: studentCount,
          faculty:  facultyCount,
        });
      } catch (err) {
        console.error("Error fetching dashboard stats", err);
      }
    };

    fetchStats();
  }, [isAdmin, isStaff]);

  const allActions = [
    {
      to:    "/books",
      label: "Browse Catalog",
      icon:  "📚",
      color: "bg-indigo-50 text-indigo-700",
      roles: ["admin", "staff", "student", "faculty"],
    },
    {
      to:    "/books/manage",
      label: "Manage Books",
      icon:  "⚙️",
      color: "bg-slate-50 text-slate-700",
      roles: ["admin", "staff"],
    },
    {
      to:    "/members",
      label: "View Members",
      icon:  "👥",
      color: "bg-emerald-50 text-emerald-700",
      roles: ["admin", "staff"],
    },
    {
      to:    "/students",
      label: "Students",
      icon:  "🎓",
      color: "bg-blue-50 text-blue-700",
      roles: ["admin", "staff"],
    },
    {
      to:    "/faculty",
      label: "Faculty",
      icon:  "🏫",
      color: "bg-violet-50 text-violet-700",
      roles: ["admin", "staff"],
    },
    {
      to:    "/transactions",
      label: "Issue / Return",
      icon:  "↔",
      color: "bg-violet-50 text-violet-700",
      roles: ["admin", "staff"],
    },
    {
      to:    "/overdue",
      label: "Overdue Report",
      icon:  "⚠",
      color: "bg-amber-50 text-amber-700",
      roles: ["admin"],
    },
    {
      to:    "/students/register",
      label: "Student Registration",
      icon:  "📝",
      color: "bg-sky-50 text-sky-700",
      roles: ["admin", "staff", "student", "faculty"],
    },
    {
      to:    "/faculty/register",
      label: "Faculty Registration",
      icon:  "🖊",
      color: "bg-fuchsia-50 text-fuchsia-700",
      roles: ["admin", "staff", "student", "faculty"],
    },
  ];

  const filteredActions = allActions.filter((a) => a.roles.includes(librarian?.role));
  const hour     = new Date().getHours();
  const greeting = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="font-display text-3xl text-slate-900">
          Good {greeting}, {librarian?.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-slate-500 mt-1 text-sm">
          Library status: <strong>{librarian?.role}</strong> access.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Books"     value={stats.books}   color="border-indigo-400" sub="Unique titles" />
        {isStaff && (
          <>
            <StatCard label="Active Members" value={stats.members}  color="border-emerald-400" sub="Registered users" />
            <StatCard label="Students"        value={stats.students} color="border-blue-400"    sub="In directory" />
            <StatCard label="Faculty"         value={stats.faculty}  color="border-violet-400"  sub="In directory" />
          </>
        )}
        {isAdmin && (
          <StatCard label="Overdue Returns" value={stats.overdue} color="border-amber-400" sub="Require follow-up" />
        )}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="font-display text-lg text-slate-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {filteredActions.map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className={`${action.color} rounded-xl p-4 flex flex-col gap-2
                          hover:opacity-80 transition-opacity font-medium text-sm`}
            >
              <span className="text-2xl">{action.icon}</span>
              {action.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}