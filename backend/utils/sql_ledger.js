import { Engagement } from '../models/engagement.model.js';

export const logEngagement = async (userId, postId, type) => {
    try {
        await Engagement.create({ userId, postId, type });
    } catch (err) {
        console.error('Error logging to MongoDB ledger', err);
    }
};

export const getEngagementHistory = async (userId) => {
    try {
        // Find engagements, sort by timestamp (createdAt) descending
        const engagements = await Engagement.find({ userId }).sort({ createdAt: -1 });
        
        // Map to match the old SQL structure exactly
        return engagements.map(e => ({
            id: e._id.toString(),
            userId: e.userId.toString(),
            postId: e.postId.toString(),
            type: e.type,
            timestamp: e.createdAt
        }));
    } catch (err) {
        throw err;
    }
};

export const getTopLikedPostsLastHour = async (limit = 10) => {
    try {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        
        const topPosts = await Engagement.aggregate([
            { 
                $match: { 
                    type: 'like', 
                    createdAt: { $gte: oneHourAgo } 
                } 
            },
            { 
                $group: { 
                    _id: '$postId', 
                    likeCount: { $sum: 1 } 
                } 
            },
            { $sort: { likeCount: -1 } },
            { $limit: limit },
            { 
                $project: { 
                    postId: '$_id', 
                    likeCount: 1, 
                    _id: 0 
                } 
            }
        ]);
        
        return topPosts;
    } catch (err) {
        throw err;
    }
};

export const getEngagementBreakdown = async () => {
    try {
        const breakdown = await Engagement.aggregate([
            { 
                $group: { 
                    _id: '$type', 
                    count: { $sum: 1 } 
                } 
            },
            { 
                $project: { 
                    type: '$_id', 
                    count: 1, 
                    _id: 0 
                } 
            }
        ]);
        
        return breakdown;
    } catch (err) {
        throw err;
    }
};

export default { logEngagement, getEngagementHistory, getTopLikedPostsLastHour, getEngagementBreakdown };
