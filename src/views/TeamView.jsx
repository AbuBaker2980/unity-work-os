import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, updateDoc, onSnapshot, orderBy, limit } from "firebase/firestore";
import {
    Users, Hash, Search, MessageSquare, Circle,
    UserMinus, Copy, Edit2, Check, X, Loader, LogOut
} from "lucide-react";
import { db } from "../firebase/config";
import GenericChat from "../components/GenericChat";
import { getRank } from "../utils/gamificationUtils"; // 👈 Import Utils
import toast from 'react-hot-toast';

const TeamView = ({ currentUser, defaultTab = 'roster', onMarkDMRead }) => {
    const [viewMode, setViewMode] = useState(defaultTab);
    const [members, setMembers] = useState([]);
    const [selectedChatUser, setSelectedChatUser] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [loadingMembers, setLoadingMembers] = useState(false);

    const [unreadMap, setUnreadMap] = useState({});
    const [isChatSearchOpen, setIsChatSearchOpen] = useState(false);
    const [chatSearchText, setChatSearchText] = useState("");

    const [teamData, setTeamData] = useState({ name: 'My Team' });
    const [isEditingName, setIsEditingName] = useState(false);
    const [editedName, setEditedName] = useState("");

    const isTeamLead = currentUser.role === 'TL' || currentUser.role === 'Team Lead';
    const AVAILABLE_ROLES = ["TL", "Developer", "ASO", "Designer", "3D Modeler", "QA"];
    const APP_ID = "unity-work-os";

    useEffect(() => { setViewMode(defaultTab); }, [defaultTab]);

    useEffect(() => {
        setIsChatSearchOpen(false);
        setChatSearchText("");
        if (selectedChatUser) {
            const storageKey = `dm_last_read_${selectedChatUser.id}`;
            localStorage.setItem(storageKey, new Date().toISOString());
            setUnreadMap(prev => { const newMap = { ...prev }; delete newMap[selectedChatUser.id]; return newMap; });
            if (onMarkDMRead) onMarkDMRead(selectedChatUser.id);
        }
    }, [selectedChatUser]);

    useEffect(() => {
        if (!currentUser?.teamId) return;
        setLoadingMembers(true);
        const q = query(collection(db, "users"), where("teamId", "==", currentUser.teamId));
        const unsubscribeMembers = onSnapshot(q, (snapshot) => {
            const memberList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMembers(memberList);
            setLoadingMembers(false);
        }, (error) => { if (error.code !== 'permission-denied') console.warn("Members listener fail"); });
        return () => unsubscribeMembers();
    }, [currentUser.teamId]);

    useEffect(() => {
        if (members.length === 0) return;
        const unsubscribers = [];
        members.forEach(member => {
            if (member.id === currentUser.uid) return;
            const chatId = [currentUser.uid, member.id].sort().join("_");
            const msgsRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'direct_messages', chatId, 'messages');
            const q = query(msgsRef, orderBy('createdAt', 'desc'), limit(1));
            const unsub = onSnapshot(q, (snap) => {
                if (!snap.empty) {
                    const lastMsg = snap.docs[0].data();
                    const lastRead = localStorage.getItem(`dm_last_read_${member.id}`) || new Date(0).toISOString();
                    const isUnread = lastMsg.senderId !== currentUser.uid && lastMsg.createdAt?.toDate().toISOString() > lastRead;
                    setUnreadMap(prev => {
                        if (isUnread) return { ...prev, [member.id]: true };
                        const newMap = { ...prev };
                        delete newMap[member.id];
                        return newMap;
                    });
                }
            }, (error) => { if (error.code !== 'permission-denied') console.warn("DM check listener fail"); });
            unsubscribers.push(unsub);
        });
        return () => unsubscribers.forEach(u => u());
    }, [members, currentUser.uid]);

    useEffect(() => {
        if (!currentUser?.teamId) return;
        const teamRef = doc(db, "teams", currentUser.teamId);
        const unsubscribe = onSnapshot(teamRef, (docSnap) => {
            if (docSnap.exists()) { setTeamData(docSnap.data()); setEditedName(docSnap.data().name); }
        }, (error) => { if (error.code !== 'permission-denied') console.warn("Team name listener fail"); });
        return () => unsubscribe();
    }, [currentUser.teamId]);

    const getDirectChatId = (uid1, uid2) => [uid1, uid2].sort().join("_");
    const filteredMembers = members.filter(m => m.id !== currentUser.uid && m.name?.toLowerCase().includes(searchQuery.toLowerCase()));

    const handleRoleUpdate = async (memberId, newRole) => {
        setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m));
        try { await updateDoc(doc(db, "users", memberId), { role: newRole }); toast.success("Role Updated"); } catch (error) { toast.error("Failed."); }
    };
    const handleKickMember = async (member) => {
        if (!confirm(`Remove ${member.name}?`)) return;
        try { await updateDoc(doc(db, "users", member.id), { teamId: null, role: 'Developer' }); toast.success("Member Removed"); } catch (error) { console.error(error); }
    };
    const handleLeaveTeam = async () => {
        if (isTeamLead) return toast.error("Team Leads cannot leave. Appoint a new lead first.");
        if (!confirm("Are you sure you want to leave this team? You will lose access to team assets.")) return;
        try { await updateDoc(doc(db, "users", currentUser.uid), { teamId: null }); toast.success("You have left the team."); } catch (error) { toast.error("Failed to leave team."); }
    };
    const handleSaveName = async () => {
        if (!editedName.trim()) return;
        try { await updateDoc(doc(db, "teams", currentUser.teamId), { name: editedName }); setIsEditingName(false); toast.success("Team Name Updated"); } catch (error) { console.error(error); }
    };
    const copyInviteCode = () => { navigator.clipboard.writeText(currentUser.teamId); toast.success("Invite Code Copied!"); };
    const getRoleColor = (role) => {
        switch (role) {
            case 'TL': return 'text-purple-300 bg-purple-500/10 border-purple-500/20';
            case 'Developer': return 'text-blue-300 bg-blue-500/10 border-blue-500/20';
            case 'Designer': return 'text-pink-300 bg-pink-500/10 border-pink-500/20';
            default: return 'text-gray-400 bg-white/5 border-white/10';
        }
    };

    if (viewMode === 'roster') {
        return (
            <div className="p-8 h-full flex flex-col bg-[#0a0a0a]">
                <div className="flex flex-col md:flex-row justify-between items-end mb-8 pb-4 border-b border-white/5 gap-4">
                    <div className="w-full">
                        <div className="flex items-center gap-3 mb-2">
                            {isEditingName ? (
                                <div className="flex items-center gap-2"><input autoFocus className="bg-[#151518] text-2xl font-bold text-white border border-blue-500/50 rounded-xl px-3 py-1 outline-none w-64" value={editedName} onChange={(e) => setEditedName(e.target.value)} /><button onClick={handleSaveName} className="p-2 bg-green-600/20 text-green-400 rounded-lg hover:bg-green-600/40"><Check size={18} /></button><button onClick={() => setIsEditingName(false)} className="p-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/40"><X size={18} /></button></div>
                            ) : (
                                <div className="flex items-center gap-3 group"><h1 className="text-3xl font-bold text-white tracking-tight">{teamData.name}</h1>{isTeamLead && <button onClick={() => setIsEditingName(true)} className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-blue-400" title="Rename Team"><Edit2 size={16} /></button>}</div>
                            )}
                        </div>
                        <div className="flex items-center gap-3"><span className="text-xs font-mono text-gray-500 bg-white/5 px-3 py-1.5 rounded-full border border-white/5 flex items-center gap-2"><Hash size={12} /> {currentUser.teamId}</span><button onClick={copyInviteCode} className="text-blue-400 text-xs font-bold hover:text-white transition-colors flex items-center gap-1 bg-blue-500/10 px-3 py-1.5 rounded-full border border-blue-500/20 hover:bg-blue-500 hover:border-blue-500"><Copy size={12} /> Invite</button></div>
                    </div>
                </div>

                {loadingMembers ? <div className="flex-1 flex items-center justify-center text-gray-600"><Loader className="animate-spin mr-2" /> Assemble Your Squad...</div> : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto custom-scrollbar pb-10">
                        {members.map(member => {
                            const isMe = member.id === currentUser.uid;
                            const hasUnread = unreadMap[member.id];

                            // 🔥 NEW: GET RANK
                            const rank = getRank(member.level || 1);

                            return (
                                <div key={member.id} className={`relative bg-[#121214] border p-5 rounded-3xl transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group flex flex-col items-center text-center
                                    ${hasUnread
                                        ? 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)] bg-blue-900/10'
                                        : isMe ? `border-blue-500/20 bg-blue-500/5 hover:${rank.border}` : `border-white/5 hover:${rank.border}`
                                    }`}>

                                    {hasUnread && <span className="absolute top-3 right-3 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span></span>}

                                    {/* Avatar Bubble */}
                                    <div className="relative mb-3">
                                        <div className={`w-16 h-16 rounded-full border-4 overflow-hidden shadow-lg transition-colors ${hasUnread ? 'border-blue-500' : rank.border}`}>
                                            {member.avatar ? (
                                                <img src={member.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-gray-800 to-gray-900 text-white font-bold text-xl">
                                                    {member.name ? member.name.charAt(0).toUpperCase() : '?'}
                                                </div>
                                            )}
                                        </div>
                                        {/* Rank Bubble */}
                                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-[#1a1a1d] rounded-full border border-white/10 flex items-center justify-center text-[8px] font-bold text-white shadow-md">
                                            {member.level || 1}
                                        </div>
                                        <div className={`absolute bottom-1 right-1 w-3.5 h-3.5 border-2 border-[#121214] rounded-full ${member.isOnline ? 'bg-emerald-500' : 'bg-gray-600'}`}></div>
                                    </div>

                                    <div className="mb-4 w-full">
                                        <h3 className={`text-base font-bold mb-0.5 flex items-center justify-center gap-1 ${hasUnread ? 'text-blue-100' : 'text-white'}`}>
                                            {member.name}
                                            {isMe && <span className="text-[8px] bg-white/10 text-gray-300 px-1.5 py-0.5 rounded ml-1">YOU</span>}
                                        </h3>
                                        {/* 🔥 SHOW TITLE IF EQUIPPED */}
                                        {member.activeTitle && <span className="text-[9px] text-yellow-500 font-normal uppercase tracking-wider block mb-1">« {member.activeTitle} »</span>}
                                        <p className="text-[10px] text-gray-500 font-mono truncate px-2">{member.email}</p>
                                    </div>

                                    <div className="mb-4">
                                        {isTeamLead && !isMe ? (
                                            <select value={member.role || 'Member'} onChange={(e) => handleRoleUpdate(member.id, e.target.value)} className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border bg-transparent outline-none cursor-pointer hover:border-white/30 transition-colors ${getRoleColor(member.role)}`}>
                                                {AVAILABLE_ROLES.map(r => <option key={r} value={r} className="bg-[#1e1e1e] text-white">{r}</option>)}
                                            </select>
                                        ) : (
                                            <span className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border ${getRoleColor(member.role)}`}>
                                                {member.role || 'Member'}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex gap-2 w-full mt-auto">
                                        {!isMe ? (
                                            <>
                                                <button onClick={() => { setSelectedChatUser(member); setViewMode('chat'); }} className={`flex-1 text-xs font-bold py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5 border ${hasUnread ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-900/50' : 'bg-white/5 hover:bg-white/10 text-white border-white/5'}`}>
                                                    <MessageSquare size={14} /> {hasUnread ? 'New Message' : 'Chat'}
                                                </button>
                                                {isTeamLead && (
                                                    <button onClick={() => handleKickMember(member)} className="p-2 bg-white/5 hover:bg-red-500/20 text-gray-500 hover:text-red-400 rounded-xl transition-colors border border-white/5" title="Remove User">
                                                        <UserMinus size={14} />
                                                    </button>
                                                )}
                                            </>
                                        ) : (
                                            !isTeamLead && (
                                                <button onClick={handleLeaveTeam} className="w-full flex items-center justify-center gap-2 py-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white text-xs font-bold rounded-xl border border-red-500/20 transition-all">
                                                    <LogOut size={14} /> Leave Team
                                                </button>
                                            )
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="flex h-full bg-[#0f0f12] overflow-hidden">
            <div className="w-72 bg-[#151518] border-r border-white/5 flex flex-col flex-shrink-0 relative z-20 shadow-xl">
                <div className="p-4 border-b border-white/5 shadow-sm bg-[#1a1a1d]">
                    <div className="relative"><Search className="absolute left-3 top-2.5 text-gray-500" size={14} /><input type="text" placeholder="Find member..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-[#0a0a0a] text-xs text-gray-300 pl-9 p-2.5 rounded-xl border border-white/10 outline-none focus:border-blue-500/50 transition-all placeholder-gray-600" /></div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
                    <button onClick={() => setSelectedChatUser(null)} className={`w-full flex items-center gap-3 px-4 py-3 mb-4 rounded-xl transition-all duration-300 group shadow-lg ${selectedChatUser === null ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-900/30 translate-x-1' : 'bg-[#1e1e21] text-gray-400 hover:bg-white/5 hover:text-white border border-white/5'}`}><div className={`p-2 rounded-lg transition-colors ${selectedChatUser === null ? 'bg-white/20' : 'bg-white/5 group-hover:bg-white/10'}`}><Hash size={18} /></div><div className="text-left"><div className="text-sm font-bold tracking-wide">Team Chat</div><div className={`text-[10px] ${selectedChatUser === null ? 'text-blue-100' : 'text-gray-600'}`}>General Discussion</div></div></button>
                    <div className="flex items-center gap-2 px-2 mb-2 mt-6"><span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Direct Messages</span><div className="h-px bg-white/5 flex-1"></div></div>
                    {loadingMembers ? <div className="space-y-2 p-2">{[1, 2, 3].map(i => <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />)}</div> : filteredMembers.map(member => {
                        const hasUnread = unreadMap[member.id];
                        return (
                            <button key={member.id} onClick={() => setSelectedChatUser(member)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative overflow-hidden ${selectedChatUser?.id === member.id ? 'bg-white/10 text-white border border-white/5' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200 border border-transparent'} ${hasUnread ? 'border-blue-500 shadow-[0_0_15px_#3b82f6] text-white bg-blue-600/10' : ''}`}>
                                {selectedChatUser?.id === member.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r-full"></div>}
                                <div className="relative"><div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white overflow-hidden border transition-colors ${hasUnread ? 'border-blue-400' : 'border-white/10 bg-[#1e1e21]'}`}>{member.avatar ? <img src={member.avatar} className="w-full h-full object-cover" /> : member.name?.[0]}</div><div className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-[#151518] rounded-full ${member.isOnline ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]' : 'bg-gray-500'}`}></div></div>
                                <div className="text-left flex-1 min-w-0"><div className={`text-sm font-bold truncate transition-colors ${selectedChatUser?.id === member.id || hasUnread ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>{member.name}</div><div className="text-[10px] opacity-50 truncate flex items-center gap-1"><span className={`w-1.5 h-1.5 rounded-full ${member.role === 'TL' ? 'bg-purple-500' : 'bg-gray-500'}`}></span>{hasUnread ? <span className="text-blue-300 font-bold">New Message</span> : member.role}</div></div>{hasUnread && <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_10px_#3b82f6] animate-pulse"></div>}
                            </button>
                        );
                    })}
                </div>
            </div>
            <div className="flex-1 flex flex-col min-w-0 bg-[#0f0f12] relative">
                <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-[#151518]/80 backdrop-blur-md z-10">
                    <div className="flex items-center gap-4">{selectedChatUser ? (<><div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden border border-white/10">{selectedChatUser.avatar ? <img src={selectedChatUser.avatar} className="w-full h-full object-cover" /> : <span className="w-full h-full flex items-center justify-center text-white text-sm">{selectedChatUser.name[0]}</span>}</div><div><h3 className="font-bold text-white text-base flex items-center gap-2">{selectedChatUser.name}</h3><span className={`text-[10px] flex items-center gap-1 font-mono ${selectedChatUser.isOnline ? 'text-emerald-400' : 'text-gray-500'}`}><Circle size={6} fill="currentColor" /> {selectedChatUser.isOnline ? 'ONLINE' : 'OFFLINE'}</span></div></>) : (<><div className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl text-white shadow-lg shadow-blue-900/20"><Hash size={20} /></div><div><h3 className="font-bold text-white text-base tracking-wide">General Team Chat</h3><span className="text-[10px] text-gray-500 font-mono flex items-center gap-1"><Users size={10} /> {members.length} MEMBERS ACTIVE</span></div></>)}</div>
                    <div className="flex items-center gap-3"><div className="relative flex items-center">{isChatSearchOpen ? (<div className="flex items-center bg-[#0a0a0a] border border-blue-500/50 rounded-lg overflow-hidden animate-slide-left w-48"><input autoFocus className="bg-transparent text-xs text-white p-2 outline-none w-full" placeholder="Search..." value={chatSearchText} onChange={(e) => setChatSearchText(e.target.value)} /><button onClick={() => { setIsChatSearchOpen(false); setChatSearchText(""); }} className="p-2 text-gray-500 hover:text-white"><X size={14} /></button></div>) : (<button onClick={() => setIsChatSearchOpen(true)} className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors"><Search size={20} /></button>)}</div></div>
                </div>
                <div className="flex-1 overflow-hidden relative bg-[#0a0a0a]">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 pointer-events-none"></div>
                    {selectedChatUser ? <GenericChat key={selectedChatUser.id} context="direct" collectionPath={['artifacts', 'unity-work-os', 'public', 'data', 'direct_messages', getDirectChatId(currentUser.uid, selectedChatUser.id), 'messages']} queryField={null} queryValue={selectedChatUser.id} currentUser={currentUser} placeholder={`Message @${selectedChatUser.name}...`} filterText={chatSearchText} /> : <GenericChat key="global-chat" context="team" collectionPath={['artifacts', 'unity-work-os', 'public', 'data', 'messages']} queryField="teamId" queryValue={currentUser.teamId} currentUser={currentUser} members={members} placeholder="Message everyone..." filterText={chatSearchText} />}
                </div>
            </div>
        </div>
    );
};

export default TeamView;