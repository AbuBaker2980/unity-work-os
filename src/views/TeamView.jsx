import { useState, useEffect } from "react";
import {
    collection, query, where, getDocs, doc, updateDoc, onSnapshot, setDoc
} from "firebase/firestore";
import {
    Users, UserCircle, MessageSquare, Loader, Copy, UserMinus,
    Edit2, Check, X, ShieldCheck
} from "lucide-react";
import { db } from "../firebase/config";
import GenericChat from "../components/GenericChat";

const TeamView = ({ currentUser, defaultTab = 'roster' }) => {
    const [activeTab, setActiveTab] = useState(defaultTab);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [teamData, setTeamData] = useState({ name: 'My Team' });
    const [isEditingName, setIsEditingName] = useState(false);
    const [editedName, setEditedName] = useState("");

    // --- UPDATED ROLES LIST ---
    const AVAILABLE_ROLES = ["TL", "Developer", "ASO", "Designer", "3D Modeler", "QA"];

    const canManage = currentUser.role === 'TL' || currentUser.role === 'Team Lead';

    useEffect(() => { setActiveTab(defaultTab); }, [defaultTab]);

    // --- FETCH TEAM MEMBERS ---
    useEffect(() => {
        const fetchTeam = async () => {
            if (!currentUser?.teamId) { setLoading(false); return; }
            try {
                const q = query(collection(db, "users"), where("teamId", "==", currentUser.teamId));
                const snap = await getDocs(q);
                setMembers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (err) { console.error(err); } finally { setLoading(false); }
        };
        fetchTeam();
    }, [currentUser.teamId]);

    // --- REALTIME TEAM DATA ---
    useEffect(() => {
        if (!currentUser?.teamId) return;
        const teamRef = doc(db, "teams", currentUser.teamId);
        const unsubscribe = onSnapshot(teamRef, async (docSnap) => {
            if (docSnap.exists()) {
                setTeamData(docSnap.data());
                setEditedName(docSnap.data().name);
            } else {
                const initialName = currentUser.teamName || "My Awesome Team";
                await setDoc(teamRef, { name: initialName, createdBy: currentUser.uid });
                setTeamData({ name: initialName });
            }
        });
        return () => unsubscribe();
    }, [currentUser.teamId, currentUser.teamName, currentUser.uid]);

    // --- HANDLERS ---
    const handleRoleUpdate = async (memberId, newRole) => {
        setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m));
        try { await updateDoc(doc(db, "users", memberId), { role: newRole }); } catch (error) { alert("Failed."); }
    };

    const handleKickMember = async (member) => {
        if (!confirm(`Remove ${member.name}?`)) return;
        try { await updateDoc(doc(db, "users", member.id), { teamId: null, role: 'Developer' }); setMembers(prev => prev.filter(m => m.id !== member.id)); } catch (error) { console.error(error); }
    };

    const handleSaveName = async () => {
        if (!editedName.trim()) return;
        try { await updateDoc(doc(db, "teams", currentUser.teamId), { name: editedName }); setIsEditingName(false); } catch (error) { console.error("Error updating team name:", error); }
    };

    const copyInviteCode = () => { navigator.clipboard.writeText(currentUser.teamId); alert("Copied!"); };

    // --- UPDATED ROLE COLORS ---
    const getRoleColor = (role) => {
        switch (role) {
            case 'TL': return 'text-purple-300 border-purple-500/30 bg-purple-500/10';
            case 'ASO': return 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10';
            case 'Developer': return 'text-blue-300 border-blue-500/30 bg-blue-500/10';
            case 'Designer': return 'text-pink-300 border-pink-500/30 bg-pink-500/10';
            case '3D Modeler': return 'text-orange-300 border-orange-500/30 bg-orange-500/10'; // New Color
            case 'QA': return 'text-red-300 border-red-500/30 bg-red-500/10';
            default: return 'text-gray-400 border-gray-500/30 bg-white/5';
        }
    };

    return (
        <div className="p-6 h-full flex flex-col">

            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-end mb-6 pb-4 border-b border-white/5 gap-4">
                <div className="w-full">
                    <div className="flex items-center gap-3 mb-2">
                        {isEditingName ? (
                            <div className="flex items-center gap-2">
                                <input autoFocus className="bg-[#151518] text-2xl font-bold text-white border border-blue-500/50 rounded px-2 py-1 outline-none w-64" value={editedName} onChange={(e) => setEditedName(e.target.value)} />
                                <button onClick={handleSaveName} className="p-1.5 bg-green-600/20 text-green-400 rounded hover:bg-green-600/40"><Check size={18} /></button>
                                <button onClick={() => setIsEditingName(false)} className="p-1.5 bg-red-600/20 text-red-400 rounded hover:bg-red-600/40"><X size={18} /></button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 group">
                                <h1 className="text-3xl font-bold text-white flex items-center gap-3 tracking-tight"><Users size={32} className="text-blue-500" /> {teamData.name}</h1>
                                {canManage && <button onClick={() => setIsEditingName(true)} className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-blue-400" title="Rename Team"><Edit2 size={16} /></button>}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500 font-mono bg-white/5 px-3 py-1 rounded-lg border border-white/5 flex items-center gap-2">ID: {currentUser.teamId}</span>
                        <button onClick={copyInviteCode} className="text-blue-400 text-xs font-bold hover:text-white transition-colors flex items-center gap-1 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20"><Copy size={12} /> Copy Code</button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex bg-[#151518] p-1 rounded-xl border border-white/10 shrink-0">
                    <button onClick={() => setActiveTab('roster')} className={`px-5 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'roster' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>Roster</button>
                    <button onClick={() => setActiveTab('chat')} className={`px-5 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'chat' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>Chat</button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative bg-[#0f0f12]/50 rounded-2xl border border-white/5">
                {activeTab === 'chat' ? (
                    <div className="h-full w-full flex flex-col">

                        {/* Security Header */}
                        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#151518]/90 backdrop-blur-md sticky top-0 z-10 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500">
                                    <MessageSquare size={20} />
                                </div>
                                <div>
                                    <h2 className="font-bold text-white text-sm">Team Chat</h2>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                        <span className="text-[10px] text-gray-500 font-mono">
                                            {members.length} Members
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Encrypted Badge */}
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/5 border border-green-500/10 shadow-sm" title="Messages are encrypted in transit and at rest via Google Cloud Security">
                                <ShieldCheck size={12} className="text-green-500" />
                                <span className="text-[9px] font-bold text-green-400 uppercase tracking-wider">Encrypted Connection</span>
                            </div>
                        </div>

                        {/* Chat Area - REPLACED */}
                        <div className="flex-1 min-h-0 min-w-0 h-full overflow-hidden">
                            <GenericChat
                                context="team"
                                collectionPath={['artifacts', 'unity-work-os', 'public', 'data', 'messages']}
                                queryField="teamId"
                                queryValue={currentUser.teamId}
                                currentUser={currentUser}
                                members={members}
                                placeholder="Message team..."
                            />
                        </div>
                    </div>
                ) : (
                    // ROSTER VIEW
                    <div className="overflow-y-auto h-full p-4 custom-scrollbar">
                        {loading ? <div className="flex items-center justify-center h-64 text-gray-600"><Loader className="animate-spin mr-2" /> Syncing...</div> : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {members.map(member => (
                                    <div key={member.id} className={`group relative bg-[#151518] border border-white/5 p-5 rounded-xl transition-all duration-300 hover:bg-[#1a1a1d] hover:border-white/10 hover:shadow-xl ${member.id === currentUser.uid ? 'ring-1 ring-blue-500/30' : ''}`}>
                                        <div className="flex items-start justify-between mb-4">
                                            {/* Avatar */}
                                            <div className="w-14 h-14 rounded-full border-2 border-white/10 overflow-hidden bg-black/50 shrink-0 shadow-lg">
                                                {member.avatar ? (
                                                    <img src={member.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-400 font-bold text-xl">
                                                        {member.name ? member.name.charAt(0).toUpperCase() : '?'}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Role Selector */}
                                            {canManage && member.id !== currentUser.uid ? (
                                                <select value={member.role || 'Member'} onChange={(e) => handleRoleUpdate(member.id, e.target.value)} className={`text-[10px] font-bold uppercase px-2 py-1 rounded-lg border outline-none cursor-pointer hover:opacity-80 transition-opacity ${getRoleColor(member.role)}`}>
                                                    {AVAILABLE_ROLES.map(r => <option key={r} value={r} className="bg-[#1e1e1e] text-white">{r}</option>)}
                                                </select>
                                            ) : <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-lg border ${getRoleColor(member.role)}`}>{member.role || 'Member'}</span>}
                                        </div>

                                        {/* Info */}
                                        <div>
                                            <h3 className="text-base font-bold text-white flex items-center gap-2">{member.name || 'Unknown'} {member.id === currentUser.uid && <span className="text-[9px] bg-blue-600 text-white px-2 py-0.5 rounded-full">YOU</span>}</h3>
                                            <p className="text-xs text-blue-400 font-medium mb-1">{member.tagline || "No status set"}</p>
                                            <p className="text-[10px] text-gray-600 font-mono">{member.email}</p>
                                        </div>

                                        {/* Actions */}
                                        <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center">
                                            <button onClick={() => setActiveTab('chat')} className="text-xs text-gray-400 hover:text-blue-400 flex items-center gap-1.5 font-bold transition-colors"><MessageSquare size={14} /> Message</button>
                                            {canManage && member.id !== currentUser.uid && <button onClick={() => handleKickMember(member)} className="text-xs text-gray-500 hover:text-red-400 flex items-center gap-1.5 font-bold transition-colors"><UserMinus size={14} /> Remove</button>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeamView;