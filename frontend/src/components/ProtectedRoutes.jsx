import React, { useEffect } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'

const ProtectedRoutes = ({ children }) => {
  const navigate = useNavigate();
  const { user, isAuthChecked } = useSelector((state) => state.auth);

  useEffect(() => {
    // Only redirect to login if authentication verification has completed and there is no user
    if (isAuthChecked && !user) {
      navigate("/login");
    }
  }, [user, isAuthChecked, navigate]);

  // If user is already loaded, render immediately
  if (user) {
    return <>{children}</>;
  }

  // If auth has been checked and no user, return null (redirecting)
  if (isAuthChecked && !user) {
    return null;
  }

  // While validating the persistent session cookie on cold load, show smooth loading state
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 text-white">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">Verifying Network Session...</span>
      </div>
    </div>
  );
};

export default ProtectedRoutes;
