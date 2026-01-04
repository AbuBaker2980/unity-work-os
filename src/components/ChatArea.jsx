import { useState, useEffect, useRef } from "react";
import {
    collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, limit, updateDoc, doc
} from "firebase/firestore";
import { MessageSquare, Send, Loader, Check, CheckCheck, Paperclip, X, File, Film, Download, UploadCloud } from "lucide-react";
import { db } from "../firebase/config";
import { formatTime } from "../utils/dateUtils";
import toast from 'react-hot-toast';

const MESSAGES_COLLECTION_PATH = ["artifacts", "unity-work-os", "public", "data", "messages"];
const STORAGE_KEYS = { LAST_READ_CHAT: "workos_last_read_chat" };

// --- CONFIGURATION ---
const CLOUD_NAME = "dfnetnyzf";
const UPLOAD_PRESET = "unity-app";

const ChatArea = ({ currentUser, teamMembers = [] }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");

    // --- ATTACHMENT STATE ---
    const [selectedFile, setSelectedFile] = useState(null);
    const [filePreview, setFilePreview] = useState(null);
    const [fileType, setFileType] = useState(null);

    const [sending, setSending] = useState(false);
    const [mentionQuery, setMentionQuery] = useState(null);
    const [filteredMembers, setFilteredMembers] = useState([]);

    // DRAG STATE
    const [isDragging, setIsDragging] = useState(false);

    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const dragCounter = useRef(0); // To prevent flickering

    // --- FETCH MESSAGES ---
    useEffect(() => {
        if (!currentUser?.teamId) return;
        const msgsRef = collection(db, ...MESSAGES_COLLECTION_PATH);
        const q = query(msgsRef, where("teamId", "==", currentUser.teamId), orderBy("createdAt", "desc"), limit(50));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedMsgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).reverse();
            setMessages(fetchedMsgs);
            localStorage.setItem(STORAGE_KEYS.LAST_READ_CHAT, new Date().toISOString());

            snapshot.docs.forEach(async (docSnap) => {
                const msg = docSnap.data();
                if (msg.senderId !== currentUser.uid && (!msg.readBy || !msg.readBy.includes(currentUser.uid))) {
                    const msgDocRef = doc(db, ...MESSAGES_COLLECTION_PATH, docSnap.id);
                    const currentReadBy = msg.readBy || [];
                    await updateDoc(msgDocRef, { readBy: [...currentReadBy, currentUser.uid] });
                }
            });
        });
        return () => unsubscribe();
    }, [currentUser.teamId, currentUser.uid]);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

    useEffect(() => {
        if (mentionQuery === null) { setFilteredMembers([]); }
        else {
            const query = mentionQuery.toLowerCase();
            setFilteredMembers(teamMembers.filter(m => m.id !== currentUser.uid && (m.name?.toLowerCase().includes(query) || m.email?.toLowerCase().includes(query))));
        }
    }, [mentionQuery, teamMembers, currentUser.uid]);

    // --- FILE HANDLING ---
    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        processFile(file);
    };

    const handlePaste = (e) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].kind === 'file') {
                e.preventDefault();
                const file = items[i].getAsFile();
                processFile(file);
                return;
            }
        }
    };

    const processFile = (file) => {
        if (!file) return;
        if (file.size > 50000000) return toast.error("File too large (Max 50MB)");

        setSelectedFile(file);

        if (file.type.startsWith('image/')) {
            setFileType('image');
            const reader = new FileReader();
            reader.onloadend = () => setFilePreview(reader.result);
            reader.readAsDataURL(file);
        } else if (file.type.startsWith('video/')) {
            setFileType('video');
            setFilePreview(null);
        } else {
            setFileType('raw');
            setFilePreview(null);
        }
    };

    const clearAttachment = () => {
        setSelectedFile(null);
        setFilePreview(null);
        setFileType(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    // --- DRAG & DROP HANDLERS (FIXED) ---
    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current += 1;
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            setIsDragging(true);
        }
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current -= 1;
        if (dragCounter.current === 0) {
            setIsDragging(false);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        dragCounter.current = 0;
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            processFile(files[0]);
        }
    };

    // --- UPLOAD TO CLOUDINARY ---
    const uploadToCloudinary = async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", UPLOAD_PRESET);
        formData.append("resource_type", "auto");

        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`,
            { method: "POST", body: formData }
        );
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);

        return {
            url: data.secure_url,
            type: data.resource_type,
            name: file.name
        };
    };

    // --- SEND MESSAGE ---
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() && !selectedFile) return;

        setSending(true);
        try {
            let attachmentData = null;
            if (selectedFile) {
                const uploadResult = await uploadToCloudinary(selectedFile);
                attachmentData = {
                    url: uploadResult.url,
                    type: uploadResult.type,
                    name: uploadResult.name
                };
            }

            const msgsRef = collection(db, ...MESSAGES_COLLECTION_PATH);
            await addDoc(msgsRef, {
                text: newMessage,
                attachment: attachmentData,
                senderId: currentUser.uid,
                senderName: currentUser.name || currentUser.email.split('@')[0],
                senderAvatar: currentUser.avatar || null,
                senderRole: currentUser.role,
                teamId: currentUser.teamId,
                createdAt: serverTimestamp(),
                readBy: []
            });

            setNewMessage("");
            clearAttachment();
            setMentionQuery(null);
            localStorage.setItem(STORAGE_KEYS.LAST_READ_CHAT, new Date().toISOString());

        } catch (error) {
            console.error(error);
            toast.error("Upload Failed. Check Network.");
        } finally {
            setSending(false);
        }
    };

    // Helpers
    const handleInputChange = (e) => { const val = e.target.value; setNewMessage(val); const match = val.match(/@([\w\s]*)$/); setMentionQuery(match ? match[1] : null); };
    const insertMention = (name) => setNewMessage(prev => prev + `@${name} `);
    const applyMention = (name) => { const lastAt = newMessage.lastIndexOf('@'); if (lastAt !== -1) { setNewMessage(`${newMessage.substring(0, lastAt)}@${name} `); setMentionQuery(null); } };

    const getStatusIcon = (msg) => {
        if (msg.senderId !== currentUser.uid) return null;
        const seenCount = msg.readBy ? msg.readBy.length : 0;
        return seenCount > 0 ? <div className="flex items-center gap-1" title={`Seen by ${seenCount}`}><CheckCheck size={14} className="text-blue-500" /></div> : <Check size={14} className="text-gray-500" />;
    };

    const renderAttachment = (msg) => {
        if (msg.imageUrl && !msg.attachment) {
            return <div className="mb-2 rounded-lg overflow-hidden border border-white/10"><a href={msg.imageUrl} target="_blank" rel="noreferrer"><img src={msg.imageUrl} alt="Attachment" className="max-w-full max-h-60 object-cover" /></a></div>;
        }
        if (!msg.attachment) return null;
        const { url, type, name } = msg.attachment;

        if (type === 'image') {
            return <div className="mb-2 rounded-lg overflow-hidden border border-white/10"><a href={url} target="_blank" rel="noreferrer"><img src={url} alt="Image" className="max-w-full max-h-60 object-cover hover:scale-105 transition-transform" /></a></div>;
        }
        if (type === 'video') {
            return <div className="mb-2 rounded-lg overflow-hidden border border-white/10 bg-black"><video src={url} controls className="max-w-full max-h-60" /></div>;
        }
        return (
            <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-3 bg-white/10 p-3 rounded-lg border border-white/10 hover:bg-white/20 transition-colors mb-2 group">
                <div className="p-2 bg-blue-500/20 rounded text-blue-400"><File size={20} /></div>
                <div className="flex-1 min-w-0"><div className="text-xs font-bold text-white truncate w-32">{name || "Attached File"}</div><div className="text-[10px] text-gray-400">Click to download</div></div><Download size={16} className="text-gray-500 group-hover:text-white" />
            </a>
        );
    };

    return (
        <div
            className="flex flex-col h-full bg-[#151518]/30 backdrop-blur-sm relative"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            {/* DRAG OVERLAY - Fixed with pointer-events-none */}
            {isDragging && (
                <div className="absolute inset-0 z-50 bg-blue-600/20 backdrop-blur-sm border-2 border-dashed border-blue-500 flex flex-col items-center justify-center animate-in fade-in duration-200 pointer-events-none">
                    <div className="bg-[#0f0f12] p-6 rounded-2xl shadow-2xl flex flex-col items-center animate-bounce">
                        <UploadCloud size={48} className="text-blue-500 mb-2" />
                        <h3 className="text-xl font-bold text-white">Drop to Upload</h3>
                        <p className="text-sm text-blue-400">Images, Videos, or Docs</p>
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                {messages.length === 0 && <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-2 opacity-50"><MessageSquare size={48} /><p className="text-sm">Start the conversation!</p></div>}

                {messages.map((msg) => {
                    const isMe = msg.senderId === currentUser.uid;
                    if (msg.type === 'system') return <div key={msg.id} className="text-center text-[10px] text-gray-600 my-4 uppercase font-bold tracking-widest">{msg.text}</div>;

                    const senderMember = teamMembers.find(m => m.id === msg.senderId);
                    const avatarUrl = msg.senderAvatar || senderMember?.avatar;

                    return (
                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-fade-in`}>
                            <div className={`flex items-end gap-3 max-w-[85%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border shadow-lg flex-shrink-0 overflow-hidden ${isMe ? 'bg-blue-600 border-blue-400/30 text-white' : 'bg-[#222] border-white/10 text-gray-400 cursor-pointer hover:border-blue-500/50'}`} title={msg.senderName} onClick={() => !isMe && insertMention(msg.senderName)}>
                                    {avatarUrl ? <img src={avatarUrl} alt="A" className="w-full h-full object-cover" /> : msg.senderName.charAt(0).toUpperCase()}
                                </div>
                                <div className={`relative p-3 text-sm leading-relaxed shadow-lg backdrop-blur-sm border ${isMe ? 'bg-blue-600/90 text-white border-blue-500/50 rounded-2xl rounded-tr-sm' : 'bg-[#2a2a2a]/90 text-gray-200 border-white/5 rounded-2xl rounded-tl-sm'}`}>
                                    {!isMe && <div className="flex justify-between items-baseline gap-4 mb-1"><span className="text-[11px] font-bold text-blue-400">{msg.senderName}</span><span className="text-[9px] text-gray-500">{formatTime(msg.createdAt)}</span></div>}
                                    {renderAttachment(msg)}
                                    {msg.text && <p>{msg.text.split(' ').map((word, i) => { if (word.startsWith('@')) return <span key={i} className="bg-yellow-500/20 text-yellow-300 px-1 rounded font-medium shadow-sm">{word} </span>; return word + ' '; })}</p>}
                                    <div className={`flex items-center justify-end gap-1 mt-1 ${isMe ? 'text-blue-200/60' : 'text-gray-500'}`}>
                                        <span className="text-[9px]">{formatTime(msg.createdAt)}</span>{isMe && getStatusIcon(msg)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Mention Popup */}
            {mentionQuery !== null && filteredMembers.length > 0 && (<div className="absolute bottom-20 left-4 right-4 bg-[#1e1e1e] border border-white/10 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto backdrop-blur-xl"><div className="p-2 text-[10px] text-gray-500 uppercase font-bold bg-black/20 border-b border-white/5">Mention Member</div>{filteredMembers.map(member => (<button key={member.id} onClick={() => applyMention(member.name || 'User')} className="w-full text-left p-2.5 hover:bg-blue-600/20 text-sm text-gray-200 flex items-center gap-3 border-b border-white/5 last:border-0 transition-colors"><div className="w-6 h-6 bg-blue-900/50 rounded-full flex items-center justify-center text-[10px] border border-blue-500/30 font-bold">{member.name ? member.name.charAt(0).toUpperCase() : '?'}</div><span className="font-medium flex-1">{member.name}</span><span className="text-xs text-gray-600 font-mono">@{member.email.split('@')[0]}</span></button>))}</div>)}

            {/* Attachment Preview */}
            {selectedFile && (
                <div className="px-4 pb-2 flex items-center gap-3 animate-slide-up bg-[#151518] pt-2 border-t border-white/5">
                    <div className="relative group">
                        {fileType === 'image' && filePreview && <img src={filePreview} alt="Preview" className="w-16 h-16 object-cover rounded-lg border border-blue-500/50 shadow-lg" />}
                        {fileType === 'video' && <div className="w-16 h-16 bg-black rounded-lg border border-blue-500/50 flex items-center justify-center"><Film size={24} className="text-blue-400" /></div>}
                        {fileType === 'raw' && <div className="w-16 h-16 bg-white/5 rounded-lg border border-white/20 flex items-center justify-center"><File size={24} className="text-gray-300" /></div>}
                        <button onClick={clearAttachment} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow-md hover:bg-red-600 transition-colors"><X size={12} /></button>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-white truncate w-48">{selectedFile.name}</p>
                        <p className="text-[10px] text-blue-400 uppercase font-bold">{fileType} Upload</p>
                    </div>
                </div>
            )}

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="p-4 bg-[#151518]/90 border-t border-white/5 shrink-0">
                <div className="flex gap-3 bg-[#0a0a0a] p-1.5 rounded-xl border border-white/10 focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all">
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="Attach File/Video/Image">
                        <Paperclip size={18} />
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
                    <input
                        type="text"
                        value={newMessage}
                        onChange={handleInputChange}
                        onPaste={handlePaste}
                        placeholder={`Message... (or Drop File)`}
                        className="flex-1 bg-transparent px-3 text-sm text-gray-200 outline-none placeholder-gray-600"
                    />
                    <button type="submit" disabled={sending || (!newMessage.trim() && !selectedFile)} className="bg-blue-600 hover:bg-blue-500 text-white p-2.5 rounded-lg disabled:opacity-50 disabled:grayscale transition-all shadow-lg shadow-blue-900/20">
                        {sending ? <Loader size={18} className="animate-spin" /> : <Send size={18} />}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ChatArea;