// src/store/slices/authSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api/axios.js";

export const loginThunk = createAsyncThunk(
  "auth/login",
  async (credentials, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/auth/login", credentials);
      localStorage.setItem("accessToken", data.data.accessToken);
      return data.data.librarian;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Login failed");
    }
  }
);

export const logoutThunk = createAsyncThunk("auth/logout", async () => {
  await api.post("/auth/logout");
  localStorage.removeItem("accessToken");
});

const authSlice = createSlice({
  name: "auth",
  initialState: {
    librarian: null,
    loading:   false,
    error:     null,
  },
  reducers: {
    setLibrarian: (state, action) => { state.librarian = action.payload; },
    clearError:   (state)          => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginThunk.pending,   (state) => { state.loading = true; state.error = null; })
      .addCase(loginThunk.fulfilled, (state, { payload }) => {
        state.loading = false; state.librarian = payload;
      })
      .addCase(loginThunk.rejected,  (state, { payload }) => {
        state.loading = false; state.error = payload;
      })
      .addCase(logoutThunk.fulfilled, (state) => { state.librarian = null; });
  },
});

export const { setLibrarian, clearError } = authSlice.actions;
export default authSlice.reducer;