import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { Search, X, Loader2, Sparkles, ArrowRight, UserCheck } from 'lucide-react';
import axios from 'axios';

const SearchDialog = ({ open, setOpen }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const { suggestedUsers } = useSelector((state) => state.auth);

  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      setSearchResults([]);
      return;
    }

    if (!searchQuery.trim()) {
      setSearchResults(suggestedUsers || []);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/user/search?q=${encodeURIComponent(searchQuery.trim())}`,
          { withCredentials: true }
        );
        if (res.data.success) {
          setSearchResults(res.data.users || []);
        }
      } catch (err) {
        console.error("Search error:", err);
        // Fallback to local filter
        const q = searchQuery.toLowerCase();
        const localHits = (suggestedUsers || []).filter(u => 
          u.username?.toLowerCase().includes(q) ||
          u.targetRole?.toLowerCase().includes(q) ||
          u.skills?.some(s => s.toLowerCase().includes(q))
        );
        setSearchResults(localHits);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery, open, suggestedUsers]);

  const displayUsers = searchQuery.trim() ? searchResults : (suggestedUsers || []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-xl w-full bg-white text-slate-900 border border-purple-100 shadow-2xl rounded-3xl p-6 sm:p-7 z-50 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-purple-100/70">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shadow-xs">
              <Search className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                Network Search
              </h2>
              <p className="text-[11px] text-slate-400 font-medium">
                Find builders, engineers, and collaborators across Zocial
              </p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Input Bar */}
        <div className="pt-4 pb-2">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 h-4 w-4 text-purple-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by username, role, or skill (e.g. Python, React)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-purple-400 rounded-2xl py-3 pl-10 pr-10 text-xs sm:text-sm font-medium text-slate-900 outline-none transition-all shadow-inner placeholder:text-slate-400"
              autoFocus
            />
            {isSearching ? (
              <Loader2 className="absolute right-3.5 h-4 w-4 text-purple-600 animate-spin" />
            ) : searchQuery.trim() ? (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 text-slate-400 hover:text-slate-600 p-0.5 rounded-md"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        </div>

        {/* Results Area */}
        <div className="max-h-[55vh] overflow-y-auto pr-1 space-y-2 mt-2">
          {displayUsers.length > 0 ? (
            displayUsers.map((u) => (
              <Link
                key={u._id}
                to={`/profile/${u._id}`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3.5 p-3 rounded-2xl bg-white hover:bg-purple-50/70 border border-slate-100 hover:border-purple-200/80 transition-all duration-200 group shadow-xs"
              >
                <Avatar className="h-11 w-11 border border-purple-100 shrink-0 shadow-xs">
                  <AvatarImage src={u.profilepicture || "https://github.com/shadcn.png"} alt={u.username} />
                  <AvatarFallback className="bg-gradient-to-br from-purple-600 to-indigo-600 text-white font-black text-xs">
                    {u.username?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>

                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-purple-700 transition-colors truncate">
                      @{u.username}
                    </span>
                    {u.targetRole && (
                      <span className="text-[10px] font-semibold text-purple-600 bg-purple-50 px-2 py-0.2 rounded-md truncate max-w-[150px]">
                        {u.targetRole}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500 truncate max-w-sm font-medium mt-0.5">
                    {u.bio || "Zocial Network Member"}
                  </span>
                  {u.skills && u.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {u.skills.slice(0, 4).map((skill, idx) => (
                        <span 
                          key={idx} 
                          className="px-1.5 py-0.5 bg-slate-100 group-hover:bg-purple-100/70 text-slate-600 group-hover:text-purple-800 text-[9px] font-bold rounded-md"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="text-slate-300 group-hover:text-purple-600 transition-transform group-hover:translate-x-0.5 shrink-0 pr-1">
                  <ArrowRight className="h-4 w-4" />
                </div>
              </Link>
            ))
          ) : (
            <div className="text-center py-12 px-4 space-y-2">
              <div className="h-12 w-12 rounded-2xl bg-purple-50 text-purple-400 flex items-center justify-center mx-auto mb-3">
                <Search className="h-6 w-6 opacity-60" />
              </div>
              <p className="text-sm font-black text-slate-700">No network matches found</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                No builder found matching "{searchQuery}". Try searching by another skill, technology, or username.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SearchDialog;
