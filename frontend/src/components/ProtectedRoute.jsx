// src/components/ProtectedRoute.jsx
import { useSelector } from "react-redux";
import { Navigate, Outlet, useLocation } from "react-router-dom";

/**
 * ProtectedRoute
 * @param {string[]} allowedRoles - e.g. ["admin"] or ["admin","staff"]
 *   Analogous to allowedDepartments in the reference; maps to Librarian roles.
 *   Leave empty / omit to allow any authenticated user.
 */
const ProtectedRoute = ({ allowedRoles = [] }) => {
  const { librarian } = useSelector((state) => state.auth);
  const location      = useLocation();

  // Not logged in → redirect to /login, preserving intended destination
  if (!librarian) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role check (skip if no restrictions declared)
  if (allowedRoles.length > 0 && !allowedRoles.includes(librarian.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;