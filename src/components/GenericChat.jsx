import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
    collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, limit, updateDoc, doc, deleteDoc
} from "firebase/firestore";
import {
    Send, Loader, Check, X, File, Reply, Share, ChevronRight, Edit2, Trash2, UploadCloud, CornerDownRight, ArrowDown
} from "lucide-react";
import { db } from "../firebase/config";
import { formatTime } from "../utils/dateUtils";
import toast from 'react-hot-toast';

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const STORAGE_KEYS = { LAST_READ_CHAT: "workos_last_read_chat" };

// --- ENHANCED SKELETON LOADING ---
const ChatSkeleton = () => (
    <div className="w-full flex flex-col justify-end min-h-full p-4 space-y-6 animate-pulse opacity-50">
        {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col gap-4">
                {/* Incoming Skeleton */}
                <div className="flex gap-3 items-end max-w-[70%]">
                    <div className="w-9 h-9 bg-white/10 rounded-full shrink-0"></div>
                    <div className="flex flex-col gap-1 w-full">
                        <div className="h-10 bg-white/5 rounded-2xl rounded-tl-sm w-full"></div>
                        <div className="h-2 bg-white/5 rounded w-10 ml-1"></div>
                    </div>
                </div>

                {/* Outgoing Skeleton */}
                <div className="flex gap-3 items-end flex-row-reverse max-w-[70%] self-end">
                    <div className="flex flex-col gap-1 w-full items-end">
                        <div className="h-14 bg-white/10 rounded-2xl rounded-tr-sm w-full"></div>
                        <div className="h-2 bg-white/5 rounded w-10 mr-1"></div>
                    </div>
                </div>
            </div>
        ))}
    </div>
);

const GenericChat = ({
    collectionPath, queryField, queryValue, context, currentUser, members = [], placeholder = "Message...", filterText = ""
}) => {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newMessage, setNewMessage] = useState("");

    // --- SCROLL STATE ---
    const [showJumpButton, setShowJumpButton] = useState(false);

    // Attachments & State
    const [selectedFile, setSelectedFile] = useState(null);
    const [filePreview, setFilePreview] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [editText, setEditText] = useState("");
    const [replyingTo, setReplyingTo] = useState(null);
    const [isForwarding, setIsForwarding] = useState(null);
    const [sending, setSending] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const messagesEndRef = useRef(null);
    const chatContainerRef = useRef(null);
    const fileInputRef = useRef(null);
    const msgRefs = useRef({});

    // --- FILTER MESSAGES ---
    const displayedMessages = messages.filter(msg =>
        !filterText || msg.text?.toLowerCase().includes(filterText.toLowerCase()) || msg.senderName?.toLowerCase().includes(filterText.toLowerCase())
    );

    // --- FETCH MESSAGES ---
    useEffect(() => {
        if (!queryValue && !collectionPath) return;

        // 1. Show Skeleton Immediately
        setLoading(true);
        setMessages([]);
        setShowJumpButton(false);

        const msgsRef = collection(db, ...collectionPath);
        let q;
        if (queryField && queryValue) {
            q = query(msgsRef, where(queryField, "==", queryValue), orderBy("createdAt", "desc"), limit(50));
        } else {
            q = query(msgsRef, orderBy("createdAt", "desc"), limit(50));
        }

        // ADDED ERROR HANDLER HERE
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedMsgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).reverse();
            setMessages(fetchedMsgs);

            // Turn off skeleton
            setLoading(false);

            if (context === "team") localStorage.setItem(STORAGE_KEYS.LAST_READ_CHAT, new Date().toISOString());
        }, (error) => {
            if (error.code !== 'permission-denied') console.warn("Chat messages listener fail");
        });
        return () => unsubscribe();
    }, [JSON.stringify(collectionPath), queryValue]);

    // --- AUTO SCROLL LOGIC ---
    useEffect(() => {
        if (!chatContainerRef.current) return;
        if (filterText) return; // Don't scroll if user is searching

        const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;

        if (!loading && (isNearBottom || messages.length === 0)) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, loading, replyingTo, filterText]);

    // --- SCROLL HANDLER ---
    const handleScroll = () => {
        if (!chatContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
        setShowJumpButton(scrollHeight - scrollTop - clientHeight > 400);
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        setShowJumpButton(false);
    };

    const scrollToMessage = (msgId) => {
        const el = msgRefs.current[msgId];
        if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.classList.add("bg-white/10", "ring-1", "ring-white/20", "transition-all", "duration-500");
            setTimeout(() => el.classList.remove("bg-white/10", "ring-1", "ring-white/20", "transition-all", "duration-500"), 1500);
        } else {
            toast("Original message not loaded", { icon: '🔍', style: { borderRadius: '10px', background: '#333', color: '#fff' } });
        }
    };

    // --- ACTIONS ---
    const handleDeleteMessage = async (msgId) => { if (confirm("Unsend?")) try { await deleteDoc(doc(db, ...collectionPath, msgId)); } catch (e) { toast.error("Error"); } };
    const saveEdit = async (msgId) => { if (!editText.trim()) return; await updateDoc(doc(db, ...collectionPath, msgId), { text: editText, isEdited: true }); setEditingId(null); };

    const handleForward = async (targetUserId) => {
        if (!isForwarding || !targetUserId) return;
        const chatId = [currentUser.uid, targetUserId].sort().join("_");
        const targetPath = ['artifacts', 'unity-work-os', 'public', 'data', 'direct_messages', chatId, 'messages'];
        try {
            await addDoc(collection(db, ...targetPath), {
                text: isForwarding.text, attachment: isForwarding.attachment || null, senderId: currentUser.uid, senderName: currentUser.name, senderAvatar: currentUser.avatar || null, createdAt: serverTimestamp(), isForwarded: true
            });
            toast.success("Forwarded!"); setIsForwarding(null);
        } catch (e) { toast.error("Failed"); }
    };

    const processFile = (file) => {
        if (!file || file.size > 50000000) return toast.error("Max 50MB");
        setSelectedFile(file); const r = new FileReader(); r.onloadend = () => setFilePreview(r.result); r.readAsDataURL(file);
    };

    const uploadToCloudinary = async (file) => {
        const formData = new FormData(); formData.append("file", file); formData.append("upload_preset", UPLOAD_PRESET);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, { method: "POST", body: formData });
        const data = await res.json(); return { url: data.secure_url, type: data.resource_type, name: file.name };
    };

    const handleSendMessage = async (e) => {
        e.preventDefault(); if (!newMessage.trim() && !selectedFile) return;
        setSending(true);
        try {
            let attachmentData = null; if (selectedFile) attachmentData = await uploadToCloudinary(selectedFile);
            const msgData = {
                text: newMessage, attachment: attachmentData, senderId: currentUser.uid, senderName: currentUser.name || "User", senderAvatar: currentUser.avatar || null, createdAt: serverTimestamp(),
                replyTo: replyingTo ? { id: replyingTo.id, text: replyingTo.text, sender: replyingTo.senderName } : null
            };
            if (context === "team") { msgData.teamId = currentUser.teamId; msgData.senderRole = currentUser.role; }
            else if (context === "project") { msgData.projectId = queryValue; }
            else if (context === "direct") { msgData.participants = [currentUser.uid, queryValue]; }

            await addDoc(collection(db, ...collectionPath), msgData);
            setNewMessage(""); setSelectedFile(null); setFilePreview(null); setReplyingTo(null);
            setTimeout(scrollToBottom, 100);
        } catch (error) { toast.error("Failed"); } finally { setSending(false); }
    };

    const renderAttachment = (msg) => {
        if (!msg.attachment) return null;
        const { url, type, name } = msg.attachment;
        if (type === 'image') return <div className="mt-2 rounded-lg overflow-hidden max-w-xs border border-white/10"><a href={url} target="_blank"><img src={url} className="w-full object-cover" /></a></div>;
        return <a href={url} target="_blank" className="flex items-center gap-2 mt-2 bg-black/20 p-2 rounded border border-white/10"><File size={14} /> <span className="text-xs underline">{name}</span></a>;
    };

    return (
        <div className="flex flex-col h-full relative" onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }} onDragLeave={() => setIsDragging(false)} onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]) }}>

            {/* MESSAGES AREA - Parent is Flex Col */}
            <div
                ref={chatContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto min-h-0 p-4 custom-scrollbar bg-[#0a0a0a] relative flex flex-col"
            >
                {/* MT-AUTO pushes content to bottom */}
                <div className="mt-auto space-y-2">

                    {loading ? (
                        <ChatSkeleton />
                    ) : (
                        <>
                            {displayedMessages.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-40 text-gray-500 opacity-60 mb-10">
                                    <Send size={40} className="mb-2 opacity-50" />
                                    <p className="text-sm">
                                        {filterText ? "No matching messages found." : "No messages yet. Say hi!"}
                                    </p>
                                </div>
                            )}

                            {displayedMessages.map((msg, index) => {
                                const isMe = msg.senderId === currentUser.uid;
                                const isReplyingToThis = replyingTo?.id === msg.id;
                                const isSequence = index > 0 && displayedMessages[index - 1].senderId === msg.senderId;

                                return (
                                    <div
                                        key={msg.id}
                                        ref={el => msgRefs.current[msg.id] = el}
                                        className={`flex flex-col group ${isMe ? 'items-end' : 'items-start'} ${isReplyingToThis ? 'opacity-50' : 'opacity-100'} transition-all duration-300`}
                                    >
                                        <div className={`flex items-end gap-3 max-w-[85%] ${isMe ? 'flex-row-reverse' : 'flex-row'} ${isSequence ? 'mt-0.5' : 'mt-4'}`}>

                                            {/* Avatar (Hidden if sequence) */}
                                            <div className={`w-9 h-9 flex-shrink-0 flex items-center justify-center ${isSequence ? 'opacity-0' : 'opacity-100'}`}>
                                                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border border-white/5 overflow-hidden ${isMe ? 'bg-blue-600 text-white' : 'bg-[#1e1e21] text-gray-400'}`}>
                                                    {msg.senderAvatar ? <img src={msg.senderAvatar} className="w-full h-full object-cover" /> : msg.senderName[0]}
                                                </div>
                                            </div>

                                            <div className="flex flex-col max-w-full">
                                                {/* Reply Preview */}
                                                {msg.replyTo && (
                                                    <div onClick={() => scrollToMessage(msg.replyTo.id)} className={`mb-1 cursor-pointer flex items-center gap-2 px-3 py-1 rounded-lg text-[10px] bg-white/5 border border-white/5 hover:bg-white/10 transition-colors w-fit max-w-full ${isMe ? 'self-end' : 'self-start'}`}>
                                                        <div className="w-0.5 h-3 bg-blue-500 rounded-full" />
                                                        <span className="font-bold text-gray-400">{msg.replyTo.sender}:</span>
                                                        <span className="text-gray-500 truncate max-w-[150px]">{msg.replyTo.text}</span>
                                                    </div>
                                                )}

                                                {/* Message Bubble */}
                                                <div className={`
                                                    relative px-4 py-2 text-sm shadow-sm border group/bubble 
                                                    ${isMe ? 'bg-blue-600 text-white border-blue-500 rounded-2xl rounded-tr-sm' : 'bg-[#1e1e21] border-white/5 text-gray-200 rounded-2xl rounded-tl-sm'}
                                                    ${isReplyingToThis ? 'ring-2 ring-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : ''}
                                                `}>
                                                    {!isMe && !isSequence && <div className="text-[10px] font-bold text-gray-500 mb-0.5 ml-0.5">{msg.senderName}</div>}
                                                    {msg.isForwarded && <div className="text-[9px] text-gray-400 italic mb-1 flex items-center gap-1"><Share size={8} /> Forwarded</div>}

                                                    {editingId === msg.id ? (
                                                        <div className="flex flex-col gap-2 min-w-[200px]">
                                                            <input autoFocus value={editText} onChange={(e) => setEditText(e.target.value)} className="bg-black/20 border border-white/10 rounded px-2 py-1 text-sm text-white outline-none focus:border-blue-400" />
                                                            <div className="flex justify-end gap-2"><button onClick={() => setEditingId(null)}><X size={14} /></button><button onClick={() => saveEdit(msg.id)}><Check size={14} /></button></div>
                                                        </div>
                                                    ) : (
                                                        <p className="whitespace-pre-wrap leading-relaxed">
                                                            {/* Highlight Search Text */}
                                                            {filterText ? (
                                                                msg.text.split(new RegExp(`(${filterText})`, 'gi')).map((part, i) =>
                                                                    part.toLowerCase() === filterText.toLowerCase() ? <span key={i} className="bg-yellow-500/30 text-yellow-200 rounded px-0.5">{part}</span> : part
                                                                )
                                                            ) : msg.text}
                                                            {msg.isEdited && <span className="text-[9px] opacity-60 ml-1">(edited)</span>}
                                                        </p>
                                                    )}
                                                    {renderAttachment(msg)}

                                                    {/* Hover Menu */}
                                                    <div className={`absolute -top-4 ${isMe ? 'right-0' : 'left-0'} hidden group-hover/bubble:flex bg-[#252529] border border-white/10 rounded-lg shadow-xl overflow-hidden z-20`}>
                                                        <button onClick={() => setReplyingTo(msg)} className="p-1.5 hover:bg-white/10 text-gray-400 hover:text-white" title="Reply"><Reply size={12} /></button>
                                                        <button onClick={() => setIsForwarding(msg)} className="p-1.5 hover:bg-white/10 text-gray-400 hover:text-white" title="Forward"><Share size={12} /></button>
                                                        {isMe && <button onClick={() => { setEditingId(msg.id); setEditText(msg.text) }} className="p-1.5 hover:bg-white/10 text-gray-400 hover:text-blue-400"><Edit2 size={12} /></button>}
                                                        {isMe && <button onClick={() => handleDeleteMessage(msg.id)} className="p-1.5 hover:bg-white/10 text-gray-400 hover:text-red-400"><Trash2 size={12} /></button>}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Timestamp */}
                                        {!isSequence && <div className={`text-[9px] text-gray-600 mt-1 mx-12 mb-1 ${isMe ? 'text-right' : 'text-left'}`}>{formatTime(msg.createdAt)}</div>}
                                    </div>
                                );
                            })}

                            {/* Invisible Element for Auto-Scroll Target */}
                            <div ref={messagesEndRef} className="h-px" />
                        </>
                    )}
                </div>
            </div>

            {/* JUMP TO PRESENT BUTTON */}
            {showJumpButton && (
                <button onClick={scrollToBottom} className="absolute bottom-24 right-6 z-30 bg-[#252529] text-white p-3 rounded-full shadow-2xl border border-white/10 hover:bg-blue-600 hover:border-blue-500 transition-all duration-300 animate-bounce" title="Jump to present"><ArrowDown size={20} /></button>
            )}

            {/* REPLY BANNER */}
            {replyingTo && (
                <div className="px-4 py-2 bg-[#1a1a1d] border-t border-white/5 flex justify-between items-center text-xs text-gray-400 animate-fade-in relative z-20">
                    <div className="flex items-center gap-2"><CornerDownRight size={16} className="text-blue-500" /><div className="flex flex-col"><span className="text-[10px] text-gray-500 uppercase font-bold">Replying to</span><span className="text-blue-400 font-bold">{replyingTo.senderName}</span></div></div>
                    <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-white/10 rounded-full text-gray-500 hover:text-white"><X size={14} /></button>
                </div>
            )}

            {/* INPUT AREA */}
            <form onSubmit={handleSendMessage} className="p-4 bg-[#151518] border-t border-white/5 shrink-0 flex gap-3 items-end relative z-20">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 text-gray-400 hover:text-white bg-[#252529] rounded-xl transition-colors border border-white/5 hover:border-white/10"><UploadCloud size={20} /></button>
                <input type="file" ref={fileInputRef} onChange={(e) => processFile(e.target.files[0])} className="hidden" />
                <div className="flex-1 bg-[#0a0a0a] border border-white/10 rounded-xl flex flex-col px-4 py-2.5 focus-within:border-blue-500/50 transition-colors shadow-inner">
                    {selectedFile && <div className="flex justify-between items-center text-xs text-blue-400 mb-2 border-b border-white/5 pb-1"><span>{selectedFile.name}</span><button type="button" onClick={() => setSelectedFile(null)}><X size={12} /></button></div>}
                    <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder={placeholder} className="bg-transparent outline-none text-sm text-white placeholder-gray-500 w-full" />
                </div>
                <button type="submit" disabled={sending || (!newMessage.trim() && !selectedFile)} className="p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl disabled:opacity-50 transition-all hover:scale-105 shadow-lg shadow-blue-900/20">{sending ? <Loader size={20} className="animate-spin" /> : <Send size={20} />}</button>
            </form>

            {/* FORWARD MODAL (PORTAL) */}
            {isForwarding && createPortal(
                <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-[#151518] w-full max-w-sm rounded-2xl border border-white/10 p-4 shadow-2xl relative animate-fade-in">
                        <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-white">Forward Message</h3><button onClick={() => setIsForwarding(null)} className="p-1 hover:bg-white/10 rounded-full transition-colors"><X size={16} className="text-gray-500 hover:text-white" /></button></div>
                        <div className="bg-[#0a0a0a] p-3 rounded-lg text-xs text-gray-400 mb-4 italic border border-white/5 line-clamp-2">"{isForwarding.text}"</div>
                        <div className="max-h-60 overflow-y-auto space-y-1 custom-scrollbar">
                            {members.filter(m => m.id !== currentUser.uid).map(m => (
                                <button key={m.id} onClick={() => handleForward(m.id)} className="w-full flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg text-left transition-colors group">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-xs font-bold text-white border border-transparent group-hover:border-blue-500/50 transition-colors">{m.name[0]}</div>
                                    <div className="flex-1"><div className="text-sm text-gray-200 group-hover:text-white">{m.name}</div><div className="text-[10px] text-gray-500">{m.role}</div></div>
                                    <ChevronRight size={14} className="ml-auto text-gray-600 group-hover:text-blue-400" />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
export default GenericChat;