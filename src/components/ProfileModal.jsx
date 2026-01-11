import { useState, useRef, useCallback } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import {
    User, X, Check, Upload, Camera, ZoomIn, Trash2,
    Mail, Shield, Briefcase, AtSign, Loader
} from "lucide-react";
import Cropper from 'react-easy-crop';
import getCroppedImg from "../utils/cropImage";
import { getRank, calculateLevelFromXP } from "../utils/gamificationUtils"; // Badges Removed
import toast from 'react-hot-toast';

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

const ProfileModal = ({ user, onClose, onUpdateLocalUser }) => {
    const [name, setName] = useState(user.name || "");
    const [tagline, setTagline] = useState(user.tagline || "");
    const [selectedAvatar, setSelectedAvatar] = useState(user.avatar || "");
    const [saving, setSaving] = useState(false);

    // --- CROPPER STATE ---
    const [imageSrc, setImageSrc] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    const fileInputRef = useRef(null);

    // 🔥 GAMIFICATION STATS (Kept)
    const xpStats = calculateLevelFromXP(user.xp || 0);
    const rank = getRank(user.level || 1);
    const progressPercent = (xpStats.currentXP / xpStats.requiredXP) * 100;

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => { setImageSrc(reader.result); };
            reader.readAsDataURL(file);
        }
    };

    const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => { setCroppedAreaPixels(croppedAreaPixels); }, []);

    const showCroppedImage = async () => {
        try {
            const croppedImageBase64 = await getCroppedImg(imageSrc, croppedAreaPixels);
            setSelectedAvatar(croppedImageBase64);
            setImageSrc(null);
        } catch (e) { console.error(e); toast.error("Could not crop image"); }
    };

    const uploadToCloudinary = async (base64Image) => {
        const formData = new FormData();
        formData.append("file", base64Image);
        formData.append("upload_preset", UPLOAD_PRESET);
        try {
            const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: formData });
            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            return data.secure_url;
        } catch (error) { console.error("Cloudinary Error:", error); throw error; }
    };

    const handleSave = async () => {
        if (!name.trim()) return toast.error("Name cannot be empty");
        setSaving(true);
        try {
            let avatarUrl = user.avatar;
            if (selectedAvatar && selectedAvatar.startsWith("data:image")) {
                avatarUrl = await uploadToCloudinary(selectedAvatar);
            } else if (selectedAvatar === "") {
                avatarUrl = "";
            }

            await updateDoc(doc(db, "users", user.uid), { name: name, tagline: tagline, avatar: avatarUrl });
            onUpdateLocalUser({ ...user, name, tagline, avatar: avatarUrl });
            onClose();
            toast.success("Profile updated successfully!");
        } catch (error) { console.error("Error updating profile:", error); toast.error("Failed to save."); } finally { setSaving(false); }
    };

    const getInitials = (n) => n ? n.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() : 'U';

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-[#151518] border border-white/10 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col relative">

                {imageSrc ? (
                    <div className="flex flex-col h-[500px] bg-[#0a0a0a] relative z-10">
                        <div className="p-4 bg-[#1a1a1d] border-b border-white/10 flex justify-between items-center"><h3 className="text-white font-bold flex items-center gap-2"><Upload size={18} className="text-blue-500" /> Adjust Photo</h3><button onClick={() => setImageSrc(null)} className="text-gray-400 hover:text-white"><X size={20} /></button></div>
                        <div className="relative flex-1 bg-black"><Cropper image={imageSrc} crop={crop} zoom={zoom} aspect={1} onCropChange={setCrop} onCropComplete={onCropComplete} onZoomChange={setZoom} cropShape="round" showGrid={false} /></div>
                        <div className="p-4 bg-[#1a1a1d] border-t border-white/10 flex items-center gap-4"><ZoomIn size={20} className="text-gray-500" /><input type="range" value={zoom} min={1} max={3} step={0.1} onChange={(e) => setZoom(e.target.value)} className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500" /><button onClick={showCroppedImage} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl text-sm font-bold ml-4 shadow-lg shadow-blue-900/20 transition-all hover:scale-105">Apply</button></div>
                    </div>
                ) : (
                    <>
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#1a1a1d]/50 relative z-10">
                            <div><h2 className="text-xl font-bold text-white flex items-center gap-2"><User className="text-blue-500" size={20} /> Identity Settings</h2><p className="text-xs text-gray-500 mt-1">Manage your public profile.</p></div>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-colors"><X size={20} /></button>
                        </div>

                        {/* NO TABS - SINGLE VIEW */}
                        <div className="p-8 pb-4 flex flex-col items-center relative z-10 overflow-y-auto custom-scrollbar max-h-[60vh]">

                            {/* Avatar Section */}
                            <div className="relative group mb-6">
                                <div className="absolute inset-0 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-full blur-md opacity-40 group-hover:opacity-60 transition-opacity"></div>
                                <div className={`relative w-28 h-28 rounded-full border-4 ${rank.border} bg-[#1e1e21] flex items-center justify-center overflow-hidden shadow-2xl`}>
                                    {selectedAvatar ? <img src={selectedAvatar} alt="Profile" className="w-full h-full object-cover" /> : <span className="text-4xl font-bold text-gray-700 select-none">{getInitials(name)}</span>}
                                </div>
                                <div onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer text-white backdrop-blur-[2px] border-4 border-transparent"><Camera size={24} className="mb-1 text-blue-400" /><span className="text-[9px] font-bold uppercase tracking-wider">Change</span></div>
                                {selectedAvatar && <button onClick={() => setSelectedAvatar("")} className="absolute bottom-1 right-1 bg-red-500 text-white p-1.5 rounded-full shadow-lg hover:bg-red-600 hover:scale-110 transition-all border-2 border-[#151518]" title="Remove Photo"><Trash2 size={12} /></button>}
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                            </div>

                            {/* 🔥 GAMIFICATION STATS (Kept) */}
                            <div className="w-full mb-6 bg-black/20 p-4 rounded-xl border border-white/5">
                                <div className="flex justify-between items-end mb-2 px-1">
                                    <span className={`text-sm font-bold ${rank.color}`}>{rank.name} <span className="text-white text-xs font-normal">Lvl {user.level || 1}</span></span>
                                    <span className="text-[10px] text-gray-500">{Math.floor(xpStats.currentXP)} / {xpStats.requiredXP} XP</span>
                                </div>
                                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className="h-full transition-all duration-1000 rounded-full"
                                        style={{
                                            width: `${Math.min(100, Math.max(0, progressPercent || 0))}%`,
                                            backgroundColor: rank.name === 'Bronze' ? '#f97316' :
                                                rank.name === 'Silver' ? '#94a3b8' :
                                                    rank.name === 'Gold' ? '#eab308' : '#3b82f6'
                                        }}
                                    ></div>
                                </div>
                            </div>

                            {/* Standard Inputs */}
                            <div className="w-full space-y-4 mb-6">
                                <div><label className="text-[10px] uppercase font-bold text-gray-500 mb-2 block ml-1 tracking-wider">Display Name</label><div className="relative group"><User className="absolute left-3 top-3.5 text-gray-500 group-focus-within:text-blue-500 transition-colors" size={16} /><input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-[#0a0a0a] border border-white/10 pl-10 p-3 rounded-xl text-sm text-white focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 outline-none transition-all placeholder-gray-700" placeholder="Your Name" /></div></div>
                                <div><label className="text-[10px] uppercase font-bold text-gray-500 mb-2 block ml-1 tracking-wider">Tagline</label><div className="relative group"><AtSign className="absolute left-3 top-3.5 text-gray-500 group-focus-within:text-purple-500 transition-colors" size={16} /><input type="text" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="e.g. Senior Unity Developer" maxLength={40} className="w-full bg-[#0a0a0a] border border-white/10 pl-10 p-3 rounded-xl text-sm text-white focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 outline-none transition-all placeholder-gray-700 pr-12" /><span className="absolute right-3 top-3.5 text-[10px] text-gray-600 font-mono bg-white/5 px-1.5 py-0.5 rounded">{tagline.length}/40</span></div></div>
                            </div>

                            {/* System Info */}
                            <div className="w-full bg-black/30 border border-white/5 rounded-2xl p-4 space-y-3"><h4 className="text-[10px] uppercase font-bold text-gray-600 mb-2 border-b border-white/5 pb-2">System Info (Locked)</h4><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><div className="flex items-center gap-1.5 mb-1 text-gray-500"><Mail size={10} /> <span className="text-[9px] uppercase font-bold">Email</span></div><div className="text-xs text-gray-300 font-mono truncate bg-white/5 p-2 rounded-lg select-all" title={user.email}>{user.email}</div></div><div><div className="flex items-center gap-1.5 mb-1 text-gray-500"><Shield size={10} /> <span className="text-[9px] uppercase font-bold">Role</span></div><div className="text-xs text-blue-400 font-mono uppercase bg-blue-500/10 border border-blue-500/20 p-2 rounded-lg font-bold tracking-wider">{user.role || 'OPERATIVE'}</div></div><div className="md:col-span-2"><div className="flex items-center gap-1.5 mb-1 text-gray-500"><Briefcase size={10} /> <span className="text-[9px] uppercase font-bold">Team ID</span></div><div className="text-xs text-gray-400 font-mono bg-white/5 p-2 rounded-lg flex justify-between items-center group cursor-pointer hover:bg-white/10 transition-colors" onClick={() => { navigator.clipboard.writeText(user.teamId); toast.success("Team ID Copied!"); }}><span className="truncate">{user.teamId}</span><span className="text-[9px] text-gray-600 group-hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">COPY</span></div></div></div></div>

                        </div>

                        <div className="p-5 border-t border-white/5 bg-[#1a1a1d]/50 flex justify-end gap-3 relative z-10">
                            <button onClick={onClose} className="px-6 py-2.5 rounded-xl text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">Cancel</button>
                            <button onClick={handleSave} disabled={saving} className="px-8 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-900/20 flex items-center gap-2 transition-all hover:scale-105 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed">{saving ? <><Loader size={16} className="animate-spin" /> Uploading...</> : <><Check size={16} /> Save Changes</>}</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ProfileModal;