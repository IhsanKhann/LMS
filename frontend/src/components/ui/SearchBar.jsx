// src/components/ui/SearchBar.jsx
import { useRef } from "react";

/**
 * SearchBar — a controlled search input with a clear button.
 *
 * Props:
 *   value       {string}   - controlled value
 *   onChange    {function} - called with the new string value (not the event)
 *   placeholder {string}   - input placeholder text
 *   className   {string}   - additional wrapper classes
 */
export default function SearchBar({
  value,
  onChange,
  placeholder = "Search…",
  className = "",
}) {
  const inputRef = useRef(null);

  return (
    <div className={`relative flex items-center ${className}`}>
      {/* Search icon */}
      <svg
        className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none"
        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>

      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input pl-9 pr-8 w-full max-w-xs"
      />

      {/* Clear button — visible only when there's a value */}
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange("");
            inputRef.current?.focus();
          }}
          className="absolute right-3 text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Clear search"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
}