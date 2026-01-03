import React, { useState, useEffect, useMemo } from 'react';
import {
    PieChart, List, CheckCircle, Clock, BarChart2, FileCode,
    Smartphone, Loader, Mail, Copy, Zap
} from 'lucide-react';
import { getTodayString } from "../utils/dateUtils";

const ReportsView = ({ tasks, projects }) => {
    // Initialize with today's date string directly
    const [selectedDate, setSelectedDate] = useState(getTodayString());
    const [reportText, setReportText] = useState('');
    const [activeView, setActiveView] = useState('visual'); // 'visual' or 'text'
    const [copied, setCopied] = useState(false);

    // Helper to safely parse date string without timezone shift
    // This is useful if you ever need to create a Date object from the input string
    const parseDate = (dateString) => {
        if (!dateString) return new Date();
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day);
    };

    const stats = useMemo(() => {
        // Ensure accurate comparison by using the date string directly
        const dayTasks = tasks.filter(t => t.date === selectedDate);
        return {
            total: dayTasks.length,
            completed: dayTasks.filter(t => t.status === 'Completed').length,
            pending: dayTasks.filter(t => t.status !== 'Completed').length,
            tasks: dayTasks
        };
    }, [selectedDate, tasks]);

    useEffect(() => {
        generateReport();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDate, tasks, projects]);

    const generateReport = () => {
        const grouped = {};
        stats.tasks.forEach(t => {
            if (!grouped[t.projectId]) grouped[t.projectId] = [];
            grouped[t.projectId].push(t);
        });

        // Use parsing helper for display date to avoid timezone issues
        const displayDate = parseDate(selectedDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        let text = `📅 *Daily Report: ${displayDate}*\n`;
        text += `📊 Total: ${stats.total} | ✅ Done: ${stats.completed} | ⏳ Pending: ${stats.pending}\n\n`;

        if (Object.keys(grouped).length === 0) {
            text += "_No tasks logged._";
        } else {
            Object.keys(grouped).forEach(projId => {
                const projName = projects.find(p => p.id === projId)?.name || 'Unknown Project';
                text += `📱 *${projName}*\n`;
                grouped[projId].forEach(t => {
                    const statusIcon = t.status === 'Completed' ? '✅' : '⏳';
                    text += `${statusIcon} ${t.title}`;
                    if (t.status === 'Completed' && t.duration) text += ` (${t.duration})`;
                    if (t.description) text += `\n   - ${t.description}`;
                    text += `\n`;
                });
                text += `\n`;
            });
        }
        setReportText(text);
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(reportText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="p-8 h-full overflow-y-auto custom-scrollbar">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3 tracking-tight">
                            <PieChart className="text-blue-500 fill-blue-500/20" size={32} />
                            Daily Reporting
                        </h1>
                        <p className="text-gray-500 mt-2">Generate and share summaries for stakeholders.</p>
                    </div>
                    <div className="bg-[#1e1e1e]/60 backdrop-blur-md p-1.5 rounded-xl flex items-center border border-white/10 shadow-lg">
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-transparent text-gray-200 text-sm px-4 py-1.5 outline-none font-mono tracking-wide"
                        />
                    </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    <div className="bg-gradient-to-br from-[#1e1e1e] to-black/50 p-6 rounded-2xl border border-white/5 shadow-xl relative overflow-hidden group hover:border-white/10 transition-all duration-300">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><List size={80} /></div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Total Tasks</p>
                        <h3 className="text-5xl font-sans font-bold text-white mt-2">{stats.total}</h3>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-900/20 to-black/50 p-6 rounded-2xl border border-emerald-500/20 shadow-xl relative overflow-hidden group hover:border-emerald-500/30 transition-all duration-300">
                        <div className="absolute top-0 right-0 p-4 opacity-10 text-emerald-500 group-hover:scale-110 transition-transform"><CheckCircle size={80} /></div>
                        <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1">Completed</p>
                        <h3 className="text-5xl font-sans font-bold text-white mt-2">{stats.completed}</h3>
                    </div>
                    <div className="bg-gradient-to-br from-amber-900/20 to-black/50 p-6 rounded-2xl border border-amber-500/20 shadow-xl relative overflow-hidden group hover:border-amber-500/30 transition-all duration-300">
                        <div className="absolute top-0 right-0 p-4 opacity-10 text-amber-500 group-hover:rotate-12 transition-transform"><Clock size={80} /></div>
                        <p className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-1">In Progress</p>
                        <h3 className="text-5xl font-sans font-bold text-white mt-2">{stats.pending}</h3>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="bg-[#151518]/60 backdrop-blur-xl border border-white/5 rounded-2xl shadow-2xl overflow-hidden">
                    {/* Tabs */}
                    <div className="flex border-b border-white/5 bg-black/20">
                        <button onClick={() => setActiveView('visual')} className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-all relative ${activeView === 'visual' ? 'text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}>
                            <BarChart2 size={16} /> Visual Summary
                            {activeView === 'visual' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />}
                        </button>
                        <button onClick={() => setActiveView('text')} className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-all relative ${activeView === 'text' ? 'text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}>
                            <FileCode size={16} /> WhatsApp Format
                            {activeView === 'text' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />}
                        </button>
                    </div>

                    <div className="p-8 min-h-[400px]">
                        {activeView === 'visual' ? (
                            <div className="space-y-6">
                                {stats.tasks.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-64 text-gray-600">
                                        <Zap size={48} className="mb-4 opacity-20" />
                                        <p>No tasks logged for this date.</p>
                                    </div>
                                ) : (
                                    Object.entries(stats.tasks.reduce((acc, t) => {
                                        (acc[t.projectId] = acc[t.projectId] || []).push(t);
                                        return acc;
                                    }, {})).map(([projId, projTasks]) => {
                                        const projName = projects.find(p => p.id === projId)?.name || 'Unknown Project';
                                        return (
                                            <div key={projId} className="bg-white/5 rounded-xl border border-white/5 p-5 hover:bg-white/10 transition-colors">
                                                <h3 className="font-bold text-blue-400 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                                                    <Smartphone size={16} /> {projName}
                                                </h3>
                                                <div className="space-y-3 pl-3 border-l-2 border-white/10">
                                                    {projTasks.map(t => (
                                                        <div key={t.id} className="flex justify-between items-start text-sm group">
                                                            <div className="flex items-start gap-3">
                                                                <span className={t.status === 'Completed' ? 'text-emerald-500' : 'text-amber-500'}>
                                                                    {t.status === 'Completed' ? <CheckCircle size={16} className="mt-0.5" /> : <Loader size={16} className="mt-0.5 animate-spin-slow" />}
                                                                </span>
                                                                <div>
                                                                    <p className="text-gray-200 font-medium group-hover:text-white transition-colors">{t.title}</p>
                                                                    {t.description && <p className="text-gray-500 text-xs mt-1">{t.description}</p>}
                                                                </div>
                                                            </div>
                                                            {t.duration && <span className="text-[10px] bg-black/40 border border-white/10 px-2 py-1 rounded-full text-gray-400 font-mono">{t.duration}</span>}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        ) : (
                            <div className="relative group">
                                <textarea
                                    readOnly
                                    value={reportText}
                                    className="w-full h-96 bg-[#0a0a0a] border border-white/10 p-6 rounded-xl text-sm font-mono text-gray-300 focus:border-blue-500/50 outline-none resize-none shadow-inner"
                                />
                            </div>
                        )}
                    </div>

                    <div className="bg-[#0f0f12] p-4 border-t border-white/5 flex justify-between items-center">
                        <div className="text-xs text-gray-600 font-medium">Ready to send to team updates.</div>
                        <div className="flex gap-3">
                            <a href={`mailto:?subject=Daily Report ${selectedDate}&body=${encodeURIComponent(reportText)}`} className="bg-white/5 hover:bg-white/10 border border-white/5 text-gray-300 px-4 py-2 text-sm font-bold flex items-center gap-2 rounded-lg transition-colors">
                                <Mail size={16} /> Email
                            </a>
                            <button
                                onClick={copyToClipboard}
                                className={`px-6 py-2 text-sm font-bold flex items-center gap-2 rounded-lg transition-all duration-300 shadow-lg 
                                ${copied ? 'bg-emerald-600 text-white shadow-emerald-900/50 scale-105' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/50 hover:-translate-y-0.5'}`}
                            >
                                {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
                                {copied ? 'Copied!' : 'Copy Report'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReportsView;