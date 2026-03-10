// src/pages/books/BookList.jsx
import { useEffect, useState, useCallback } from "react";
import { Link }        from "react-router-dom";
import { useSelector } from "react-redux";
import api             from "../../api/axios.js";
import SearchBar       from "../../components/ui/SearchBar.jsx";

/**
 * BookList — tabular view with Edit/Delete for admin & staff.
 * Students see the same table but without action buttons.
 */
export default function BookList() {
  const { librarian }     = useSelector((s) => s.auth);
  const canManage         = librarian?.role === "admin" || librarian?.role === "staff";

  const [books,   setBooks]   = useState([]);
  const [meta,    setMeta]    = useState({});
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [page,    setPage]    = useState(1);
  const [deleting, setDeleting] = useState(null); // book_id being deleted

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/books", {
        params: { search, page, limit: 20 },
      });
      setBooks(data.data);
      setMeta(data.meta);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { fetchBooks(); }, [fetchBooks]);

  const handleSearch = (val) => { setSearch(val); setPage(1); };

  const handleDelete = async (bookId, title) => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setDeleting(bookId);
    try {
      await api.delete(`/books/${bookId}`);
      setBooks((prev) => prev.filter((b) => b.book_id !== bookId));
    } catch (err) {
      alert(err.response?.data?.message || "Delete failed");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-slate-900">Book Catalog</h1>
          <p className="text-slate-500 text-sm mt-1">{meta.total ?? "…"} titles</p>
        </div>
        <div className="flex items-center gap-3">
          <SearchBar value={search} onChange={handleSearch} placeholder="Search by title or ISBN…" />
          {canManage && (
            <Link to="/books/new" className="btn-primary whitespace-nowrap">
              + Add Book
            </Link>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" />
          </div>
        ) : books.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <span className="text-4xl mb-3">🔍</span>
            <p className="font-medium">No books found</p>
            <p className="text-sm">Try a different search term</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-slate-500 uppercase tracking-wider">
                <th className="pb-3 pr-4">Title</th>
                <th className="pb-3 pr-4">Author(s)</th>
                <th className="pb-3 pr-4">Category</th>
                <th className="pb-3 pr-4">ISBN</th>
                <th className="pb-3 pr-4">Year</th>
                <th className="pb-3 pr-4">Copies</th>
                <th className="pb-3">Availability</th>
                {canManage && <th className="pb-3 pl-4">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {books.map((book) => (
                <tr
                  key={book.book_id}
                  className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                >
                  <td className="py-3 pr-4 font-medium text-slate-800 max-w-[200px]">
                    <Link
                      to={`/books/${book.book_id}`}
                      className="hover:text-primary transition-colors line-clamp-2"
                    >
                      {book.title}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 text-slate-500 text-xs max-w-[160px] truncate">
                    {book.authors || "—"}
                  </td>
                  <td className="py-3 pr-4">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                      {book.category_name || "General"}
                    </span>
                  </td>
                  <td className="py-3 pr-4 font-mono text-xs text-slate-500">
                    {book.isbn || "—"}
                  </td>
                  <td className="py-3 pr-4 text-slate-500 text-xs">
                    {book.publication_year || "—"}
                  </td>
                  <td className="py-3 pr-4 font-mono text-xs text-slate-600 text-center">
                    {book.available_copies ?? 0}/{book.total_copies ?? 0}
                  </td>
                  <td className="py-3 pr-4">
                    {book.available_copies > 0 ? (
                      <span className="badge-available">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Available
                      </span>
                    ) : (
                      <span className="badge-issued">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        Issued
                      </span>
                    )}
                  </td>
                  {canManage && (
                    <td className="py-3 pl-4">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/books/${book.book_id}/edit`}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                        >
                          Edit
                        </Link>
                        <span className="text-slate-300">|</span>
                        <button
                          onClick={() => handleDelete(book.book_id, book.title)}
                          disabled={deleting === book.book_id}
                          className="text-xs text-red-500 hover:text-red-700 font-medium
                                     transition-colors disabled:opacity-50"
                        >
                          {deleting === book.book_id ? "…" : "Delete"}
                        </button>
                      </div>
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