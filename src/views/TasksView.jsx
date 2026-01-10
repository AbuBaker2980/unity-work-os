import { useState, useEffect, useMemo, useRef } from "react";
import { collection, query, where, getDocs, serverTimestamp } from "firebase/firestore";
import {
    CheckSquare, Play, Image as ImageIcon, MoreVertical, CheckCircle,
    Loader, Trash2, AlertCircle, Users, X, LayoutTemplate, List, Plus, UploadCloud,
    Calendar as CalendarIcon // Added Icon
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

    // 🔥 NEW: Date Filter State (Defaults to Today)
    const [selectedDate, setSelectedDate] = useState(getTodayString());

    const [newTask, setNewTask] = useState({
        projectId: '', title: '', description: '', status: 'In Progress', date: getTodayString(), startTime: '', proofUrl: '', assignedTo: '',
        priority: 'Medium', type: 'Feature'
    });

    // --- PROOF UPLOAD STATE ---
    const [proofFile, setProofFile] = useState(null);
    const [proofPreview, setProofPreview] = useState(null);
    const fileInputRef = useRef(null);
    const dateInputRef = useRef(null); // Ref for custom date picker trigger

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeMenuId, setActiveMenuId] = useState(null);
    const [teamMembers, setTeamMembers] = useState([]);
    const [draggedTaskId, setDraggedTaskId] = useState(null);

    useEffect(() => {
        if (!user?.teamId) return;
        if (['TL', 'Team Lead', 'Manager'].includes(user.role)) {
            const fetchTeam = async () => { const q = query(collection(db, "users"), where("teamId", "==", user.teamId)); const snap = await getDocs(q); setTeamMembers(snap.docs.map(d => ({ id: d.id, ...d.data() }))); };
            fetchTeam();
        }
    }, [user]);

    useEffect(() => { const h = () => setActiveMenuId(null); document.addEventListener('click', h); return () => document.removeEventListener('click', h); }, []);

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

    // --- SUBMIT ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newTask.projectId) return toast.error("Select project");

        setIsSubmitting(true);
        const toastId = toast.loading("Creating Task...");

        try {
            let uploadedProofUrl = "";

            // 1. Upload Proof if selected
            if (proofFile) {
                uploadedProofUrl = await uploadToCloudinary(proofFile);
            }

            let aName = user.name || 'Self', aText = `${user.name} started task: "${newTask.title}"`, aType = 'TASK_STARTED';
            if (newTask.assignedTo && newTask.assignedTo !== user.uid) { const m = teamMembers.find(x => x.id === newTask.assignedTo); aName = m ? m.name : 'Member'; aText = `${user.name} assigned "${newTask.title}" to ${aName}`; aType = 'TASK_ASSIGNED'; }

            // Ensure task uses currently selected date if adding directly
            const taskDate = newTask.date || selectedDate;

            await onAddTask({
                ...newTask,
                date: taskDate,
                proofUrl: uploadedProofUrl,
                status: 'In Progress',
                startTime: serverTimestamp(),
                assignedBy: user.uid,
                assignedByName: user.name
            });

            await logActivity(aText, aType, { view: 'tasks' });

            setNewTask({ ...newTask, title: '', description: '', proofUrl: '', startTime: '', assignedTo: '', priority: 'Medium', type: 'Feature', date: getTodayString() });
            setProofFile(null);
            setProofPreview(null);
            setIsFormOpen(false);
            toast.success("Task Started!", { id: toastId });

        } catch (error) {
            console.error("Error adding task", error);
            toast.error("Failed to add task.", { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };

    const markCompleted = (task) => {
        onUpdateTask(task.id, { status: 'Completed', completionTime: serverTimestamp(), duration: getDuration(task.startTime, new Date()) });
        logActivity(`${user.name || 'User'} completed "${task.title}"`, 'TASK_COMPLETED', { view: 'tasks' });
        playSound('success');
    };

    const markInProgress = (task) => onUpdateTask(task.id, { status: 'In Progress' });

    const handleDelete = (id) => {
        const taskToDelete = tasks.find(t => t.id === id);
        if (taskToDelete) {
            logActivity(`${user.name} deleted task: "${taskToDelete.title}"`, 'TASK_DELETED', { view: 'tasks' });
        }
        onDeleteTask(id);
        playSound('delete');
    };

    const handleDragStart = (e, id) => { setDraggedTaskId(id); e.dataTransfer.effectAllowed = "move"; e.target.style.opacity = '0.5'; };
    const handleDragEnd = (e) => { e.target.style.opacity = '1'; setDraggedTaskId(null); };
    const handleDrop = (e, status) => { e.preventDefault(); if (!draggedTaskId) return; const t = tasks.find(x => x.id === draggedTaskId); if (t && t.status !== status) status === 'Completed' ? markCompleted(t) : markInProgress(t); };

    // 🔥 MODIFIED: Filter Tasks by Selected Date
    const filteredTasks = useMemo(() => {
        return tasks.filter(t => t.date === selectedDate);
    }, [tasks, selectedDate]);

    const tasksByDate = useMemo(() => { const g = {}; filteredTasks.forEach(t => { if (!g[t.date]) g[t.date] = []; g[t.date].push(t); }); return Object.entries(g).sort((a, b) => new Date(b[0]) - new Date(a[0])); }, [filteredTasks]);
    const kanbanTasks = useMemo(() => ({ todo: filteredTasks.filter(t => t.status === 'In Progress'), done: filteredTasks.filter(t => t.status === 'Completed') }), [filteredTasks]);

    const getPriorityColor = (p) => {
        if (p === 'High') return 'text-red-400 bg-red-500/10 border-red-500/20';
        if (p === 'Low') return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
    };
    const getTypeIcon = (t) => {
        if (t === 'Bug') return '🐞 Bug';
        if (t === 'Art') return '🎨 Art';
        return '🚀 Feat';
    };

    const TaskCard = ({ task, isKanban = false }) => {
        const proj = projects.find(p => p.id === task.projectId);
        const isCompleted = task.status === 'Completed';
        const assignee = teamMembers.find(m => m.id === task.assignedTo)?.name || (task.userId === user.uid ? 'You' : 'Member');
        const zIndexClass = activeMenuId === task.id ? "z-20" : "z-0";

        return (
            <div
                draggable={isKanban}
                onDragStart={(e) => isKanban && handleDragStart(e, task.id)}
                onDragEnd={isKanban ? handleDragEnd : undefined}
                className={`relative group bg-[#151518] border ${isCompleted ? 'border-green-500/20 opacity-75 hover:opacity-100' : 'border-white/10 hover:border-blue-500/30'} ${isKanban ? 'p-4 mb-3 cursor-grab active:cursor-grabbing hover:-translate-y-1 shadow-lg' : 'p-5 mb-0 hover:translate-x-1'} rounded-2xl transition-all duration-300 hover:shadow-xl ${zIndexClass}`}
            >
                <div className={`absolute left-0 top-4 bottom-4 w-1 rounded-r-full ${isCompleted ? 'bg-green-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'}`} />
                <div className="pl-4 flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="text-[9px] uppercase font-bold text-gray-500 bg-white/5 px-2 py-0.5 rounded truncate max-w-[100px]">{proj?.name}</span>
                            <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded border ${getPriorityColor(task.priority)}`}>{task.priority}</span>
                            <span className="text-[9px] text-gray-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded">{getTypeIcon(task.type)}</span>
                            {task.assignedTo && task.assignedTo !== task.assignedBy && <span className="text-[9px] text-purple-400 flex items-center gap-1 bg-purple-500/10 px-2 py-0.5 rounded"><Users size={10} /> {assignee}</span>}
                        </div>
                        <h4 className={`text-sm font-bold text-gray-200 truncate ${isCompleted ? 'line-through decoration-gray-600' : ''}`}>{task.title}</h4>
                        {!isKanban && <p className="text-xs text-gray-500 mt-1 max-w-2xl line-clamp-2">{task.description || 'No description provided.'}</p>}
                        <div className="mt-3 flex items-center gap-3 text-xs flex-wrap">
                            {!isCompleted && <span className="flex items-center gap-1.5 text-amber-400 bg-amber-500/10 px-2 py-1 rounded"><Loader size={12} className="animate-spin-slow" /> {isKanban ? 'Active' : 'In Progress'}</span>}
                            {isCompleted && <span className="flex items-center gap-1.5 text-green-400 bg-green-500/10 px-2 py-1 rounded"><CheckCircle size={12} /> {task.duration || 'Done'}</span>}
                            {task.proofUrl && <button onClick={() => window.open(task.proofUrl, '_blank')} className="text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20"><ImageIcon size={12} /> View Proof</button>}
                        </div>
                    </div>
                    <div className="relative ml-2">
                        <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === task.id ? null : task.id); }} className="p-1.5 text-gray-500 hover:text-white rounded-lg hover:bg-white/10 transition-colors"><MoreVertical size={16} /></button>
                        {activeMenuId === task.id && (
                            <div className="absolute right-0 top-8 bg-[#1e1e1e] border border-white/10 shadow-2xl rounded-xl z-50 w-40 overflow-hidden py-1 backdrop-blur-xl animate-fade-in">
                                <button onClick={(e) => { e.stopPropagation(); markCompleted(task); setActiveMenuId(null); }} className="w-full px-4 py-2.5 text-left text-xs text-gray-300 hover:bg-green-500/20 hover:text-green-400 flex items-center gap-2"><CheckCircle size={14} /> Complete</button>
                                <button onClick={(e) => { e.stopPropagation(); markInProgress(task); setActiveMenuId(null); }} className="w-full px-4 py-2.5 text-left text-xs text-gray-300 hover:bg-amber-500/20 hover:text-amber-400 flex items-center gap-2"><Loader size={14} /> In Progress</button>
                                <div className="h-px bg-white/10 my-1"></div>
                                <button onClick={(e) => { e.stopPropagation(); handleDelete(task.id); setActiveMenuId(null); }} className="w-full px-4 py-2.5 text-left text-xs text-red-400 hover:bg-red-500/20 flex items-center gap-2"><Trash2 size={14} /> Delete</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col relative">
            <div className="p-6 flex justify-between items-center mb-2">
                <div>
                    {/* 🔥 MODIFIED: Header shows selected date */}
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <CheckSquare className="text-blue-500" size={28} />
                        {selectedDate === getTodayString() ? "Today's Log" : "Daily Log"}
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">
                        Viewing tasks for: <span className="text-blue-400 font-bold">{formatDate(selectedDate)}</span>
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* 🔥 NEW: Date Picker Button */}
                    <div className="relative">
                        <button
                            onClick={() => dateInputRef.current?.showPicker()}
                            className="bg-[#151518] border border-white/10 hover:border-blue-500/50 text-gray-400 hover:text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all"
                        >
                            <CalendarIcon size={16} />
                            {selectedDate === getTodayString() ? "Today" : selectedDate}
                        </button>
                        <input
                            type="date"
                            ref={dateInputRef}
                            value={selectedDate}
                            onChange={(e) => {
                                setSelectedDate(e.target.value);
                                setNewTask(prev => ({ ...prev, date: e.target.value })); // Also update form default
                            }}
                            className="absolute inset-0 opacity-0 cursor-pointer w-0 h-0"
                        />
                    </div>

                    <div className="flex bg-[#151518] p-1 rounded-lg border border-white/10"><button onClick={() => setViewMode('list')} className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}><List size={16} /></button><button onClick={() => setViewMode('board')} className={`p-2 rounded-md transition-all ${viewMode === 'board' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}><LayoutTemplate size={16} /></button></div>
                    <button onClick={() => setIsFormOpen(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 text-sm font-bold flex items-center gap-2 rounded-xl shadow-lg shadow-blue-900/20 transition-all hover:scale-105"><Play size={16} fill="currentColor" /> Add Task</button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 pb-20 custom-scrollbar">

                {/* 🔥 MODIFIED: List View Logic */}
                {viewMode === 'list' && (
                    <div className="animate-fade-in">
                        {tasksByDate.length === 0 ? (
                            <div className="flex flex-col items-center justify-center mt-20 text-gray-600">
                                <CheckSquare size={48} className="mb-4 opacity-50" />
                                <p>No tasks found for {formatDate(selectedDate)}</p>
                            </div>
                        ) : (
                            tasksByDate.map(([date, dateTasks]) => (
                                <div key={date} className="mb-10 animate-slide-up">
                                    <div className="flex items-center gap-4 mb-4">
                                        <span className={`text-xs font-bold px-3 py-1 rounded-full border ${date === getTodayString() ? 'bg-blue-500/10 border-blue-500/50 text-blue-400' : 'bg-white/5 border-white/10 text-gray-500'}`}>{formatDate(date)}</span>
                                        <div className="h-px bg-white/10 flex-1"></div>
                                    </div>
                                    <div className="space-y-3">{dateTasks.map(task => <TaskCard key={task.id} task={task} />)}</div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* 🔥 MODIFIED: Board View Logic */}
                {viewMode === 'board' && (
                    <div className="flex gap-6 h-full pb-4">
                        <div className="flex-1 bg-[#151518]/50 border border-white/5 rounded-2xl p-4 flex flex-col" onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, 'In Progress')}>
                            <div className="flex items-center justify-between mb-4 px-2">
                                <h3 className="font-bold text-amber-400 flex items-center gap-2"><Loader size={18} className="animate-spin-slow" /> In Progress</h3>
                                <span className="bg-amber-500/10 text-amber-400 text-xs px-2 py-0.5 rounded-full font-mono">{kanbanTasks.todo.length}</span>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                                {kanbanTasks.todo.length === 0 && (
                                    <div className="flex flex-col items-center justify-center mt-10 border-2 border-dashed border-white/5 p-8 rounded-xl text-center group hover:border-blue-500/30 transition-colors">
                                        <p className="text-gray-600 text-xs mb-4">No active tasks for this date</p>
                                        <button onClick={() => setIsFormOpen(true)} className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-bold px-4 py-2 rounded-lg transition-all flex items-center gap-2 hover:scale-105"><Plus size={14} /> Add New Task</button>
                                    </div>
                                )}
                                {kanbanTasks.todo.map(task => <TaskCard key={task.id} task={task} isKanban={true} />)}
                            </div>
                        </div>
                        <div className="flex-1 bg-[#151518]/50 border border-white/5 rounded-2xl p-4 flex flex-col" onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, 'Completed')}><div className="flex items-center justify-between mb-4 px-2"><h3 className="font-bold text-green-400 flex items-center gap-2"><CheckCircle size={18} /> Completed</h3><span className="bg-green-500/10 text-green-400 text-xs px-2 py-0.5 rounded-full font-mono">{kanbanTasks.done.length}</span></div><div className="flex-1 overflow-y-auto custom-scrollbar pr-1">{kanbanTasks.done.length === 0 && <div className="text-center text-gray-600 text-xs mt-10 border-2 border-dashed border-white/5 p-4 rounded-xl">Nothing done yet</div>}{kanbanTasks.done.map(task => <TaskCard key={task.id} task={task} isKanban={true} />)}</div></div>
                    </div>
                )}
            </div>
            {isFormOpen && (<><div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity" onClick={() => setIsFormOpen(false)} /><div className="absolute right-0 top-0 h-full w-96 bg-[#151518] border-l border-white/10 z-50 shadow-2xl p-6 overflow-y-auto animate-slide-left"><div className="flex justify-between items-center mb-8"><h3 className="text-lg font-bold text-white">New Task Entry</h3><button onClick={() => setIsFormOpen(false)} className="text-gray-500 hover:text-white"><X size={20} /></button></div><form onSubmit={handleSubmit} className="space-y-6"><div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl text-xs text-blue-200 flex gap-3"><AlertCircle size={16} className="flex-shrink-0 mt-0.5 text-blue-400" /><p>Task starts as "In Progress".</p></div>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs text-gray-500 mb-2 font-bold uppercase">Priority</label><select value={newTask.priority} onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 p-3 rounded-xl text-sm text-gray-200 outline-none"><option>High</option><option>Medium</option><option>Low</option></select></div>
                    <div><label className="block text-xs text-gray-500 mb-2 font-bold uppercase">Type</label><select value={newTask.type} onChange={(e) => setNewTask({ ...newTask, type: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 p-3 rounded-xl text-sm text-gray-200 outline-none"><option>Feature</option><option>Bug</option><option>Art</option></select></div>
                </div>
                {teamMembers.length > 0 && (<div><label className="block text-xs text-gray-500 mb-2 font-bold uppercase">Assign To</label><select value={newTask.assignedTo} onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 p-3 rounded-xl text-sm text-gray-200 outline-none"><option value="">-- Myself --</option>{teamMembers.filter(m => m.id !== user.uid).map(m => <option key={m.id} value={m.id}>{m.name || m.email}</option>)}</select></div>)}<div><label className="block text-xs text-gray-500 mb-2 font-bold uppercase">Date</label><input type="date" value={newTask.date} onChange={(e) => setNewTask({ ...newTask, date: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 p-3 rounded-xl text-sm text-gray-200 outline-none" /></div><div><label className="block text-xs text-gray-500 mb-2 font-bold uppercase">Project</label><select value={newTask.projectId} onChange={(e) => setNewTask({ ...newTask, projectId: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 p-3 rounded-xl text-sm text-gray-200 outline-none" required><option value="">Select Project...</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div><div><label className="block text-xs text-gray-500 mb-2 font-bold uppercase">Task Title</label><input type="text" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 p-3 rounded-xl text-sm text-gray-200 outline-none" placeholder="e.g. Bug Fix" required /></div><div><label className="block text-xs text-gray-500 mb-2 font-bold uppercase">Description</label><textarea rows={3} value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 p-3 rounded-xl text-sm text-gray-200 outline-none" placeholder="Details..." /></div>

                {/* --- PROOF UPLOAD (UPDATED) --- */}
                <div>
                    <label className="block text-xs text-gray-500 mb-2 font-bold uppercase">Proof (Optional)</label>
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center overflow-hidden h-32
                            ${proofPreview ? 'border-blue-500 bg-blue-900/10' : 'border-white/10 bg-[#0a0a0a] hover:border-blue-500/50'}
                        `}
                    >
                        <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />

                        {proofPreview ? (
                            <div className="relative w-full h-full flex items-center justify-center group">
                                <img src={proofPreview} alt="Preview" className="max-h-full object-contain" />
                                <button
                                    onClick={clearProof}
                                    className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ) : (
                            <>
                                <UploadCloud className="mx-auto mb-2 text-gray-500" />
                                <span className="text-xs text-gray-500">Click to upload Screenshot</span>
                            </>
                        )}
                    </div>
                </div>

                <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-900/20 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {isSubmitting ? <><Loader size={18} className="animate-spin" /> UPLOADING...</> : "START TASK"}
                </button>
            </form></div></>)}
        </div>
    );
};

export default TasksView;