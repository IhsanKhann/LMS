// src/pages/books/BookDetail.jsx
import { useEffect, useState } from "react";
import { useParams, Link }     from "react-router-dom";
import api from "../../api/axios.js"

export default function BookDetail() {
  const { id }    = useParams();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/books/${id}`)
      .then(({ data }) => setBook(data.data))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="h-64 flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" /></div>;
  if (!book) return <div className="text-center py-20 text-slate-400">Book not found.</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link to="/books" className="text-primary text-sm hover:underline">← Back to Catalog</Link>
      <div className="card">
        <h1 className="font-display text-3xl text-slate-900">{book.title}</h1>
        <p className="text-slate-500 mt-1">{book.authors}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 text-sm">
          {[["ISBN", book.isbn], ["Edition", book.edition], ["Year", book.publication_year],
            ["Publisher", book.publisher_name], ["Category", book.category_name]].map(([k, v]) => (
            <div key={k}><p className="text-xs text-slate-400 uppercase tracking-wide">{k}</p><p className="font-medium">{v || "—"}</p></div>
          ))}
        </div>
      </div>
      <div className="card">
        <h2 className="font-display text-lg mb-4">Physical Copies ({book.copies?.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-xs text-slate-500 uppercase">
              <th className="pb-2 pr-4">Copy ID</th><th className="pb-2 pr-4">Barcode</th>
              <th className="pb-2 pr-4">Location</th><th className="pb-2">Status</th>
            </tr></thead>
            <tbody>{book.copies?.map((c) => (
              <tr key={c.copy_id} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="py-2 pr-4 font-mono text-slate-600">{c.copy_id}</td>
                <td className="py-2 pr-4 font-mono">{c.barcode}</td>
                <td className="py-2 pr-4 text-slate-500">{c.shelf_location || "—"}</td>
                <td className="py-2"><span className={c.status === "available" ? "badge-available" : "badge-issued"}>{c.status}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}