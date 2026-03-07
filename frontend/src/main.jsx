// src/main.jsx
import React       from "react";
import ReactDOM    from "react-dom/client";
import { Provider } from "react-redux";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";
import { store }          from "./store/index.js";
import ProtectedRoute     from "./components/ProtectedRoute.jsx";
import "./index.css";

// ── Lazy-loaded pages ─────────────────────────────────────────────────────────
const LoginPage         = React.lazy(() => import("./pages/auth/LoginPage.jsx"));
const AppLayout         = React.lazy(() => import("./components/layout/AppLayout.jsx"));
const Dashboard         = React.lazy(() => import("./pages/dashboard/Dashboard.jsx"));
const BookCatalog       = React.lazy(() => import("./pages/books/BookCatalog.jsx"));
const BookDetail        = React.lazy(() => import("./pages/books/BookDetails.jsx"));
const MembersPage       = React.lazy(() => import("./pages/members/MembersPage.jsx"));
const TransactionsPage  = React.lazy(() => import("./pages/transactions/TransactionsPage.jsx"));
const OverduePage       = React.lazy(() => import("./pages/transactions/OverduePage.jsx"));
const UnauthorizedPage  = React.lazy(() => import("./pages/auth/UnauthorizedPage.jsx"));

// ── Router ────────────────────────────────────────────────────────────────────
const router = createBrowserRouter([
  // Public
  { path: "/login",        element: <LoginPage /> },
  { path: "/unauthorized", element: <UnauthorizedPage /> },

  // Protected: any authenticated librarian (staff or admin)
  {
    element: <ProtectedRoute allowedRoles={["admin", "staff"]} />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true,               element: <Navigate to="/dashboard" replace /> },
          { path: "/dashboard",        element: <Dashboard /> },
          { path: "/books",            element: <BookCatalog /> },
          { path: "/books/:id",        element: <BookDetail /> },
          { path: "/members",          element: <MembersPage /> },
          { path: "/transactions",     element: <TransactionsPage /> },
        ],
      },
    ],
  },

  // Protected: admin only
  {
    element: <ProtectedRoute allowedRoles={["admin"]} />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/overdue",  element: <OverduePage /> },
          // Add admin-only pages here (e.g. /admin/librarians, /admin/policies)
        ],
      },
    ],
  },

  // Fallback
  { path: "*", element: <Navigate to="/dashboard" replace /> },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <React.Suspense fallback={
        <div className="h-screen flex items-center justify-center bg-surface">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
        </div>
      }>
        <RouterProvider router={router} />
      </React.Suspense>
    </Provider>
  </React.StrictMode>
);