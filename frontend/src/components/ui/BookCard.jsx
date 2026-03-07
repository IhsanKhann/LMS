// src/components/ui/BookCard.jsx
import { Link } from "react-router-dom";

/**
 * BookCard — catalog grid tile
 * Props: book { book_id, title, authors, category_name, publication_year,
 *               total_copies, available_copies }
 */
export default function BookCard({ book }) {
  const {
    book_id, title, authors, category_name,
    publication_year, total_copies = 0, available_copies = 0,
  } = book;

  const isAvailable = available_copies > 0;

  // Generate a deterministic pastel background from the title
  const hue = [...(title || "")].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  const bg  = `hsl(${hue},40%,94%)`;
  const fg  = `hsl(${hue},45%,35%)`;

  return (
    <Link
      to={`/books/${book_id}`}
      className="group bg-white rounded-xl border border-slate-100 shadow-card
                 hover:shadow-hover hover:-translate-y-0.5 transition-all duration-200
                 flex flex-col overflow-hidden"
    >
      {/* Spine / cover strip */}
      <div
        className="h-36 flex items-center justify-center relative overflow-hidden"
        style={{ backgroundColor: bg }}
      >
        <span className="font-display text-4xl opacity-20" style={{ color: fg }}>
          {title?.[0]}
        </span>
        {/* Category chip */}
        <span
          className="absolute top-3 right-3 text-[10px] font-medium px-2 py-0.5
                     rounded-full bg-white/80 backdrop-blur-sm text-slate-600"
        >
          {category_name || "General"}
        </span>
      </div>

      {/* Details */}
      <div className="p-4 flex flex-col flex-1 gap-1">
        <h3 className="font-display font-semibold text-slate-900 text-sm leading-snug
                       line-clamp-2 group-hover:text-primary transition-colors">
          {title}
        </h3>
        <p className="text-xs text-slate-500 truncate">{authors || "Unknown author"}</p>
        <p className="text-xs text-slate-400">{publication_year || "—"}</p>

        {/* Availability footer */}
        <div className="mt-auto pt-3 border-t border-slate-50 flex items-center justify-between">
          <span className={isAvailable ? "badge-available" : "badge-issued"}>
            <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? "bg-emerald-500" : "bg-amber-500"}`} />
            {isAvailable ? "Available" : "Issued"}
          </span>
          <span className="text-xs text-slate-400 font-mono">
            {available_copies}/{total_copies}
          </span>
        </div>
      </div>
    </Link>
  );
}