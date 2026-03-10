// src/components/ProtectedRoute.jsx
import { useSelector } from "react-redux";
import { Navigate, Outlet } from "react-router-dom";

export default function ProtectedRoute({ allowedRoles }) {
  const { librarian } = useSelector((s) => s.auth);

  // DEV: always allow access
  if (!librarian) return <Navigate to="/login" replace />;

  // Optional: check roles in dev
  if (allowedRoles && !allowedRoles.includes(librarian.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}