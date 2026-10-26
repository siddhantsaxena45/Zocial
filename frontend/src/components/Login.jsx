import React, { useEffect, useState } from 'react'
import GoogleLoginButton from './GoogleLoginButton'
import axios from 'axios'
import { toast } from 'sonner'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2, Zap, ShieldCheck } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { setAuthUser } from '@/redux/authSlice'
import { clearNotifications } from '@/redux/rtnSlice'
import { clearMessages } from '@/redux/messageNotificationSlice'

const Login = () => {
    const [input, setInput] = useState({
        email: "",
        password: "",
    })
    const [loading, setLoading] = useState(false)
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const { user } = useSelector(state => state.auth)

    useEffect(() => {
        if (user) {
            navigate("/")
        }
    }, [user, navigate])

    const handleChange = (e) => {
        setInput({
            ...input,
            [e.target.name]: e.target.value,
        })
    }

    const loginHandler = async (e) => {
        e.preventDefault()
        try {
            setLoading(true)
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/user/login`, input, {
                headers: { "Content-Type": "application/json" },
                withCredentials: true
            });
            if (res.data.success) {
                dispatch(setAuthUser(res.data.user))
                dispatch(clearNotifications());
                dispatch(clearMessages());
                navigate("/")
                toast.success(res.data.message)
                setInput({ email: "", password: "" })
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Login failed")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-6 bg-mesh relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px] animate-pulse"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>

            <div className="w-full max-w-md relative z-10">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-indigo-600 shadow-xl shadow-indigo-200 mb-6 group transition-transform hover:scale-110">
                        <Zap className="h-8 w-8 text-white fill-white" />
                    </div>
                    <h1 className="text-4xl font-black tracking-tighter text-slate-900 mb-2">
                        ZOCIAL<span className="text-indigo-600">.</span>
                    </h1>
                    <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px]">Career Intelligence Hub</p>
                </div>

                <div className="glass-card p-10 shadow-2xl border-white/40">
                    <div className="mb-8">
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Professional Access</h2>
                        <p className="text-slate-500 text-sm font-medium mt-1">Sync with your global network intelligence.</p>
                    </div>

                    <form onSubmit={loginHandler} className="space-y-6">
                        <div className="space-y-4">
                            <GoogleLoginButton />
                            <div className="relative flex items-center py-2">
                                <div className="flex-grow border-t border-slate-100"></div>
                                <span className="flex-shrink mx-4 text-[10px] font-black uppercase tracking-widest text-slate-400">or use intelligence link</span>
                                <div className="flex-grow border-t border-slate-100"></div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="group">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 px-1 group-focus-within:text-indigo-600 transition-colors">Email or @Username</label>
                                <input
                                    onChange={handleChange}
                                    name="email"
                                    type="text"
                                    value={input.email}
                                    required
                                    placeholder="name@company.com or @handle"
                                    className="w-full bg-slate-50/50 border-2 border-slate-100/50 rounded-xl px-4 py-3 text-sm font-medium outline-none transition-all focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-500/5"
                                />
                            </div>

                            <div className="group">
                                <div className="flex justify-between items-center mb-2 px-1">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 group-focus-within:text-indigo-600 transition-colors">Access Key</label>
                                    <Link to="/forgot-password" size="sm" className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 transition-colors">Lost Key?</Link>
                                </div>
                                <input
                                    onChange={handleChange}
                                    name="password"
                                    value={input.password}
                                    type="password"
                                    required
                                    placeholder="••••••••"
                                    className="w-full bg-slate-50/50 border-2 border-slate-100/50 rounded-xl px-4 py-3 text-sm font-medium outline-none transition-all focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-500/5"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-4 text-xs font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-indigo-200 transition-all hover:bg-indigo-700 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none`}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                                    Synchronizing...
                                </>
                            ) : (
                                <>
                                    <ShieldCheck className="h-4 w-4" />
                                    Initiate Session
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-10 pt-8 border-t border-slate-100 text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            New Intelligence?{' '}
                            <Link to="/signup" className="text-indigo-600 hover:text-indigo-800 transition-colors underline underline-offset-4 decoration-2">
                                Register Hub
                            </Link>
                        </p>
                    </div>
                </div>

                <div className="mt-8 text-center text-slate-400 text-[10px] font-medium tracking-wide">
                    &copy; 2024 ZOCIAL INTELLIGENCE SYSTEMS. ALL RIGHTS RESERVED.
                </div>
            </div>
        </div>
    )
}

export default Login
