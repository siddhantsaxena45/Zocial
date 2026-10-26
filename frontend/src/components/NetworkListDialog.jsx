import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';

const NetworkListDialog = ({ open, setOpen, title, userIds = [] }) => {
  const { suggestedUsers } = useSelector((state) => state.auth);
  const { user: currentUser } = useSelector((state) => state.auth);

  const allKnownUsers = currentUser ? [...suggestedUsers, currentUser] : suggestedUsers;

  // Map userIds to full user objects.
  // We now prioritize the data passed in if it's already an object (from our backend populate)
  const displayUsers = userIds.map(u => {
    // If it's already an object with a username, it's populated data from the backend
    if (u && typeof u === 'object' && u.username) return u;
    
    // Fallback: look it up in the known users cache if it's just an ID
    const id = typeof u === 'object' ? u._id : u;
    return allKnownUsers.find(known => {
        const targetId = typeof known === 'object' ? known._id : known;
        return targetId === id;
    });
  }).filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md bg-white border-none shadow-2xl rounded-2xl glass-card z-50">
        <DialogHeader className="border-b border-gray-100 pb-4">
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-900">
            <Users className="h-5 w-5 text-indigo-600" />
            {title} ({userIds.length})
          </DialogTitle>
        </DialogHeader>

        <div className="py-2">
          <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-2">
            {displayUsers.length > 0 ? (
              displayUsers.map((user) => {
                const cleanUsername = user?.username 
                  ? (user.username.startsWith('@') ? user.username : `@${user.username.toLowerCase().replace(/\s+/g, '')}`)
                  : '@builder';
                const initialLetter = cleanUsername.replace(/^@/, '')[0]?.toUpperCase() || 'U';

                return (
                  <Link 
                    key={user._id} 
                    to={`/profile/${user._id}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-4 p-3 hover:bg-indigo-50/50 rounded-xl transition-colors w-full border border-transparent hover:border-indigo-100 group"
                  >
                    <Avatar className="h-10 w-10 border border-slate-200">
                      <AvatarImage src={user.profilepicture || user.profilePicture || "https://github.com/shadcn.png"} alt={cleanUsername} />
                      <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-bold text-sm">
                        {initialLetter}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col flex-1 text-left">
                      <span className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors text-sm">
                        {cleanUsername}
                      </span>
                      <span className="text-xs text-slate-500 truncate max-w-[200px]">
                        {user.bio || "Professional Network Member"}
                      </span>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="text-center py-12 text-slate-500">
                <p className="text-sm font-medium">No users found in this network.</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NetworkListDialog;
