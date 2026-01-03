import { useState } from "react";
import { doc, updateDoc, getDocs, query, collection, where } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { db, auth } from "../firebase/config";
import { Users, PlusCircle, LogOut, ArrowRight, Activity } from "lucide-react";

const OnboardingView = ({ user }) => {
    const [mode, setMode] = useState(null);
    const [teamName, setTeamName] = useState("");
    const [joinCode, setJoinCode] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogout = async () => { await signOut(auth); window.location.reload(); };

    const handleCreateTeam = async (e) => {
        e.preventDefault(); setLoading(true);
        const newTeamId = teamName.replace(/\s+/g, '-').toLowerCase() + '-' + Math.floor(1000 + Math.random() * 9000);
        try {
            await updateDoc(doc(db, "users", user.uid), { teamId: newTeamId, role: "TL", teamName: teamName });
            window.location.reload();
        } catch (err) { setError("Failed to create team."); setLoading(false); }
    };

    const handleJoinTeam = async (e) => {
        e.preventDefault(); setLoading(true); setError("");
        try {
            const q = query(collection(db, "users"), where("teamId", "==", joinCode));
            const snapshot = await getDocs(q);
            if (snapshot.empty) { setError("Invalid Team ID. Please check the code."); setLoading(false); return; }
            await updateDoc(doc(db, "users", user.uid), { teamId: joinCode, role: "Developer" });
            window.location.reload();
        } catch (err) { setError("Failed to join team."); setLoading(false); }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-gray-300 relative overflow-hidden font-sans selection:bg-blue-500/30">
            {/* Ambient Background */}
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-900/10 via-transparent to-purple-900/10 pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

            {/* Logout */}
            <button onClick={handleLogout} className="absolute top-6 right-6 flex items-center gap-2 text-gray-500 hover:text-red-400 transition-colors text-sm font-bold z-50">
                <LogOut size={16} /> Logout
            </button>

            <div className="max-w-3xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 p-8 relative z-10">
                <div className="col-span-1 md:col-span-2 text-center mb-8 animate-fade-in">
                    <div className="inline-flex items-center justify-center p-3 bg-blue-500/10 rounded-2xl mb-4 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                        <Activity className="text-blue-400" size={32} />
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Welcome, {user.name}!</h1>
                    <p className="text-gray-500 text-lg">Choose your path to get started.</p>
                </div>

                {/* Create Team Card */}
                <div onClick={() => setMode('create')}
                    className={`group bg-[#151518]/80 backdrop-blur-xl border p-8 rounded-2xl cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-900/20 
                    ${mode === 'create' ? 'border-blue-500 bg-blue-900/10' : 'border-white/5 hover:border-blue-500/50'}`}>
                    <div className={`p-4 rounded-xl inline-block mb-6 transition-colors ${mode === 'create' ? 'bg-blue-500 text-white' : 'bg-blue-500/10 text-blue-500 group-hover:bg-blue-500 group-hover:text-white'}`}>
                        <PlusCircle size={32} />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">Create New Team</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">I am a Team Lead. I want to set up a new workspace for my projects.</p>

                    {mode === 'create' && (
                        <form onSubmit={handleCreateTeam} className="mt-6 animate-fadeIn">
                            <input type="text" placeholder="Team Name (e.g. Alpha Studio)" required
                                className="w-full bg-black/30 border border-white/10 p-3 rounded-xl mb-3 text-white focus:border-blue-500 outline-none transition-colors"
                                value={teamName} onChange={e => setTeamName(e.target.value)} autoFocus />
                            <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30">
                                {loading ? "Creating..." : <>Create & Start <ArrowRight size={16} /></>}
                            </button>
                        </form>
                    )}
                </div>

                {/* Join Team Card */}
                <div onClick={() => setMode('join')}
                    className={`group bg-[#151518]/80 backdrop-blur-xl border p-8 rounded-2xl cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-emerald-900/20 
                    ${mode === 'join' ? 'border-emerald-500 bg-emerald-900/10' : 'border-white/5 hover:border-emerald-500/50'}`}>
                    <div className={`p-4 rounded-xl inline-block mb-6 transition-colors ${mode === 'join' ? 'bg-emerald-500 text-white' : 'bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white'}`}>
                        <Users size={32} />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">Join Team</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">I have an invite code from my Manager or Team Lead.</p>

                    {mode === 'join' && (
                        <form onSubmit={handleJoinTeam} className="mt-6 animate-fadeIn">
                            <input type="text" placeholder="Enter Team ID Code" required
                                className="w-full bg-black/30 border border-white/10 p-3 rounded-xl mb-3 text-white font-mono focus:border-emerald-500 outline-none transition-colors"
                                value={joinCode} onChange={e => setJoinCode(e.target.value)} autoFocus />
                            {error && <p className="text-red-400 text-xs mb-3 bg-red-900/20 p-2 rounded">{error}</p>}
                            <button disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30">
                                {loading ? "Joining..." : <>Join Team <ArrowRight size={16} /></>}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OnboardingView;