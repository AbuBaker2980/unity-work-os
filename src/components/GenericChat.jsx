import { useState, useEffect, useRef } from "react";
import {
    collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, limit, updateDoc, doc, deleteDoc, getDocs
} from "firebase/firestore";
import {
    MessageSquare, Send, Loader, Check, X, File, Film, Download, UploadCloud,
    Trash2, Edit2, Reply, Share, ChevronRight, User
} from "lucide-react";
import { db } from "../firebase/config";
import { formatTime } from "../utils/dateUtils";
import toast from 'react-hot-toast';

// --- CONFIGURATION ---
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const STORAGE_KEYS = { LAST_READ_CHAT: "workos_last_read_chat" };

const GenericChat = ({
    collectionPath, queryField, queryValue, context, currentUser, members = [], placeholder = "Message..."
}) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");

    // Attachments
    const [selectedFile, setSelectedFile] = useState(null);
    const [filePreview, setFilePreview] = useState(null);
    const [fileType, setFileType] = useState(null);

    // Editing / Replying / Forwarding
    const [editingId, setEditingId] = useState(null);
    const [editText, setEditText] = useState("");
    const [replyingTo, setReplyingTo] = useState(null); // Message Object
    const [isForwarding, setIsForwarding] = useState(null); // Message Object to forward

    const [sending, setSending] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const dragCounter = useRef(0);

    // --- FETCH MESSAGES ---
    useEffect(() => {
        if (!queryValue && !collectionPath) return; // Path check
        const msgsRef = collection(db, ...collectionPath);

        let q;
        if (queryField && queryValue) {
            q = query(msgsRef, where(queryField, "==", queryValue), orderBy("createdAt", "desc"), limit(50));
        } else {
            q = query(msgsRef, orderBy("createdAt", "desc"), limit(50));
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedMsgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).reverse();
            setMessages(fetchedMsgs);
            if (context === "team") localStorage.setItem(STORAGE_KEYS.LAST_READ_CHAT, new Date().toISOString());
        });
        return () => unsubscribe();
    }, [JSON.stringify(collectionPath)]); // Deep compare path

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, replyingTo]);

    // --- ACTIONS ---
    const handleDeleteMessage = async (msgId) => {
        if (!confirm("Unsend message?")) return;
        try { await deleteDoc(doc(db, ...collectionPath, msgId)); toast.success("Unsent"); }
        catch (error) { toast.error("Error"); }
    };

    const saveEdit = async (msgId) => {
        if (!editText.trim()) return;
        await updateDoc(doc(db, ...collectionPath, msgId), { text: editText, isEdited: true });
        setEditingId(null);
    };

    const handleForward = async (targetUserId) => {
        // Logic handled in UI, this function executes send
        if (!isForwarding || !targetUserId) return;

        // Construct Chat ID
        const chatId = [currentUser.uid, targetUserId].sort().join("_");
        const targetPath = ['artifacts', 'unity-work-os', 'public', 'data', 'direct_messages', chatId, 'messages'];

        try {
            await addDoc(collection(db, ...targetPath), {
                text: isForwarding.text,
                attachment: isForwarding.attachment || null,
                senderId: currentUser.uid,
                senderName: currentUser.name,
                senderAvatar: currentUser.avatar || null,
                createdAt: serverTimestamp(),
                isForwarded: true
            });
            toast.success("Forwarded!");
            setIsForwarding(null);
        } catch (e) { toast.error("Failed to forward"); }
    };

    // --- FILE & DRAG ---
    const processFile = (file) => {
        if (!file || file.size > 50000000) return toast.error("Max 50MB");
        setSelectedFile(file);
        if (file.type.startsWith('image/')) {
            setFileType('image'); const r = new FileReader(); r.onloadend = () => setFilePreview(r.result); r.readAsDataURL(file);
        } else { setFileType('raw'); setFilePreview(null); }
    };

    const uploadToCloudinary = async (file) => {
        const formData = new FormData(); formData.append("file", file); formData.append("upload_preset", UPLOAD_PRESET);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, { method: "POST", body: formData });
        const data = await res.json();
        return { url: data.secure_url, type: data.resource_type, name: file.name };
    };

    // --- SEND ---
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() && !selectedFile) return;
        setSending(true);
        try {
            let attachmentData = null;
            if (selectedFile) attachmentData = await uploadToCloudinary(selectedFile);

            const msgData = {
                text: newMessage,
                attachment: attachmentData,
                senderId: currentUser.uid,
                senderName: currentUser.name || "User",
                senderAvatar: currentUser.avatar || null,
                createdAt: serverTimestamp(),
                replyTo: replyingTo ? { id: replyingTo.id, text: replyingTo.text, sender: replyingTo.senderName } : null
            };

            if (context === "team") { msgData.teamId = currentUser.teamId; msgData.senderRole = currentUser.role; }
            else if (context === "project") { msgData.projectId = queryValue; }

            await addDoc(collection(db, ...collectionPath), msgData);
            setNewMessage(""); setSelectedFile(null); setFilePreview(null); setReplyingTo(null);
        } catch (error) { console.error(error); toast.error("Failed to send."); }
        finally { setSending(false); }
    };

    // --- RENDER HELPERS ---
    const renderAttachment = (msg) => {
        if (!msg.attachment) return null;
        const { url, type, name } = msg.attachment;
        if (type === 'image') return <div className="mt-2 rounded-lg overflow-hidden max-w-xs"><a href={url} target="_blank"><img src={url} className="w-full object-cover" /></a></div>;
        return <a href={url} target="_blank" className="flex items-center gap-2 mt-2 bg-black/20 p-2 rounded border border-white/10"><File size={14} /> <span className="text-xs underline">{name}</span></a>;
    };

    return (
        <div className="flex flex-col h-full relative" onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }} onDragLeave={() => setIsDragging(false)} onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]) }}>

            {/* MESSAGES AREA */}
            <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-4 custom-scrollbar bg-[#0a0a0a]">
                {messages.map((msg) => {
                    const isMe = msg.senderId === currentUser.uid;
                    return (
                        <div key={msg.id} className={`flex flex-col group ${isMe ? 'items-end' : 'items-start'}`}>

                            {/* Reply Context */}
                            {msg.replyTo && (
                                <div className={`flex items-center gap-1 mb-1 text-[10px] text-gray-500 opacity-75 ${isMe ? 'mr-2' : 'ml-10'}`}>
                                    <Reply size={10} className="scale-x-[-1]" />
                                    <span>Replying to <strong>{msg.replyTo.sender}</strong>: {msg.replyTo.text?.substring(0, 30)}...</span>
                                </div>
                            )}

                            <div className={`flex items-end gap-2 max-w-[85%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                {/* Avatar */}
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border shrink-0 ${isMe ? 'bg-blue-600 text-white' : 'bg-[#222] text-gray-400'}`}>
                                    {msg.senderAvatar ? <img src={msg.senderAvatar} className="w-full h-full rounded-full object-cover" /> : msg.senderName[0]}
                                </div>

                                {/* Bubble */}
                                <div className={`relative p-3 text-sm shadow-md border group/bubble ${isMe ? 'bg-blue-600/20 border-blue-500/30 text-white rounded-2xl rounded-tr-sm' : 'bg-[#151518] border-white/10 text-gray-200 rounded-2xl rounded-tl-sm'}`}>
                                    {!isMe && <div className="text-[10px] font-bold text-gray-500 mb-0.5">{msg.senderName}</div>}

                                    {msg.isForwarded && <div className="text-[9px] text-gray-500 italic mb-1 flex items-center gap-1"><Share size={8} /> Forwarded</div>}

                                    {editingId === msg.id ? (
                                        <div className="flex flex-col gap-2 min-w-[200px]">
                                            <input autoFocus value={editText} onChange={(e) => setEditText(e.target.value)} className="bg-black/40 border border-white/10 rounded px-2 py-1 text-sm text-white" />
                                            <div className="flex justify-end gap-2"><button onClick={() => setEditingId(null)}><X size={14} /></button><button onClick={() => saveEdit(msg.id)}><Check size={14} /></button></div>
                                        </div>
                                    ) : (
                                        <p className="whitespace-pre-wrap leading-relaxed">{msg.text} {msg.isEdited && <span className="text-[9px] opacity-50">(edited)</span>}</p>
                                    )}

                                    {renderAttachment(msg)}

                                    {/* Actions */}
                                    <div className="absolute -top-3 right-2 hidden group-hover/bubble:flex bg-[#1a1a1d] border border-white/10 rounded-lg shadow-xl overflow-hidden">
                                        <button onClick={() => setReplyingTo(msg)} className="p-1.5 hover:bg-white/10 text-gray-400 hover:text-white" title="Reply"><Reply size={12} /></button>
                                        <button onClick={() => setIsForwarding(msg)} className="p-1.5 hover:bg-white/10 text-gray-400 hover:text-white" title="Forward"><Share size={12} /></button>
                                        {isMe && <button onClick={() => { setEditingId(msg.id); setEditText(msg.text) }} className="p-1.5 hover:bg-white/10 text-gray-400 hover:text-blue-400"><Edit2 size={12} /></button>}
                                        {isMe && <button onClick={() => handleDeleteMessage(msg.id)} className="p-1.5 hover:bg-white/10 text-gray-400 hover:text-red-400"><Trash2 size={12} /></button>}
                                    </div>
                                </div>
                            </div>
                            <span className="text-[9px] text-gray-600 mt-1 mx-1">{formatTime(msg.createdAt)}</span>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* REPLYING BANNER */}
            {replyingTo && (
                <div className="px-4 py-2 bg-[#151518] border-t border-white/5 flex justify-between items-center text-xs text-gray-400">
                    <div className="flex items-center gap-2"><Reply size={12} className="scale-x-[-1] text-blue-500" /> Replying to <span className="text-blue-400 font-bold">{replyingTo.senderName}</span></div>
                    <button onClick={() => setReplyingTo(null)} className="hover:text-white"><X size={14} /></button>
                </div>
            )}

            {/* INPUT AREA */}
            <form onSubmit={handleSendMessage} className="p-3 bg-[#151518] border-t border-white/5 shrink-0 flex gap-2 items-end">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2.5 text-gray-400 hover:text-white bg-white/5 rounded-xl"><UploadCloud size={18} /></button>
                <input type="file" ref={fileInputRef} onChange={(e) => processFile(e.target.files[0])} className="hidden" />

                <div className="flex-1 bg-[#0a0a0a] border border-white/10 rounded-xl flex flex-col px-3 py-2 focus-within:border-blue-500/50 transition-colors">
                    {selectedFile && <div className="flex justify-between items-center text-xs text-blue-400 mb-2 border-b border-white/5 pb-1"><span>{selectedFile.name}</span><button type="button" onClick={() => setSelectedFile(null)}><X size={12} /></button></div>}
                    <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder={placeholder} className="bg-transparent outline-none text-sm text-white placeholder-gray-600 w-full" />
                </div>

                <button type="submit" disabled={sending || (!newMessage.trim() && !selectedFile)} className="p-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl disabled:opacity-50">{sending ? <Loader size={18} className="animate-spin" /> : <Send size={18} />}</button>
            </form>

            {/* FORWARD MODAL */}
            {isForwarding && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="bg-[#151518] w-full max-w-sm rounded-2xl border border-white/10 p-4">
                        <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-white">Forward Message</h3><button onClick={() => setIsForwarding(null)}><X size={16} className="text-gray-500" /></button></div>
                        <div className="bg-[#0a0a0a] p-3 rounded-lg text-xs text-gray-400 mb-4 italic border border-white/5 line-clamp-2">"{isForwarding.text}"</div>
                        <div className="max-h-60 overflow-y-auto space-y-1">
                            {members.filter(m => m.id !== currentUser.uid).map(m => (
                                <button key={m.id} onClick={() => handleForward(m.id)} className="w-full flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg text-left transition-colors">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-xs font-bold text-white">{m.name[0]}</div>
                                    <div><div className="text-sm text-gray-200">{m.name}</div><div className="text-[10px] text-gray-500">{m.role}</div></div>
                                    <ChevronRight size={14} className="ml-auto text-gray-600" />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
export default GenericChat;