// src/pages/auth/UnauthorizedPage.jsx
import { useNavigate } from "react-router-dom";

export default function UnauthorizedPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="text-center">
        <span className="text-6xl">🔒</span>
        <h1 className="font-display text-3xl text-slate-900 mt-4">Access Denied</h1>
        <p className="text-slate-500 mt-2">You don't have permission to view this page.</p>
        <button onClick={() => navigate("/dashboard")} className="btn-primary mt-6">
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}