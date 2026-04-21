// src/components/ui/SearchBar.jsx

/**
 * SearchBar — controlled search input with a search icon.
 *
 * Props:
 *   value       (string)   — current search string
 *   onChange    (fn)       — called with new string value
 *   placeholder (string)   — input placeholder text
 *   className   (string)   — extra Tailwind classes for the wrapper
 */
export default function SearchBar({ value, onChange, placeholder = "Search…", className = "" }) {
  return (
    <div className={`relative ${className}`}>
      {/* Search icon */}
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        width="15" height="15" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2"
      >
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>

      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input pl-9 pr-3"
      />
    </div>
  );
}