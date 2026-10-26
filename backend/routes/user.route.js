import express from "express";
import {
    getProfile, editProfile, logout, register, login, getSuggestedUsers, 
    getFollowingUsers, getChatPartners, followOrUnfollow, googleLogin, 
    forgotPassword, resetPassword, sendConnectionRequest, acceptConnectionRequest, 
    rejectConnectionRequest, getPendingRequests, getConnectionStatus, withdrawConnectionRequest, removeSynergy, getMe,
    scoutCandidates, searchUsers
} from "../controllers/user.controller.js";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import upload from "../middlewares/multer.js";
const router = express.Router();

router.route('/register').post(register);
router.route('/login').post(login);
router.route('/google-login').post(googleLogin);
router.route('/logout').get(isAuthenticated, logout);
router.route('/search').get(isAuthenticated, searchUsers);
router.route('/scout').get(isAuthenticated, scoutCandidates).post(isAuthenticated, scoutCandidates);
router.route('/:id/profile').get(isAuthenticated, getProfile);
router.route('/profile/edit').post(isAuthenticated, upload.single("profilephoto"), editProfile);
router.route('/suggested').get(isAuthenticated, getSuggestedUsers);
router.route('/following').get(isAuthenticated, getFollowingUsers);
router.route('/chat-partners').get(isAuthenticated, getChatPartners);
router.route('/followorunfollow/:id').post(isAuthenticated, followOrUnfollow); // Legacy follow, keep for now or replace
router.route('/forgot-password').post(forgotPassword);
router.route('/reset-password').post(resetPassword);

// Synergy / LinkedIn Flow Routes
router.route('/synergy/request/:id').post(isAuthenticated, sendConnectionRequest);
router.route('/synergy/accept/:requestId').post(isAuthenticated, acceptConnectionRequest);
router.route('/synergy/reject/:requestId').post(isAuthenticated, rejectConnectionRequest);
router.route('/synergy/pending').get(isAuthenticated, getPendingRequests);
router.route('/synergy/status/:id').get(isAuthenticated, getConnectionStatus);
router.route('/synergy/withdraw/:id').delete(isAuthenticated, withdrawConnectionRequest);
router.route('/synergy/remove/:id').delete(isAuthenticated, removeSynergy);
router.route('/me').get(isAuthenticated, getMe);

export default router;