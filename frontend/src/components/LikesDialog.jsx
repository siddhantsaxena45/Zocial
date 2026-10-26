import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Link } from 'react-router-dom';

const formatHandle = (raw) => {
    if (!raw) return "@builder";
    const trimmed = String(raw).trim();
    if (trimmed.startsWith("@")) return trimmed;
    return `@${trimmed.toLowerCase().replace(/\s+/g, '')}`;
};

const LikesDialog = ({ open, setOpen, likes }) => {
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-md bg-white/95 backdrop-blur-xl border-slate-200">
                <DialogHeader>
                    <DialogTitle className="text-center text-xl font-black tracking-tight text-slate-900 border-b border-slate-100 pb-4">
                        Professional Engagements
                    </DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto py-4 -mx-6 px-6 relative">
                    {likes && likes.length > 0 ? (
                        likes.map((like) => {
                            const cleanHandle = formatHandle(like?.username);
                            const initialLetter = cleanHandle.replace(/^@/, '')[0]?.toUpperCase() || 'U';

                            return (
                                <div key={like._id || like} className="flex items-center justify-between group hover:bg-slate-50 p-2 rounded-xl transition-colors">
                                    <div className="flex items-center gap-4">
                                        <Link to={`/profile/${like._id || like}`} onClick={() => setOpen(false)}>
                                            <Avatar className="h-12 w-12 border border-slate-200 group-hover:border-indigo-200 transition-colors shadow-sm">
                                                <AvatarImage src={like.profilepicture} alt={cleanHandle} />
                                                <AvatarFallback className="bg-indigo-50 text-indigo-700 font-bold">
                                                    {initialLetter}
                                                </AvatarFallback>
                                            </Avatar>
                                        </Link>
                                        <div className="flex flex-col">
                                            <Link to={`/profile/${like._id || like}`} onClick={() => setOpen(false)} className="text-sm font-bold text-slate-800 hover:text-indigo-600 transition-colors">
                                                {cleanHandle}
                                            </Link>
                                            <span className="text-xs text-slate-500 font-medium">Network Connection</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center text-slate-500 py-8 font-medium">
                            No engagements yet. Be the first to interact!
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default LikesDialog;
