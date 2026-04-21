// src/pages/registration/StudentRegistration.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Public-facing student self-registration form.
// Matches the existing LibraryOS slate/indigo design system.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import { Link, useNavigate }   from "react-router-dom";
import api from "../../../api/axios";

const STEPS = ["Account", "Personal", "Academic"];

const EMPTY = {
  // Step 1 — Account
  name:            "",
  registration_no: "",
  email:           "",
  password:        "",
  confirm_password:"",
  // Step 2 — Personal
  phone:           "",
  date_of_birth:   "",
  gender:          "",
  address:         "",
  // Step 3 — Academic
  department_id:   "",
  academic_year:   "",
  cgpa:            "",
  profile_bio:     "",
};

function Field({ label, error, required, children }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 flex items-center gap-1">⚠ {error}</p>}
    </div>
  );
}

function StepIndicator({ current, total, labels }) {
  return (
    <div className="flex items-center justify-between mb-8">
      {labels.map((label, i) => (
        <div key={i} className="flex items-center gap-2 flex-1">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all
            ${i < current  ? "bg-indigo-600 border-indigo-600 text-white"
            : i === current ? "bg-white border-indigo-600 text-indigo-600"
                            : "bg-white border-slate-200 text-slate-400"}`}>
            {i < current ? "✓" : i + 1}
          </div>
          <span className={`text-xs font-medium hidden sm:block
            ${i === current ? "text-indigo-600" : i < current ? "text-slate-600" : "text-slate-400"}`}>
            {label}
          </span>
          {i < total - 1 && (
            <div className={`flex-1 h-0.5 mx-2 rounded ${i < current ? "bg-indigo-600" : "bg-slate-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function StudentRegistration() {
  const navigate                = useNavigate();
  const [step,      setStep]    = useState(0);
  const [form,      setForm]    = useState(EMPTY);
  const [errors,    setErrors]  = useState({});
  const [submitErr, setSubmitErr] = useState(null);
  const [loading,   setLoading] = useState(false);
  const [success,   setSuccess] = useState(false);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    api.get("/departments").then(({ data }) => setDepartments(data.data || [])).catch(() => {});
  }, []);

  const set = (field) => (e) => {
    setForm((p) => ({ ...p, [field]: e.target.value }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: null }));
  };

  // ── Per-step validation ────────────────────────────────────────────────────
  const validateStep = (s) => {
    const e = {};
    if (s === 0) {
      if (!form.name.trim())            e.name            = "Full name is required";
      if (!form.registration_no.trim()) e.registration_no = "Registration number is required";
      if (!form.email.trim())           e.email           = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email";
      if (!form.password)               e.password        = "Password is required";
      else if (form.password.length < 6) e.password       = "Minimum 6 characters";
      if (form.password !== form.confirm_password) e.confirm_password = "Passwords do not match";
    }
    if (s === 2) {
      if (!form.department_id)          e.department_id   = "Department is required";
      if (form.cgpa && (isNaN(form.cgpa) || form.cgpa < 0 || form.cgpa > 4))
                                        e.cgpa            = "CGPA must be 0.00 – 4.00";
    }
    return e;
  };

  const handleNext = () => {
    const e = validateStep(step);
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setStep((s) => s + 1);
  };

  const handleBack = () => { setErrors({}); setStep((s) => s - 1); };

  const handleSubmit = async () => {
    const e = validateStep(2);
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading(true);
    setSubmitErr(null);
    try {
      await api.post("/students/register", {
        name:            form.name.trim(),
        registration_no: form.registration_no.trim(),
        email:           form.email.trim(),
        password:        form.password,
        phone:           form.phone || undefined,
        date_of_birth:   form.date_of_birth || undefined,
        gender:          form.gender || undefined,
        address:         form.address || undefined,
        department_id:   Number(form.department_id),
        academic_year:   form.academic_year || undefined,
        cgpa:            form.cgpa ? parseFloat(form.cgpa) : undefined,
        profile_bio:     form.profile_bio || undefined,
      });
      setSuccess(true);
    } catch (err) {
      setSubmitErr(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-slate-50
                      flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center
                          mx-auto text-4xl animate-bounce">🎉</div>
          <div>
            <h2 className="font-display text-2xl font-bold text-slate-800">Registration Successful!</h2>
            <p className="text-slate-500 mt-2">
              Welcome to LibraryOS. Your student account has been created and your
              library membership is active.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => navigate("/dashboard")}
              className="btn-primary">Go to Dashboard</button>
            <Link to="/faculty/register" className="btn-outline">Register as Faculty Instead</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-slate-50
                    flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-3xl">📖</span>
            <span className="font-display text-xl font-semibold text-slate-800">LibraryOS</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Student Registration</h1>
          <p className="text-slate-500 text-sm mt-1">Create your university library account</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
          <StepIndicator current={step} total={STEPS.length} labels={STEPS} />

          {/* ── Step 0: Account ──────────────────────────────────────────── */}
          {step === 0 && (
            <div className="space-y-5">
              <Field label="Full Name" required error={errors.name}>
                <input className={`input ${errors.name ? "border-red-400" : ""}`}
                  type="text" placeholder="Ali Hassan" value={form.name} onChange={set("name")} />
              </Field>
              <Field label="Registration Number" required error={errors.registration_no}>
                <input className={`input ${errors.registration_no ? "border-red-400" : ""}`}
                  type="text" placeholder="CS-2024-001" value={form.registration_no} onChange={set("registration_no")} />
              </Field>
              <Field label="University Email" required error={errors.email}>
                <input className={`input ${errors.email ? "border-red-400" : ""}`}
                  type="email" placeholder="name@uni.edu" value={form.email} onChange={set("email")} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Password" required error={errors.password}>
                  <input className={`input ${errors.password ? "border-red-400" : ""}`}
                    type="password" placeholder="Min. 6 characters" value={form.password} onChange={set("password")} />
                </Field>
                <Field label="Confirm Password" error={errors.confirm_password}>
                  <input className={`input ${errors.confirm_password ? "border-red-400" : ""}`}
                    type="password" placeholder="Repeat password" value={form.confirm_password} onChange={set("confirm_password")} />
                </Field>
              </div>
            </div>
          )}

          {/* ── Step 1: Personal ─────────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Phone">
                  <input className="input" type="tel" placeholder="0300-1234567"
                    value={form.phone} onChange={set("phone")} />
                </Field>
                <Field label="Gender">
                  <select className="input" value={form.gender} onChange={set("gender")}>
                    <option value="">— Select —</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </Field>
              </div>
              <Field label="Date of Birth">
                <input className="input" type="date" value={form.date_of_birth} onChange={set("date_of_birth")} />
              </Field>
              <Field label="Address">
                <textarea className="input resize-none" rows={3}
                  placeholder="Your current address…"
                  value={form.address} onChange={set("address")} />
              </Field>
            </div>
          )}

          {/* ── Step 2: Academic ─────────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-5">
              <Field label="Department" required error={errors.department_id}>
                <select className={`input ${errors.department_id ? "border-red-400" : ""}`}
                  value={form.department_id} onChange={set("department_id")}>
                  <option value="">— Select department —</option>
                  {departments.map((d) => (
                    <option key={d.department_id} value={d.department_id}>{d.department_name}</option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Academic Year">
                  <select className="input" value={form.academic_year} onChange={set("academic_year")}>
                    <option value="">— Select —</option>
                    {["1st Year","2nd Year","3rd Year","4th Year","Graduate"].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </Field>
                <Field label="CGPA" error={errors.cgpa}>
                  <input className={`input ${errors.cgpa ? "border-red-400" : ""}`}
                    type="number" min="0" max="4" step="0.01" placeholder="e.g. 3.75"
                    value={form.cgpa} onChange={set("cgpa")} />
                </Field>
              </div>
              <Field label="About / Bio">
                <textarea className="input resize-none" rows={3}
                  placeholder="A short note about yourself…"
                  value={form.profile_bio} onChange={set("profile_bio")} />
              </Field>

              {submitErr && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
                  ✗ {submitErr}
                </div>
              )}
            </div>
          )}

          {/* ── Navigation ──────────────────────────────────────────────── */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
            {step > 0 ? (
              <button onClick={handleBack} className="btn-outline">← Back</button>
            ) : (
              <Link to="/dashboard" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
                Cancel
              </Link>
            )}
            {step < STEPS.length - 1 ? (
              <button onClick={handleNext} className="btn-primary">Next →</button>
            ) : (
              <button onClick={handleSubmit} disabled={loading} className="btn-primary disabled:opacity-50">
                {loading ? "Creating Account…" : "Create Account"}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Are you faculty?{" "}
          <Link to="/faculty/register" className="text-indigo-600 font-medium hover:underline">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}