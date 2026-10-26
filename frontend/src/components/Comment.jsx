import React, { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Link } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { useSelector, useDispatch } from 'react-redux'
import axios from 'axios'
import { toast } from 'sonner'
import { setPosts, setSelectedPost } from '@/redux/postSlice'

const Comment = ({ comment }) => {
  const { user } = useSelector(state => state.auth);
  const { selectedPost, posts } = useSelector(state => state.post);
  const dispatch = useDispatch();
  const [isDeleting, setIsDeleting] = useState(false);

  // Allow deletion if the logged in user is the comment author OR the post author
  const canDelete = user?._id === comment?.author?._id || user?._id === selectedPost?.author?._id;

  const deleteCommentHandler = async () => {
    try {
      setIsDeleting(true);
      const res = await axios.delete(`${import.meta.env.VITE_API_URL}/post/comment/${comment._id}`, {
        withCredentials: true
      });
      if (res.data.success) {
        // Update selectedPost
        const updatedComments = selectedPost.comments.filter(c => c._id !== comment._id);
        const updatedSelectedPost = { ...selectedPost, comments: updatedComments };
        dispatch(setSelectedPost(updatedSelectedPost));

        // Update posts list
        const updatedPosts = posts.map(p => p._id === selectedPost._id ? updatedSelectedPost : p);
        dispatch(setPosts(updatedPosts));

        toast.success(res.data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete comment');
    } finally {
      setIsDeleting(false);
    }
  }

  const formatHandle = (raw) => {
    if (!raw) return "@builder";
    const trimmed = String(raw).trim();
    if (trimmed.startsWith("@")) return trimmed;
    return `@${trimmed.toLowerCase().replace(/\s+/g, '')}`;
  };

  const cleanAuthor = formatHandle(comment?.author?.username);
  const initialLetter = cleanAuthor.replace(/^@/, '')[0]?.toUpperCase() || 'U';

  return (
    <div className="flex items-center gap-3 w-full group">
      {/* Avatar */}
      <Link to={`/profile/${comment?.author?._id}`} className="shrink-0 hover:opacity-80 transition-opacity">
        <Avatar className="h-8 w-8">
          <AvatarImage src={comment?.author?.profilepicture} className="object-cover w-full h-full" />
          <AvatarFallback className="bg-slate-100 font-bold text-slate-700">{initialLetter}</AvatarFallback>
        </Avatar>
      </Link>

      {/* Text wrapper */}
      <div className="flex-1 text-sm sm:text-base leading-snug break-words overflow-hidden">
        <Link to={`/profile/${comment?.author?._id}`} className="font-semibold mr-2 text-sm hover:underline decoration-slate-300 underline-offset-2">
          {cleanAuthor}
        </Link>
        <span className="break-words break-all overflow-hidden w-full text-slate-700">{comment?.text}</span>
      </div>

      {/* Delete Button */}
      {canDelete && (
        <button 
          onClick={deleteCommentHandler} 
          disabled={isDeleting}
          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500 p-1"
          title="Delete Comment"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

export default Comment
