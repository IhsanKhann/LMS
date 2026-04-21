// routes/issue.routes.js
// PRD §7.4 — Issue & Return routes (was transaction.routes.js)
import { Router } from "express";
import {
  issueBook, returnBook,
  getIssues, getIssue,
  getOverdue, getMemberIssues, getBookIssues,
} from "../controllers/issue.controller.js";
import { checkAuth, checkRole } from "../middleware/auth.middleware.js";

const router = Router();

// ⚠️  Static/parameterised routes before /:id to avoid Express path conflicts.
router.get("/overdue",           checkAuth, checkRole(["admin", "staff"]), getOverdue);
router.get("/member/:memberId",  checkAuth,                                getMemberIssues);
router.get("/book/:bookId",      checkAuth, checkRole(["admin", "staff"]), getBookIssues);
router.get("/",                  checkAuth, checkRole(["admin", "staff"]), getIssues);
router.get("/:id",               checkAuth, checkRole(["admin", "staff"]), getIssue);
router.post("/",                 checkAuth, checkRole(["admin", "staff"]), issueBook);
router.put("/:id/return",        checkAuth, checkRole(["admin", "staff"]), returnBook);

export default router;