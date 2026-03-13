// routes/student.routes.js
// ─────────────────────────────────────────────────────────────────────────────
// No auth middleware — auth is disabled per project spec.
// ─────────────────────────────────────────────────────────────────────────────
import { Router } from "express";
import {
  registerStudent,
  getStudents,
  getStudent,
  updateStudent,
} from "../controllers/student.controller.js";

const router = Router();

router.post("/register", registerStudent);
router.get("/",          getStudents);
router.get("/:id",       getStudent);
router.put("/:id",       updateStudent);

export default router;