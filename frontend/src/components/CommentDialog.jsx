import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@radix-ui/react-avatar'
import { MoreHorizontal } from 'lucide-react'
import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import Comment from './Comment'
import axios from 'axios'
import { toast } from 'sonner'
import { setPosts, setSelectedPost } from '@/redux/postSlice'


const CommentDialog = ({ open, setOpen }) => {
  const [text, settext] = useState("")

  const { selectedPost, posts } = useSelector(state => state.post)


  const dispatch = useDispatch()

  const handleChange = (e) => {
    let inputText = e.target.value
    if (inputText.trim()) {
      settext(inputText)
    } else {
      settext("")
    }
  }

  const sendMessageHandler = async () => {
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/post/${selectedPost._id}/comment`,

        { comment: text },
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: true,
        }
      );

      if (res.data.success) {
        const newComment = res.data.comment;

        // 🔁 Create updated comments array
        const updatedComments = [...selectedPost.comments, newComment];

        // 🔁 Update global posts list
        const updatedPosts = posts.map((postitem) =>
          postitem._id === selectedPost._id
            ? { ...postitem, comments: updatedComments }
            : postitem
        );

        // 🔁 Dispatch updated posts and selected post
        dispatch(setPosts(updatedPosts));
        dispatch(setSelectedPost({ ...selectedPost, comments: updatedComments }));

        // ✅ Clear input
        settext("");

        toast.success(res.data.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to comment");
    }
  };

  const formatHandle = (raw) => {
    if (!raw) return "@builder";
    const trimmed = String(raw).trim();
    if (trimmed.startsWith("@")) return trimmed;
    return `@${trimmed.toLowerCase().replace(/\s+/g, '')}`;
  };

  const cleanAuthor = formatHandle(selectedPost?.author?.username);
  const initialLetter = cleanAuthor.replace(/^@/, '')[0]?.toUpperCase() || 'U';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-4xl w-full h-[60vh] xl:h-[80vh] p-0 rounded-xl overflow-hidden shadow-2xl">
        <div className="flex flex-col xl:flex-row w-full h-[60vh] xl:h-[80vh] ">
          {/* Left: Image */}
          <div className="w-full h-1/2 xl:h-full xl:w-1/2 bg-black flex items-center justify-center ">
            <img
              src={selectedPost?.image}
              alt=""
              className="object-contain max-w-[70%] xl:max-w-full xl:max-h-full"
            />
          </div>

          {/* Right: Comments Section */}
          <div className="w-full xl:w-1/2 bg-white flex flex-col h-full overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between gap-3 p-4 border-b">
              <div className="flex items-center gap-2 sm:gap-3  ">
                <Avatar className="h-9 w-9 sm:h-10 sm:w-10 rounded-full overflow-hidden">
                  <AvatarImage src={selectedPost?.author?.profilepicture || "https://github.com/shadcn.png"} className="w-full h-full object-cover" />
                  <AvatarFallback className="bg-slate-100 font-bold text-slate-700">{initialLetter}</AvatarFallback>
                </Avatar>
                <span className="font-semibold text-sm max-w-[180px] text-slate-900">
                  {cleanAuthor}
                </span>
              </div>
              

            </div>

            {/* Comments (Scrollable) */}
            <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3 text-sm">
              {
                selectedPost?.comments.map((comment) => (
                  <Comment key={comment._id} comment={comment} />
                ))
              }
            </div>

            {/* Add comment input */}
            <div className="border-t p-3 flex-shrink-0 flex items-center gap-3">

              <input
                type="text"
                value={text}
                onChange={handleChange}
                placeholder="Add a comment..."
                className="flex-1 outline-none text-sm px-3 py-2 bg-gray-100 rounded-full"
              />
              <button disabled={!text.trim()} onClick={sendMessageHandler} className="text-blue-500 font-medium text-sm hover:opacity-80">Post</button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default CommentDialog
