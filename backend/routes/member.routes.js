// routes/member.routes.js
import { Router } from "express";
import {
  getMembers, getMember, createMember, updateMember, deleteMember,
} from "../controllers/member.controller.js";
import { checkAuth, checkRole } from "../middleware/auth.middleware.js";

const router = Router();

// PRD §7.3 — all member routes are Admin only
router.get("/",    checkAuth, checkRole(["admin", "staff"]), getMembers);
router.get("/:id", checkAuth, checkRole(["admin", "staff"]), getMember);
router.post("/",   checkAuth, checkRole(["admin"]),          createMember);
router.put("/:id", checkAuth, checkRole(["admin"]),          updateMember);
router.delete("/:id", checkAuth, checkRole(["admin"]),       deleteMember);

export default router;