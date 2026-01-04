import React, { useState, useEffect, useRef } from 'react';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import {
    doc, getDoc, collection, query, where, addDoc, updateDoc, deleteDoc, onSnapshot, serverTimestamp, orderBy, limit
} from 'firebase/firestore';
import { toDateObj, getTodayString } from "./utils/dateUtils";
import {
    Layout, Box, Briefcase, CheckSquare, Clipboard, Users, MessageSquare, LogOut,
    Plus, Search, Smartphone, Folder, FolderPlus, Link, Trash2, ChevronRight, ChevronDown,
    Settings, CheckCircle, XCircle, Command, Bell, Monitor, Menu, X, LayoutGrid, Cpu, Filter, Layers, HardDrive, File,
    Lock
} from 'lucide-react';
import { Toaster } from 'react-hot-toast';

import { auth, db } from "./firebase/config";
import { playSound } from "./utils/soundUtils";

// Views Imports
import AuthView from "./views/AuthView";
import OnboardingView from "./views/OnboardingView";
import DashboardView from "./views/DashboardView";
import TasksView from "./views/TasksView";
import ReportsView from "./views/ReportsView";
import ProjectVault from "./views/ProjectVault";
import TeamView from "./views/TeamView";
import ArchivesView from "./views/ArchivesView";
import ProfileModal from "./components/ProfileModal";
import CommandPalette from "./components/CommandPalette";

const APP_ID = "unity-work-os";
const getCollectionRef = (collectionName) => collection(db, 'artifacts', APP_ID, 'public', 'data', collectionName);
const MESSAGES_COLLECTION_PATH = ['artifacts', APP_ID, 'public', 'data', 'messages'];
const PROJECT_MESSAGES_COLLECTION_PATH = ['artifacts', APP_ID, 'public', 'data', 'project_messages'];
const STORAGE_KEYS = { LAST_READ_CHAT: "workos_last_read_chat" };

// ✅ AAPKA GITHUB DOWNLOAD LINK YAHAN HAI
const DOWNLOAD_LINK = "https://github.com/AbuBaker2980/unity-work-os/releases/download/v1.0.2/Unity.Work.OS.Setup.1.0.2.exe";

// --- DASHBOARD COMPONENT ---
const Dashboard = ({
    user, handleLogout, onUpdateUser,
    localProjects, localFolders, localTasks, localActivities,
    activityDate, setActivityDate,
    inAppNotifications, clearNotifications
}) => {
    const [view, setView] = useState('dashboard');
    const [teamTab, setTeamTab] = useState('roster');
    const [selectedProjectId, setSelectedProjectId] = useState(null);
    const [projectFilter, setProjectFilter] = useState('All');

    // RESPONSIVE SIDEBAR STATE
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);

    // --- NOTIFICATION STATES ---
    const [unreadChat, setUnreadChat] = useState(false);
    const [unreadProjectIds, setUnreadProjectIds] = useState(new Set()); // Tracks IDs of projects with new msgs

    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [isCommandPaletteOpen, setCommandPaletteOpen] = useState(false);
    const [isNotifOpen, setNotifOpen] = useState(false);

    const [isCreateFolderOpen, setCreateFolderOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    const [newFolderUrl, setNewFolderUrl] = useState("");
    const [collapsedFolders, setCollapsedFolders] = useState({});

    const [projectSearch, setProjectSearch] = useState("");
    const [editingFolder, setEditingFolder] = useState(null);
    const [editFolderName, setEditFolderName] = useState("");
    const [editFolderUrl, setEditFolderUrl] = useState("");

    const projects = localProjects || [];
    const folders = localFolders || [];
    const tasks = localTasks || [];
    const activities = localActivities || [];

    const toggleFolder = (folderId) => setCollapsedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));

    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setCommandPaletteOpen(prev => !prev);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 768) {
                setSidebarOpen(false);
            } else {
                setSidebarOpen(true);
            }
        };
        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // --- GLOBAL CHAT LISTENER ---
    useEffect(() => {
        if (!user?.teamId) return;
        const msgsRef = collection(db, ...MESSAGES_COLLECTION_PATH);
        const q = query(msgsRef, where("teamId", "==", user.teamId), orderBy('createdAt', 'desc'), limit(10));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const lastRead = localStorage.getItem(STORAGE_KEYS.LAST_READ_CHAT) || new Date(0).toISOString();
            const hasNew = snapshot.docs.some(doc => toDateObj(doc.data().createdAt) > new Date(lastRead) && doc.data().senderId !== user.uid);

            if (view !== 'team' || teamTab !== 'chat') {
                setUnreadChat(hasNew);
            } else {
                setUnreadChat(false);
                localStorage.setItem(STORAGE_KEYS.LAST_READ_CHAT, new Date().toISOString());
            }
        });
        return () => unsubscribe();
    }, [user.teamId, view, teamTab]);

    const handleNavigate = (newView, param = null) => {
        setView(newView);
        setMobileMenuOpen(false);
        if (newView === 'team') setTeamTab(param || 'roster');
        if (newView === 'projects' && param) setSelectedProjectId(param);
        if (newView === 'tasks') setView('tasks');
    };

    // --- HELPER: CLEAR PROJECT NOTIFICATION ---
    const markProjectRead = (projectId) => {
        setUnreadProjectIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(projectId);
            return newSet;
        });
    };

    const checkPermission = (action) => {
        const role = user?.role || 'Guest';
        if (action === 'VIEW_PROJECTS') return true;

        const isLead = ['TL', 'Team Lead', 'Manager'].includes(role);
        const isContributor = ['Developer', 'ASO'].includes(role);

        if (action === 'CREATE_CONTENT') return isLead || isContributor;
        if (action === 'DELETE_CONTENT') return isLead;
        if (action === 'MANAGE_FOLDERS') return isLead || isContributor;

        return false;
    };

    const logActivity = async (text, type, meta = {}) => {
        await addDoc(getCollectionRef('activities'), { text, type, meta, timestamp: serverTimestamp(), teamId: user.teamId });
    };

    // --- ACTIONS ---
    const createFolder = async (e) => {
        e.preventDefault();
        if (!checkPermission('CREATE_CONTENT')) return alert("Access Denied.");
        await addDoc(getCollectionRef('folders'), { name: newFolderName, storeUrl: newFolderUrl, createdBy: user.uid, teamId: user.teamId, createdAt: serverTimestamp() });
        setCreateFolderOpen(false); setNewFolderName(""); setNewFolderUrl("");
        logActivity(`${user.name} created folder: ${newFolderName}`, 'FOLDER_CREATED', { view: 'projects' });
    };

    const handleEditFolder = async (folderId) => {
        if (!editFolderName.trim()) return;
        try {
            await updateDoc(doc(getCollectionRef('folders'), folderId), { name: editFolderName, storeUrl: editFolderUrl });
            setEditingFolder(null); setEditFolderName(""); setEditFolderUrl("");
        } catch (error) { console.error("Error updating folder", error); }
    };

    const deleteFolder = async (folderId, folderName) => {
        if (!checkPermission('DELETE_CONTENT')) return alert("Access Denied. Only Team Leads can delete.");
        if (!confirm(`Are you sure you want to delete the folder "${folderName}"?\n\nThis will NOT delete the projects inside, but will move them to 'Unassigned'.`)) return;
        const projectsInFolder = projects.filter(p => p.folderId === folderId);
        for (const proj of projectsInFolder) await updateDoc(doc(getCollectionRef('projects'), proj.id), { folderId: null });
        await deleteDoc(doc(getCollectionRef('folders'), folderId));
        logActivity(`${user.name} deleted folder: ${folderName}`, 'FOLDER_DELETED', { view: 'projects' });
    };

    const createProject = async () => {
        if (!checkPermission('CREATE_CONTENT')) return alert("Access Denied.");
        const docRef = await addDoc(getCollectionRef('projects'), { name: 'New Project', platform: 'Android', status: 'In Development', createdAt: serverTimestamp(), createdBy: user.uid, teamId: user.teamId, adsVault: [], folderId: null, history: [], assets: { apk: '', aab: '' } });
        logActivity(`${user.name} added project`, 'PROJECT_CREATED', { projectId: docRef.id, view: 'projects' });
        setSelectedProjectId(docRef.id); setView('projects');
    };

    const updateProject = async (id, data) => updateDoc(doc(getCollectionRef('projects'), id), data);

    const deleteProject = async (id) => {
        if (checkPermission('DELETE_CONTENT')) {
            if (confirm("Are you sure you want to permanently delete this project?\n\nThis action cannot be undone.")) {
                await deleteDoc(doc(getCollectionRef('projects'), id));
                if (selectedProjectId === id) setSelectedProjectId(null);
            }
        }
    };

    const addTask = async (taskData) => addDoc(getCollectionRef('tasks'), { ...taskData, teamId: user.teamId });
    const updateTask = async (id, data) => updateDoc(doc(getCollectionRef('tasks'), id), data);
    const deleteTask = async (id) => { if (confirm("Delete task?")) deleteDoc(doc(getCollectionRef('tasks'), id)); };
    const handleActivityClick = (activity) => { if (activity.meta?.view) { setView(activity.meta.view); if (activity.meta.projectId) setSelectedProjectId(activity.meta.projectId); } };

    const filteredProjects = projects.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(projectSearch.toLowerCase());
        const matchesTab = projectFilter === 'All' || p.platform === projectFilter || (projectFilter === 'PC' && p.platform === 'Windows');
        return matchesSearch && matchesTab;
    });

    const handleDragStart = (e, projectId) => { e.dataTransfer.setData("projectId", projectId); e.dataTransfer.effectAllowed = "move"; };
    const handleDropOnFolder = async (e, folderId) => { e.preventDefault(); const projectId = e.dataTransfer.getData("projectId"); if (projectId) { await updateDoc(doc(getCollectionRef('projects'), projectId), { folderId }); } };
    const handleDropOnUnassigned = async (e) => { e.preventDefault(); const projectId = e.dataTransfer.getData("projectId"); if (projectId) { await updateDoc(doc(getCollectionRef('projects'), projectId), { folderId: null }); } };

    const renderProjectItem = (p) => {
        let Icon = Smartphone;
        let colorClass = "text-gray-400";
        if (p.platform === 'iOS') { Icon = Smartphone; colorClass = "text-gray-400"; }
        if (p.platform === 'Windows' || p.platform === 'PC') { Icon = Monitor; colorClass = "text-gray-400"; }

        const hasUnread = unreadProjectIds.has(p.id);

        return (
            <div
                key={p.id}
                draggable
                onDragStart={(e) => handleDragStart(e, p.id)}
                onClick={() => setSelectedProjectId(p.id)}
                className={`group flex items-center justify-between px-3 py-1.5 rounded-md cursor-pointer text-sm mb-0.5 transition-all relative
                    ${selectedProjectId === p.id ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-[#1a1a1d] hover:text-white'}`}
            >
                <div className="flex items-center gap-2 truncate flex-1">
                    <Icon size={14} className={selectedProjectId === p.id ? 'text-white' : colorClass} />
                    <span className={`truncate text-xs ${hasUnread ? "font-bold text-white" : ""}`}>{p.name}</span>
                </div>

                {hasUnread && <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_5px_red] mr-2"></div>}

                {checkPermission('DELETE_CONTENT') && (
                    <button onClick={(e) => { e.stopPropagation(); deleteProject(p.id); }} className={`opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 rounded transition-all ${selectedProjectId === p.id ? 'text-blue-200 hover:text-white' : 'text-gray-500'}`} title="Delete Project">
                        <Trash2 size={12} />
                    </button>
                )}
            </div>
        );
    };

    const SidebarBtn = ({ icon: Icon, label, active, onClick, isOpen, locked, alert }) => (
        <button
            onClick={locked ? undefined : onClick}
            className={`w-full flex items-center px-4 py-3 mb-1 rounded-xl transition-all duration-300 group outline-none relative overflow-hidden 
                ${active ? 'text-white bg-gradient-to-r from-blue-600/20 to-transparent border-l-2 border-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.2)]'
                    : locked
                        ? 'text-gray-600 cursor-not-allowed opacity-40 bg-transparent'
                        : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'}`
            }
            title={locked ? "Access Restricted" : label}
        >
            <div className="relative z-10 flex items-center w-full">
                <div className="relative">
                    <Icon size={20} className={`transition-all duration-300 ${active ? 'text-blue-400 scale-110 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]' : locked ? 'text-gray-600' : 'group-hover:text-white'}`} />
                    {alert && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 border-2 border-[#0f0f12] rounded-full animate-pulse shadow-[0_0_10px_red]"></span>}
                </div>
                <span className={`ml-4 font-medium text-sm tracking-wide transition-all duration-300 whitespace-nowrap ${isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 w-0 overflow-hidden'}`}>
                    {label}
                </span>
                {locked && isOpen && <Lock size={12} className="ml-auto text-gray-500" />}
            </div>
        </button>
    );

    return (
        <div className="flex h-screen bg-[#050505] text-gray-300 overflow-hidden font-sans selection:bg-blue-500/30 selection:text-blue-200 relative">
            <style>{`
                ::-webkit-scrollbar { width: 6px; height: 6px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
                ::-webkit-scrollbar-thumb:hover { background: #555; }
                .animate-fade-in { animation: fadeIn 0.4s ease-out; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            `}</style>

            <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} projects={projects} tasks={tasks} teamMembers={[]} onNavigate={handleNavigate} />
            {showProfileModal && (<ProfileModal user={user} onClose={() => setShowProfileModal(false)} onUpdateLocalUser={onUpdateUser} />)}
            {showLogoutConfirm && (<div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fade-in"><div className="bg-[#151518] border border-white/10 p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center relative animate-scale-up"><div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20"><LogOut size={32} className="text-red-500 ml-1" /></div><h3 className="text-2xl font-bold text-white mb-2">Log Out?</h3><p className="text-sm text-gray-400 mb-8 leading-relaxed">Are you sure you want to sign out?</p><div className="flex gap-3"><button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-sm transition-colors border border-white/5 hover:border-white/10">Cancel</button><button onClick={handleLogout} className="flex-1 py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-colors shadow-lg shadow-red-900/20 flex items-center justify-center gap-2">Yes, Logout</button></div></div></div>)}

            {isMobileMenuOpen && (<div className="fixed inset-0 bg-black/80 z-30 md:hidden backdrop-blur-sm animate-fade-in" onClick={() => setMobileMenuOpen(false)} />)}

            <div className={`fixed inset-y-0 left-0 z-40 bg-[#050505] border-r border-white/5 flex flex-col transition-transform duration-300 ease-in-out md:relative ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} ${isSidebarOpen ? 'md:w-64' : 'md:w-20'} md:translate-x-0 w-64 shadow-[10px_0_30px_rgba(0,0,0,0.5)]`}>
                <div className={`h-20 flex items-center px-5 border-b border-white/5 ${isSidebarOpen ? 'justify-between' : 'justify-center'}`}><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.5)] border border-white/10 flex-shrink-0 animate-pulse"><Box className="w-6 h-6 text-white" /></div>{(isSidebarOpen || isMobileMenuOpen) && <span className="font-bold text-white tracking-widest text-lg font-mono">UNITY CORE</span>}</div><button className="md:hidden text-gray-400" onClick={() => setMobileMenuOpen(false)}><X size={20} /></button></div>
                <div className="px-4 mb-4 mt-6"><button onClick={() => { setCommandPaletteOpen(true); setMobileMenuOpen(false); }} className={`w-full flex items-center justify-between bg-white/5 border border-white/5 p-3 rounded-xl text-gray-400 hover:text-white hover:border-blue-500/50 hover:bg-white/10 transition-all group ${!isSidebarOpen && 'justify-center'} shadow-inner`} title="Quick Search (Ctrl + K)"><div className="flex items-center gap-3"><Search size={18} className="group-hover:text-blue-400 transition-colors" />{(isSidebarOpen || isMobileMenuOpen) && <span className="text-xs font-medium tracking-wide">Quick Search...</span>}</div>{isSidebarOpen && !isMobileMenuOpen && (<div className="flex gap-1 opacity-50"><span className="text-[9px] font-mono bg-black/50 px-1.5 py-0.5 rounded border border-white/10">Ctrl</span><span className="text-[9px] font-mono bg-black/50 px-1.5 py-0.5 rounded border border-white/10">K</span></div>)}</button></div>

                <nav className="flex-1 py-2 px-3 space-y-2 overflow-y-auto">
                    <SidebarBtn icon={Layout} label="Dashboard" active={view === 'dashboard'} onClick={() => handleNavigate('dashboard')} isOpen={isSidebarOpen || isMobileMenuOpen} />
                    <SidebarBtn icon={CheckSquare} label="Daily Tasks" active={view === 'tasks'} onClick={() => handleNavigate('tasks')} isOpen={isSidebarOpen || isMobileMenuOpen} />

                    {(checkPermission('VIEW_PROJECTS') || ['Designer', '3D Modeler'].includes(user.role)) && (
                        <SidebarBtn
                            icon={Briefcase}
                            label="Projects"
                            active={view === 'projects'}
                            onClick={() => handleNavigate('projects')}
                            isOpen={isSidebarOpen || isMobileMenuOpen}
                            locked={!checkPermission('VIEW_PROJECTS')}
                            alert={unreadProjectIds.size > 0}
                        />
                    )}

                    <SidebarBtn icon={Users} label="Team" active={(view === 'team' && teamTab === 'roster')} onClick={() => handleNavigate('team', 'roster')} isOpen={isSidebarOpen || isMobileMenuOpen} />
                    <button onClick={() => handleNavigate('team', 'chat')} className={`relative w-full flex items-center px-4 py-3 mb-1 rounded-xl transition-all duration-300 group outline-none overflow-hidden ${(view === 'team' && teamTab === 'chat') ? 'text-white' : 'text-gray-500 hover:text-gray-200'}`}>{(view === 'team' && teamTab === 'chat') && (<><div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.8)] rounded-r-full" /><div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-transparent" /></>)}<div className="relative flex items-center z-10"><div className="relative"><MessageSquare size={20} className={`transition-all duration-300 ${(view === 'team' && teamTab === 'chat') ? "text-purple-400 scale-110 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]" : "group-hover:text-white"}`} />{unreadChat && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 border-2 border-[#0f0f12] rounded-full animate-pulse shadow-[0_0_10px_red]"></span>}</div><span className={`ml-4 font-medium text-sm tracking-wide transition-all duration-300 whitespace-nowrap ${(isSidebarOpen || isMobileMenuOpen) ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 w-0 overflow-hidden"}`}>Team Chat</span></div></button>
                    <SidebarBtn icon={Layers} label="Archives" active={view === 'archives'} onClick={() => handleNavigate('archives')} isOpen={isSidebarOpen || isMobileMenuOpen} />
                    <SidebarBtn icon={Clipboard} label="Reports" active={view === 'reports'} onClick={() => handleNavigate('reports')} isOpen={isSidebarOpen || isMobileMenuOpen} />
                </nav>

                <div className="p-4 bg-[#050505]"><div className={`flex items-center ${(isSidebarOpen || isMobileMenuOpen) ? 'justify-between' : 'justify-center'} p-2.5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all cursor-pointer backdrop-blur-sm shadow-lg group`}>{(isSidebarOpen || isMobileMenuOpen) ? (<div onClick={() => setShowProfileModal(true)} className="flex items-center gap-3 overflow-hidden flex-1 mr-2">{user.avatar ? (<img src={user.avatar} alt="Me" className="w-9 h-9 rounded-full bg-black/50 border border-white/10 object-cover group-hover:border-blue-500 transition-colors" />) : (<div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white font-bold text-xs shadow-lg">{user.name ? user.name.charAt(0).toUpperCase() : 'U'}</div>)}<div className="flex flex-col overflow-hidden"><span className="text-[9px] uppercase font-bold text-blue-400 mb-0.5 tracking-wider">{user.role}</span><span className="text-xs text-white truncate w-24 font-medium group-hover:text-blue-200 transition-colors">{user.name || "User"}</span></div></div>) : null}<button onClick={() => setShowLogoutConfirm(true)} className="text-gray-500 hover:text-red-400 transition-colors p-1.5 hover:bg-red-500/10 rounded-lg" title="Logout"><LogOut size={18} /></button></div></div>
            </div>

            <div className="flex-1 flex flex-col min-w-0 bg-[#0a0a0a] relative h-screen overflow-hidden">
                <div className="md:hidden h-16 bg-[#0f0f12] border-b border-white/5 flex items-center justify-between px-4 shrink-0 z-20"><button onClick={() => setMobileMenuOpen(true)} className="text-gray-400 hover:text-white p-2"><Menu size={24} /></button><span className="font-bold text-white tracking-wide">UNITY CORE</span><button onClick={() => setNotifOpen(!isNotifOpen)} className="text-gray-400 hover:text-white p-2 relative"><Bell size={20} />{inAppNotifications.length > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-[#0f0f12]" />}</button></div>
                <div className="hidden md:block absolute top-4 right-6 z-30"><div className="relative"><button onClick={() => setNotifOpen(!isNotifOpen)} className="text-gray-500 hover:text-white p-2 rounded-full bg-black/20 hover:bg-white/10 border border-white/5 transition-colors relative"><Bell size={18} />{inAppNotifications.length > 0 && <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full border border-[#0f0f12]" />}</button>{isNotifOpen && (<><div className="fixed inset-0 z-30" onClick={() => setNotifOpen(false)} /><div className="absolute right-0 top-10 w-72 bg-[#151518] border border-white/10 rounded-xl shadow-2xl z-40 p-2 overflow-hidden animate-fade-in origin-top-right"><div className="flex justify-between items-center px-3 py-2 mb-1 border-b border-white/5"><h4 className="text-[10px] uppercase font-bold text-gray-500">Notifications</h4>{inAppNotifications.length > 0 && <button onClick={clearNotifications} className="text-[10px] text-blue-400 hover:underline">Clear</button>}</div>{inAppNotifications.length === 0 ? (<p className="text-xs text-gray-600 px-2 py-4 text-center">No new notifications</p>) : (<div className="max-h-64 overflow-y-auto custom-scrollbar">{inAppNotifications.map(n => (<div key={n.id} className="p-2.5 hover:bg-white/5 rounded-lg text-xs text-gray-300 border-b border-white/5 last:border-0 mb-1 flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" /><div><p className="leading-snug">{n.text}</p><p className="text-[9px] text-gray-600 mt-1">{n.time}</p></div></div>))}</div>)}</div></>)}</div></div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden relative custom-scrollbar">
                    <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-900/10 to-transparent pointer-events-none" />
                    <div className="relative z-10 h-full flex flex-col">
                        {view === 'dashboard' && (<DashboardView projects={projects} tasks={tasks} activities={activities} onCreateProject={createProject} onNavigate={handleNavigate} onActivityClick={handleActivityClick} userRole={user.role} checkPermission={checkPermission} activityDate={activityDate} setActivityDate={setActivityDate} user={user} />)}
                        {view === 'projects' && checkPermission('VIEW_PROJECTS') && (
                            <div className="h-full flex flex-col">
                                <div className="px-8 pt-8 pb-4 shrink-0 flex justify-between items-end">
                                    <div>
                                        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                                            <Briefcase className="text-blue-500" size={24} /> Project Vault
                                        </h1>
                                        <p className="text-gray-500 mt-1 text-sm">Manage your digital vault and assets.</p>
                                    </div>
                                </div>

                                <div className="flex-1 flex min-h-0 overflow-hidden">
                                    <div className={`${selectedProjectId ? 'w-80 border-r border-white/5' : 'w-full'} bg-[#0f0f12]/50 backdrop-blur-md flex flex-col transition-all duration-300 relative`}>
                                        <div className="px-4 py-4 space-y-4">
                                            <div className="relative group">
                                                <Search className="absolute left-3 top-2.5 text-gray-500 group-focus-within:text-blue-500 transition-colors" size={16} />
                                                <input type="text" placeholder="Search..." value={projectSearch} onChange={(e) => setProjectSearch(e.target.value)}
                                                    className="w-full bg-[#151518] border border-white/10 pl-10 p-2 rounded-xl text-sm text-gray-200 outline-none focus:border-blue-500/50 transition-all placeholder-gray-600 shadow-inner"
                                                />
                                            </div>
                                            <div className="grid grid-cols-4 gap-2">
                                                {['All', 'Android', 'iOS', 'PC'].map(tab => {
                                                    let activeStyle = "bg-white text-black border-white";
                                                    if (tab === 'Android') activeStyle = "bg-green-500 text-black border-green-500";
                                                    if (tab === 'iOS') activeStyle = "bg-blue-500 text-white border-blue-500";
                                                    if (tab === 'PC') activeStyle = "bg-purple-500 text-white border-purple-500";

                                                    return (
                                                        <button
                                                            key={tab}
                                                            onClick={() => setProjectFilter(tab)}
                                                            className={`py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border transition-all shadow-sm ${projectFilter === tab ? activeStyle : 'bg-transparent text-gray-600 border-transparent hover:bg-white/5 hover:text-gray-400'}`}
                                                        >
                                                            {tab}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>

                                        {isCreateFolderOpen && (<div className="p-4 bg-white/5 border-b border-white/5 animate-fade-in"><input type="text" placeholder="Folder Name" className="w-full bg-[#0a0a0a] border border-white/10 p-2 rounded text-sm text-white mb-2 outline-none focus:border-blue-500" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} autoFocus /><input type="text" placeholder="Store URL (Optional)" className="w-full bg-[#0a0a0a] border border-white/10 p-2 rounded text-sm text-white mb-2 outline-none focus:border-blue-500" value={newFolderUrl} onChange={(e) => setNewFolderUrl(e.target.value)} /><div className="flex gap-2"><button onClick={createFolder} className="flex-1 bg-green-600 hover:bg-green-500 text-white text-xs font-bold py-2 rounded shadow-lg" disabled={!newFolderName}>Confirm</button><button onClick={() => setCreateFolderOpen(false)} className="px-3 bg-red-500/20 text-red-400 hover:bg-red-500/40 rounded"><XCircle size={16} /></button></div></div>)}

                                        <div className="flex-1 overflow-y-auto px-4 pb-20 custom-scrollbar space-y-4">
                                            <div className="space-y-3">
                                                {folders.map(folder => {
                                                    const folderProjects = filteredProjects.filter(p => p.folderId === folder.id);
                                                    const isCollapsed = collapsedFolders[folder.id];
                                                    if (projectFilter !== 'All' && folderProjects.length === 0) return null;

                                                    return (
                                                        <div key={folder.id}
                                                            className="transition-all"
                                                            onDragOver={(e) => e.preventDefault()}
                                                            onDrop={(e) => handleDropOnFolder(e, folder.id)}
                                                        >
                                                            <div className="flex items-center justify-between py-1 cursor-pointer group" onClick={() => toggleFolder(folder.id)}>
                                                                {editingFolder === folder.id ? (
                                                                    <div className="flex flex-col gap-2 flex-1 relative z-50 p-2 bg-[#1a1a1d] border border-white/10 rounded-lg" onClick={e => e.stopPropagation()}><input autoFocus placeholder="Name" className="bg-black text-white text-xs p-1.5 border border-white/10 rounded" value={editFolderName} onChange={e => setEditFolderName(e.target.value)} /><input placeholder="URL" className="bg-black text-white text-xs p-1.5 border border-white/10 rounded" value={editFolderUrl} onChange={e => setEditFolderUrl(e.target.value)} /><div className="flex gap-2 justify-end mt-1"><button onClick={() => handleEditFolder(folder.id)} className="text-green-400 hover:bg-green-500/20 p-1 rounded"><CheckCircle size={14} /></button><button onClick={() => setEditingFolder(null)} className="text-red-400 hover:bg-red-500/20 p-1 rounded"><XCircle size={14} /></button></div></div>
                                                                ) : (
                                                                    <div className="flex items-center gap-2 flex-1 overflow-hidden">
                                                                        <div className={`text-gray-500 transition-transform ${!isCollapsed ? 'rotate-90' : ''}`}><ChevronRight size={12} /></div>
                                                                        <div className="text-yellow-500"><Folder size={14} fill="currentColor" /></div>
                                                                        <span className="font-bold text-xs text-gray-400 group-hover:text-white transition-colors uppercase tracking-wide">{folder.name}</span>
                                                                        <span className="text-[9px] text-gray-600 bg-white/5 px-1.5 rounded-full">{folderProjects.length}</span>
                                                                    </div>
                                                                )}

                                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    {folder.storeUrl && <a href={folder.storeUrl} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-blue-400" onClick={(e) => e.stopPropagation()}><Link size={12} /></a>}
                                                                    {checkPermission('MANAGE_FOLDERS') && !editingFolder && (
                                                                        <>
                                                                            <button onClick={(e) => { e.stopPropagation(); setEditingFolder(folder.id); setEditFolderName(folder.name); setEditFolderUrl(folder.storeUrl || ""); }} className="text-gray-600 hover:text-white"><Settings size={12} /></button>
                                                                            <button onClick={(e) => { e.stopPropagation(); deleteFolder(folder.id, folder.name); }} className="text-gray-600 hover:text-red-400"><Trash2 size={12} /></button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {!isCollapsed && (
                                                                <div className="pl-4 mt-1 space-y-0.5 border-l border-white/5 ml-1.5">
                                                                    {folderProjects.length === 0 && <div className="text-[10px] text-gray-700 italic py-1 pl-2">Empty Folder</div>}
                                                                    {folderProjects.map(p => renderProjectItem(p))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )
                                                })}
                                            </div>

                                            <div
                                                className="mt-6 pt-4 border-t border-white/5"
                                                onDragOver={(e) => e.preventDefault()}
                                                onDrop={handleDropOnUnassigned}
                                            >
                                                <div className="flex items-center gap-2 mb-2 px-1 text-gray-600 uppercase text-[10px] font-bold tracking-widest">
                                                    <HardDrive size={12} /> Unassigned
                                                </div>
                                                <div className="space-y-0.5 pl-1">
                                                    {filteredProjects.filter(p => !p.folderId).map(p => renderProjectItem(p))}
                                                    {filteredProjects.filter(p => !p.folderId).length === 0 && <div className="text-[10px] text-gray-700 py-2 italic">No unassigned projects.</div>}
                                                </div>
                                            </div>

                                        </div>

                                        <div className="absolute bottom-6 left-0 right-0 flex justify-center z-20 pointer-events-none">
                                            <div className="flex gap-2 p-1.5 bg-[#151518]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl pointer-events-auto transform hover:scale-105 transition-transform">
                                                {checkPermission('CREATE_CONTENT') && (
                                                    <button onClick={createProject} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg transition-colors">
                                                        <Plus size={14} /> <span>Project</span>
                                                    </button>
                                                )}
                                                {checkPermission('CREATE_CONTENT') && (
                                                    <button onClick={() => setCreateFolderOpen(!isCreateFolderOpen)} className="flex items-center gap-2 bg-[#27272a] hover:bg-[#3f3f46] text-gray-300 hover:text-white text-xs font-bold px-4 py-2.5 rounded-xl border border-white/5 transition-colors">
                                                        <FolderPlus size={14} /> <span>Folder</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {selectedProjectId && projects.find(p => p.id === selectedProjectId) ? (
                                        <div className="flex-1 min-w-0 bg-[#0a0a0a] shadow-[inset_10px_0_30px_-10px_rgba(0,0,0,0.5)]">
                                            <ProjectVault
                                                project={projects.find(p => p.id === selectedProjectId)}
                                                folders={folders}
                                                onUpdate={updateProject}
                                                onClose={() => setSelectedProjectId(null)}
                                                userRole={user.role}
                                                userName={user.name}
                                                user={user}
                                                logActivity={logActivity}
                                                hasUnreadDiscussion={unreadProjectIds.has(selectedProjectId)}
                                                onMarkDiscussionRead={() => markProjectRead(selectedProjectId)}
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex-1 flex flex-col items-center justify-center text-gray-600 animate-fade-in">
                                            <div className="p-6 bg-white/5 rounded-full mb-6 animate-pulse"><Command size={48} className="text-blue-500/50" /></div>
                                            <h3 className="text-xl font-bold text-white mb-2">Select a Project</h3>
                                            <p className="text-sm">Choose from the list to view details & keys.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {view === 'team' && <TeamView currentUser={user} defaultTab={teamTab} />}
                        {view === 'tasks' && <TasksView projects={projects} tasks={tasks} onAddTask={addTask} onUpdateTask={updateTask} onDeleteTask={deleteTask} logActivity={logActivity} user={user} />}
                        {view === 'archives' && <ArchivesView user={user} />}
                        {view === 'reports' && <ReportsView tasks={tasks} projects={projects} />}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function AppWrapper() {
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [projects, setProjects] = useState([]);
    const [folders, setFolders] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [activities, setActivities] = useState([]);
    const [activityDate, setActivityDate] = useState(getTodayString());
    const [inAppNotifications, setInAppNotifications] = useState([]);
    const isFirstLoad = useRef(true);
    const projectsRef = useRef([]);

    // Sync ref with state
    useEffect(() => {
        projectsRef.current = projects;
    }, [projects]);

    const requestNotificationPermission = () => { if ("Notification" in window && Notification.permission !== "granted") Notification.requestPermission(); };

    const showDesktopNotification = (title, body) => {
        if (Notification.permission === "granted") {
            const notif = new Notification(title, {
                body,
                icon: '/vite.svg',
                tag: 'work-os-notification'
            });
            notif.onclick = () => window.focus();
        }
        playSound('notification');
    };

    const addInAppNotification = (text) => { const newNotif = { id: crypto.randomUUID(), text, time: new Date().toLocaleTimeString() }; setInAppNotifications(prev => [newNotif, ...prev]); };

    useEffect(() => {
        if (!user?.teamId) return;
        requestNotificationPermission();

        // --- 1. PROJECTS LISTENER ---
        const unsubProjects = onSnapshot(query(getCollectionRef('projects'), where('teamId', '==', user.teamId)), (s) => {
            const fetchedProjects = s.docs.map(d => ({ id: d.id, ...d.data() }));

            if (!isFirstLoad.current) {
                s.docChanges().forEach((change) => {
                    if (change.type === "modified") {
                        const newData = change.doc.data();
                        const oldData = projectsRef.current.find(p => p.id === change.doc.id);
                        if (oldData) {
                            const wasAllowed = (oldData.allowedMembers || []).includes(user.uid);
                            const isAllowed = (newData.allowedMembers || []).includes(user.uid);
                            if (!wasAllowed && isAllowed) {
                                showDesktopNotification("Access Granted", `You have been added to the discussion for: ${newData.name}`);
                                addInAppNotification(`Added to discussion: ${newData.name}`);
                            }
                        }
                    }
                });
            }
            setProjects(fetchedProjects);
        });

        const unsubFolders = onSnapshot(query(getCollectionRef('folders'), where('teamId', '==', user.teamId)), (s) => setFolders(s.docs.map(d => ({ id: d.id, ...d.data() }))));

        const unsubTasks = onSnapshot(query(getCollectionRef('tasks'), where('teamId', '==', user.teamId)), (snapshot) => {
            const fetchedTasks = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            if (!isFirstLoad.current) {
                snapshot.docChanges().forEach((change) => {
                    const task = change.doc.data();
                    if (change.type === "added" && task.assignedTo === user.uid && task.assignedBy !== user.uid) {
                        const msg = `New Task: ${task.title}`;
                        showDesktopNotification("New Assignment", msg);
                        addInAppNotification(msg);
                    }
                    if (change.type === "modified" && task.status === 'Completed' && task.assignedTo !== user.uid) {
                        const msg = `${task.assignedByName || 'Someone'} completed: ${task.title}`;
                        showDesktopNotification("Task Completed", msg);
                        addInAppNotification(msg);
                    }
                });
            }
            setTasks(fetchedTasks);
        });

        const startOfDay = new Date(activityDate); startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(activityDate); endOfDay.setHours(23, 59, 59, 999);

        const unsubActivities = onSnapshot(query(getCollectionRef('activities'), where('teamId', '==', user.teamId), where('timestamp', '>=', startOfDay), where('timestamp', '<=', endOfDay), orderBy('timestamp', 'desc')), (snapshot) => {
            const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            if (!isFirstLoad.current) {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === "added") {
                        const act = change.doc.data();
                        if (act.type?.includes("DELETE") || act.type?.includes("UPLOAD")) {
                            showDesktopNotification("Team Activity", act.text);
                        }
                    }
                });
            }
            setActivities(fetched);
        });

        const msgsRef = collection(db, ...MESSAGES_COLLECTION_PATH);
        const unsubChat = onSnapshot(query(msgsRef, where("teamId", "==", user.teamId), orderBy("createdAt", "desc"), limit(1)), (snapshot) => {
            if (!isFirstLoad.current && !snapshot.empty) {
                const msg = snapshot.docs[0].data();
                if (msg.senderId !== user.uid) {
                    if (msg.text.includes(`@${user.name}`)) {
                        const notifyText = `${msg.senderName} mentioned you: ${msg.text}`;
                        showDesktopNotification("New Mention", notifyText);
                        addInAppNotification(notifyText);
                    } else {
                        showDesktopNotification(`Message from ${msg.senderName}`, msg.text);
                    }
                }
            }
        });

        setTimeout(() => { isFirstLoad.current = false; }, 2000);
        return () => { unsubProjects(); unsubFolders(); unsubTasks(); unsubActivities(); unsubChat(); };
    }, [user?.teamId, activityDate]);

    // --- 2. PROJECT MESSAGES LISTENER (GLOBAL) ---
    useEffect(() => {
        if (!user?.teamId) return;

        const msgsRef = collection(db, ...PROJECT_MESSAGES_COLLECTION_PATH);
        const q = query(msgsRef, orderBy('createdAt', 'desc'), limit(1));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!isFirstLoad.current && !snapshot.empty) {
                const msg = snapshot.docs[0].data();
                const project = projectsRef.current.find(p => p.id === msg.projectId);

                if (project && msg.senderId !== user.uid) {
                    const isTL = ['TL', 'Team Lead', 'Manager'].includes(user.role);
                    const isAllowed = isTL || (project.allowedMembers || []).includes(user.uid);

                    if (isAllowed) {
                        const title = `Msg: ${project.name}`;
                        const body = `${msg.senderName}: ${msg.text || '📎 Attachment'}`;
                        showDesktopNotification(title, body);
                        addInAppNotification(`${project.name}: ${msg.senderName} sent a message`);

                        // --- SET PROJECT AS UNREAD IN APP STATE ---
                        setUnreadProjectIds(prev => new Set(prev).add(project.id));
                    }
                }
            }
        });

        return () => unsubscribe();
    }, [user?.teamId]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        setUser({ uid: firebaseUser.uid, email: firebaseUser.email, role: userData.role || 'Developer', name: userData.name, tagline: userData.tagline, avatar: userData.avatar, teamId: userData.teamId });
                    } else { setUser(null); }
                } catch (error) { console.error("Error fetching user role:", error); setUser(null); }
            } else { setUser(null); }
            setAuthLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleLogout = async () => { await signOut(auth); setUser(null); };

    if (authLoading) return <div className="h-screen bg-[#0a0a0a] flex items-center justify-center text-gray-500 font-mono text-sm tracking-wider">INITIALIZING SYSTEM...</div>;

    // --- 🛑 DOWNLOAD PAGE LOGIC 🛑 ---
    // Agar Electron nahi hai, toh Download page dikhao
    const isElectron = navigator.userAgent.toLowerCase().includes('electron');

    if (!isElectron) {
        return (
            <div className="h-screen bg-[#050505] flex flex-col items-center justify-center text-center p-4">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl flex items-center justify-center shadow-[0_0_40px_rgba(37,99,235,0.3)] mb-8 animate-pulse">
                    <Box className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
                    Unity Work OS
                </h1>
                <p className="text-gray-400 text-lg mb-10 max-w-md leading-relaxed">
                    The ultimate workspace for developers. Manage projects, tasks, and teams in one secure vault.
                </p>
                <div className="flex flex-col gap-4 w-full max-w-xs">
                    <a
                        href={DOWNLOAD_LINK}
                        className="flex items-center justify-center gap-3 w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-blue-500/25 hover:scale-105"
                    >
                        <Monitor size={20} /> Download for Windows
                    </a>
                    <p className="text-xs text-gray-600 mt-2">v1.0.2 • Windows 10/11 • 64-bit</p>
                </div>
            </div>
        );
    }

    // --- AGAR ELECTRON HAI, TO APP DIKHAO ---
    if (!user) return <AuthView />;
    if (!user.teamId) return <OnboardingView user={user} />;

    return (
        <>
            <Toaster position="bottom-right" toastOptions={{ style: { background: '#333', color: '#fff', border: '1px solid #444' } }} />
            <Dashboard
                user={user}
                handleLogout={handleLogout}
                onUpdateUser={setUser}
                localProjects={projects}
                localFolders={folders}
                localTasks={tasks}
                localActivities={activities}
                activityDate={activityDate}
                setActivityDate={setActivityDate}
                inAppNotifications={inAppNotifications}
                clearNotifications={() => setInAppNotifications([])}
            />
        </>
    );
}