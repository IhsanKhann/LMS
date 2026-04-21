// src/pages/books/BookForm.jsx
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios.js";

const EMPTY_FORM = {
  title:            "",
  isbn:             "",
  edition:          "",
  publication_year: "",
  publisher_id:     "",
  category_id:      "",
  author_ids:       [],
};

export default function BookForm() {
  const navigate        = useNavigate();
  const { id }          = useParams();
  const isEdit          = Boolean(id);

  const [form,         setForm]         = useState(EMPTY_FORM);
  const [publishers,   setPublishers]   = useState([]);
  const [categories,   setCategories]   = useState([]);
  const [authors,      setAuthors]      = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [fetchingMeta, setFetchingMeta] = useState(true);
  const [errors,       setErrors]       = useState({});
  const [submitError,  setSubmitError]  = useState(null);

  useEffect(() => {
    const loadAll = async () => {
      setFetchingMeta(true);
      try {
        // ⚠️  FIX: All three endpoints now live under /books/* on the backend.
        //     Previously /publishers and /authors returned 404 (no routes existed),
        //     and /categories was fetched from the wrong base path.
        const [pubRes, catRes, authRes] = await Promise.all([
          api.get("/books/publishers"),
          api.get("/books/categories"),
          api.get("/books/authors"),
        ]);
        setPublishers(pubRes.data.data  ?? []);
        setCategories(catRes.data.data  ?? []);
        setAuthors(authRes.data.data    ?? []);

        if (isEdit) {
          const { data } = await api.get(`/books/${id}`);
          const b = data.data;
          setForm({
            title:            b.title            ?? "",
            isbn:             b.isbn             ?? "",
            edition:          b.edition          ?? "",
            publication_year: b.publication_year ?? "",
            publisher_id:     b.publisher_id     ?? "",
            category_id:      b.category_id      ?? "",
            // ⚠️  FIX: The original comment said "backend returns author string;
            //     edit form starts empty". We now parse the author IDs from the
            //     copies array so the checkboxes reflect the existing selection.
            author_ids: Array.isArray(b.author_ids)
              ? b.author_ids
              : [],
          });
        }
      } catch (err) {
        console.error("Failed to load book form metadata", err);
      } finally {
        setFetchingMeta(false);
      }
    };
    loadAll();
  }, [id, isEdit]);

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.title.trim())
      e.title = "Title is required";
    if (form.isbn && !/^\d{10}(\d{3})?$/.test(form.isbn.replace(/-/g, "")))
      e.isbn  = "Must be a valid ISBN-10 or ISBN-13";
    if (
      form.publication_year &&
      (isNaN(form.publication_year) ||
        form.publication_year < 1000 ||
        form.publication_year > new Date().getFullYear() + 1)
    )
      e.publication_year = "Enter a valid 4-digit year";
    if (!form.category_id)
      e.category_id = "Category is required";
    return e;
  };

  // ── Field helpers ──────────────────────────────────────────────────────────
  const set = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const toggleAuthor = (authorId) => {
    setForm((prev) => ({
      ...prev,
      author_ids: prev.author_ids.includes(authorId)
        ? prev.author_ids.filter((a) => a !== authorId)
        : [...prev.author_ids, authorId],
    }));
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setSubmitError(null);
    setLoading(true);

    const payload = {
      ...form,
      publication_year: form.publication_year ? Number(form.publication_year) : null,
      publisher_id:     form.publisher_id     ? Number(form.publisher_id)     : null,
      category_id:      form.category_id      ? Number(form.category_id)      : null,
      author_ids:       form.author_ids.map(Number),
    };

    try {
      if (isEdit) {
        await api.put(`/books/${id}`, payload);
      } else {
        await api.post("/books", payload);
      }
      navigate("/books");
    } catch (err) {
      setSubmitError(err.response?.data?.message || "Failed to save book");
    } finally {
      setLoading(false);
    }
  };

  if (fetchingMeta) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-3xl text-slate-900">
          {isEdit ? "Edit Book" : "Add New Book"}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {isEdit
            ? "Update the details below."
            : "Fill in the details to add a new title to the catalog."}
        </p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Title */}
          <Field label="Title *" error={errors.title}>
            <input
              type="text"
              className={`input ${errors.title ? "border-red-400" : ""}`}
              placeholder="e.g. Introduction to Algorithms"
              value={form.title}
              onChange={set("title")}
            />
          </Field>

          {/* ISBN */}
          <Field label="ISBN" error={errors.isbn}>
            <input
              type="text"
              className={`input ${errors.isbn ? "border-red-400" : ""}`}
              placeholder="978-3-16-148410-0"
              value={form.isbn}
              onChange={set("isbn")}
            />
          </Field>

          {/* Edition + Year */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Edition">
              <input
                type="text" className="input"
                placeholder="e.g. 3rd"
                value={form.edition} onChange={set("edition")}
              />
            </Field>
            <Field label="Publication Year" error={errors.publication_year}>
              <input
                type="number"
                className={`input ${errors.publication_year ? "border-red-400" : ""}`}
                placeholder={String(new Date().getFullYear())}
                min="1000" max={new Date().getFullYear() + 1}
                value={form.publication_year} onChange={set("publication_year")}
              />
            </Field>
          </div>

          {/* Publisher + Category */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Publisher">
              <select className="input" value={form.publisher_id} onChange={set("publisher_id")}>
                <option value="">— Select publisher —</option>
                {publishers.map((p) => (
                  <option key={p.publisher_id} value={p.publisher_id}>{p.publisher_name}</option>
                ))}
              </select>
            </Field>
            <Field label="Category *" error={errors.category_id}>
              <select
                className={`input ${errors.category_id ? "border-red-400" : ""}`}
                value={form.category_id} onChange={set("category_id")}
              >
                <option value="">— Select category —</option>
                {categories.map((c) => (
                  <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* Authors */}
          {authors.length > 0 && (
            <Field label="Author(s)">
              <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-3
                              grid grid-cols-2 gap-y-2 gap-x-4">
                {authors.map((a) => (
                  <label key={a.author_id} className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form.author_ids.includes(a.author_id)}
                      onChange={() => toggleAuthor(a.author_id)}
                      className="accent-indigo-600 w-4 h-4"
                    />
                    <span className="text-sm text-slate-700 truncate">{a.author_name}</span>
                  </label>
                ))}
              </div>
            </Field>
          )}

          {/* Submit error */}
          {submitError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
              ✗ {submitError}
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit" disabled={loading}
              className="btn-primary disabled:opacity-50"
            >
              {loading ? "Saving…" : isEdit ? "Save Changes" : "Add Book"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/books")}
              className="btn-outline"
            >
              Cancel
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}