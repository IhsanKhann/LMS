// routes/auth.routes.js
import { Router } from "express";
import {
  register,
  login,
  refresh,
  logout,
  getMe,
  updateMe,
  changePassword,
} from "../controllers/auth.controller.js";
import { checkAuth } from "../middleware/auth.middleware.js";

const router = Router();

// PRD §7.1
router.post("/register",      register);
router.post("/login",         login);
router.post("/refresh",       refresh);
router.post("/logout",        checkAuth, logout);
router.get( "/me",            checkAuth, getMe);
router.put( "/me",            checkAuth, updateMe);
router.put( "/me/password",   checkAuth, changePassword);

export default router;