import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { resumeUpload } from '../middleware/upload.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { updateResumeSkills, uploadResume } from '../controllers/resumeController.js';

const router = Router();

router.post('/upload', requireAuth, resumeUpload.single('resume'), asyncHandler(uploadResume));
router.put('/skills', requireAuth, asyncHandler(updateResumeSkills));

export default router;
