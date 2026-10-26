import React from 'react'
import { Outlet } from 'react-router-dom'
import LeftSidebar from './LeftSidebar'
import LikesDialog from './LikesDialog'
import { useDispatch, useSelector } from 'react-redux'
import { setEngagementModalOpen } from '@/redux/postSlice'
import useAxiosInterceptor from '@/hooks/useAxiosInterceptor'

const MainLayout = () => {
  useAxiosInterceptor();
  const dispatch = useDispatch();
  const { engagementModalOpen, selectedPost } = useSelector(state => state.post);

  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      <LeftSidebar />
      <main className="flex-1 lg:ml-72 transition-all duration-300 min-h-screen">
        <div className="pt-24 lg:pt-0 pb-24 lg:pb-12 px-3 sm:px-4 lg:px-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
      
      {/* Global Engagement Modal */}
      <LikesDialog 
        open={engagementModalOpen} 
        setOpen={(val) => dispatch(setEngagementModalOpen(val))} 
        likes={selectedPost?.likes || []} 
      />
    </div>
  )
}

export default MainLayout
