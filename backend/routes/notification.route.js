import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { getNotifications, markAsRead, createMissedCallNotification } from "../controllers/notification.controller.js";

const router = express.Router();

router.route("/").get(isAuthenticated, getNotifications);
router.route("/mark-read").post(isAuthenticated, markAsRead);
router.route("/missed-call/:id").post(isAuthenticated, createMissedCallNotification);

export default router;
