// src/components/ui/BookCard.jsx
import { Link } from "react-router-dom";

/**
 * BookCard — displayed in the /books catalog grid.
 *
 * Expected book shape:
 *   book_id, title, authors, category_name, isbn,
 *   publication_year, available_copies, total_copies
 */
export default function BookCard({ book }) {
  const available = book.available_copies ?? 0;
  const total     = book.total_copies     ?? 0;
  const initials  = book.title
    ?.split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "BK";

  return (
    <Link
      to={`/books/${book.book_id}`}
      className="group flex flex-col bg-white rounded-xl border border-slate-100
                 shadow-card hover:shadow-md hover:-translate-y-0.5 transition-all
                 duration-200 overflow-hidden"
    >
      {/* Spine / cover placeholder */}
      <div className="h-36 bg-gradient-to-br from-indigo-50 to-slate-100
                      flex items-center justify-center relative overflow-hidden shrink-0">
        {/* Decorative lines mimicking pages */}
        <div className="absolute inset-0 opacity-20">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute left-0 right-0 h-px bg-slate-400"
              style={{ top: `${20 + i * 14}%` }}
            />
          ))}
        </div>
        <span className="relative text-2xl font-display font-bold text-indigo-300
                         group-hover:scale-105 transition-transform duration-200">
          {initials}
        </span>

        {/* Availability badge — top-right */}
        <div className="absolute top-2 right-2">
          {available > 0 ? (
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
        </div>
      </div>

      {/* Details */}
      <div className="flex flex-col flex-1 p-4 gap-1">
        <p className="text-sm font-semibold text-slate-800 line-clamp-2 leading-snug
                      group-hover:text-primary transition-colors">
          {book.title}
        </p>

        {book.authors && (
          <p className="text-xs text-slate-500 truncate">{book.authors}</p>
        )}

        <div className="mt-auto pt-3 flex items-center justify-between">
          {book.category_name && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium
                             bg-slate-100 text-slate-500">
              {book.category_name}
            </span>
          )}
          <span className="ml-auto font-mono text-[11px] text-slate-400">
            {available}/{total}
          </span>
        </div>
      </div>
    </Link>
  );
}