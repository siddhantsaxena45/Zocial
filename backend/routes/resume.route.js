import express from "express";
import { generateResume, getResume, simulateJobFit } from "../controllers/resume.controller.js";
import isAuthenticated from "../middlewares/isAuthenticated.js";

const router = express.Router();

router.get("/:id", isAuthenticated, getResume);
router.post("/generate/:id", isAuthenticated, generateResume);
router.post("/generate", isAuthenticated, generateResume);
router.post("/job-fit", isAuthenticated, simulateJobFit);

export default router;
