// routes/book.routes.js
import { Router } from "express";
import {
  getBooks, searchBooks, getBook, createBook, updateBook, deleteBook,
  addCopies, getCategories, getPublishers, getAuthors,
} from "../controllers/book.controller.js";
import { checkAuth, checkRole } from "../middleware/auth.middleware.js";

const router = Router();

// ⚠️  Static routes MUST be declared before /:id to avoid Express matching
//     "categories", "search", etc. as the :id param.
router.get("/categories",  checkAuth,                        getCategories);
router.get("/publishers",  checkAuth,                        getPublishers);
router.get("/authors",     checkAuth,                        getAuthors);
router.get("/search",      checkAuth,                        searchBooks);   // PRD §7.2
router.get("/",            checkAuth,                        getBooks);
router.get("/:id",         checkAuth,                        getBook);
router.post("/",           checkAuth, checkRole(["admin"]),  createBook);
router.put("/:id",         checkAuth, checkRole(["admin"]),  updateBook);
router.delete("/:id",      checkAuth, checkRole(["admin"]),  deleteBook);
router.post("/:id/copies", checkAuth, checkRole(["admin"]),  addCopies);

export default router;