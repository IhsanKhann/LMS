// routes/book.routes.js
import { Router } from "express";
import {
  getBooks, getBook, createBook, updateBook, deleteBook,
  addCopies, getCategories, getPublishers, getAuthors,
} from "../controllers/book.controller.js";
import { checkAuth, checkRole } from "../middleware/auth.middleware.js";

const router = Router();

// ⚠️  FIX: /categories MUST be registered before /:id, otherwise Express
//     matches "categories" as the :id param and calls getBook instead.
router.get("/categories",           checkAuth,                        getCategories);
// ⚠️  FIX: BookForm.jsx fetches /publishers and /authors to populate dropdowns.
//     These routes were missing — BookForm would silently get empty arrays.
router.get("/publishers",           checkAuth,                        getPublishers);
router.get("/authors",              checkAuth,                        getAuthors);
router.get("/",                     checkAuth,                        getBooks);
router.get("/:id",                  checkAuth,                        getBook);
router.post("/",                    checkAuth, checkRole(["admin"]),  createBook);
router.put("/:id",                  checkAuth, checkRole(["admin"]),  updateBook);
router.delete("/:id",               checkAuth, checkRole(["admin"]),  deleteBook);
router.post("/:id/copies",          checkAuth, checkRole(["admin"]),  addCopies);

export default router;