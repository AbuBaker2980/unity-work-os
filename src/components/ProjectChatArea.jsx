import { useState, useEffect, useRef } from "react";
import {
    collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, limit
} from "firebase/firestore";
import { MessageSquare, Send, Loader, Paperclip, X, Film, File, Download } from "lucide-react";
import { db } from "../firebase/config";
import { formatTime } from "../utils/dateUtils";
import toast from 'react-hot-toast';

// --- ✅ CONFIGURATION ---
const CLOUD_NAME = "dfnetnyzf";
const UPLOAD_PRESET = "unity-app";

const COLLECTION_PATH = ["artifacts", "unity-work-os", "public", "data", "project_messages"];

const ProjectChatArea = ({ project, currentUser }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");

    // --- ATTACHMENT STATE ---
    const [selectedFile, setSelectedFile] = useState(null);
    const [filePreview, setFilePreview] = useState(null);
    const [fileType, setFileType] = useState(null); // 'image', 'video', 'raw'

    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    // --- FETCH MESSAGES ---
    useEffect(() => {
        if (!project?.id) return;
        const msgsRef = collection(db, ...COLLECTION_PATH);
        const q = query(
            msgsRef,
            where("projectId", "==", project.id),
            orderBy("createdAt", "desc"),
            limit(50)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedMsgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).reverse();
            setMessages(fetchedMsgs);
        });
        return () => unsubscribe();
    }, [project.id]);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

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

    // --- UPLOAD TO CLOUDINARY (AUTO) ---
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

            const msgsRef = collection(db, ...COLLECTION_PATH);
            await addDoc(msgsRef, {
                text: newMessage,
                attachment: attachmentData,
                projectId: project.id,
                senderId: currentUser.uid,
                senderName: currentUser.name || "User",
                senderAvatar: currentUser.avatar || null,
                createdAt: serverTimestamp(),
            });

            setNewMessage("");
            clearAttachment();
        } catch (error) {
            console.error(error);
            toast.error("Failed to send message.");
        } finally {
            setSending(false);
        }
    };

    // --- RENDER CONTENT ---
    const renderAttachment = (msg) => {
        if (msg.imageUrl && !msg.attachment) {
            return (
                <div className="mb-2 rounded-lg overflow-hidden border border-white/10">
                    <a href={msg.imageUrl} target="_blank" rel="noopener noreferrer">
                        <img src={msg.imageUrl} alt="Attachment" className="max-w-full max-h-40 object-cover" />
                    </a>
                </div>
            );
        }

        if (!msg.attachment) return null;
        const { url, type, name } = msg.attachment;

        if (type === 'image') {
            return <div className="mb-2 rounded-lg overflow-hidden border border-white/10"><a href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt="Img" className="max-w-full max-h-40 object-cover" /></a></div>;
        }
        if (type === 'video') {
            return <div className="mb-2 rounded-lg overflow-hidden border border-white/10 bg-black"><video src={url} controls className="max-w-full max-h-40" /></div>;
        }
        return (
            <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-white/10 p-2 rounded-lg border border-white/10 hover:bg-white/20 transition-colors mb-2">
                <File size={16} className="text-blue-400" />
                <span className="text-xs font-bold text-white truncate w-24">{name || "File"}</span>
                <Download size={14} className="text-gray-400" />
            </a>
        );
    };

    return (
        <div className="flex flex-col h-[500px] bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden relative">
            <div className="p-4 border-b border-white/5 bg-[#151518] flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <MessageSquare size={16} className="text-blue-500" />
                    <span className="text-sm font-bold text-white">Project Discussion</span>
                </div>
                <span className="text-[10px] text-gray-500">Encrypted • Private</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#0f0f12]">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-600 space-y-2">
                        <MessageSquare size={32} opacity={0.5} />
                        <p className="text-xs">No discussions yet.</p>
                    </div>
                )}

                {messages.map((msg) => {
                    const isMe = msg.senderId === currentUser.uid;
                    return (
                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-fade-in`}>
                            <div className={`flex items-end gap-2 max-w-[85%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border flex-shrink-0 overflow-hidden ${isMe ? 'bg-blue-600 border-blue-400 text-white' : 'bg-[#222] border-white/10 text-gray-400'}`} title={msg.senderName}>
                                    {msg.senderAvatar ? <img src={msg.senderAvatar} alt="A" className="w-full h-full object-cover" /> : msg.senderName?.charAt(0).toUpperCase()}
                                </div>

                                <div className={`relative p-3 text-xs leading-relaxed rounded-2xl ${isMe ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-[#1a1a1d] border border-white/10 text-gray-300 rounded-tl-sm'}`}>
                                    {!isMe && <div className="text-[9px] font-bold text-gray-500 mb-1">{msg.senderName}</div>}
                                    {renderAttachment(msg)}
                                    {msg.text}
                                    <div className={`text-[9px] mt-1 text-right ${isMe ? 'text-blue-200' : 'text-gray-600'}`}>{formatTime(msg.createdAt)}</div>
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {selectedFile && (
                <div className="px-4 pb-2 bg-[#151518] border-t border-white/5 flex items-center gap-2 pt-2">
                    <div className="relative group">
                        {fileType === 'image' && filePreview && <img src={filePreview} alt="Preview" className="w-10 h-10 object-cover rounded-md border border-blue-500/50" />}
                        {fileType === 'video' && <div className="w-10 h-10 bg-black rounded-md border border-blue-500/50 flex items-center justify-center"><Film size={16} className="text-blue-400" /></div>}
                        {fileType === 'raw' && <div className="w-10 h-10 bg-white/5 rounded-md border border-white/20 flex items-center justify-center"><File size={16} className="text-gray-300" /></div>}
                        <button onClick={clearAttachment} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"><X size={10} /></button>
                    </div>
                    <span className="text-[10px] text-blue-400 truncate w-32">{selectedFile.name}</span>
                </div>
            )}

            <form onSubmit={handleSendMessage} className="p-3 bg-[#151518] border-t border-white/5 shrink-0">
                <div className="flex gap-2">
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                        <Paperclip size={16} />
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />

                    <input
                        type="text"
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        onPaste={handlePaste}
                        placeholder="Discuss this project..."
                        className="flex-1 bg-[#0a0a0a] border border-white/10 rounded-lg px-3 text-xs text-white focus:border-blue-500 outline-none"
                    />
                    <button type="submit" disabled={sending || (!newMessage.trim() && !selectedFile)} className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg disabled:opacity-50">
                        {sending ? <Loader size={16} className="animate-spin" /> : <Send size={16} />}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ProjectChatArea;