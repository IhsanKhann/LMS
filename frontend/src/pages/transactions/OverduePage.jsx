// src/pages/transactions/OverduePage.jsx
import { useEffect, useState } from "react";
import api from "../../api/axios.js";

export default function OverduePage() {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/transactions/overdue").then(({ data }) => setRows(data.data)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-slate-900">Overdue Returns</h1>
        <p className="text-slate-500 text-sm mt-1">{rows.length} overdue transaction{rows.length !== 1 && "s"}</p>
      </div>
      <div className="card overflow-x-auto">
        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-amber-400 border-t-transparent" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <span className="text-4xl">🎉</span>
            <p className="mt-3 font-medium">No overdue books!</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-xs text-slate-500 uppercase tracking-wider">
              <th className="pb-3 pr-4">Book</th><th className="pb-3 pr-4">Borrower</th>
              <th className="pb-3 pr-4">Type</th><th className="pb-3 pr-4">Due Date</th>
              <th className="pb-3 pr-4">Days Late</th><th className="pb-3">Fine</th>
            </tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.issue_id} className="border-b border-slate-50 hover:bg-red-50/30 transition-colors">
                <td className="py-3 pr-4 font-medium text-slate-800 max-w-[200px] truncate">{r.title}</td>
                <td className="py-3 pr-4">
                  <p className="font-medium">{r.borrower_name}</p>
                  <p className="text-xs text-slate-400">{r.borrower_email}</p>
                </td>
                <td className="py-3 pr-4 capitalize text-xs text-slate-500">{r.member_type}</td>
                <td className="py-3 pr-4 font-mono text-xs text-slate-600">{r.due_date?.split("T")[0]}</td>
                <td className="py-3 pr-4"><span className="badge-overdue">{r.days_overdue}d</span></td>
                <td className="py-3 font-mono font-medium text-red-600">${r.accrued_fine}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}