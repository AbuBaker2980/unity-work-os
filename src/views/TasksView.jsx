import { useState, useEffect, useMemo, useRef } from "react";
import { collection, query, where, getDocs, serverTimestamp } from "firebase/firestore";
import {
    CheckSquare, Play, Image as ImageIcon, MoreVertical, CheckCircle,
    Loader, Trash2, AlertCircle, Users, X, LayoutTemplate, List, Plus, UploadCloud,
    Calendar as CalendarIcon, Eye, ShieldCheck, Bug, XCircle, RotateCcw, Lock,
    TrendingUp
} from "lucide-react";
import { db } from "../firebase/config";
import { formatDate, getDuration, getTodayString } from "../utils/dateUtils";
import { playSound } from "../utils/soundUtils";
import toast from 'react-hot-toast';

// --- CLOUDINARY CONFIG ---
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

const TasksView = ({ projects, tasks, onAddTask, onUpdateTask, onDeleteTask, logActivity, user }) => {
    const [viewMode, setViewMode] = useState('board');
    const [selectedDate, setSelectedDate] = useState(getTodayString());

    // 🔥 NEW: Extended Task State
    const [newTask, setNewTask] = useState({
        projectId: '', title: '', description: '', status: 'In Progress', date: getTodayString(), startTime: '', proofUrl: '', assignedTo: '',
        priority: 'Medium', type: 'Feature'
    });

    const [proofFile, setProofFile] = useState(null);
    const [proofPreview, setProofPreview] = useState(null);
    const fileInputRef = useRef(null);
    const dateInputRef = useRef(null);

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeMenuId, setActiveMenuId] = useState(null);
    const [teamMembers, setTeamMembers] = useState([]);
    const [draggedTaskId, setDraggedTaskId] = useState(null);

    // --- ROLE HELPERS ---
    const isQA = user.role === 'QA';
    const isLead = ['TL', 'Team Lead', 'Manager'].includes(user.role);

    // 🔒 Permission to Assign Tasks to Others
    const canAssignOthers = isLead || isQA;

    useEffect(() => {
        if (!user?.teamId) return;
        const fetchTeam = async () => { const q = query(collection(db, "users"), where("teamId", "==", user.teamId)); const snap = await getDocs(q); setTeamMembers(snap.docs.map(d => ({ id: d.id, ...d.data() }))); };
        fetchTeam();
    }, [user]);

    useEffect(() => { const h = () => setActiveMenuId(null); document.addEventListener('click', h); return () => document.removeEventListener('click', h); }, []);

    // --- 🔒 PERMISSION CHECKER ---
    const checkPermission = (task, action) => {
        const isOwner = task.assignedTo === user.uid;
        const isCreator = task.assignedBy === user.uid;
        const isAuthority = ['TL', 'Team Lead', 'Manager', 'QA'].includes(user.role);

        if (action === 'request_review') return isOwner || isCreator || isAuthority;
        if (action === 'review') return isOwner || isAuthority;
        if (action === 'testing') return isOwner || isAuthority;
        if (action === 'delete') return isCreator || isAuthority;
        return false;
    };

    // --- FILE HANDLERS ---
    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) return toast.error("File too large (Max 10MB)");
            setProofFile(file);
            setProofPreview(URL.createObjectURL(file));
        }
    };

    const clearProof = (e) => {
        e.stopPropagation();
        setProofFile(null);
        setProofPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const uploadToCloudinary = async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", UPLOAD_PRESET);
        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: formData });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        return data.secure_url;
    };

    // --- WORKFLOW ACTIONS ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newTask.projectId) return toast.error("Select project");

        setIsSubmitting(true);
        const toastId = toast.loading("Creating Task...");
        try {
            let uploadedProofUrl = "";
            if (proofFile) uploadedProofUrl = await uploadToCloudinary(proofFile);

            let aText = `${user.name} created ${newTask.type}: "${newTask.title}"`;
            let aType = 'TASK_CREATED';

            if (newTask.type === 'Bug') { aText = `${user.name} reported BUG: "${newTask.title}"`; aType = 'BUG_REPORTED'; }
            if (newTask.type === 'ASO') { aText = `${user.name} started ASO Task: "${newTask.title}"`; aType = 'ASO_UPDATE'; }
            if (newTask.priority === 'Critical') { aText = `🚨 CRITICAL BUG: "${newTask.title}" reported by ${user.name}`; aType = 'CRITICAL_BUG'; }

            const taskDate = newTask.date || selectedDate;

            await onAddTask({
                ...newTask,
                date: taskDate,
                proofUrl: uploadedProofUrl,
                status: 'In Progress',
                startTime: serverTimestamp(),
                assignedBy: user.uid,
                assignedByName: user.name,
                history: [{ status: 'Created', by: user.name, time: new Date().toISOString() }]
            });
            await logActivity(aText, aType, { view: 'tasks' });

            setNewTask({ ...newTask, title: '', description: '', proofUrl: '', startTime: '', assignedTo: '', priority: 'Medium', type: 'Feature', date: getTodayString() });
            setProofFile(null);
            setProofPreview(null);
            setIsFormOpen(false);
            toast.success("Task Created!", { id: toastId });

        } catch (error) {
            console.error("Error adding task", error);
            toast.error("Failed to add task.", { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- STATUS TRANSITIONS ---
    const updateStatus = (task, newStatus, activityMsg, activityType) => {
        onUpdateTask(task.id, {
            status: newStatus,
            completionTime: newStatus === 'Completed' ? serverTimestamp() : null,
            duration: newStatus === 'Completed' ? getDuration(task.startTime, new Date()) : null
        });
        logActivity(activityMsg, activityType, { view: 'tasks' });
        playSound('notification');
    };

    const handleRequestReview = (task) => updateStatus(task, 'In Review', `${user.name} requested review for "${task.title}"`, 'CODE_REVIEW');
    const handleApprove = (task) => updateStatus(task, 'Testing', `${user.name} approved "${task.title}". Moved to QA.`, 'REVIEW_APPROVED');
    const handleReject = (task) => updateStatus(task, 'In Progress', `${user.name} requested changes on "${task.title}"`, 'FEEDBACK_GIVEN');
    const handlePassTest = (task) => {
        updateStatus(task, 'Completed', `✅ QA ${user.name} Verified "${task.title}"`, 'QA_VERIFIED');
        playSound('success');
    };
    const handleFailTest = (task) => updateStatus(task, 'In Progress', `❌ QA ${user.name} Rejected "${task.title}"`, 'BUG_FOUND');

    const handleDelete = (id) => {
        const taskToDelete = tasks.find(t => t.id === id);
        if (taskToDelete) logActivity(`${user.name} deleted task: "${taskToDelete.title}"`, 'TASK_DELETED', { view: 'tasks' });
        onDeleteTask(id);
        playSound('delete');
    };

    // --- DRAG & DROP ---
    const handleDragStart = (e, id) => { setDraggedTaskId(id); e.dataTransfer.effectAllowed = "move"; e.target.style.opacity = '0.5'; };
    const handleDragEnd = (e) => { e.target.style.opacity = '1'; setDraggedTaskId(null); };
    const handleDrop = (e, status) => {
        e.preventDefault();
        if (!draggedTaskId) return;
        const t = tasks.find(x => x.id === draggedTaskId);
        if (t && t.status !== status && checkPermission(t, 'request_review')) {
            onUpdateTask(t.id, { status });
        } else {
            toast.error("Please use action buttons for this transition.");
        }
    };

    const filteredTasks = useMemo(() => tasks.filter(t => t.date === selectedDate), [tasks, selectedDate]);
    const tasksByDate = useMemo(() => { const g = {}; filteredTasks.forEach(t => { if (!g[t.date]) g[t.date] = []; g[t.date].push(t); }); return Object.entries(g).sort((a, b) => new Date(b[0]) - new Date(a[0])); }, [filteredTasks]);

    const kanbanTasks = useMemo(() => ({
        todo: filteredTasks.filter(t => t.status === 'In Progress'),
        review: filteredTasks.filter(t => t.status === 'In Review'),
        testing: filteredTasks.filter(t => t.status === 'Testing'),
        done: filteredTasks.filter(t => t.status === 'Completed')
    }), [filteredTasks]);

    const getPriorityColor = (p) => {
        if (p === 'Critical') return 'text-red-500 bg-red-500/20 border-red-500/40 animate-pulse';
        if (p === 'High') return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
        if (p === 'Low') return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
    };

    const getTypeIcon = (t) => {
        if (t === 'Bug') return '🐞 Bug';
        if (t === 'Art') return '🎨 Art';
        if (t === 'ASO') return '📈 ASO';
        if (t === 'Testing') return '🧪 Test';
        return '🚀 Feat';
    };

    const TaskCard = ({ task, isKanban = false }) => {
        const proj = projects.find(p => p.id === task.projectId);
        const isCompleted = task.status === 'Completed';
        const assignee = teamMembers.find(m => m.id === task.assignedTo)?.name || (task.assignedTo === user.uid ? 'You' : 'Member');
        const zIndexClass = activeMenuId === task.id ? "z-20" : "z-0";

        return (
            <div
                draggable={isKanban}
                onDragStart={(e) => isKanban && handleDragStart(e, task.id)}
                onDragEnd={isKanban ? handleDragEnd : undefined}
                className={`relative group bg-[#151518] border ${isCompleted ? 'border-green-500/20 opacity-75' : 'border-white/10 hover:border-blue-500/30'} ${isKanban ? 'p-3 mb-3 cursor-grab active:cursor-grabbing hover:-translate-y-1 shadow-lg' : 'p-5 mb-0 hover:translate-x-1'} rounded-2xl transition-all duration-300 hover:shadow-xl ${zIndexClass}`}
            >
                <div className={`absolute left-0 top-4 bottom-4 w-1 rounded-r-full ${isCompleted ? 'bg-green-500' : task.priority === 'Critical' ? 'bg-red-500' : 'bg-blue-500'}`} />

                <div className="pl-3">
                    <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                            {/* Badges */}
                            <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                                <span className="text-[9px] font-bold text-gray-500 bg-white/5 px-2 py-0.5 rounded truncate max-w-[80px]">{proj?.name}</span>
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${getPriorityColor(task.priority)}`}>{task.priority}</span>
                                <span className="text-[9px] text-gray-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded">{getTypeIcon(task.type)}</span>
                            </div>

                            <h4 className={`text-sm font-bold text-gray-200 leading-tight ${isCompleted ? 'line-through decoration-gray-600' : ''}`}>{task.title}</h4>

                            {!isKanban && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</p>}

                            {/* Actions Bar */}
                            <div className="mt-3 flex items-center gap-2 flex-wrap">
                                {task.status === 'In Progress' && checkPermission(task, 'request_review') && (
                                    <button onClick={() => handleRequestReview(task)} className="text-[10px] bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white px-2 py-1 rounded flex items-center gap-1 transition-colors">
                                        <Eye size={12} /> Request Review
                                    </button>
                                )}

                                {task.status === 'In Review' && checkPermission(task, 'review') && (
                                    <>
                                        <button onClick={() => handleApprove(task)} className="text-[10px] bg-green-600/20 text-green-400 hover:bg-green-600 hover:text-white px-2 py-1 rounded flex items-center gap-1 transition-colors"><CheckCircle size={12} /> Approve</button>
                                        <button onClick={() => handleReject(task)} className="text-[10px] bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white px-2 py-1 rounded flex items-center gap-1 transition-colors"><RotateCcw size={12} /> Reject</button>
                                    </>
                                )}

                                {task.status === 'Testing' && checkPermission(task, 'testing') && (
                                    <>
                                        <button onClick={() => handlePassTest(task)} className="text-[10px] bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white px-2 py-1 rounded flex items-center gap-1 transition-colors"><ShieldCheck size={12} /> Verify</button>
                                        <button onClick={() => handleFailTest(task)} className="text-[10px] bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white px-2 py-1 rounded flex items-center gap-1 transition-colors"><Bug size={12} /> Fail</button>
                                    </>
                                )}

                                {task.proofUrl && <button onClick={() => window.open(task.proofUrl, '_blank')} className="text-[10px] text-gray-400 hover:text-white bg-white/5 px-2 py-1 rounded border border-white/10 flex items-center gap-1"><ImageIcon size={10} /> Proof</button>}
                            </div>
                        </div>

                        {/* Menu */}
                        <div className="relative">
                            <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === task.id ? null : task.id); }} className="p-1 text-gray-600 hover:text-white"><MoreVertical size={14} /></button>
                            {activeMenuId === task.id && (
                                <div className="absolute right-0 top-6 bg-[#1e1e1e] border border-white/10 shadow-2xl rounded-lg z-50 w-32 overflow-hidden py-1 backdrop-blur-xl">
                                    {checkPermission(task, 'delete') ? (
                                        <button onClick={() => handleDelete(task.id)} className="w-full px-3 py-2 text-left text-[10px] text-red-400 hover:bg-red-500/20 flex items-center gap-2"><Trash2 size={12} /> Delete</button>
                                    ) : (
                                        <div className="w-full px-3 py-2 text-left text-[10px] text-gray-500 flex items-center gap-2 cursor-not-allowed"><Lock size={12} /> Locked</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    {task.assignedTo && (
                        <div className="mt-2 pt-2 border-t border-white/5 flex justify-between items-center">
                            <span className="text-[9px] text-gray-500 font-mono">Assigned to:</span>
                            <span className="text-[9px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">{assignee}</span>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col relative">
            <div className="p-6 flex justify-between items-center mb-2 shrink-0">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <CheckSquare className="text-blue-500" size={28} />
                        {selectedDate === getTodayString() ? "Today's Log" : "Daily Log"}
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">Viewing tasks for: <span className="text-blue-400 font-bold">{formatDate(selectedDate)}</span></p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <button onClick={() => dateInputRef.current?.showPicker()} className="bg-[#151518] border border-white/10 hover:border-blue-500/50 text-gray-400 hover:text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all">
                            <CalendarIcon size={16} /> {selectedDate === getTodayString() ? "Today" : selectedDate}
                        </button>
                        <input type="date" ref={dateInputRef} value={selectedDate} onChange={(e) => { setSelectedDate(e.target.value); setNewTask(prev => ({ ...prev, date: e.target.value })); }} className="absolute inset-0 opacity-0 cursor-pointer w-0 h-0" />
                    </div>
                    <div className="flex bg-[#151518] p-1 rounded-lg border border-white/10">
                        <button onClick={() => setViewMode('list')} className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}><List size={16} /></button>
                        <button onClick={() => setViewMode('board')} className={`p-2 rounded-md transition-all ${viewMode === 'board' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}><LayoutTemplate size={16} /></button>
                    </div>
                    <button onClick={() => setIsFormOpen(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 text-sm font-bold flex items-center gap-2 rounded-xl shadow-lg hover:scale-105 transition-all"><Plus size={16} /> Add Task</button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-20 custom-scrollbar">
                {viewMode === 'list' && (
                    <div className="animate-fade-in space-y-4">
                        {tasksByDate.map(([date, dateTasks]) => (
                            <div key={date} className="mb-8">
                                <div className="flex items-center gap-4 mb-4"><span className={`text-xs font-bold px-3 py-1 rounded-full border ${date === getTodayString() ? 'bg-blue-500/10 border-blue-500/50 text-blue-400' : 'bg-white/5 border-white/10 text-gray-500'}`}>{formatDate(date)}</span><div className="h-px bg-white/10 flex-1"></div></div>
                                <div className="space-y-3">{dateTasks.map(task => <TaskCard key={task.id} task={task} />)}</div>
                            </div>
                        ))}
                        {tasksByDate.length === 0 && <div className="text-center text-gray-600 mt-20">No tasks.</div>}
                    </div>
                )}

                {/* MODIFIED KANBAN BOARD */}
                {viewMode === 'board' && (
                    <div className="flex gap-4 h-full pb-4 min-w-[1000px]">
                        {/* 1. IN PROGRESS */}
                        <div className="flex-1 bg-[#151518]/50 border border-white/5 rounded-2xl p-3 flex flex-col" onDragOver={e => e.preventDefault()} onDrop={e => handleDrop(e, 'In Progress')}>
                            <div className="flex justify-between mb-3 px-1"><h3 className="font-bold text-amber-400 text-sm flex gap-2"><Loader size={16} /> In Progress</h3><span className="bg-amber-500/10 text-amber-400 text-[10px] px-2 rounded-full">{kanbanTasks.todo.length}</span></div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">{kanbanTasks.todo.map(t => <TaskCard key={t.id} task={t} isKanban />)}</div>
                        </div>

                        {/* 2. IN REVIEW */}
                        <div className="flex-1 bg-[#151518]/50 border border-white/5 rounded-2xl p-3 flex flex-col" onDragOver={e => e.preventDefault()} onDrop={e => handleDrop(e, 'In Review')}>
                            <div className="flex justify-between mb-3 px-1"><h3 className="font-bold text-blue-400 text-sm flex gap-2"><Eye size={16} /> Code Review</h3><span className="bg-blue-500/10 text-blue-400 text-[10px] px-2 rounded-full">{kanbanTasks.review.length}</span></div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 bg-blue-900/5 rounded-xl p-1">{kanbanTasks.review.map(t => <TaskCard key={t.id} task={t} isKanban />)}</div>
                        </div>

                        {/* 3. TESTING */}
                        <div className="flex-1 bg-[#151518]/50 border border-white/5 rounded-2xl p-3 flex flex-col" onDragOver={e => e.preventDefault()} onDrop={e => handleDrop(e, 'Testing')}>
                            <div className="flex justify-between mb-3 px-1"><h3 className="font-bold text-purple-400 text-sm flex gap-2"><Bug size={16} /> QA Testing</h3><span className="bg-purple-500/10 text-purple-400 text-[10px] px-2 rounded-full">{kanbanTasks.testing.length}</span></div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 bg-purple-900/5 rounded-xl p-1">{kanbanTasks.testing.map(t => <TaskCard key={t.id} task={t} isKanban />)}</div>
                        </div>

                        {/* 4. COMPLETED */}
                        <div className="flex-1 bg-[#151518]/50 border border-white/5 rounded-2xl p-3 flex flex-col" onDragOver={e => e.preventDefault()} onDrop={e => handleDrop(e, 'Completed')}>
                            <div className="flex justify-between mb-3 px-1"><h3 className="font-bold text-green-400 text-sm flex gap-2"><CheckCircle size={16} /> Done</h3><span className="bg-green-500/10 text-green-400 text-[10px] px-2 rounded-full">{kanbanTasks.done.length}</span></div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">{kanbanTasks.done.map(t => <TaskCard key={t.id} task={t} isKanban />)}</div>
                        </div>
                    </div>
                )}
            </div>

            {/* CREATE MODAL */}
            {isFormOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-end">
                    <div className="h-full w-[400px] bg-[#151518] border-l border-white/10 shadow-2xl p-6 overflow-y-auto animate-slide-left">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">Create New Task</h3>
                            <button onClick={() => setIsFormOpen(false)} className="text-gray-500 hover:text-white"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-[10px] font-bold text-gray-500 uppercase">Priority</label><select value={newTask.priority} onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 p-2.5 rounded-xl text-sm text-white outline-none mt-1"><option>Medium</option><option>High</option><option>Low</option><option>Critical</option></select></div>
                                <div><label className="text-[10px] font-bold text-gray-500 uppercase">Type</label><select value={newTask.type} onChange={(e) => setNewTask({ ...newTask, type: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 p-2.5 rounded-xl text-sm text-white outline-none mt-1"><option>Feature</option><option>Bug</option><option>Art</option><option>Testing</option><option>ASO</option></select></div>
                            </div>

                            {/* Project Select */}
                            <div><label className="text-[10px] font-bold text-gray-500 uppercase">Project</label><select value={newTask.projectId} onChange={(e) => setNewTask({ ...newTask, projectId: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 p-2.5 rounded-xl text-sm text-white outline-none mt-1" required><option value="">Select Project...</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>

                            {/* Title & Desc */}
                            <div><label className="text-[10px] font-bold text-gray-500 uppercase">Title</label><input type="text" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 p-3 rounded-xl text-sm text-white outline-none mt-1" placeholder="Task title..." required /></div>
                            <div><label className="text-[10px] font-bold text-gray-500 uppercase">Details</label><textarea rows={3} value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 p-3 rounded-xl text-sm text-white outline-none mt-1" placeholder="Description..." /></div>

                            {/* Assignee - RESTRICTED 🔒 */}
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Assign To</label>
                                <select
                                    value={newTask.assignedTo}
                                    onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
                                    className="w-full bg-[#0a0a0a] border border-white/10 p-2.5 rounded-xl text-sm text-white outline-none mt-1"
                                >
                                    <option value="">-- Assign to Myself --</option>
                                    {/* Only Leads and QA can see other members */}
                                    {canAssignOthers && teamMembers.filter(m => m.id !== user.uid).map(m => (
                                        <option key={m.id} value={m.id}>
                                            {m.name || m.email} ({m.role})
                                        </option>
                                    ))}
                                </select>
                                {!canAssignOthers && <p className="text-[9px] text-gray-600 mt-1 italic">*Only Leads & QA can assign tasks to others.</p>}
                            </div>

                            {/* Proof Upload */}
                            <div onClick={() => fileInputRef.current?.click()} className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center h-28 ${proofPreview ? 'border-blue-500 bg-blue-900/10' : 'border-white/10 bg-[#0a0a0a] hover:border-blue-500/50'}`}>
                                <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
                                {proofPreview ? (
                                    <div className="relative w-full h-full flex items-center justify-center group"><img src={proofPreview} alt="Preview" className="max-h-full object-contain" /><button onClick={clearProof} className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded shadow opacity-0 group-hover:opacity-100"><X size={12} /></button></div>
                                ) : (
                                    <><UploadCloud className="text-gray-500 mb-1" /><span className="text-[10px] text-gray-500">Upload Screenshot (Opt)</span></>
                                )}
                            </div>

                            <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                                {isSubmitting ? <Loader size={18} className="animate-spin" /> : "CREATE TASK"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TasksView;