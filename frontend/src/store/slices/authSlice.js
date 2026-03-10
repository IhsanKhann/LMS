import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// Simulate logout
export const logoutThunk = createAsyncThunk("auth/logout", async () => {
  localStorage.removeItem("accessToken");
});

const authSlice = createSlice({
  name: "auth",
  initialState: {
    // Hardcoded test librarian: ensures frontend always thinks user is logged in
    librarian: {
      librarian_id: 1,
      name: "Test Librarian",
      username: "test",
      role: "admin", // Change to "staff", "student", "faculty" to test different routes
    },
    loading: false,
    error: null,
  },
  reducers: {
    setLibrarian: (state, action) => {
      state.librarian = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(logoutThunk.fulfilled, (state) => {
      state.librarian = null;
    });
  },
});

export const { setLibrarian, clearError } = authSlice.actions;
export default authSlice.reducer;