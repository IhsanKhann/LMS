// routes/transaction.routes.js
import { Router } from "express";
import {
  issueBook, returnBook, getOverdue, getMemberTransactions,
} from "../controllers/issue.controller.js";
import { checkAuth, checkRole } from "../middleware/auth.middleware.js";

const router = Router();
router.post("/issue",                    checkAuth, issueBook);
router.patch("/:issueId/return",         checkAuth, returnBook);
router.get("/overdue",                   checkAuth, getOverdue);
router.get("/member/:memberId",          checkAuth, getMemberTransactions);
export default router;