import express from "express";

import { 
    addComment, 
    addPost,  
    bookmarkPost,  
    deletePost,  
    deleteComment,  
    dislikePost,  
    getAllPost,  
    getCommentsOfPost,  
    getUserPost,  
    likePost, 
    editPostCaption,
    vouchPost,
    getBountyPosts
} from "../controllers/post.controller.js";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import upload from "../middlewares/multer.js";

const router = express.Router();

router.route('/addpost').post(isAuthenticated, upload.single("image"), addPost);
router.route('/all').get(isAuthenticated, getAllPost);
router.route('/bounties/all').get(isAuthenticated, getBountyPosts);
router.route('/userpost/all').get(isAuthenticated, getUserPost);
router.route('/:id/like').get(isAuthenticated, likePost);
router.route('/:id/dislike').get(isAuthenticated, dislikePost);
router.route('/:id/vouch').post(isAuthenticated, vouchPost);
router.route("/:id/comment").post(isAuthenticated, addComment);
router.route("/:id/comment/all").get(isAuthenticated, getCommentsOfPost);
router.route("/delete/:id").delete(isAuthenticated, deletePost);
router.route("/edit/:id").put(isAuthenticated, editPostCaption);
router.route("/comment/:id").delete(isAuthenticated, deleteComment);
router.route("/:id/bookmark").get(isAuthenticated, bookmarkPost);

export default router;