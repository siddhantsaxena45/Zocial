import { createSlice } from "@reduxjs/toolkit";

const rtnSlice = createSlice({
  name: "realtimenotification",
  initialState: {
    likeNotification: [],
  },
  reducers: {
    setAllNotifications: (state, action) => {
      state.likeNotification = action.payload;
    },
    setLikeNotification: (state, action) => {
      const payload = action.payload;

      const processNotification = (notif) => {
        if (notif.type === "dislike" || notif.type === "connectionWithdrawn" || notif.type === "connectionRemoved") {
          state.likeNotification = state.likeNotification.filter(
            (n) => !(n.userId === notif.userId && (notif.type === "dislike" ? n.postId === notif.postId : true))
          );
        }
        else if (notif.type === "connectionAccepted") {
          // Clear any pending connectionRequest or follow related to this user
          state.likeNotification = state.likeNotification.filter(
            (n) => !(n.userId === notif.userId && ["connectionRequest", "follow"].includes(n.type))
          );
          state.likeNotification.push({ ...notif, seen: false, timestamp: Date.now() });
        }
        else if (notif.type === "like" || notif.type === "follow" || notif.type === "unfollow" || notif.type === "connectionRequest" || notif.type === "comment" || notif.type === "synergyTag" || notif.type === "vouchAccepted") {
          // De-duplication Check: If user already has a notification of this human/post pair
          const existingIndex = state.likeNotification.findIndex(
            (n) => 
              n.userId === notif.userId && 
              n.type === notif.type && 
              (notif.type === "like" ? n.postId === notif.postId : true)
          );

          if (existingIndex !== -1) {
            // Update existing notification timestamp and set as unseen
            state.likeNotification[existingIndex] = {
              ...state.likeNotification[existingIndex],
              ...notif,
              seen: false,
              timestamp: Date.now(),
            };
            // Move to end (newest)
            const [item] = state.likeNotification.splice(existingIndex, 1);
            state.likeNotification.push(item);
          } else {
            // New Notification
            state.likeNotification.push({
              ...notif,
              seen: false,
              timestamp: Date.now(),
            });
          }
        }
      };

      if (Array.isArray(payload)) {
        payload.forEach(processNotification);
      } else {
        processNotification(payload);
      }
    },
    markAllNotificationsSeen: (state) => {
      state.likeNotification = state.likeNotification.map((n) => ({
        ...n,
        seen: true,
      }));
    },
    markSynergyNotificationsSeen: (state) => {
      state.likeNotification = state.likeNotification.map((n) => 
        (['connectionRequest', 'connectionAccepted', 'follow'].includes(n.type)) 
          ? { ...n, seen: true } 
          : n
      );
    },
    clearNotifications: (state) => {
      state.likeNotification = [];
    },
  },
});

export const { setAllNotifications, setLikeNotification, markAllNotificationsSeen, markSynergyNotificationsSeen, clearNotifications } = rtnSlice.actions;
export default rtnSlice.reducer;
