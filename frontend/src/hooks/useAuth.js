// src/hooks/useAuth.js
import { useSelector, useDispatch } from "react-redux";
import { useNavigate }              from "react-router-dom";
import { loginThunk, logoutThunk }  from "../store/slices/authSlice.js";

/**
 * useAuth — convenience hook wrapping Redux auth state + actions
 *
 * @returns {object} { librarian, isAdmin, loading, error, login, logout }
 */
export function useAuth() {
  const dispatch   = useDispatch();
  const navigate   = useNavigate();
  const { librarian, loading, error } = useSelector((s) => s.auth);

  const login = async (credentials, redirectTo = "/dashboard") => {
    const res = await dispatch(loginThunk(credentials));
    if (loginThunk.fulfilled.match(res)) {
      navigate(redirectTo, { replace: true });
    }
    return res;
  };

  const logout = async () => {
    await dispatch(logoutThunk());
    navigate("/login", { replace: true });
  };

  return {
    librarian,
    isAdmin:  librarian?.role === "admin",
    isStaff:  librarian?.role === "staff",
    loading,
    error,
    login,
    logout,
  };
}