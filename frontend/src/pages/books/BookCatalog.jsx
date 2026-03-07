// src/pages/books/BookCatalog.jsx
import { useEffect, useState, useCallback } from "react";
import api      from "../../api/axios.js";
import BookCard from "../../components/ui/BookCard.jsx";

export default function BookCatalog() {
  const [books,    setBooks]    = useState([]);
  const [meta,     setMeta]     = useState({});
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [page,     setPage]     = useState(1);

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/books", {
        params: { search, page, limit: 16 },
      });
      setBooks(data.data);
      setMeta(data.meta);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { fetchBooks(); }, [fetchBooks]);

  // Debounce search → reset to page 1
  const handleSearch = (val) => { setSearch(val); setPage(1); };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-slate-900">Book Catalog</h1>
          <p className="text-slate-500 text-sm mt-1">{meta.total ?? "…"} titles available</p>
        </div>
        <input
          type="search"
          placeholder="Search by title or ISBN…"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="input max-w-xs"
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-64 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : books.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <span className="text-5xl mb-4">🔍</span>
          <p className="text-lg font-medium">No books found</p>
          <p className="text-sm">Try a different search term</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {books.map((book) => <BookCard key={book.book_id} book={book} />)}
        </div>
      )}

      {/* Pagination */}
      {meta.pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
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