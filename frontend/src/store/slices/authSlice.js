// src/store/slices/authSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api/axios.js";

// ── Thunks ──────────────────────────────────────────────────────────────────

export const loginThunk = createAsyncThunk(
  "auth/login",
  async (credentials, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/auth/login", credentials);
      // Persist token so the axios interceptor picks it up on subsequent requests
      if (data.token) {
        localStorage.setItem("accessToken", data.token);
      }
      // Backend may return the user under different keys — handle all variants
      return data.librarian ?? data.user ?? data.data ?? null;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Invalid credentials. Please try again."
      );
    }
  }
);

export const logoutThunk = createAsyncThunk("auth/logout", async () => {
  localStorage.removeItem("accessToken");
  try {
    // Best-effort: tell the server to invalidate the refresh token cookie
    await api.post("/auth/logout");
  } catch (_) {
    // Ignore — local session is cleared regardless
  }
});

// ── Slice ───────────────────────────────────────────────────────────────────

const authSlice = createSlice({
  name: "auth",
  initialState: {
    // Set a hardcoded librarian here during development so every page is
    // accessible without a running backend. Set to null in production.
    librarian: {
      librarian_id: 1,
      name:         "Test Librarian",
      username:     "test",
      role:         "admin", // try "staff" | "student" | "faculty"
    },
    isAuthenticated: true, // mirrors !!librarian
    loading:         false,
    error:           null,
  },
  reducers: {
    setLibrarian: (state, action) => {
      state.librarian      = action.payload;
      state.isAuthenticated = !!action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // ── login ──────────────────────────────────────────────────────────────
    builder
      .addCase(loginThunk.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.loading        = false;
        state.librarian      = action.payload;
        state.isAuthenticated = !!action.payload;
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload;
      });

    // ── logout ─────────────────────────────────────────────────────────────
    builder.addCase(logoutThunk.fulfilled, (state) => {
      state.librarian       = null;
      state.isAuthenticated = false;
    });
  },
});

export const { setLibrarian, clearError } = authSlice.actions;
export default authSlice.reducer;