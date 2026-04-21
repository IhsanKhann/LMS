// src/pages/members/StudentPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Student directory — searchable, paginated table.
// Admin/staff see full data including membership status.
// ⚠️  FIX: This file was completely empty in the original upload.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState, useCallback } from "react";
import { Link }        from "react-router-dom";
import { useSelector } from "react-redux";
import api             from "../../api/axios.js";

export default function StudentPage() {
  const { librarian } = useSelector((s) => s.auth);
  const canManage     = ["admin", "staff"].includes(librarian?.role);

  const [students, setStudents] = useState([]);
  const [meta,     setMeta]     = useState({});
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [page,     setPage]     = useState(1);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/students", {
        params: { search, page, limit: 20 },
      });
      setStudents(data.data);
      setMeta(data.meta);
    } catch (err) {
      console.error("Failed to fetch students", err);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const handleSearch = (val) => { setSearch(val); setPage(1); };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-slate-900">Students</h1>
          <p className="text-slate-500 text-sm mt-1">{meta.total ?? "…"} registered</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="search"
            placeholder="Search by name, reg no, or email…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="input max-w-xs"
          />
          {/* Always show registration link */}
          <Link to="/students/register" className="btn-primary whitespace-nowrap">
            + Register
          </Link>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" />
          </div>
        ) : students.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <span className="text-4xl mb-3">🎓</span>
            <p className="font-medium">No students found</p>
            <p className="text-sm">Try a different search term</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-slate-500 uppercase tracking-wider">
                <th className="pb-3 pr-4">Name</th>
                <th className="pb-3 pr-4">Reg. No</th>
                <th className="pb-3 pr-4">Department</th>
                <th className="pb-3 pr-4">Year</th>
                <th className="pb-3 pr-4">Email</th>
                {canManage && <th className="pb-3 pr-4">Membership</th>}
                <th className="pb-3">Portal</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr
                  key={s.student_id}
                  className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                >
                  <td className="py-3 pr-4 font-medium text-slate-800">
                    <Link
                      to={`/students/${s.student_id}`}
                      className="hover:text-primary transition-colors"
                    >
                      {s.name}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 font-mono text-xs text-slate-500">
                    {s.registration_no}
                  </td>
                  <td className="py-3 pr-4 text-slate-500 text-xs">
                    {s.department_name || "—"}
                  </td>
                  <td className="py-3 pr-4 text-slate-500 text-xs">
                    {s.academic_year || "—"}
                  </td>
                  <td className="py-3 pr-4 text-slate-500 text-xs">
                    {s.email}
                  </td>
                  {canManage && (
                    <td className="py-3 pr-4">
                      {s.membership_status ? (
                        <span className={
                          s.membership_status === "active"
                            ? "badge-available"
                            : "badge-issued"
                        }>
                          {s.membership_status}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  )}
                  <td className="py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      s.is_registered
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-400"
                    }`}>
                      {s.is_registered ? "✓ Active" : "Pending"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {meta.pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-outline disabled:opacity-40"
          >
            ← Prev
          </button>
          <span className="text-sm text-slate-600 px-2">
            Page {page} of {meta.pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(meta.pages, p + 1))}
            disabled={page === meta.pages}
            className="btn-outline disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}