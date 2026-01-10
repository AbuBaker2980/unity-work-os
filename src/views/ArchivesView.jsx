import React, { useState, useEffect } from 'react';
import {
    Book, Code, Link as LinkIcon, Plus, Search, Folder, FolderPlus,
    FileText, Copy, ExternalLink, Trash2, Save, X, Database,
    Download, ChevronRight, CornerUpLeft, Loader, UploadCloud, Edit2, Check,
    Maximize2, Minimize2
} from 'lucide-react';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from "../firebase/config";
import toast from 'react-hot-toast';

const ArchivesView = ({ user }) => {
    const [activeCategory, setActiveCategory] = useState('snippets');
    const [items, setItems] = useState([]);
    const [currentFolder, setCurrentFolder] = useState('root');
    const [folderPath, setFolderPath] = useState([{ id: 'root', name: 'Home' }]);
    const [searchTerm, setSearchTerm] = useState("");

    // Modals
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);

    // Editing State
    const [editMode, setEditMode] = useState(false);
    const [editItemId, setEditItemId] = useState(null);

    // UI State
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Loading States
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [isSavingFile, setIsSavingFile] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // Form State
    const [newItem, setNewItem] = useState({ title: '', content: '' });
    const [newFolderName, setNewFolderName] = useState('');

    // Drag State
    const [isDraggingOver, setIsDraggingOver] = useState(false);

    useEffect(() => {
        if (!user?.teamId) return;

        const q = query(
            collection(db, 'artifacts', 'unity-work-os', 'public', 'data', 'archives'),
            where('teamId', '==', user.teamId),
            where('category', '==', activeCategory)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const allData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setItems(allData);
        });

        return () => unsubscribe();
    }, [user.teamId, activeCategory]);

    useEffect(() => {
        setCurrentFolder('root');
        setFolderPath([{ id: 'root', name: 'Home' }]);
    }, [activeCategory]);

    const getItemCount = (folderId) => {
        return items.filter(i => i.parentFolderId === folderId && i.type !== 'folder').length;
    };

    // --- EDIT HANDLERS ---
    const openEditModal = (item) => {
        setEditMode(true);
        setEditItemId(item.id);
        setNewItem({ title: item.title, content: item.content });
        setIsAddModalOpen(true);
    };

    const closeModals = () => {
        setIsAddModalOpen(false);
        setIsFolderModalOpen(false);
        setEditMode(false);
        setEditItemId(null);
        setNewItem({ title: '', content: '' });
        setNewFolderName('');
        setIsFullscreen(false);
    };

    // --- DRAG & DROP LOGIC ---
    const handleDragStart = (e, itemId) => { e.dataTransfer.setData("itemId", itemId); };

    const handleMainDrop = async (e, targetFolderId = currentFolder) => {
        e.preventDefault(); e.stopPropagation(); setIsDraggingOver(false);
        const internalId = e.dataTransfer.getData("itemId");

        if (internalId) {
            if (internalId === targetFolderId) return;
            try {
                await updateDoc(doc(db, 'artifacts', 'unity-work-os', 'public', 'data', 'archives', internalId), { parentFolderId: targetFolderId });
                toast.success("Item moved!");
            } catch (error) { toast.error("Failed to move item."); }
            return;
        }

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) handleFileUpload(files, targetFolderId);
    };

    const handleFileUpload = async (files, targetFolderId) => {
        setIsUploading(true);
        const toastId = toast.loading(`Uploading ${files.length} file(s)...`);
        try {
            let count = 0;
            for (const file of files) {
                const textContent = await file.text();
                await addDoc(collection(db, 'artifacts', 'unity-work-os', 'public', 'data', 'archives'), {
                    title: file.name, content: textContent, type: 'file', parentFolderId: targetFolderId,
                    category: activeCategory, teamId: user.teamId, createdBy: user.name, createdAt: serverTimestamp()
                });
                count++;
            }
            logActivity(`uploaded ${count} files`, 'ARCHIVE_UPLOAD');
            toast.success("Uploaded successfully!", { id: toastId });
        } catch (error) { toast.error("Failed. Ensure text files.", { id: toastId }); }
        finally { setIsUploading(false); }
    };

    const logActivity = async (text, type) => {
        await addDoc(collection(db, 'artifacts', 'unity-work-os', 'public', 'data', 'activities'), {
            text: `${user.name} ${text}`, type, timestamp: serverTimestamp(), teamId: user.teamId, meta: { view: 'archives' }
        });
    };

    // --- CREATE & UPDATE LOGIC ---
    const handleSaveFile = async () => {
        if (!newItem.title || !newItem.content) return toast.error("Title and Content required");
        setIsSavingFile(true);
        try {
            const collectionRef = collection(db, 'artifacts', 'unity-work-os', 'public', 'data', 'archives');

            if (editMode && editItemId) {
                await updateDoc(doc(collectionRef, editItemId), {
                    title: newItem.title,
                    content: newItem.content,
                    lastModified: serverTimestamp()
                });
                toast.success("File updated!");
                logActivity(`updated file "${newItem.title}"`, 'ARCHIVE_UPDATE');
            } else {
                await addDoc(collectionRef, {
                    ...newItem, type: 'file', parentFolderId: currentFolder, category: activeCategory,
                    teamId: user.teamId, createdBy: user.name, createdAt: serverTimestamp()
                });
                toast.success("File saved!");
                logActivity(`created file "${newItem.title}"`, 'ARCHIVE_CREATE');
            }
            closeModals();
        } catch (error) {
            console.error(error);
            toast.error("Failed to save");
        } finally {
            setIsSavingFile(false);
        }
    };

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;
        setIsCreatingFolder(true);
        try {
            await addDoc(collection(db, 'artifacts', 'unity-work-os', 'public', 'data', 'archives'), {
                title: newFolderName, type: 'folder', parentFolderId: currentFolder, category: activeCategory,
                teamId: user.teamId, createdBy: user.name, createdAt: serverTimestamp()
            });
            logActivity(`created folder "${newFolderName}"`, 'ARCHIVE_FOLDER');
            closeModals();
            toast.success("Folder created!");
        } catch (error) { toast.error("Failed to create folder"); }
        finally { setIsCreatingFolder(false); }
    };

    const handleDelete = async (item) => {
        if (!confirm(`Delete "${item.title}"?`)) return;
        await deleteDoc(doc(db, 'artifacts', 'unity-work-os', 'public', 'data', 'archives', item.id));
        logActivity(`deleted "${item.title}"`, 'ARCHIVE_DELETE');
        toast.success("Deleted");
    };

    const enterFolder = (folder) => {
        setCurrentFolder(folder.id);
        setFolderPath(prev => [...prev, { id: folder.id, name: folder.title }]);
    };

    const navigateBreadcrumb = (index) => {
        const newPath = folderPath.slice(0, index + 1);
        setFolderPath(newPath);
        setCurrentFolder(newPath[newPath.length - 1].id);
    };

    const moveItemUp = async (item) => {
        if (folderPath.length <= 1) return;
        const parentId = folderPath[folderPath.length - 2].id;
        await updateDoc(doc(db, 'artifacts', 'unity-work-os', 'public', 'data', 'archives', item.id), { parentFolderId: parentId });
        toast.success("Item moved up");
    };

    const copyToClipboard = (text) => { navigator.clipboard.writeText(text); toast.success("Copied!"); };

    const downloadFile = (title, content, category) => {
        const element = document.createElement("a");
        const file = new Blob([content], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);
        if (title.includes('.')) element.download = title;
        else {
            const ext = category === 'snippets' ? 'cs' : 'txt';
            element.download = `${title}.${ext}`;
        }
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    const currentItems = items.filter(i => {
        const isChild = (i.parentFolderId || 'root') === currentFolder;
        const matchesSearch = i.title.toLowerCase().includes(searchTerm.toLowerCase());
        if (searchTerm) return matchesSearch && i.type === 'file';
        return isChild;
    });

    const visibleFolders = currentItems.filter(i => i.type === 'folder');
    const visibleFiles = currentItems.filter(i => i.type !== 'folder');

    const getPlaceholders = () => {
        switch (activeCategory) {
            case 'snippets': return { title: "e.g. AdManager Script", content: "public class..." };
            case 'docs': return { title: "e.g. Game GDD", content: "# Game Details..." };
            case 'links': return { title: "e.g. Asset Pack", content: "https://..." };
            default: return { title: "", content: "" };
        }
    };
    const placeholders = getPlaceholders();

    return (
        <div className="h-full flex flex-col bg-[#0a0a0a] relative overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

            <div className="p-6 border-b border-white/5 flex justify-between items-center relative z-10 bg-[#0a0a0a]/80 backdrop-blur-md">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Database className="text-emerald-500" /> THE ARCHIVES
                    </h1>
                    <p className="text-xs text-gray-500 font-mono mt-1">Knowledge Base & Code Repository</p>
                </div>
                <div className="flex gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-gray-500" size={16} />
                        <input type="text" placeholder="Search files..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-[#151518] border border-white/10 pl-10 pr-4 py-2 rounded-xl text-sm text-gray-300 focus:border-emerald-500/50 outline-none w-64" />
                    </div>
                    <button onClick={() => setIsFolderModalOpen(true)} className="bg-[#151518] hover:bg-white/5 text-emerald-400 border border-emerald-500/30 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"><FolderPlus size={16} /> New Folder</button>
                    <button onClick={() => setIsAddModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-900/20"><Plus size={16} /> Add File</button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden relative z-10">
                <div className="w-64 border-r border-white/5 p-4 space-y-2 bg-[#0f0f12]">
                    {[{ id: 'snippets', label: 'Code Snippets', icon: Code }, { id: 'docs', label: 'Documentation', icon: FileText }, { id: 'links', label: 'Resource Links', icon: LinkIcon }].map(cat => (
                        <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeCategory === cat.id ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'}`}>
                            <cat.icon size={18} /> {cat.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 flex flex-col min-h-0">
                    <div className="px-6 py-3 border-b border-white/5 bg-[#0f0f12]/50 flex items-center gap-2 text-sm">
                        {folderPath.map((folder, index) => (
                            <React.Fragment key={folder.id}>
                                <button onClick={() => navigateBreadcrumb(index)} className={`hover:text-emerald-400 transition-colors ${index === folderPath.length - 1 ? 'text-white font-bold' : 'text-gray-500'}`}>{folder.name}</button>
                                {index < folderPath.length - 1 && <ChevronRight size={14} className="text-gray-600" />}
                            </React.Fragment>
                        ))}
                    </div>

                    {/* --- MAIN DROP ZONE --- */}
                    <div className={`flex-1 overflow-y-auto p-6 custom-scrollbar transition-colors ${isDraggingOver ? 'bg-emerald-500/5' : ''}`} onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }} onDragLeave={() => setIsDraggingOver(false)} onDrop={(e) => handleMainDrop(e, currentFolder)}>
                        {isDraggingOver && (
                            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-none">
                                <div className="bg-[#151518] p-8 rounded-3xl border-2 border-emerald-500 border-dashed animate-bounce flex flex-col items-center">
                                    <UploadCloud size={64} className="text-emerald-500 mb-4" /><h3 className="text-2xl font-bold text-white">Drop to Upload</h3>
                                </div>
                            </div>
                        )}

                        {visibleFolders.length === 0 && visibleFiles.length === 0 && !searchTerm && (
                            <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-80 pointer-events-none">
                                <Folder size={48} className="mb-4 text-gray-700" /><p className="text-sm font-bold">This folder is empty.</p>
                            </div>
                        )}

                        {visibleFolders.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
                                {visibleFolders.map(folder => (
                                    <div key={folder.id} onClick={() => enterFolder(folder)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleMainDrop(e, folder.id)} className="group bg-[#151518] border border-white/5 p-4 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-[#1a1a1d] hover:border-emerald-500/50 transition-all relative">
                                        <Folder size={40} className="text-emerald-500/80 mb-2 group-hover:scale-110 transition-transform" fill="currentColor" fillOpacity={0.2} />
                                        <span className="text-sm text-gray-300 font-bold truncate w-full text-center">{folder.title}</span>
                                        <button onClick={(e) => { e.stopPropagation(); handleDelete(folder); }} className="absolute top-2 right-2 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12} /></button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {visibleFiles.map(item => (
                                <div key={item.id} draggable="true" onDragStart={(e) => handleDragStart(e, item.id)} className="bg-[#151518] border border-white/5 rounded-2xl p-5 hover:border-emerald-500/30 transition-all group relative overflow-hidden flex flex-col active:cursor-grabbing cursor-grab">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">{activeCategory === 'snippets' ? <Code size={18} /> : activeCategory === 'docs' ? <Book size={18} /> : <LinkIcon size={18} />}</div>
                                            <div><h3 className="font-bold text-gray-200 text-sm truncate w-48" title={item.title}>{item.title}</h3><p className="text-[10px] text-gray-600 font-mono">by {item.createdBy}</p></div>
                                        </div>
                                        <div className="flex gap-1">
                                            <button onClick={() => openEditModal(item)} className="p-1.5 text-gray-500 hover:text-white rounded hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" title="Edit"><Edit2 size={14} /></button>
                                            {currentFolder !== 'root' && <button onClick={() => moveItemUp(item)} className="p-1.5 text-gray-500 hover:text-blue-400 rounded hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" title="Move Up"><CornerUpLeft size={14} /></button>}
                                            <button onClick={() => handleDelete(item)} className="p-1.5 text-gray-500 hover:text-red-400 rounded hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
                                        </div>
                                    </div>

                                    {activeCategory === 'snippets' && (
                                        <div className="relative mt-2 flex-1 group/code">
                                            <pre className="bg-[#0a0a0a] p-3 rounded-lg text-xs text-gray-400 font-mono overflow-x-auto border border-white/5 custom-scrollbar max-h-40"><code>{item.content}</code></pre>
                                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/code:opacity-100 transition-opacity">
                                                <button onClick={() => downloadFile(item.title, item.content, 'snippets')} className="p-1.5 bg-white/10 hover:bg-white/20 rounded text-gray-400 hover:text-blue-400 transition-colors"><Download size={14} /></button>
                                                <button onClick={() => copyToClipboard(item.content)} className="p-1.5 bg-white/10 hover:bg-white/20 rounded text-gray-400 hover:text-white transition-colors"><Copy size={14} /></button>
                                            </div>
                                        </div>
                                    )}
                                    {activeCategory === 'docs' && (
                                        <div className="mt-2 relative flex-1">
                                            <div className="text-sm text-gray-400 leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto custom-scrollbar pr-2 font-mono bg-black/20 p-3 rounded-lg border border-white/5">{item.content}</div>
                                            <div className="flex gap-2 justify-end mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => copyToClipboard(item.content)} className="flex items-center gap-1 text-[10px] bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white px-2 py-1.5 rounded transition-colors"><Copy size={12} /> Copy</button>
                                                <button onClick={() => downloadFile(item.title, item.content, 'docs')} className="flex items-center gap-1 text-[10px] bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 hover:text-white px-2 py-1.5 rounded transition-colors"><Download size={12} /> Download</button>
                                            </div>
                                        </div>
                                    )}
                                    {activeCategory === 'links' && (
                                        <div className="mt-2 flex-1">
                                            <a href={item.content} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-xs bg-blue-500/10 p-3 rounded-xl border border-blue-500/20 transition-colors"><ExternalLink size={14} /> {item.content}</a>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* --- ADD / EDIT FILE MODAL (FIXED POSITIONING) --- */}
            {isAddModalOpen && (
                // 🛑 CHANGED: absolute instead of fixed, removes p-4 in fullscreen
                <div className={`absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in ${isFullscreen ? '' : 'p-4'}`}>

                    <div className={`bg-[#151518] border border-white/10 flex flex-col shadow-2xl transition-all duration-300 ${isFullscreen
                            ? 'w-full h-full rounded-none border-0' // Fullscreen Mode fills PARENT
                            : 'w-full max-w-lg rounded-2xl' // Default Mode
                        }`}>
                        <div className="p-5 border-b border-white/5 flex justify-between items-center bg-[#1a1a1d]">
                            <h2 className="text-white font-bold">{editMode ? 'Edit File' : `Add ${activeCategory}`}</h2>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setIsFullscreen(!isFullscreen)} className="text-gray-500 hover:text-white p-1 rounded hover:bg-white/10" title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
                                    {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                                </button>
                                <button onClick={closeModals}><X size={20} className="text-gray-500 hover:text-white" /></button>
                            </div>
                        </div>

                        <div className="p-6 space-y-4 flex-1 flex flex-col min-h-0 overflow-y-auto">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Title / Filename</label>
                                <input className="w-full bg-[#0a0a0a] border border-white/10 p-3 rounded-xl text-sm text-white focus:border-emerald-500 outline-none" placeholder={placeholders.title} value={newItem.title} onChange={e => setNewItem({ ...newItem, title: e.target.value })} />
                            </div>
                            <div className="flex-1 flex flex-col">
                                <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Content</label>
                                {activeCategory === 'links' ? (
                                    <input className="w-full bg-[#0a0a0a] border border-white/10 p-3 rounded-xl text-sm text-blue-400 focus:border-emerald-500 outline-none" placeholder={placeholders.content} value={newItem.content} onChange={e => setNewItem({ ...newItem, content: e.target.value })} />
                                ) : (
                                    <textarea
                                        className={`w-full bg-[#0a0a0a] border border-white/10 p-3 rounded-xl text-sm text-gray-300 font-mono focus:border-emerald-500 outline-none resize-none custom-scrollbar ${isFullscreen ? 'flex-1' : 'h-64'}`}
                                        placeholder={placeholders.content}
                                        value={newItem.content}
                                        onChange={e => setNewItem({ ...newItem, content: e.target.value })}
                                    />
                                )}
                            </div>
                        </div>
                        <div className="p-5 border-t border-white/5 flex justify-end gap-3 bg-[#1a1a1d]">
                            <button onClick={closeModals} className="text-gray-500 hover:text-white px-4 py-2 text-sm font-bold">Cancel</button>
                            <button onClick={handleSaveFile} disabled={isSavingFile} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg">
                                {isSavingFile ? <Loader size={16} className="animate-spin" /> : editMode ? <Check size={16} /> : <Save size={16} />}
                                {isSavingFile ? 'Saving...' : editMode ? 'Update' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- CREATE FOLDER MODAL --- */}
            {isFolderModalOpen && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-[#151518] border border-white/10 w-full max-w-sm rounded-2xl shadow-2xl flex flex-col">
                        <div className="p-5 border-b border-white/5 flex justify-between items-center">
                            <h2 className="text-white font-bold flex items-center gap-2"><FolderPlus size={18} className="text-emerald-500" /> New Folder</h2>
                            <button onClick={closeModals}><X size={20} className="text-gray-500 hover:text-white" /></button>
                        </div>
                        <div className="p-6">
                            <input className="w-full bg-[#0a0a0a] border border-white/10 p-3 rounded-xl text-sm text-white focus:border-emerald-500 outline-none" placeholder="Folder Name (e.g. Ads)" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} />
                        </div>
                        <div className="p-5 border-t border-white/5 flex justify-end gap-3">
                            <button onClick={handleCreateFolder} disabled={isCreatingFolder} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
                                {isCreatingFolder ? <Loader size={16} className="animate-spin" /> : null}
                                {isCreatingFolder ? 'Creating...' : 'Create Folder'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ArchivesView;