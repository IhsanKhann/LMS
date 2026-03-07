// src/pages/auth/LoginPage.jsx
import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { loginThunk } from "../../store/slices/authSlice.js";

// ── Floating label input ─────────────────────────────────────────────────────
function FloatingInput({ id, label, type = "text", value, onChange, autoComplete }) {
  const [focused,  setFocused]  = useState(false);
  const [showPass, setShowPass] = useState(false);
  const isPassword = type === "password";
  const lifted     = focused || value.length > 0;

  return (
    <div className="relative">
      <div
        className={`relative rounded-xl border transition-all duration-200 ${
          focused
            ? "border-indigo-400 shadow-[0_0_0_3px_rgba(99,102,241,0.15)]"
            : value.length > 0
            ? "border-slate-500"
            : "border-slate-700 hover:border-slate-600"
        } bg-slate-800/60`}
      >
        {/* Floating label */}
        <label
          htmlFor={id}
          className={`absolute left-4 pointer-events-none font-body transition-all duration-200 select-none ${
            lifted
              ? "top-2 text-[10px] font-semibold tracking-widest uppercase text-indigo-400"
              : "top-1/2 -translate-y-1/2 text-sm text-slate-500"
          }`}
        >
          {label}
        </label>

        <input
          id={id}
          type={isPassword && showPass ? "text" : type}
          value={value}
          autoComplete={autoComplete}
          required
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={onChange}
          className={`w-full bg-transparent rounded-xl px-4 pb-3 text-sm text-white
                      focus:outline-none caret-indigo-400 ${lifted ? "pt-6" : "pt-4"}`}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPass((p) => !p)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500
                       hover:text-slate-300 transition-colors"
            tabIndex={-1}
          >
            {showPass ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="1.8">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45
                         18.45 0 0 1 5.06-5.94"/>
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0
                         0 1-2.16 3.19"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="1.8">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Left brand panel ─────────────────────────────────────────────────────────
function BrandPanel() {
  return (
    <div className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden
                    bg-gradient-to-br from-slate-900 via-[#0d1424] to-[#0a0f1e]">

      {/* Grid lines */}
      <div className="absolute inset-0 opacity-[0.035]" style={{
        backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",
        backgroundSize: "48px 48px",
      }}/>

      {/* Glow orbs */}
      <div className="absolute top-[-80px] left-[-80px] w-72 h-72 rounded-full
                      bg-indigo-600/20 blur-[100px] pointer-events-none"/>
      <div className="absolute bottom-[-60px] right-[-40px] w-56 h-56 rounded-full
                      bg-violet-600/15 blur-[80px] pointer-events-none"/>

      {/* Logo */}
      <div className="relative flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30
                        flex items-center justify-center text-lg">📖</div>
        <span className="text-white font-semibold tracking-wide text-sm">LibraryOS</span>
      </div>

      {/* Content */}
      <div className="relative space-y-8">
        <div>
          <h2 className="text-4xl font-display font-bold text-white leading-tight">
            Manage your<br/>
            <span className="text-transparent bg-clip-text
                             bg-gradient-to-r from-indigo-400 to-violet-400">
              university library
            </span><br/>
            with precision.
          </h2>
          <p className="mt-4 text-slate-400 text-sm leading-relaxed max-w-xs">
            Centralized cataloging, member management, and automated
            borrowing transactions — all in one place.
          </p>
        </div>

        {/* Stats */}
        <div className="flex gap-8">
          {[["13", "DB Entities"], ["2", "Member Roles"], ["∞", "Transactions"]].map(([v, l]) => (
            <div key={l}>
              <p className="text-2xl font-display font-bold text-white">{v}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{l}</p>
            </div>
          ))}
        </div>

        {/* Live-ish card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5
                        backdrop-blur-sm max-w-xs">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30
                            flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                   stroke="#34d399" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-white">Book Issued Successfully</p>
              <p className="text-[10px] text-slate-500">Copy #BC-00142 · Member #M-0031</p>
            </div>
          </div>
          <div className="h-px bg-white/5 mb-3"/>
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>Due in 14 days</span>
            <span className="text-emerald-400 font-medium">Active</span>
          </div>
        </div>
      </div>

      <p className="relative text-xs text-slate-700">
        © {new Date().getFullYear()} University Library Management System
      </p>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { loading, error } = useSelector((s) => s.auth);
  const from = location.state?.from?.pathname || "/dashboard";

  const [form,  setForm]  = useState({ username: "", password: "" });
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (error) {
      setShake(true);
      const t = setTimeout(() => setShake(false), 500);
      return () => clearTimeout(t);
    }
  }, [error]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await dispatch(loginThunk(form));
    if (loginThunk.fulfilled.match(res)) navigate(from, { replace: true });
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@300;400;500;600&display=swap');
        .font-display { font-family:'Playfair Display',serif; }
        .font-body    { font-family:'DM Sans',sans-serif; }

        @keyframes shake {
          0%,100%{ transform:translateX(0) }
          20%    { transform:translateX(-7px) }
          40%    { transform:translateX(7px) }
          60%    { transform:translateX(-4px) }
          80%    { transform:translateX(4px) }
        }
        .shake { animation:shake 0.45s ease; }

        @keyframes fadeUp {
          from { opacity:0; transform:translateY(18px) }
          to   { opacity:1; transform:translateY(0) }
        }
        .fu-1 { animation:fadeUp .5s .04s ease both; }
        .fu-2 { animation:fadeUp .5s .10s ease both; }
        .fu-3 { animation:fadeUp .5s .16s ease both; }
        .fu-4 { animation:fadeUp .5s .22s ease both; }
        .fu-5 { animation:fadeUp .5s .28s ease both; }
        .fu-6 { animation:fadeUp .5s .34s ease both; }
      `}</style>

      <div className="min-h-screen bg-[#080d18] flex font-body">

        {/* Brand panel — left half */}
        <BrandPanel />

        {/* Form panel — right half */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-16 relative">

          {/* Subtle radial bloom */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[500px] h-[500px] rounded-full bg-indigo-900/10 blur-[130px]"/>
          </div>

          <div className={`relative w-full max-w-md ${shake ? "shake" : ""}`}>

            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-2 mb-10 fu-1">
              <span className="text-2xl">📖</span>
              <span className="text-white font-semibold">LibraryOS</span>
            </div>

            {/* Heading */}
            <div className="mb-10 fu-1">
              <p className="text-xs font-semibold tracking-[0.2em] uppercase text-indigo-400 mb-3">
                Librarian Portal
              </p>
              <h1 className="text-[2rem] font-display font-bold text-white leading-snug">
                Welcome back
              </h1>
              <p className="text-slate-500 text-sm mt-2">
                Sign in to access the library management dashboard.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-6 flex items-start gap-3 px-4 py-3.5 rounded-xl
                              bg-red-500/8 border border-red-500/20 fu-1">
                <svg className="w-4 h-4 text-red-400 mt-0.5 shrink-0" viewBox="0 0 24 24"
                     fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Fields */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="fu-2">
                <FloatingInput
                  id="username" label="Username"
                  value={form.username} autoComplete="username"
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                />
              </div>

              <div className="fu-3">
                <FloatingInput
                  id="password" label="Password" type="password"
                  value={form.password} autoComplete="current-password"
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>

              {/* Remember + forgot */}
              <div className="fu-4 flex items-center justify-between pt-2 pb-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <div className="relative w-4 h-4">
                    <input type="checkbox" className="peer absolute opacity-0 w-full h-full cursor-pointer"/>
                    <div className="w-4 h-4 rounded border border-slate-600
                                    peer-checked:bg-indigo-500 peer-checked:border-indigo-500
                                    transition-colors"/>
                    <svg className="absolute inset-0 w-4 h-4 text-white opacity-0
                                    peer-checked:opacity-100 transition-opacity pointer-events-none"
                         viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                  <span className="text-xs text-slate-500 hover:text-slate-400 transition-colors">
                    Remember me
                  </span>
                </label>
                <button type="button"
                        className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                  Forgot password?
                </button>
              </div>

              {/* Submit */}
              <div className="fu-5 pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="relative w-full rounded-xl py-3.5 text-sm font-semibold text-white
                             overflow-hidden transition-all duration-150 active:scale-[0.98]
                             disabled:opacity-50 disabled:cursor-not-allowed
                             bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700
                             focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                >
                  <span className={`flex items-center justify-center gap-2 transition-opacity
                                    ${loading ? "opacity-0" : "opacity-100"}`}>
                    Sign In
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" strokeWidth="2.5">
                      <line x1="5" y1="12" x2="19" y2="12"/>
                      <polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </span>
                  {loading && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10"
                                stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor"
                              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                      </svg>
                    </span>
                  )}
                </button>
              </div>

              {/* Divider + SSO hint */}
              <div className="fu-6 pt-2">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-slate-800"/>
                  <span className="text-xs text-slate-700">or continue with</span>
                  <div className="flex-1 h-px bg-slate-800"/>
                </div>
                <button
                  type="button"
                  className="mt-3 w-full flex items-center justify-center gap-3 rounded-xl
                             py-3 text-sm text-slate-400 font-medium border border-slate-800
                             hover:border-slate-700 hover:text-slate-300 transition-all duration-150"
                >
                  {/* University icon */}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                       stroke="currentColor" strokeWidth="1.8">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                  University SSO
                </button>
              </div>
            </form>

            {/* Footer */}
            <p className="mt-10 text-center text-xs text-slate-700 fu-6">
              Restricted to authorized library staff only.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}