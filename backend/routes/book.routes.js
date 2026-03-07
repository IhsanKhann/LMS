// routes/book.routes.js
import { Router } from "express";
import { getBooks, getBook, createBook } from "../controllers/book.controller.js";
import { checkAuth, checkRole } from "../middleware/auth.middleware.js";

const router = Router();
router.get("/",     checkAuth, getBooks);
router.get("/:id",  checkAuth, getBook);
router.post("/",    checkAuth, checkRole(["admin"]), createBook);
export default router;