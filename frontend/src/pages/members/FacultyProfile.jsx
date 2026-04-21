// src/pages/members/FacultyProfile.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Detailed faculty profile — professional info + borrow history.
// Inline edit mode for editable profile fields.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import { useParams, Link }     from "react-router-dom";
import api                     from "../../api/axios.js";

const STATUS_BADGE = {
  active:    "badge-available",
  suspended: "badge-issued",
  returned:  "bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full",
  overdue:   "bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-medium",
};

export default function FacultyProfile() {
  const { id } = useParams();

  const [faculty,  setFaculty]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [editing,  setEditing]  = useState(false);
  const [form,     setForm]     = useState({});
  const [saving,   setSaving]   = useState(false);
  const [saveMsg,  setSaveMsg]  = useState(null);

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = () => {
    setLoading(true);
    api
      .get(`/faculty/${id}`)
      .then(({ data }) => {
        const f = data.data;
        setFaculty(f);
        setForm({
          phone:           f.phone           || "",
          gender:          f.gender          || "",
          joining_date:    f.joining_date    || "",
          designation:     f.designation     || "",
          qualification:   f.qualification   || "",
          specialization:  f.specialization  || "",
          office_location: f.office_location || "",
          profile_bio:     f.profile_bio     || "",
        });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const set = (f) => (e) => setForm((prev) => ({ ...prev, [f]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      await api.put(`/faculty/${id}`, form);
      setSaveMsg({ ok: true, text: "Profile updated successfully" });
      setEditing(false);
      load();
    } catch (err) {
      setSaveMsg({ ok: false, text: err.response?.data?.message || "Update failed" });
    } finally {
      setSaving(false);
    }
  };

  // ── States ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="h-64 flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
    </div>
  );

  if (!faculty) return (
    <div className="text-center py-20 text-slate-400">Faculty member not found.</div>
  );

  const initials = faculty.name
    ?.split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link to="/faculty" className="text-primary text-sm hover:underline">
        ← Back to Faculty
      </Link>

      {/* ── Profile header card ─────────────────────────────────────────────── */}
      <div className="card">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center
                          text-violet-700 text-xl font-bold shrink-0">
            {initials}
          </div>

          <div className="flex-1 min-w-0">
            {/* Name + badges */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h1 className="font-display text-2xl text-slate-900">{faculty.name}</h1>
                <p className="text-slate-400 text-sm font-mono">{faculty.employee_no}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {faculty.membership_status && (
                  <span className={STATUS_BADGE[faculty.membership_status] || "badge-available"}>
                    {faculty.membership_status}
                  </span>
                )}
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                  ${faculty.is_registered
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-100 text-slate-500"}`}>
                  {faculty.is_registered ? "✓ Portal Access" : "No Portal Access"}
                </span>
                <button
                  onClick={() => { setEditing((e) => !e); setSaveMsg(null); }}
                  className={editing ? "btn-outline text-xs py-1 px-3" : "btn-primary text-xs py-1 px-3"}
                >
                  {editing ? "Cancel" : "Edit Profile"}
                </button>
              </div>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 mt-4 text-sm">
              {[
                ["Email",           faculty.email],
                ["Department",      faculty.department_name],
                ["Designation",     faculty.designation],
                ["Qualification",   faculty.qualification],
                ["Specialization",  faculty.specialization],
                ["Office",          faculty.office_location],
                ["Gender",          faculty.gender
                                      ? faculty.gender.charAt(0).toUpperCase() + faculty.gender.slice(1)
                                      : null],
                ["Joining Date",    faculty.joining_date],
                ["Phone",           faculty.phone],
              ].map(([k, v]) => (
                <div key={k}>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">{k}</p>
                  <p className="font-medium text-slate-700">{v || "—"}</p>
                </div>
              ))}
            </div>

            {/* Bio (read mode) */}
            {faculty.profile_bio && !editing && (
              <div className="mt-4 p-3 bg-slate-50 rounded-lg text-sm text-slate-600 italic">
                "{faculty.profile_bio}"
              </div>
            )}
          </div>
        </div>

        {/* ── Edit form ──────────────────────────────────────────────────────── */}
        {editing && (
          <div className="mt-6 pt-6 border-t border-slate-100 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Phone
                </label>
                <input className="input" type="tel" value={form.phone} onChange={set("phone")} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Gender
                </label>
                <select className="input" value={form.gender} onChange={set("gender")}>
                  <option value="">—</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Designation
                </label>
                <input className="input" type="text" placeholder="e.g. Associate Professor"
                  value={form.designation} onChange={set("designation")} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Office Location
                </label>
                <input className="input" type="text" placeholder="e.g. Block-A, Room 204"
                  value={form.office_location} onChange={set("office_location")} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Joining Date
                </label>
                <input className="input" type="date"
                  value={form.joining_date} onChange={set("joining_date")} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Qualification
              </label>
              <input className="input" type="text" placeholder="e.g. PhD Computer Science, MIT"
                value={form.qualification} onChange={set("qualification")} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Specialization
              </label>
              <input className="input" type="text"
                placeholder="e.g. Machine Learning, Distributed Systems"
                value={form.specialization} onChange={set("specialization")} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Bio
              </label>
              <textarea className="input resize-none" rows={3}
                placeholder="Research interests, teaching philosophy…"
                value={form.profile_bio} onChange={set("profile_bio")} />
            </div>

            {saveMsg && (
              <div className={`p-3 rounded-lg text-sm ${saveMsg.ok
                ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                : "bg-red-50 border border-red-200 text-red-600"}`}>
                {saveMsg.ok ? "✓" : "✗"} {saveMsg.text}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={handleSave} disabled={saving}
                className="btn-primary disabled:opacity-50">
                {saving ? "Saving…" : "Save Changes"}
              </button>
              <button onClick={() => setEditing(false)} className="btn-outline">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Borrow history card ──────────────────────────────────────────────── */}
      <div className="card">
        <h2 className="font-display text-lg mb-4">Borrow History</h2>

        {!faculty.borrow_history || faculty.borrow_history.length === 0 ? (
          <p className="text-slate-400 text-sm py-4 text-center">No borrowing history.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-slate-500 uppercase">
                  <th className="pb-2 pr-4">Book</th>
                  <th className="pb-2 pr-4">Issue Date</th>
                  <th className="pb-2 pr-4">Due Date</th>
                  <th className="pb-2 pr-4">Returned</th>
                  <th className="pb-2 pr-4">Fine</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {faculty.borrow_history.map((h) => (
                  <tr key={h.issue_id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-2 pr-4 font-medium text-slate-700 max-w-[200px] truncate">
                      {h.title}
                    </td>
                    <td className="py-2 pr-4 text-slate-500 text-xs">{h.issue_date}</td>
                    <td className="py-2 pr-4 text-slate-500 text-xs">{h.due_date}</td>
                    <td className="py-2 pr-4 text-slate-500 text-xs">{h.return_date || "—"}</td>
                    <td className="py-2 pr-4 font-mono text-xs">
                      {parseFloat(h.fine_amount) > 0 ? (
                        <span className="text-red-600 font-semibold">
                          Rs.{parseFloat(h.fine_amount).toFixed(2)}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="py-2">
                      <span className={STATUS_BADGE[h.status] || "text-xs text-slate-500"}>
                        {h.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}