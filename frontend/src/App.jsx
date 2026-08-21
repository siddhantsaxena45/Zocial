import { createBrowserRouter, RouterProvider } from "react-router-dom"
import Signup from "./components/Signup"
import Login from "./components/Login"
import MainLayout from "./components/MainLayout"
import Home from "./components/Home"
import Profile from "./components/Profile"
import EditProfile from "./components/EditProfile"
import ChatPage from "./components/ChatPage"
import AnalyticsDashboard from "./components/AnalyticsDashboard"
import ResumeGenerator from "./components/ResumeGenerator"
import ForgotPassword from "./components/ForgotPassword"
import ResetPassword from "./components/ResetPassword"
import { io } from "socket.io-client"
import axios from "axios"
import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setAuthUser } from "./redux/authSlice";
import { setSocket } from "./redux/socketSlice"
import { setOnlineUsers } from "./redux/chatSlice"
import { setLikeNotification, setAllNotifications } from "./redux/rtnSlice"
import { setMessageNotification } from "./redux/messageNotificationSlice";
import { setIncomingCall, resetCall } from "./redux/callSlice";
import ProtectedRoutes from "./components/ProtectedRoutes"
import { GoogleOAuthProvider } from '@react-oauth/google';
import GlobalCallManager from "./components/GlobalCallManager";
const browserRouter = createBrowserRouter([
  {
    path: "/",
    element:<ProtectedRoutes> <MainLayout /></ProtectedRoutes>,
    children: [
      {
        path: "/",
        element:<Home />
      }, {
        path: "/profile/:id",
        element:  <Profile />
      }, {
        path: "/account/edit",
        element:  <EditProfile />
      },
      {
        path: "/chat",
        element:  <ChatPage />
      },
      {
        path: "/analytics",
        element: <AnalyticsDashboard />
      }
    ]
  },
  {
    path: "/resume/:id",
    element: <ProtectedRoutes><ResumeGenerator /></ProtectedRoutes>,
  },
  {
    path: "/signup",
    element: <Signup />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/forgot-password",
    element: <ForgotPassword />,
  },
  {
    path: "/reset-password",
    element: <ResetPassword />,
  }
])
function App() {
  const { user } = useSelector(state => state.auth)
  const { socket } = useSelector(state => state.socketio)
  const dispatch = useDispatch()

  // 🔄 Global Sync: Refresh user data from server on every page load/refresh
  // This bypasses stale localStorage data from redux-persist.
  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/user/me`, { withCredentials: true });
        if (res.data.success) {
          dispatch(setAuthUser(res.data.user));
        }
      } catch (error) {
        console.error("Failed to refresh auth user:", error);
      }
    };

    const fetchNotifications = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/notification`, { withCredentials: true });
        if (res.data.success) {
          // Map backend format to frontend format
          const formattedNotifications = res.data.notifications.map(notif => ({
            userId: notif.sender._id,
            userDetails: notif.sender,
            type: notif.type,
            postId: notif.post,
            message: notif.message,
            seen: notif.isRead,
            timestamp: notif.createdAt
          }));
          dispatch(setAllNotifications(formattedNotifications));
        }
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      }
    };

    if (user) {
      fetchMe();
      fetchNotifications();
    }
  }, [dispatch]);

  const userId = user?._id;

  useEffect(() => {
    if (userId) {
      const socketio = io(import.meta.env.VITE_SOCKET_URL, {
        query: {
          userId: userId
        },
      })
      dispatch(setSocket(socketio))
      socketio.on("getOnlineUsers", (onlineUser) => {
        dispatch(setOnlineUsers(onlineUser));
      });
      socketio.on("notification", (notification) => {
        dispatch(setLikeNotification(notification));
      });
      socketio.on("message", (message) => {
        dispatch(setMessageNotification(message));
      });

      socketio.on("video-offer", ({ from, offer, userDetails }) => {
        dispatch(setIncomingCall({ incoming: true, info: { from, offer, userDetails } }));
      });

      socketio.on("call-ended", () => {
        dispatch(resetCall());
      });

      socketio.on("call-rejected", () => {
        dispatch(resetCall());
      });

      return () => {
        socketio.disconnect();
        dispatch(setSocket(null))
      }
    }
  }, [userId, dispatch])

  return (
    <>
     <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
        <RouterProvider router={browserRouter} />
        <GlobalCallManager />
     </GoogleOAuthProvider>
      
    </>
  )
}

export default App