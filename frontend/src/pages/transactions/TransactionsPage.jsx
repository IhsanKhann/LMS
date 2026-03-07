// src/pages/transactions/TransactionsPage.jsx
import { useState } from "react";
import api from "../../api/axios.js";

export default function TransactionsPage() {
  const [mode,    setMode]    = useState("issue"); // "issue" | "return"
  const [form,    setForm]    = useState({ copy_id: "", member_id: "", issue_id: "" });
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(null); setResult(null);
    try {
      if (mode === "issue") {
        const { data } = await api.post("/transactions/issue", {
          copy_id:   Number(form.copy_id),
          member_id: Number(form.member_id),
        });
        setResult(data);
      } else {
        const { data } = await api.patch(`/transactions/${form.issue_id}/return`);
        setResult(data);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-3xl text-slate-900">Librarian Terminal</h1>
        <p className="text-slate-500 text-sm mt-1">Issue or return book copies</p>
      </div>

      {/* Mode toggle */}
      <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1 w-fit">
        {["issue", "return"].map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setResult(null); setError(null); }}
            className={`px-6 py-2 rounded-md text-sm font-medium capitalize transition-all
                        ${mode === m ? "bg-white shadow-sm text-primary" : "text-slate-500 hover:text-slate-800"}`}
          >
            {m === "issue" ? "📤 Issue Book" : "📥 Return Book"}
          </button>
        ))}
      </div>

      {/* Form */}
      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "issue" ? (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">
                  Book Copy ID (or scan barcode)
                </label>
                <input
                  type="number" className="input"
                  placeholder="Copy ID"
                  value={form.copy_id}
                  onChange={(e) => setForm({ ...form, copy_id: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">
                  Member ID
                </label>
                <input
                  type="number" className="input"
                  placeholder="Library Member ID"
                  value={form.member_id}
                  onChange={(e) => setForm({ ...form, member_id: e.target.value })}
                  required
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">
                Transaction (Issue) ID
              </label>
              <input
                type="number" className="input"
                placeholder="Issue Transaction ID"
                value={form.issue_id}
                onChange={(e) => setForm({ ...form, issue_id: e.target.value })}
                required
              />
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Processing…" : mode === "issue" ? "Issue Book" : "Return Book"}
          </button>
        </form>

        {/* Result */}
        {result && (
          <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
            <p className="font-medium text-emerald-700">✓ {result.message}</p>
            <pre className="text-xs text-emerald-600 mt-2 font-mono overflow-x-auto">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          </div>
        )}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">✗ {error}</p>
          </div>
        )}
      </div>
    </div>
  );
}