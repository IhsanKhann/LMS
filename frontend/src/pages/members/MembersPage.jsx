// src/pages/members/MembersPage.jsx
import { useEffect, useState } from "react";
import api from "../../api/axios.js";

export default function MembersPage() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/members").then(({ data }) => setMembers(data.data)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl text-slate-900">Library Members</h1>
      <div className="card overflow-x-auto">
        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-xs text-slate-500 uppercase tracking-wider">
              <th className="pb-3 pr-4">ID</th><th className="pb-3 pr-4">Name</th>
              <th className="pb-3 pr-4">Type</th><th className="pb-3 pr-4">Department</th>
              <th className="pb-3 pr-4">Email</th><th className="pb-3">Status</th>
            </tr></thead>
            <tbody>{members.map((m) => (
              <tr key={m.member_id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                <td className="py-3 pr-4 font-mono text-slate-500 text-xs">{m.member_id}</td>
                <td className="py-3 pr-4 font-medium text-slate-800">{m.name}</td>
                <td className="py-3 pr-4">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${m.member_type === "student" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"}`}>
                    {m.member_type}
                  </span>
                </td>
                <td className="py-3 pr-4 text-slate-500 text-xs">{m.department_name}</td>
                <td className="py-3 pr-4 text-slate-500 text-xs">{m.email}</td>
                <td className="py-3"><span className={m.status === "active" ? "badge-available" : "badge-issued"}>{m.status}</span></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}