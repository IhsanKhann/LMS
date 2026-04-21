// routes/transaction.routes.js
import { Router } from "express";
import {
  issueBook, returnBook, getOverdue, getMemberTransactions,
} from "../controllers/issue.controller.js";
import { checkAuth, checkRole } from "../middleware/auth.middleware.js";

const router = Router();

// ⚠️  FIX: Static routes (/overdue, /member/:memberId) MUST come before
//     dynamic routes (/:issueId/...) so Express doesn't swallow "overdue"
//     as an issueId parameter.
router.get("/overdue",               checkAuth, checkRole(["admin", "staff"]), getOverdue);
router.get("/member/:memberId",      checkAuth,                                getMemberTransactions);
router.post("/issue",                checkAuth, checkRole(["admin", "staff"]), issueBook);
router.patch("/:issueId/return",     checkAuth, checkRole(["admin", "staff"]), returnBook);

export default router;