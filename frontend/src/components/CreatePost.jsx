import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import React, { useRef, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { readFileAsDataURL } from "@/lib/utils";
import { Button } from "./ui/button";
import { 
  Loader2, Github, Globe, Tag, Users, 
  ChevronDown, ChevronUp, ImagePlus, Sparkles, Code, FileCode,
  Search, X, Check 
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { setPosts } from "@/redux/postSlice";
import { addUserPost } from "@/redux/authSlice";

const CreatePost = ({ open, setOpen }) => {
  const imageRef = useRef();
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState("");
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [showArtifacts, setShowArtifacts] = useState(false);

  // Proof-of-work, Code Inspector, & Synergy state
  const [githubUrl, setGithubUrl] = useState("");
  const [liveUrl, setLiveUrl] = useState("");
  const [tags, setTags] = useState("");
  const [codeSnippet, setCodeSnippet] = useState("");
  const [codeLanguage, setCodeLanguage] = useState("javascript");
  const [collaboratorUsername, setCollaboratorUsername] = useState("");
  const [collaboratorRole, setCollaboratorRole] = useState("Co-Developer");
  const [selectedCollaborator, setSelectedCollaborator] = useState(null);
  const [collabSearch, setCollabSearch] = useState("");
  const [collabSearchResults, setCollabSearchResults] = useState([]);
  const [isSearchingCollab, setIsSearchingCollab] = useState(false);
  const [showCollabDropdown, setShowCollabDropdown] = useState(false);

  const { user } = useSelector(state => state.auth);
  const { posts } = useSelector(state => state.post);
  const dispatch = useDispatch();

  const searchCollaborators = async (query) => {
    setCollabSearch(query);
    try {
      setIsSearchingCollab(true);
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/user/search?q=${encodeURIComponent(query)}`,
        { withCredentials: true }
      );
      if (res.data.success) {
        setCollabSearchResults(res.data.users || []);
        setShowCollabDropdown(true);
      }
    } catch (err) {
      console.error("Collaborator search error:", err);
    } finally {
      setIsSearchingCollab(false);
    }
  };

  const handleSelectCollaborator = (collabUser) => {
    setSelectedCollaborator(collabUser);
    setCollaboratorUsername(collabUser.username);
    setCollabSearch("");
    setShowCollabDropdown(false);
  };

  const handleRemoveCollaborator = () => {
    setSelectedCollaborator(null);
    setCollaboratorUsername("");
    setCollaboratorRole("Co-Developer");
  };

  const fileChangeHandler = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setFile(file);
      const previewUrl = await readFileAsDataURL(file);
      setPreview(previewUrl);
    }
  };

  const createPostHandler = async () => {
    if (!file) {
      return toast.error("Please upload an image or visual artifact for your transmission.");
    }

    try {
      setLoading(true);
      const formdata = new FormData();
      formdata.append("caption", caption);
      formdata.append("image", file);
      
      if (githubUrl) formdata.append("githubUrl", githubUrl);
      if (liveUrl) formdata.append("liveUrl", liveUrl);
      if (tags) formdata.append("tags", tags);
      if (codeSnippet) formdata.append("codeSnippet", codeSnippet);
      if (codeLanguage) formdata.append("codeLanguage", codeLanguage);
      if (selectedCollaborator) {
        formdata.append("collaboratorId", selectedCollaborator._id);
        formdata.append("collaboratorUsername", selectedCollaborator.username);
        formdata.append("collaboratorRole", collaboratorRole);
      } else if (collaboratorUsername) {
        formdata.append("collaboratorUsername", collaboratorUsername);
        formdata.append("collaboratorRole", collaboratorRole);
      }

      const response = await axios.post(`${import.meta.env.VITE_API_URL}/post/addpost`, formdata, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true
      });

      if (response.data.success) {
        toast.success(response.data.message || "Transmission published!");
        dispatch(setPosts([response.data.post, ...posts]));
        dispatch(addUserPost(response.data.post));
        
        // Reset state
        setCaption('');
        setFile('');
        setPreview('');
        setGithubUrl('');
        setLiveUrl('');
        setTags('');
        setCodeSnippet('');
        setCodeLanguage('javascript');
        setCollaboratorUsername('');
        setCollaboratorRole('Co-Developer');
        setSelectedCollaborator(null);
        setCollabSearch('');
        setShowCollabDropdown(false);
        setShowArtifacts(false);
        setOpen(false);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to publish transmission");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        onInteractOutside={() => setOpen(false)}
        className="w-full max-w-lg sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 bg-white/95 backdrop-blur-xl border border-slate-100 shadow-2xl"
      >
        <DialogHeader className="border-b border-slate-100 pb-3">
          <DialogTitle className="text-center text-base font-black text-slate-900 uppercase tracking-tight flex items-center justify-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-600" /> New Transmission
          </DialogTitle>
        </DialogHeader>

        {/* User Info */}
        <div className="flex gap-3 items-center mt-2">
          <Avatar className="h-10 w-10 border border-slate-200">
            <AvatarImage src={user?.profilepicture || "https://github.com/shadcn.png"} alt="img" />
            <AvatarFallback className="bg-slate-100 font-bold text-slate-700 text-xs">
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <h1 className="font-bold text-sm text-slate-900">@{user?.username}</h1>
            <span className="text-[11px] text-slate-500 font-medium line-clamp-1">{user?.bio || "Zocial Builder"}</span>
          </div>
        </div>

        {/* Caption */}
        <Textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="What did you build or ship today? Describe architectural decisions, milestones, or learnings..."
          className="mt-3 text-sm rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-indigo-500 resize-none"
          rows={3}
        />

        {/* Image Preview / Upload Area */}
        {preview ? (
          <div className="relative mt-2 rounded-xl overflow-hidden border border-slate-200 max-h-60 group">
            <img src={preview} alt="preview" className="w-full h-full object-cover" />
            <button
              onClick={() => { setFile(''); setPreview(''); }}
              className="absolute top-2 right-2 bg-black/70 hover:bg-black text-white text-[10px] font-bold px-2 py-1 rounded-md transition-all"
            >
              Change Artifact
            </button>
          </div>
        ) : (
          <div 
            onClick={() => imageRef.current.click()}
            className="mt-2 border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/30 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer transition-all gap-2"
          >
            <div className="p-2.5 bg-white rounded-full shadow-sm text-indigo-600">
              <ImagePlus className="h-5 w-5" />
            </div>
            <span className="text-xs font-bold text-slate-700">Attach Visual Proof / Architecture Diagram</span>
            <span className="text-[10px] text-slate-400 font-medium">JPEG, PNG, or WebP up to 10MB</span>
          </div>
        )}

        <input type="file" hidden ref={imageRef} accept="image/*" onChange={fileChangeHandler} />

        {/* Collapsible Proof-of-Work & Synergy Artifacts */}
        <div className="mt-2 border border-slate-100 rounded-xl bg-slate-50/60 p-3">
          <button
            type="button"
            onClick={() => setShowArtifacts(!showArtifacts)}
            className="w-full flex justify-between items-center text-xs font-bold text-slate-700 hover:text-indigo-600 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
              Proof-of-Work & Synergy Artifacts (GitHub, Live URL, Tags)
            </span>
            {showArtifacts ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {showArtifacts && (
            <div className="mt-3 space-y-2.5 pt-2 border-t border-slate-200/60 text-xs">
              {/* GitHub Repo URL */}
              <div className="flex items-center gap-2 bg-white rounded-lg px-2.5 py-1.5 border border-slate-200">
                <Github className="h-4 w-4 text-slate-500 shrink-0" />
                <input
                  type="url"
                  placeholder="GitHub Repository URL (e.g. https://github.com/...)"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  className="w-full bg-transparent outline-none text-xs text-slate-700"
                />
              </div>

              {/* Live Project URL */}
              <div className="flex items-center gap-2 bg-white rounded-lg px-2.5 py-1.5 border border-slate-200">
                <Globe className="h-4 w-4 text-slate-500 shrink-0" />
                <input
                  type="url"
                  placeholder="Live Project / Demo URL (e.g. https://...)"
                  value={liveUrl}
                  onChange={(e) => setLiveUrl(e.target.value)}
                  className="w-full bg-transparent outline-none text-xs text-slate-700"
                />
              </div>

              {/* Tech Stack Tags */}
              <div className="flex items-center gap-2 bg-white rounded-lg px-2.5 py-1.5 border border-slate-200">
                <Tag className="h-4 w-4 text-slate-500 shrink-0" />
                <input
                  type="text"
                  placeholder="Technologies used (comma separated: React, Node.js, Docker...)"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full bg-transparent outline-none text-xs text-slate-700"
                />
              </div>

              {/* 🤝 Synergy Collaborator Search & Tagging */}
              <div className="space-y-2">
                {selectedCollaborator ? (
                  <div className="flex flex-col gap-2 p-2.5 bg-gradient-to-r from-purple-50/80 to-indigo-50/80 border border-purple-200/90 rounded-xl shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7 border border-purple-200 shadow-xs">
                          <AvatarImage src={selectedCollaborator.profilepicture || "https://github.com/shadcn.png"} />
                          <AvatarFallback className="text-[10px] font-bold bg-purple-600 text-white">
                            {selectedCollaborator.username?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                            @{selectedCollaborator.username}
                            <span className="text-[9px] font-black uppercase tracking-wider text-purple-700 bg-purple-100 border border-purple-200 px-1.5 py-0.5 rounded-md">
                              Tagged Collaborator
                            </span>
                          </span>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={handleRemoveCollaborator} 
                        className="text-slate-400 hover:text-red-500 transition-colors p-1"
                        title="Remove collaborator"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    
                    {/* Role Selector & Quick Presets */}
                    <div className="space-y-1.5 pt-2 border-t border-purple-100">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-purple-800 shrink-0">Collaborator Role:</span>
                        <input
                          type="text"
                          placeholder="e.g. Co-Architect, UI/UX Lead, Backend Engineer..."
                          value={collaboratorRole}
                          onChange={(e) => setCollaboratorRole(e.target.value)}
                          className="w-full bg-white border border-purple-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 outline-none focus:ring-1 focus:ring-purple-400"
                        />
                      </div>
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {["Frontend Lead", "Backend Architect", "UI/UX Designer", "Full-Stack Co-Dev", "DevOps & Cloud"].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setCollaboratorRole(preset)}
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-md transition-all ${
                              collaboratorRole === preset 
                                ? "bg-purple-600 text-white shadow-xs" 
                                : "bg-white text-purple-700 hover:bg-purple-100 border border-purple-200"
                            }`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="flex items-center gap-2 bg-white rounded-lg px-2.5 py-1.5 border border-slate-200 focus-within:border-purple-400 transition-all">
                      <Users className="h-4 w-4 text-purple-600 shrink-0" />
                      <input
                        type="text"
                        placeholder="Tag Collaborator (Search Synergy connections by @username or role...)"
                        value={collabSearch}
                        onFocus={() => searchCollaborators(collabSearch)}
                        onChange={(e) => searchCollaborators(e.target.value)}
                        className="w-full bg-transparent outline-none text-xs text-slate-700 placeholder:text-slate-400"
                      />
                      {isSearchingCollab ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-500 shrink-0" />
                      ) : (
                        <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      )}
                    </div>

                    {/* Autocomplete Dropdown */}
                    {showCollabDropdown && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-2xl z-50 max-h-52 overflow-y-auto divide-y divide-slate-100">
                        <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                          <span>Synergy Connections & Builders</span>
                          <button 
                            type="button" 
                            onClick={() => setShowCollabDropdown(false)}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                        {collabSearchResults.length > 0 ? (
                          collabSearchResults.map((u) => (
                            <div
                              key={u._id}
                              onClick={() => handleSelectCollaborator(u)}
                              className="flex items-center gap-2.5 p-2.5 hover:bg-purple-50 cursor-pointer transition-colors"
                            >
                              <Avatar className="h-8 w-8 border border-slate-100 shrink-0">
                                <AvatarImage src={u.profilepicture || "https://github.com/shadcn.png"} />
                                <AvatarFallback className="text-[10px] font-bold bg-indigo-50 text-indigo-700">
                                  {u.username?.[0]?.toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col flex-1 min-w-0">
                                <span className="text-xs font-bold text-slate-900 truncate">@{u.username}</span>
                              </div>
                              <span className="text-[10px] font-black text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100 shrink-0 hover:bg-purple-600 hover:text-white transition-colors">
                                Tag Partner
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="p-4 text-center text-xs text-slate-400 font-medium">
                            No matching builders found for "{collabSearch}". Try a different name.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            className="rounded-xl text-xs font-bold text-slate-600"
          >
            Cancel
          </Button>

          <Button
            onClick={createPostHandler}
            disabled={loading || !file}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-2 px-6 shadow-md shadow-indigo-100"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Publishing...
              </>
            ) : (
              "Publish Transmission"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePost;
