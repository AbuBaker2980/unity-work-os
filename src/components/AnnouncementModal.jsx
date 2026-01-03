import { useState } from "react";
import { Megaphone, X, Check, Clock } from "lucide-react";

const AnnouncementModal = ({ currentMessage, onClose, onUpdate }) => {
    const [message, setMessage] = useState(currentMessage || "");
    const [duration, setDuration] = useState("24"); // Default 24 hours
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!message.trim()) return alert("Message cannot be empty");
        setSaving(true);
        try {
            let expiresAt = null;

            // Calculate Expiration Date
            if (duration !== "forever") {
                const now = new Date();
                const hours = parseInt(duration);
                now.setHours(now.getHours() + hours);
                expiresAt = now.toISOString();
            }

            await onUpdate(message, expiresAt);
            onClose();
        } catch (error) {
            console.error("Error saving announcement:", error);
            alert("Failed to save.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-[#151518] border border-white/10 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                <div className="p-5 border-b border-white/5 flex justify-between items-center bg-[#1a1a1d]">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Megaphone className="text-blue-500" size={20} /> Post Announcement
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
                </div>

                <div className="p-6 space-y-4">
                    {/* Message Input */}
                    <div>
                        <label className="block text-xs text-gray-500 mb-2 font-bold uppercase">Message</label>
                        <textarea
                            rows={4}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="w-full bg-[#0a0a0a] border border-white/10 p-3 rounded-xl text-sm text-white focus:border-blue-500 outline-none resize-none placeholder-gray-700"
                            placeholder="Type your team announcement here..."
                        />
                    </div>

                    {/* Duration Select */}
                    <div>
                        <label className="block text-xs text-gray-500 mb-2 font-bold uppercase flex items-center gap-2">
                            <Clock size={12} /> Auto-Expire In
                        </label>
                        <select
                            value={duration}
                            onChange={(e) => setDuration(e.target.value)}
                            className="w-full bg-[#0a0a0a] border border-white/10 p-3 rounded-xl text-sm text-white focus:border-blue-500 outline-none cursor-pointer"
                        >
                            <option value="24">24 Hours</option>
                            <option value="48">48 Hours (2 Days)</option>
                            <option value="72">3 Days</option>
                            <option value="168">1 Week</option>
                            <option value="forever">Never (Always Visible)</option>
                        </select>
                    </div>
                </div>

                <div className="p-5 border-t border-white/5 bg-[#1a1a1d] flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-colors">Cancel</button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-lg flex items-center gap-2 disabled:opacity-50 transition-all hover:scale-105"
                    >
                        {saving ? "Posting..." : <>Post <Check size={16} /></>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AnnouncementModal;