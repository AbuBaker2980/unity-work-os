import { useEffect, useState } from "react";
import { Search, ChevronRight, Smartphone, CheckSquare, Users } from "lucide-react";

const CommandPalette = ({ isOpen, onClose, projects, tasks, teamMembers, onNavigate }) => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);

    useEffect(() => {
        if (!isOpen) { setQuery(""); return; }
        // Focus input logic can go here
    }, [isOpen]);

    useEffect(() => {
        if (!query.trim()) { setResults([]); return; }
        const lowerQ = query.toLowerCase();

        const hits = [
            ...projects.filter(p => p.name.toLowerCase().includes(lowerQ)).map(p => ({ ...p, type: 'project', label: 'Project' })),
            ...tasks.filter(t => t.title.toLowerCase().includes(lowerQ)).map(t => ({ ...t, type: 'task', label: 'Task' })),
            ...teamMembers.filter(m => m.name?.toLowerCase().includes(lowerQ)).map(m => ({ ...m, type: 'member', label: 'Team' }))
        ];
        setResults(hits.slice(0, 5));
    }, [query, projects, tasks, teamMembers]);

    if (!isOpen) return null;

    const handleSelect = (item) => {
        if (item.type === 'project') onNavigate('projects', item.id);
        if (item.type === 'task') onNavigate('tasks');
        if (item.type === 'member') onNavigate('team');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-start justify-center pt-[20vh]" onClick={onClose}>
            <div className="bg-[#151518] border border-white/10 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-fade-in" onClick={e => e.stopPropagation()}>
                <div className="flex items-center px-4 py-4 border-b border-white/10">
                    <Search className="text-gray-500 mr-3" size={20} />
                    <input
                        autoFocus
                        placeholder="Search projects, tasks, or people..."
                        className="bg-transparent border-none outline-none text-white w-full text-lg placeholder-gray-600"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                    />
                    <div className="text-[10px] text-gray-500 border border-white/10 px-2 py-1 rounded">ESC</div>
                </div>

                <div className="max-h-64 overflow-y-auto custom-scrollbar p-2">
                    {results.length === 0 && query && <div className="text-center text-gray-600 py-4 text-sm">No results found.</div>}
                    {results.map((item, i) => (
                        <div key={i} onClick={() => handleSelect(item)} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 cursor-pointer group transition-colors">
                            <div className="p-2 rounded-lg bg-white/5 border border-white/5 group-hover:border-blue-500/30 group-hover:text-blue-400 text-gray-500">
                                {item.type === 'project' && <Smartphone size={16} />}
                                {item.type === 'task' && <CheckSquare size={16} />}
                                {item.type === 'member' && <Users size={16} />}
                            </div>
                            <div className="flex-1">
                                <h4 className="text-sm font-bold text-gray-200">{item.name || item.title}</h4>
                                <span className="text-[10px] uppercase font-bold text-gray-600 tracking-wider">{item.label}</span>
                            </div>
                            <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 text-gray-500" />
                        </div>
                    ))}
                    {!query && <div className="text-xs text-gray-600 p-2 text-center">Type to start searching...</div>}
                </div>
            </div>
        </div>
    );
};

export default CommandPalette;