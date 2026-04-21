// src/pages/registration/FacultyRegistration.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Public-facing faculty self-registration form. Matches LibraryOS design system.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import { Link, useNavigate }   from "react-router-dom";
import api from "../../../api/axios.js";

const STEPS = ["Account", "Personal", "Professional"];

const EMPTY = {
  // Step 1 — Account
  name:        "",
  employee_no: "",
  email:       "",
  password:    "",
  confirm_password: "",
  // Step 2 — Personal
  phone:       "",
  gender:      "",
  joining_date:"",
  // Step 3 — Professional
  department_id:  "",
  designation:    "",
  qualification:  "",
  specialization: "",
  office_location:"",
  profile_bio:    "",
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
            ${i < current  ? "bg-violet-600 border-violet-600 text-white"
            : i === current ? "bg-white border-violet-600 text-violet-600"
                            : "bg-white border-slate-200 text-slate-400"}`}>
            {i < current ? "✓" : i + 1}
          </div>
          <span className={`text-xs font-medium hidden sm:block
            ${i === current ? "text-violet-600" : i < current ? "text-slate-600" : "text-slate-400"}`}>
            {label}
          </span>
          {i < total - 1 && (
            <div className={`flex-1 h-0.5 mx-2 rounded ${i < current ? "bg-violet-600" : "bg-slate-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function FacultyRegistration() {
  const navigate             = useNavigate();
  const [step,    setStep]   = useState(0);
  const [form,    setForm]   = useState(EMPTY);
  const [errors,  setErrors] = useState({});
  const [submitErr, setSubmitErr] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    api.get("/departments").then(({ data }) => setDepartments(data.data || [])).catch(() => {});
  }, []);

  const set = (field) => (e) => {
    setForm((p) => ({ ...p, [field]: e.target.value }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: null }));
  };

  const validateStep = (s) => {
    const e = {};
    if (s === 0) {
      if (!form.name.trim())        e.name        = "Full name is required";
      if (!form.employee_no.trim()) e.employee_no = "Employee number is required";
      if (!form.email.trim())       e.email       = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email";
      if (!form.password)           e.password    = "Password is required";
      else if (form.password.length < 6) e.password = "Minimum 6 characters";
      if (form.password !== form.confirm_password) e.confirm_password = "Passwords do not match";
    }
    if (s === 2) {
      if (!form.department_id)      e.department_id = "Department is required";
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
      await api.post("/faculty/register", {
        name:           form.name.trim(),
        employee_no:    form.employee_no.trim(),
        email:          form.email.trim(),
        password:       form.password,
        phone:          form.phone || undefined,
        gender:         form.gender || undefined,
        joining_date:   form.joining_date || undefined,
        department_id:  Number(form.department_id),
        designation:    form.designation || undefined,
        qualification:  form.qualification || undefined,
        specialization: form.specialization || undefined,
        office_location:form.office_location || undefined,
        profile_bio:    form.profile_bio || undefined,
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
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-slate-50
                      flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center
                          mx-auto text-4xl animate-bounce">🎓</div>
          <div>
            <h2 className="font-display text-2xl font-bold text-slate-800">Registration Successful!</h2>
            <p className="text-slate-500 mt-2">
              Your faculty account has been created and library membership is now active.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => navigate("/dashboard")} className="btn-primary">Go to Dashboard</button>
            <Link to="/students/register" className="btn-outline">Register as Student Instead</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-slate-50
                    flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-3xl">📖</span>
            <span className="font-display text-xl font-semibold text-slate-800">LibraryOS</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Faculty Registration</h1>
          <p className="text-slate-500 text-sm mt-1">Create your faculty library account</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
          <StepIndicator current={step} total={STEPS.length} labels={STEPS} />

          {/* ── Step 0: Account ──────────────────────────────────────────── */}
          {step === 0 && (
            <div className="space-y-5">
              <Field label="Full Name" required error={errors.name}>
                <input className={`input ${errors.name ? "border-red-400" : ""}`}
                  type="text" placeholder="Dr. Jane Smith" value={form.name} onChange={set("name")} />
              </Field>
              <Field label="Employee Number" required error={errors.employee_no}>
                <input className={`input ${errors.employee_no ? "border-red-400" : ""}`}
                  type="text" placeholder="FAC-2024-001" value={form.employee_no} onChange={set("employee_no")} />
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
                  <input className="input" type="tel" placeholder="0311-1111111"
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
              <Field label="Joining Date">
                <input className="input" type="date" value={form.joining_date} onChange={set("joining_date")} />
              </Field>
            </div>
          )}

          {/* ── Step 2: Professional ─────────────────────────────────────── */}
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
                <Field label="Designation">
                  <input className="input" type="text" placeholder="e.g. Associate Professor"
                    value={form.designation} onChange={set("designation")} />
                </Field>
                <Field label="Office Location">
                  <input className="input" type="text" placeholder="e.g. Block-A, Room 204"
                    value={form.office_location} onChange={set("office_location")} />
                </Field>
              </div>
              <Field label="Qualification">
                <input className="input" type="text" placeholder="e.g. PhD Computer Science, MIT"
                  value={form.qualification} onChange={set("qualification")} />
              </Field>
              <Field label="Specialization">
                <input className="input" type="text" placeholder="e.g. Machine Learning, Distributed Systems"
                  value={form.specialization} onChange={set("specialization")} />
              </Field>
              <Field label="About / Bio">
                <textarea className="input resize-none" rows={3}
                  placeholder="Research interests, teaching philosophy…"
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
              <Link to="/dashboard" className="text-sm text-slate-500 hover:text-slate-700">Cancel</Link>
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
          Are you a student?{" "}
          <Link to="/students/register" className="text-indigo-600 font-medium hover:underline">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}