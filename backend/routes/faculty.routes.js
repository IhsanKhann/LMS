// routes/faculty.routes.js
// ─────────────────────────────────────────────────────────────────────────────
// No auth middleware — auth is disabled per project spec.
// ─────────────────────────────────────────────────────────────────────────────
import { Router } from "express";
import {
  registerFaculty,
  getFacultyList,
  getFaculty,
  updateFaculty,
} from "../controllers/faculty.controller.js";

const router = Router();

router.post("/register", registerFaculty);
router.get("/",          getFacultyList);
router.get("/:id",       getFaculty);
router.put("/:id",       updateFaculty);

export default router;