// src/store/slices/authSlice.js
// ─────────────────────────────────────────────────────────────────────────────
//  Redux slice for authentication state.
//  Referenced by: LoginPage.jsx, useAuth.js, ProtectedRoute.jsx
//
//  State shape:
//    librarian     — null | { id, name, role, username?, email? }
//    isAuthenticated — boolean
//    loading       — boolean
//    error         — null | string
// ─────────────────────────────────────────────────────────────────────────────
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api/axios.js";

// ── loginThunk ────────────────────────────────────────────────────────────────
// Payload: { username, password }  (username can be email, reg_no, emp_no, etc.)
export const loginThunk = createAsyncThunk(
  "auth/login",
  async (credentials, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/auth/login", credentials);
      // data = { success: true, data: { accessToken, user: { id, name, role, ... } } }
      return data.data; // { accessToken, user }
    } catch (err) {
      const message =
        err.response?.data?.message || "Login failed. Please try again.";
      return rejectWithValue(message);
    }
  }
);

// ── logoutThunk ───────────────────────────────────────────────────────────────
export const logoutThunk = createAsyncThunk(
  "auth/logout",
  async (_, { rejectWithValue }) => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Even if the server call fails, clear the local session
    }
    localStorage.removeItem("accessToken");
  }
);

// ── Restore session from localStorage on cold load ───────────────────────────
// If there's a token in localStorage, decode it to restore the user without
// a network request. The axios interceptor will refresh if the token is expired.
const restoreSession = () => {
  try {
    const token = localStorage.getItem("accessToken");
    if (!token) return { librarian: null, isAuthenticated: false };

    // Decode the JWT payload (no signature verification — the server verifies)
    const payload = JSON.parse(atob(token.split(".")[1]));

    // Reject if clearly expired (add 10-second buffer)
    if (payload.exp * 1000 < Date.now() - 10_000) {
      localStorage.removeItem("accessToken");
      return { librarian: null, isAuthenticated: false };
    }

    return {
      librarian: {
        id:   payload.id,
        role: payload.role,
        // name is not in the JWT — it will be populated after getMe or on next login
        name: null,
      },
      isAuthenticated: true,
    };
  } catch {
    localStorage.removeItem("accessToken");
    return { librarian: null, isAuthenticated: false };
  }
};

const initialSession = restoreSession();

// ── Slice ─────────────────────────────────────────────────────────────────────
const authSlice = createSlice({
  name: "auth",
  initialState: {
    librarian:       initialSession.librarian,
    isAuthenticated: initialSession.isAuthenticated,
    loading:         false,
    error:           null,
  },

  reducers: {
    // Called by the axios interceptor's auth:logout event
    clearAuth(state) {
      state.librarian       = null;
      state.isAuthenticated = false;
      state.error           = null;
    },

    // Allows updating profile fields after a successful GET /me call
    setLibrarian(state, action) {
      state.librarian       = { ...state.librarian, ...action.payload };
      state.isAuthenticated = true;
    },
  },

  extraReducers: (builder) => {
    // ── login ───────────────────────────────────────────────────────────────
    builder
      .addCase(loginThunk.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        const { accessToken, user } = action.payload;

        // Persist token for the axios interceptor
        localStorage.setItem("accessToken", accessToken);

        state.librarian       = user;   // { id, name, role, username?, email? }
        state.isAuthenticated = true;
        state.loading         = false;
        state.error           = null;
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload ?? "Login failed";
      });

    // ── logout ──────────────────────────────────────────────────────────────
    builder
      .addCase(logoutThunk.pending, (state) => {
        state.loading = true;
      })
      .addCase(logoutThunk.fulfilled, (state) => {
        state.librarian       = null;
        state.isAuthenticated = false;
        state.loading         = false;
        state.error           = null;
      })
      .addCase(logoutThunk.rejected, (state) => {
        // Even on rejection, clear local state
        state.librarian       = null;
        state.isAuthenticated = false;
        state.loading         = false;
      });
  },
});

export const { clearAuth, setLibrarian } = authSlice.actions;
export default authSlice.reducer;