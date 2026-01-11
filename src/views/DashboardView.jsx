import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom'; // 👈 ✅ 1. Import Link
import {
    CheckSquare, Users, MessageSquare, ArrowUpRight, Calendar,
    Activity, Code, Briefcase, Target, Clock, AlertCircle, CheckCircle,
    AlertTriangle, Info, Trash2, Mail, Cpu, Megaphone, X,
    Book, Link as LinkIcon, FileText, Database, Lock
} from "lucide-react";
import { formatTime, getTodayString } from "../utils/dateUtils";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import AnnouncementModal from "../components/AnnouncementModal";
import { APP_VERSION } from "../constants";
const APP_ID = "unity-work-os";

const DashboardView = ({
    projects = [], tasks = [], activities = [],
    onNavigate, onActivityClick,
    activityDate, setActivityDate, user
}) => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [announcement, setAnnouncement] = useState(null);
    const [showAnnouncement, setShowAnnouncement] = useState(true);
    const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);

    const today = getTodayString();
    const isTeamLead = ['TL', 'Team Lead', 'Manager'].includes(user?.role);

    // --- PERMISSION CHECK FOR PROJECTS CARD ---
    const canViewProjects = [
        'TL', 'Team Lead', 'Manager',
        'Developer', 'ASO', 'QA',
        'Designer', '3D Modeler'
    ].includes(user?.role);

    // Live Clock
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // --- FETCH ANNOUNCEMENT ---
    useEffect(() => {
        if (!user?.teamId) return;
        const announcementRef = doc(db, 'artifacts', APP_ID, 'public', `announcement_${user.teamId}`);

        const unsubscribe = onSnapshot(announcementRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
                    setAnnouncement(null);
                } else {
                    setAnnouncement(data);
                    setShowAnnouncement(true);
                }
            } else {
                setAnnouncement(null);
            }
        });
        return () => unsubscribe();
    }, [user?.teamId]);

    // --- SAVE ANNOUNCEMENT ---
    const handleUpdateAnnouncement = async (text, expiresAt) => {
        if (!user?.teamId) return;
        const announcementRef = doc(db, 'artifacts', APP_ID, 'public', `announcement_${user.teamId}`);
        await setDoc(announcementRef, {
            text,
            expiresAt,
            createdBy: user.name,
            createdAt: new Date().toISOString(),
            teamId: user.teamId
        });
    };

    const getTimeGreeting = () => {
        const hour = currentTime.getHours();
        if (hour < 12) return "Good Morning";
        if (hour < 18) return "Good Afternoon";
        return "Good Evening";
    };

    // --- LOGIC ---
    const stats = useMemo(() => {
        const tasksToday = tasks.filter(t => t.date === today);
        const completed = tasksToday.filter(t => t.status === "Completed");
        const total = tasksToday.length;
        const progress = total === 0 ? 0 : Math.round((completed.length / total) * 100);
        const nextTask = tasksToday.find(t => t.status !== "Completed") || null;
        const myPending = tasks.filter(t =>
            t.date === today &&
            t.status !== 'Completed' &&
            (t.assignedTo === user?.uid || (!t.assignedTo && t.assignedBy === user?.uid))
        );
        return { total, completed: completed.length, progress, nextTask, myPending };
    }, [tasks, today, user]);

    const projectStats = useMemo(() => {
        const android = projects.filter(p => p.platform === 'Android').length;
        const ios = projects.filter(p => p.platform === 'iOS').length;
        const pc = projects.filter(p => p.platform === 'PC' || p.platform === 'Windows').length;
        return { total: projects.length, android, ios, pc };
    }, [projects]);

    const getProgressColor = (p) => {
        if (p >= 75) return "text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]";
        if (p >= 40) return "text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]";
        return "text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]";
    };

    // --- ACTIVITY COLOR LOGIC ---
    const getActivityStyle = (type) => {
        if (type?.includes('ARCHIVE')) {
            if (type.includes('SNIPPET')) return { border: 'border-l-purple-500', icon: <Code size={14} className="text-purple-500" />, text: 'text-purple-200' };
            if (type.includes('DOC')) return { border: 'border-l-yellow-500', icon: <Book size={14} className="text-yellow-500" />, text: 'text-yellow-200' };
            if (type.includes('LINK')) return { border: 'border-l-cyan-500', icon: <LinkIcon size={14} className="text-cyan-500" />, text: 'text-cyan-200' };
            return { border: 'border-l-gray-500', icon: <Database size={14} className="text-gray-500" />, text: 'text-gray-200' };
        }
        if (type?.includes('COMPLETED')) return { border: 'border-l-emerald-500', icon: <CheckCircle size={14} className="text-emerald-500" />, text: 'text-emerald-200' };
        if (type?.includes('ASSIGNED') || type?.includes('STARTED')) return { border: 'border-l-amber-500', icon: <AlertTriangle size={14} className="text-amber-500" />, text: 'text-amber-200' };
        if (type?.includes('DELETE')) return { border: 'border-l-red-500', icon: <Trash2 size={14} className="text-red-500" />, text: 'text-red-200' };
        if (type?.includes('PROJECT') || type?.includes('UPDATE') || type?.includes('ADDED')) return { border: 'border-l-blue-500', icon: <Info size={14} className="text-blue-500" />, text: 'text-blue-200' };
        return { border: 'border-l-gray-600', icon: <Activity size={14} className="text-gray-500" />, text: 'text-gray-400' };
    };

    return (
        <div className="h-full flex flex-col relative bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-[#0a0a0a] to-[#0a0a0a]">

            {isAnnouncementModalOpen && (
                <AnnouncementModal
                    currentMessage={announcement?.text}
                    onClose={() => setIsAnnouncementModalOpen(false)}
                    onUpdate={handleUpdateAnnouncement}
                />
            )}

            <style>{`
                @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .animate-card-1 { animation: fadeInUp 0.6s ease-out forwards; animation-delay: 0.1s; opacity: 0; }
                .animate-card-2 { animation: fadeInUp 0.6s ease-out forwards; animation-delay: 0.2s; opacity: 0; }
                .animate-card-3 { animation: fadeInUp 0.6s ease-out forwards; animation-delay: 0.3s; opacity: 0; }
                .animate-card-4 { animation: fadeInUp 0.6s ease-out forwards; animation-delay: 0.4s; opacity: 0; }
                .animate-announcement { animation: fadeInUp 0.5s ease-out forwards; }
            `}</style>

            <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                {/* 1. HEADER */}
                <div className="flex flex-col md:flex-row justify-between items-end mb-6 gap-4 animate-fade-in">
                    <div>
                        <div className="flex items-center gap-2 text-emerald-500 mb-1">
                            <Cpu size={16} className="animate-pulse" />
                            <span className="text-xs font-mono uppercase tracking-widest font-bold">System Online</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                            {getTimeGreeting()}, <span className="text-blue-500">{user?.name?.split(' ')[0] || 'Dev'}</span>
                        </h1>
                        <p className="text-gray-500 mt-1">Here is your daily briefing.</p>
                    </div>

                    <div className="flex gap-4 items-end">
                        {isTeamLead && (
                            <button
                                onClick={() => setIsAnnouncementModalOpen(true)}
                                className="bg-[#151518]/60 backdrop-blur-md p-3 rounded-2xl border border-white/5 shadow-lg text-blue-400 hover:text-white hover:bg-blue-600 transition-all"
                                title="Post Announcement"
                            >
                                <Megaphone size={20} />
                            </button>
                        )}
                        <div className="text-right bg-[#151518]/60 backdrop-blur-md px-6 py-2 rounded-2xl border border-white/5 shadow-lg">
                            <h2 className="text-3xl font-mono font-bold text-white tabular-nums tracking-tight">
                                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </h2>
                            <p className="text-sm text-gray-500 font-medium">
                                {currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                            </p>
                        </div>
                    </div>
                </div>

                {/* --- ANNOUNCEMENT SECTION --- */}
                {showAnnouncement && announcement && (
                    <div className="mb-8 animate-announcement relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/30 p-4 flex items-start gap-4 shadow-[0_0_20px_rgba(59,130,246,0.15)]">
                        <div className="p-2.5 bg-blue-500/20 rounded-xl text-blue-400 shrink-0 border border-blue-500/30 animate-pulse">
                            <Megaphone size={20} />
                        </div>
                        <div className="flex-1 pt-1">
                            <h4 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                                System Broadcast <span className="text-[10px] bg-blue-500 text-black px-1.5 py-0.5 rounded font-bold uppercase">New</span>
                            </h4>
                            <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">
                                {announcement.text}
                            </p>
                            <div className="flex gap-3 mt-2 text-[10px] text-gray-500 font-mono">
                                <span>Posted by {announcement.createdBy}</span>
                                <span>•</span>
                                <span>{new Date(announcement.createdAt).toLocaleDateString()}</span>
                                {announcement.expiresAt && (
                                    <><span>•</span><span className="text-orange-400">Expires: {new Date(announcement.expiresAt).toLocaleString()}</span></>
                                )}
                            </div>
                        </div>
                        <button onClick={() => setShowAnnouncement(false)} className="text-gray-500 hover:text-white transition-colors p-1"><X size={16} /></button>
                    </div>
                )}

                {/* 2. BENTO GRID */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-8">
                    {/* A. DAILY GOALS */}
                    <div className="animate-card-1 md:col-span-4 bg-[#151518]/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 relative overflow-hidden group hover:border-cyan-500/50 hover:shadow-[0_0_30px_rgba(6,182,212,0.15)] hover:-translate-y-1 transition-all duration-300">
                        <div className="absolute top-0 right-0 p-32 bg-cyan-600/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:bg-cyan-600/10 transition-colors"></div>
                        <div className="flex justify-between items-start mb-6">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2"><Target size={18} className="text-cyan-400 group-hover:scale-110 transition-transform" /> Daily Goals</h3>
                            <span className="text-xs font-mono text-gray-400 border border-white/10 px-2 py-1 rounded-md bg-black/20">{stats.completed}/{stats.total} Done</span>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="relative w-24 h-24 flex-shrink-0 rounded-full bg-transparent">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                    <path className="text-white/5" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                                    <path className={`${getProgressColor(stats.progress)} transition-all duration-1000 ease-out`} strokeDasharray={`${stats.progress}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center flex-col"><span className={`text-xl font-bold ${getProgressColor(stats.progress).split(' ')[0]}`}>{stats.progress}%</span></div>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-1">Current Focus</p>
                                {stats.nextTask ? (<div className="text-sm font-medium text-white line-clamp-2 leading-relaxed"><span className="text-cyan-400 mr-2">●</span>{stats.nextTask.title}</div>) : (<p className="text-sm text-gray-600 italic">No pending tasks.</p>)}
                            </div>
                        </div>
                    </div>

                    {/* B. PROJECTS (UNLOCKED FOR EVERYONE) */}
                    <div
                        onClick={() => canViewProjects && onNavigate("projects")}
                        className={`animate-card-2 md:col-span-4 bg-[#151518]/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 relative overflow-hidden transition-all duration-300
                            ${canViewProjects
                                ? 'cursor-pointer group hover:border-purple-500/50 hover:shadow-[0_0_30px_rgba(168,85,247,0.15)] hover:-translate-y-1'
                                : 'opacity-60 cursor-not-allowed border-white/5 grayscale-[0.5]'
                            }
                        `}
                    >
                        <div className="absolute top-0 right-0 p-32 bg-purple-600/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:bg-purple-600/10 transition-colors"></div>

                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                {canViewProjects ? (
                                    <Briefcase size={18} className="text-purple-400 group-hover:rotate-12 transition-transform" />
                                ) : (
                                    <Lock size={18} className="text-gray-500" />
                                )}
                                Projects
                            </h3>
                            {canViewProjects && <ArrowUpRight size={18} className="text-gray-600 group-hover:text-white transition-colors" />}
                        </div>

                        <h2 className="text-4xl font-bold text-white mb-4 relative z-10">
                            {canViewProjects ? projectStats.total : <span className="text-2xl text-gray-500">Locked</span>}
                            {canViewProjects && <span className="text-sm text-gray-500 font-normal"> Active</span>}
                        </h2>

                        {canViewProjects ? (
                            <>
                                <div className="flex gap-2 mt-auto relative z-10">
                                    <div className="h-1.5 flex-1 bg-green-500/20 rounded-full overflow-hidden"><div style={{ width: `${(projectStats.android / projectStats.total) * 100}%` }} className="h-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div></div>
                                    <div className="h-1.5 flex-1 bg-blue-500/20 rounded-full overflow-hidden"><div style={{ width: `${(projectStats.ios / projectStats.total) * 100}%` }} className="h-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div></div>
                                    <div className="h-1.5 flex-1 bg-gray-500/20 rounded-full overflow-hidden"><div style={{ width: `${(projectStats.pc / projectStats.total) * 100}%` }} className="h-full bg-gray-400"></div></div>
                                </div>
                                <div className="flex justify-between text-[10px] text-gray-500 mt-2 font-mono relative z-10"><span>Android</span><span>iOS</span><span>PC</span></div>
                            </>
                        ) : (
                            <p className="text-xs text-gray-500 mt-2">Access restricted to authorized personnel.</p>
                        )}
                    </div>

                    {/* C. TEAM BUTTONS */}
                    <div className="md:col-span-4 grid grid-rows-2 gap-4">
                        <button onClick={() => onNavigate('team', 'chat')} className="animate-card-3 bg-[#151518]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex items-center gap-4 group text-left hover:border-pink-500/50 hover:shadow-[0_0_30px_rgba(236,72,153,0.15)] hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"><div className="absolute inset-0 bg-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div><div className="p-3 bg-pink-500/10 rounded-xl text-pink-400 group-hover:scale-110 group-hover:bg-pink-500 group-hover:text-white transition-all duration-300 relative z-10 shadow-[0_0_15px_rgba(236,72,153,0.3)]"><MessageSquare size={20} /></div><div className="relative z-10"><h4 className="font-bold text-white text-sm group-hover:text-pink-200 transition-colors">Team Chat</h4><p className="text-[10px] text-gray-500 group-hover:text-gray-400">Collaborate with team</p></div></button>
                        <button onClick={() => onNavigate('team', 'roster')} className="animate-card-4 bg-[#151518]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex items-center gap-4 group text-left hover:border-amber-500/50 hover:shadow-[0_0_30px_rgba(245,158,11,0.15)] hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"><div className="absolute inset-0 bg-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div><div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-white transition-all duration-300 relative z-10 shadow-[0_0_15px_rgba(245,158,11,0.3)]"><Users size={20} /></div><div className="relative z-10"><h4 className="font-bold text-white text-sm group-hover:text-amber-200 transition-colors">Team Members</h4><p className="text-[10px] text-gray-500 group-hover:text-gray-400">View members & roles</p></div></button>
                    </div>
                </div>

                {/* 3. SPLIT: PENDING & ACTIVITY */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[450px]">

                    {/* LEFT: TEAM ACTIVITY (COLORED & WIDE) */}
                    <div className="lg:col-span-2 bg-[#151518]/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex flex-col animate-card-3 relative overflow-hidden">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Activity size={18} className="text-blue-400" /> Team Activity
                            </h2>
                            <div className="bg-[#151518] border border-white/10 rounded-lg flex items-center px-3 py-1.5 gap-2 hover:border-white/20 transition-colors">
                                <Calendar size={14} className="text-gray-500" />
                                <input type="date" value={activityDate} onChange={(e) => setActivityDate(e.target.value)} className="bg-transparent text-gray-300 text-xs outline-none font-mono uppercase" />
                            </div>
                        </div>

                        {/* TERMINAL LOOK INSIDE GLASS CARD */}
                        <div className="bg-[#0f0f12] border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-inner relative flex-1">
                            <div className="bg-[#1a1a1d] border-b border-white/5 px-4 py-2 flex gap-2 shrink-0">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-500/50 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50 shadow-[0_0_8px_rgba(234,179,8,0.5)]"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-green-500/50 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                            </div>

                            <div className="overflow-y-auto custom-scrollbar p-3 flex-1 space-y-1">
                                {(activities || []).map((activity, index) => {
                                    const style = getActivityStyle(activity.type);
                                    return (
                                        <div key={activity.id} onClick={() => onActivityClick(activity)} className={`group flex gap-3 p-3 hover:bg-white/5 rounded-lg cursor-pointer text-xs transition-colors border-l-2 ${style.border} mb-1`}>
                                            <div className="mt-0.5 shrink-0 opacity-70 group-hover:opacity-100">{style.icon}</div>
                                            <div className="flex-1">
                                                <div className={`font-medium ${style.text} group-hover:text-white transition-colors`}>{activity.text}</div>
                                                <span className="text-[10px] text-gray-600 font-mono mt-1 block">{formatTime(activity.timestamp)}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                                {activities.length === 0 && <div className="p-8 text-center text-gray-600 font-mono text-xs">// Team idle. No activity.</div>}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: MY PENDING TASKS (NARROW) */}
                    <div className="flex-1 bg-[#151518]/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex flex-col animate-card-4 relative overflow-hidden">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <CheckSquare size={18} className="text-orange-500" /> My Pending
                            </h2>
                            <span className="text-[10px] text-gray-500 font-mono bg-white/5 px-2 py-1 rounded">{today}</span>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                            {stats.myPending.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-60">
                                    <div className="p-4 bg-white/5 rounded-full mb-3"><CheckSquare size={32} /></div>
                                    <p className="text-sm">You're all caught up!</p>
                                </div>
                            ) : (
                                stats.myPending.map(task => (
                                    <div key={task.id} className="p-4 bg-[#0a0a0a]/50 border-l-2 border-orange-500/50 hover:border-orange-500 rounded-r-xl transition-all duration-300 flex items-start justify-between group">
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-gray-200 font-bold group-hover:text-white transition-colors text-sm truncate">{task.title}</h4>
                                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${task.priority === 'High' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                                    {task.priority}
                                                </span>
                                                <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                                    <Clock size={10} /> {task.startTime ? formatTime(task.startTime) : 'Not Started'}
                                                </span>
                                            </div>
                                        </div>
                                        <button onClick={() => onNavigate('tasks')} className="p-2 rounded-lg bg-white/5 hover:bg-orange-500/20 text-gray-500 hover:text-orange-400 transition-colors ml-2">
                                            <ArrowUpRight size={16} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                </div>
            </div>

            {/* FIXED FOOTER */}
            <div className="py-4 border-t border-white/5 bg-[#0a0a0a] z-10 shrink-0 flex flex-col md:flex-row justify-between items-center px-8 gap-4">
                <div className="flex items-center gap-4">
                    <div className="text-[10px] text-gray-600 font-mono flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
                        <span>UNITY CORE v{APP_VERSION}</span>
                    </div>
                    {/* 👇 ✅ ADDED DOCS LINK HERE */}
                    <span className="text-gray-800">|</span>
                    <Link to="/docs" className="text-[10px] text-gray-500 hover:text-blue-400 flex items-center gap-1.5 transition-colors group">
                        <Book size={12} className="group-hover:scale-110 transition-transform" /> Docs
                    </Link>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-1 md:gap-4">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Code size={12} className="text-blue-500/50" />
                        <span>Designed & Developed by <span className="text-gray-300 font-semibold">Abu Baker</span> ❤️</span>
                    </div>
                    <span className="hidden md:block text-gray-800">|</span>
                    <a href="mailto:bakerrana298@gmail.com" className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors font-mono">
                        bakerrana298@gmail.com
                    </a>
                </div>
            </div>
        </div>
    );
};

export default DashboardView;