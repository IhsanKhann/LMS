// routes/transaction.routes.js
// ─────────────────────────────────────────────────────────────────────────────
//  Fix: getMemberTransactions → getMemberIssues (function did not exist)
//  Fix: route paths corrected (/issues plural, not singular params)
//  Fix: route ordering — static paths before dynamic /:id params
// ─────────────────────────────────────────────────────────────────────────────
import { Router } from "express";
import {
  issueBook,
  returnBook,
  getIssues,
  getIssue,
  getOverdue,
  getMemberIssues,
  getBookIssues,
} from "../controllers/issue.controller.js";
import { checkAuth, checkRole } from "../middleware/auth.middleware.js";

const router = Router();

// ⚠️  Static/parameterised routes MUST come before dynamic /:id routes
//     so Express doesn't swallow "overdue" or "member" as an issueId.

// GET  /api/transactions/overdue
router.get(
  "/overdue",
  checkAuth, checkRole(["admin", "staff"]),
  getOverdue
);

// GET  /api/transactions/member/:memberId
router.get(
  "/member/:memberId",
  checkAuth,
  getMemberIssues
);

// GET  /api/transactions/book/:bookId
router.get(
  "/book/:bookId",
  checkAuth, checkRole(["admin", "staff"]),
  getBookIssues
);

// GET  /api/transactions  — all issues (paginated)
router.get(
  "/",
  checkAuth, checkRole(["admin", "staff"]),
  getIssues
);

// GET  /api/transactions/:id
router.get(
  "/:id",
  checkAuth, checkRole(["admin", "staff"]),
  getIssue
);

// POST /api/transactions  — issue a book
router.post(
  "/",
  checkAuth, checkRole(["admin", "staff"]),
  issueBook
);

// PATCH /api/transactions/:id/return  — mark returned
router.patch(
  "/:id/return",
  checkAuth, checkRole(["admin", "staff"]),
  returnBook
);

export default router;