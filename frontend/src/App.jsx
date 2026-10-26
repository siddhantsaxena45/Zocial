import { createBrowserRouter, RouterProvider } from "react-router-dom"
import Signup from "./components/Signup"
import Login from "./components/Login"
import MainLayout from "./components/MainLayout"
import Home from "./components/Home"
import Profile from "./components/Profile"
import EditProfile from "./components/EditProfile"
import ChatPage from "./components/ChatPage"
import ResumeGenerator from "./components/ResumeGenerator"
import ForgotPassword from "./components/ForgotPassword"
import ResetPassword from "./components/ResetPassword"
import { io } from "socket.io-client"
import axios from "axios"
import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setAuthUser, setAuthChecked } from "./redux/authSlice";
import { setSocket } from "./redux/socketSlice"
import { setOnlineUsers } from "./redux/chatSlice"
import { setLikeNotification, setAllNotifications } from "./redux/rtnSlice"
import { setMessageNotification } from "./redux/messageNotificationSlice";
import { setIncomingCall, resetCall } from "./redux/callSlice";
import ProtectedRoutes from "./components/ProtectedRoutes"
import { GoogleOAuthProvider } from '@react-oauth/google';
import ZocialScout from "./components/ZocialScout";
import GlobalCallManager from "./components/GlobalCallManager";

const browserRouter = createBrowserRouter([
  {
    path: "/",
    element: <ProtectedRoutes> <MainLayout /></ProtectedRoutes>,
    children: [
      {
        path: "/",
        element: <Home />
      }, {
        path: "/profile/:id",
        element: <Profile />
      }, {
        path: "/account/edit",
        element: <EditProfile />
      },
      {
        path: "/chat",
        element: <ChatPage />
      },
      {
        path: "/scout",
        element: <ZocialScout />
      },
      {
        path: "/resume/:id",
        element: <ResumeGenerator />
      }
    ]
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

  // 🔄 Global Sync: Always verify user authentication from server on page load/refresh
  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/user/me`, { withCredentials: true });
        if (res.data.success && res.data.user) {
          dispatch(setAuthUser(res.data.user));
        } else {
          dispatch(setAuthChecked(true));
        }
      } catch (error) {
        console.error("Failed to refresh auth user:", error);
        dispatch(setAuthChecked(true));
      }
    };

    fetchMe();
  }, [dispatch]);

  // Fetch notifications once user is verified
  useEffect(() => {
    if (!user) return;
    const fetchNotifications = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/notification`, { withCredentials: true });
        if (res.data.success) {
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

    fetchNotifications();
  }, [user?._id, dispatch]);

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