// routes/book.routes.js
import { Router } from "express";
import {
  getBooks, getBook, createBook, updateBook, deleteBook,
  addCopies, getCategories,
} from "../controllers/book.controller.js";
import { checkAuth, checkRole } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/categories",       checkAuth, getCategories);
router.get("/",                 checkAuth, getBooks);
router.get("/:id",              checkAuth, getBook);
router.post("/",                checkAuth, checkRole(["admin"]), createBook);
router.put("/:id",              checkAuth, checkRole(["admin"]), updateBook);
router.delete("/:id",           checkAuth, checkRole(["admin"]), deleteBook);
router.post("/:id/copies",      checkAuth, checkRole(["admin"]), addCopies);

export default router;