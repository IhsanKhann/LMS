// src/pages/members/FacultyPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Admin/Staff view — full faculty directory with search, department filter.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState, useCallback } from "react";
import { Link }        from "react-router-dom";
import { useSelector } from "react-redux";
import api             from "../../api/axios.js";

export default function FacultyPage() {
  const { librarian }     = useSelector((s) => s.auth);
  const canManage         = ["admin", "staff"].includes(librarian?.role);

  const [faculty,    setFaculty]    = useState([]);
  const [meta,       setMeta]       = useState({});
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [page,       setPage]       = useState(1);
  const [departments, setDepts]     = useState([]);

  useEffect(() => {
    api.get("/departments").then(({ data }) => setDepts(data.data || [])).catch(() => {});
  }, []);

  const fetchFaculty = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/faculty", {
        params: { search, department_id: deptFilter || undefined, page, limit: 15 },
      });
      setFaculty(data.data);
      setMeta(data.meta);
    } finally {
      setLoading(false);
    }
  }, [search, deptFilter, page]);

  useEffect(() => { fetchFaculty(); }, [fetchFaculty]);

  const handleSearch = (val) => { setSearch(val); setPage(1); };
  const handleDept   = (val) => { setDeptFilter(val); setPage(1); };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-slate-900">Faculty</h1>
          <p className="text-slate-500 text-sm mt-1">{meta.total ?? "…"} faculty members</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            placeholder="Search name, emp. no. or designation…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="input max-w-xs"
          />
          <select value={deptFilter} onChange={(e) => handleDept(e.target.value)} className="input w-auto">
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.department_id} value={d.department_id}>{d.department_name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" />
          </div>
        ) : faculty.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <span className="text-4xl mb-3">🔍</span>
            <p className="font-medium">No faculty found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-slate-500 uppercase tracking-wider">
                <th className="pb-3 pr-4">Name</th>
                <th className="pb-3 pr-4">Employee No.</th>
                <th className="pb-3 pr-4">Department</th>
                <th className="pb-3 pr-4">Designation</th>
                <th className="pb-3 pr-4">Membership</th>
                <th className="pb-3">Portal</th>
                {canManage && <th className="pb-3 pl-4">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {faculty.map((f) => (
                <tr key={f.faculty_id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center
                                      text-violet-700 text-xs font-bold shrink-0">
                        {f.name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800 leading-tight">{f.name}</p>
                        <p className="text-xs text-slate-400">{f.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-4 font-mono text-xs text-slate-600">{f.employee_no}</td>
                  <td className="py-3 pr-4 text-slate-500 text-xs max-w-[140px] truncate">{f.department_name}</td>
                  <td className="py-3 pr-4">
                    {f.designation ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-violet-50 text-violet-700">
                        {f.designation}
                      </span>
                    ) : <span className="text-slate-300 text-xs">—</span>}
                  </td>
                  <td className="py-3 pr-4">
                    {f.membership_status ? (
                      <span className={f.membership_status === "active" ? "badge-available" : "badge-issued"}>
                        <span className={`w-1.5 h-1.5 rounded-full ${f.membership_status === "active" ? "bg-emerald-500" : "bg-amber-500"}`} />
                        {f.membership_status}
                      </span>
                    ) : <span className="text-xs text-slate-400">No membership</span>}
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                      ${f.is_registered ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {f.is_registered ? "✓ Registered" : "Pending"}
                    </span>
                  </td>
                  {canManage && (
                    <td className="py-3 pl-4">
                      <Link
                        to={`/faculty/${f.faculty_id}`}
                        className="text-xs text-violet-600 hover:text-violet-800 font-medium"
                      >
                        View
                      </Link>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {meta.pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="btn-outline disabled:opacity-40">← Prev</button>
          <span className="text-sm text-slate-600 px-2">Page {page} of {meta.pages}</span>
          <button onClick={() => setPage((p) => Math.min(meta.pages, p + 1))} disabled={page === meta.pages}
            className="btn-outline disabled:opacity-40">Next →</button>
        </div>
      )}
    </div>
  );
}