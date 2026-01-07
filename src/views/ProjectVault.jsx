import React, { useState, useEffect, useRef } from 'react';
import {
    Box, Settings, DollarSign, FileJson, ShoppingBag, Check, Cloud,
    Plus, Trash2, Upload, Key, History, X, Link as LinkIcon, ExternalLink,
    Download, Copy, Save, AlertCircle, Rocket, ChevronDown, ChevronUp, Package, GitCommit, Lock,
    MessageSquare, Users, ShieldCheck, CreditCard, Tag
} from 'lucide-react';
import InputField from "../components/InputField";
import ProjectChatArea from "../components/ProjectChatArea";
import toast from 'react-hot-toast';
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";

const ProjectVault = ({ project, folders, onUpdate, onClose, userRole, userName, user, logActivity, hasUnreadDiscussion, onMarkDiscussionRead }) => {
    // --- ROLE CHECKS ---
    const isTL = ['TL', 'Team Lead', 'Manager'].includes(userRole);
    const isQA = userRole === 'QA';
    const isCreative = ['Designer', '3D Modeler'].includes(userRole);
    const isDevOps = ['Developer', 'ASO'].includes(userRole);

    // --- PERMISSION CHECK FOR DISCUSSION ---
    const allowedMembers = project.allowedMembers || [];
    const canAccessDiscussion = isTL || allowedMembers.includes(user.uid);

    // --- DEFAULT TAB LOGIC ---
    const getDefaultTab = () => {
        if (isCreative) return 'discussion';
        if (isQA) return 'store';
        return 'general';
    };

    const [activeTab, setActiveTab] = useState(getDefaultTab());
    const [formData, setFormData] = useState({ ...project });
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // --- TEAM MEMBERS STATE ---
    const [teamMembers, setTeamMembers] = useState([]);
    const [expandedNetworkId, setExpandedNetworkId] = useState(null);

    const formDataRef = useRef(formData);
    const isDirtyRef = useRef(false);
    const modifiedSectionsRef = useRef(new Set());

    const fileInputRef = useRef(null);
    const keyStoreInputRef = useRef(null);

    // Initial Data Load
    useEffect(() => {
        let initialData = { ...project };
        if (!initialData.adsVault) initialData.adsVault = [];
        if (!initialData.inAppProducts) initialData.inAppProducts = [];
        if (!initialData.firebase) initialData.firebase = { files: [] };
        if (!initialData.keystore) initialData.keystore = { files: [] };
        if (!initialData.store) initialData.store = { versionHistory: [] };
        if (!initialData.assets) initialData.assets = { apk: '', aab: '' };
        if (!initialData.platform) initialData.platform = 'Android';
        if (!initialData.status) initialData.status = 'In Development';
        if (!initialData.allowedMembers) initialData.allowedMembers = [];

        setFormData(initialData);
        setHasUnsavedChanges(false);

        formDataRef.current = initialData;
        isDirtyRef.current = false;
        modifiedSectionsRef.current.clear();

        setActiveTab(getDefaultTab());
    }, [project]);

    // --- AUTO CLEAR UNREAD IF DEFAULT TAB IS DISCUSSION ---
    useEffect(() => {
        if (activeTab === 'discussion' && hasUnreadDiscussion && onMarkDiscussionRead) {
            onMarkDiscussionRead();
        }
    }, [activeTab, hasUnreadDiscussion]);

    useEffect(() => {
        formDataRef.current = formData;
        isDirtyRef.current = hasUnsavedChanges;
    }, [formData, hasUnsavedChanges]);

    useEffect(() => {
        if (isTL && user.teamId) {
            const fetchTeam = async () => {
                const q = query(collection(db, "users"), where("teamId", "==", user.teamId));
                const snap = await getDocs(q);
                const members = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setTeamMembers(members);
            };
            fetchTeam();
        }
    }, [isTL, user.teamId]);

    useEffect(() => {
        return () => {
            if (isDirtyRef.current && !isQA && !isCreative) {
                performSave(formDataRef.current, modifiedSectionsRef.current, true);
            }
        };
    }, []);

    const performSave = async (dataToSave, modifiedSet, isSilent = false) => {
        if (isQA || isCreative) return;

        await onUpdate(project.id, dataToSave);

        if (logActivity && modifiedSet.size > 0) {
            const sections = Array.from(modifiedSet).map(s => {
                if (s === 'discussion_access') return 'Discussion Access';
                if (s === 'ads') return 'Ad Networks';
                if (s === 'inapp') return 'In-App Products';
                if (s === 'firebase') return 'Firebase';
                if (s === 'keystore') return 'Keystore';
                if (s === 'store') return 'Release Settings';
                return 'General Settings';
            });
            const actionText = sections.length > 1
                ? sections.slice(0, -1).join(', ') + ' & ' + sections.slice(-1)
                : sections[0];

            logActivity(`${userName} updated ${actionText} for "${dataToSave.name}"`, 'PROJECT_UPDATE');
        }

        if (!isSilent) {
            setHasUnsavedChanges(false);
            modifiedSectionsRef.current.clear();
            toast.success("Changes saved successfully!");
        }
    };

    const toggleMemberAccess = (memberId) => {
        const currentList = formData.allowedMembers || [];
        let newList;
        if (currentList.includes(memberId)) {
            newList = currentList.filter(id => id !== memberId);
        } else {
            newList = [...currentList, memberId];
        }
        handleChange('allowedMembers', newList, null);
        markChange('discussion_access');
    };

    const handleReleaseVersion = async () => {
        if (isQA || isCreative) return;
        if (!formData.store?.versionCode) return toast.error("Please set a Version Code first.");

        let history = [...(formData.store.versionHistory || [])];
        const latestEntry = history[0];
        const currentVersionCode = formData.store.versionCode;

        const newEntry = {
            id: crypto.randomUUID(),
            versionCode: currentVersionCode,
            versionName: formData.store?.versionName || '1.0',
            notes: formData.store?.releaseNotes || 'No notes',
            apk: formData.assets?.apk || '',
            aab: formData.assets?.aab || '',
            updatedBy: userName || 'Unknown',
            date: new Date().toISOString()
        };

        let actionType = '';

        if (latestEntry && latestEntry.versionCode === currentVersionCode) {
            newEntry.id = latestEntry.id;
            newEntry.date = new Date().toISOString();
            history[0] = newEntry;
            actionType = 'UPDATED_RELEASE';
        } else {
            history.unshift(newEntry);
            actionType = 'NEW_RELEASE';
        }

        const updatedData = {
            ...formData,
            status: 'Live',
            store: {
                ...formData.store,
                versionHistory: history
            }
        };

        setFormData(updatedData);
        setHasUnsavedChanges(false);
        modifiedSectionsRef.current.clear();

        await onUpdate(project.id, updatedData);

        if (logActivity) {
            const logMsg = actionType === 'NEW_RELEASE'
                ? `${userName} released NEW version v${currentVersionCode}`
                : `${userName} updated release details for v${currentVersionCode}`;
            logActivity(logMsg, 'VERSION_RELEASE');
        }

        toast.success(`Version v${currentVersionCode} Released Successfully!`);
    };

    const markChange = (section) => {
        if (isQA || isCreative) return;
        setHasUnsavedChanges(true);
        modifiedSectionsRef.current.add(section);
    };

    const handleChange = (field, value, section = null) => {
        if (isQA || isCreative) return;
        markChange(section === 'assets' || section === 'store' ? 'store' : 'general');
        if (section) {
            setFormData(p => ({ ...p, [section]: { ...p[section], [field]: value } }));
        } else {
            setFormData(p => ({ ...p, [field]: value }));
        }
    };

    // --- ADS & IN-APP LOGIC ---
    const toggleNetwork = (id) => { setExpandedNetworkId(expandedNetworkId === id ? null : id); };
    const addNetwork = () => { if (isQA || isCreative) return; markChange('ads'); const newId = crypto.randomUUID(); setFormData(prev => ({ ...prev, adsVault: [...(prev.adsVault || []), { id: newId, networkName: 'New Network', adUnits: [] }] })); setExpandedNetworkId(newId); };
    const updateNetworkName = (netId, name) => { if (isQA || isCreative) return; markChange('ads'); setFormData(prev => ({ ...prev, adsVault: prev.adsVault.map(n => n.id === netId ? { ...n, networkName: name } : n) })); }
    const removeNetwork = (netId) => { if (isQA || isCreative) return; if (confirm('Delete network?')) { markChange('ads'); setFormData(prev => ({ ...prev, adsVault: prev.adsVault.filter(n => n.id !== netId) })); } };
    const addAdUnit = (netId) => { if (isQA || isCreative) return; markChange('ads'); setFormData(prev => ({ ...prev, adsVault: prev.adsVault.map(n => n.id === netId ? { ...n, adUnits: [...n.adUnits, { id: crypto.randomUUID(), name: '', type: 'Banner', unitId: '', notes: '' }] } : n) })); };
    const updateAdUnit = (netId, unitId, field, value) => { if (isQA || isCreative) return; markChange('ads'); setFormData(prev => ({ ...prev, adsVault: prev.adsVault.map(n => n.id === netId ? { ...n, adUnits: n.adUnits.map(u => u.id === unitId ? { ...u, [field]: value } : u) } : n) })); }
    const removeAdUnit = (netId, unitId) => { if (isQA || isCreative) return; if (confirm("Delete Key?")) { markChange('ads'); setFormData(prev => ({ ...prev, adsVault: prev.adsVault.map(n => n.id === netId ? { ...n, adUnits: n.adUnits.filter(u => u.id !== unitId) } : n) })); } };

    // --- IN-APP PRODUCTS HANDLERS ---
    const addInAppProduct = () => {
        if (isQA || isCreative) return;
        markChange('inapp');
        const newProduct = {
            id: crypto.randomUUID(),
            productId: '',
            name: '',
            type: 'Non-Consumable',
            desc: ''
        };
        setFormData(prev => ({ ...prev, inAppProducts: [...(prev.inAppProducts || []), newProduct] }));
    };

    const updateInAppProduct = (prodId, field, value) => {
        if (isQA || isCreative) return;
        markChange('inapp');
        setFormData(prev => ({
            ...prev,
            inAppProducts: prev.inAppProducts.map(p => p.id === prodId ? { ...p, [field]: value } : p)
        }));
    };

    const removeInAppProduct = (prodId) => {
        if (isQA || isCreative) return;
        if (confirm("Delete this product?")) {
            markChange('inapp');
            setFormData(prev => ({
                ...prev,
                inAppProducts: prev.inAppProducts.filter(p => p.id !== prodId)
            }));
        }
    };

    const copySingleId = (id) => { navigator.clipboard.writeText(id); toast.success("Copied!"); };
    const copyAllIds = () => { const allText = formData.adsVault.map(net => `=== ${net.networkName} ===\n` + net.adUnits.map(u => `${u.name} (${u.type}): ${u.unitId}`).join('\n')).join('\n\n'); navigator.clipboard.writeText(allText); toast.success("All Ad IDs copied!"); };
    const copyNetworkIds = (network) => { const text = network.adUnits.map(u => `${u.name} (${u.type}): ${u.unitId}`).join('\n'); navigator.clipboard.writeText(text); toast.success(`Copied IDs for ${network.networkName}`); };

    const handleFileUpload = (e, section) => {
        if (isQA || isCreative) return;
        const files = Array.from(e.target.files);
        if (!files.length) return;
        markChange(section);
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                setFormData(p => ({ ...p, [section]: { ...p[section], files: [...(p[section]?.files || []), { id: crypto.randomUUID(), name: file.name, content: event.target.result, size: file.size, uploadedAt: new Date().toISOString() }] } }));
            };
            section === 'keystore' ? reader.readAsDataURL(file) : reader.readAsText(file);
        });
        toast.success("File Uploaded");
    };
    const handleDownload = (file, section) => {
        const link = document.createElement("a");
        link.download = file.name;
        if (file.content.startsWith("data:")) { link.href = file.content; }
        else { const blob = new Blob([file.content], { type: "application/json" }); link.href = URL.createObjectURL(blob); }
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        if (logActivity) logActivity(`${userName} downloaded ${section === 'keystore' ? 'Keystore' : 'Firebase JSON'} for "${formData.name}"`, 'FILE_DOWNLOAD');
        toast.success("Download Started");
    };
    const removeFile = (fileId, section) => {
        if (isQA || isCreative) return;
        if (confirm("Delete file?")) {
            markChange(section);
            setFormData(p => ({ ...p, [section]: { ...p[section], files: p[section].files.filter(f => f.id !== fileId) } }));
            toast.success("File deleted");
        }
    };

    return (
        <div className="h-full flex flex-col bg-[#0f0f12] relative">
            <div className="p-6 border-b border-white/5 bg-[#0f0f12]/80 backdrop-blur-md sticky top-0 z-20 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500"><Box size={20} /></div>
                    <div>
                        <h2 className="font-bold text-white text-lg tracking-tight">{formData.name || 'New Project'}</h2>
                        <p className="text-xs text-gray-500 font-mono mt-0.5 flex items-center gap-2">
                            {hasUnsavedChanges && !isQA && !isCreative && <span className="text-yellow-500 flex items-center gap-1"><AlertCircle size={10} /> Unsaved</span>}
                            {(isQA || isCreative) && <span className="text-red-400 flex items-center gap-1 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 text-[9px] uppercase font-bold"><Lock size={8} /> Read-Only</span>}
                        </p>
                    </div>
                </div>
                <div className="flex gap-3 items-center">
                    {!isQA && !isCreative && (
                        <button
                            onClick={() => performSave(formData, modifiedSectionsRef.current)}
                            disabled={!hasUnsavedChanges}
                            className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg ${hasUnsavedChanges ? 'bg-green-600 hover:bg-green-500 text-white shadow-green-900/20 scale-105 animate-pulse' : 'bg-[#1a1a1d] text-gray-600 border border-white/5 cursor-default'}`}
                        >
                            <Save size={16} /> {hasUnsavedChanges ? "Save Changes" : "Saved"}
                        </button>
                    )}
                    <button onClick={onClose} className="bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white p-2.5 rounded-xl transition-colors"><X size={20} /></button>
                </div>
            </div>

            <div className="px-6 py-4 border-b border-white/5 bg-black/20 overflow-x-auto flex gap-2">
                {[
                    { id: 'general', icon: Settings, label: 'General' },
                    { id: 'discussion', icon: MessageSquare, label: 'Discussion' },
                    { id: 'store', icon: ShoppingBag, label: 'Release & Store' },
                    { id: 'inapp', icon: CreditCard, label: 'In-App Products' },
                    { id: 'ads', icon: DollarSign, label: 'Ad Network' },
                    { id: 'firebase', icon: FileJson, label: 'Firebase' },
                    { id: 'keystore', icon: Key, label: 'Keystore' }
                ].map(tab => {
                    let isLocked = false;
                    if (tab.id === 'discussion') {
                        if (!canAccessDiscussion) isLocked = true;
                    } else if (tab.id === 'store') {
                        if (isCreative) isLocked = true;
                    } else {
                        // Default locking for QA & Creative roles
                        if (isQA || isCreative) isLocked = true;

                        // Override: Ads are viewable (but not editable)
                        if (tab.id === 'ads') isLocked = false;
                    }

                    // Special Override: QA/Creative can VIEW but not edit ads
                    if ((isQA || isCreative) && tab.id === 'ads') {
                        isLocked = false;
                    }

                    return (
                        <button
                            key={tab.id}
                            onClick={() => {
                                if (isLocked) {
                                    toast.error("Access Restricted");
                                    return;
                                }
                                if (hasUnsavedChanges && !isQA && !isCreative) performSave(formData, modifiedSectionsRef.current, true);
                                setActiveTab(tab.id);
                                if (tab.id === 'discussion' && onMarkDiscussionRead) onMarkDiscussionRead();
                            }}
                            className={`
                                flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all relative
                                ${activeTab === tab.id ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}
                                ${isLocked ? 'opacity-50 cursor-not-allowed bg-transparent border-transparent' : ''}
                            `}
                        >
                            <tab.icon size={14} /> {tab.label}
                            {tab.id === 'discussion' && hasUnreadDiscussion && (
                                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-md border-2 border-[#0f0f12]"></span>
                            )}
                            {isLocked && <Lock size={10} />}
                        </button>
                    );
                })}
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="max-w-4xl mx-auto">
                    {activeTab === 'general' && (
                        <div className="bg-[#151518] border border-white/5 p-8 rounded-2xl shadow-xl space-y-6 animate-fade-in relative">
                            <InputField label="Project Name" value={formData.name} onChange={(v) => handleChange('name', v)} />
                            <div className="grid grid-cols-2 gap-6">
                                <div><label className="block text-xs text-gray-500 mb-2 font-bold uppercase tracking-wide">Platform</label><select value={formData.platform} onChange={(e) => handleChange('platform', e.target.value)} className="w-full bg-[#0a0a0a] border border-white/10 p-3 rounded-xl text-sm text-gray-200 outline-none focus:border-blue-500/50"><option value="Android">Android</option><option value="iOS">iOS</option><option value="PC">PC / Windows</option></select></div>
                                <div><label className="block text-xs text-gray-500 mb-2 font-bold uppercase tracking-wide">Project Status</label><select value={formData.status} onChange={(e) => handleChange('status', e.target.value)} className={`w-full bg-[#0a0a0a] border border-white/10 p-3 rounded-xl text-sm font-bold outline-none focus:border-blue-500/50 ${formData.status === 'Live' ? 'text-green-400' : formData.status === 'On Hold' ? 'text-red-400' : 'text-amber-400'}`}><option value="In Development">In Development</option><option value="Live">Live</option><option value="On Hold">On Hold</option></select></div>
                            </div>
                            <div className="mb-5"><label className="block text-xs text-gray-500 mb-2 font-bold uppercase tracking-wide">Folder</label><select value={formData.folderId || ''} onChange={(e) => handleChange('folderId', e.target.value)} className="w-full bg-[#0a0a0a] border border-white/10 p-3 rounded-xl text-sm text-gray-200 outline-none focus:border-blue-500/50"><option value="">-- Unassigned --</option>{folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select></div>
                            <InputField label="Package Name" value={formData.packageName} onChange={(v) => handleChange('packageName', v)} placeholder="com.company.game" />
                        </div>
                    )}

                    {activeTab === 'discussion' && canAccessDiscussion && (
                        <div className="animate-fade-in space-y-6">
                            {isTL && (
                                <div className="bg-[#151518] border border-white/5 p-6 rounded-2xl shadow-xl">
                                    <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                                        <ShieldCheck size={16} className="text-emerald-500" /> Manage Discussion Access
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {teamMembers.filter(m => m.id !== user.uid).map(member => {
                                            const isSelected = (formData.allowedMembers || []).includes(member.id);
                                            return (
                                                <button
                                                    key={member.id}
                                                    onClick={() => toggleMemberAccess(member.id)}
                                                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${isSelected ? 'bg-blue-600/10 border-blue-500/50 text-white' : 'bg-[#0a0a0a] border-white/10 text-gray-500 hover:border-white/20'}`}
                                                >
                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-600'}`}>
                                                        {isSelected && <Check size={10} className="text-white" />}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="text-xs font-bold truncate">{member.name}</div>
                                                        <div className="text-[9px] uppercase">{member.role}</div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                        {teamMembers.length <= 1 && <p className="text-xs text-gray-600 col-span-3">No other team members found.</p>}
                                    </div>
                                    <p className="text-[10px] text-gray-500 mt-4 italic">* Selected members will see this Discussion tab.</p>
                                </div>
                            )}
                            <ProjectChatArea project={project} currentUser={user} />
                        </div>
                    )}

                    {activeTab === 'inapp' && (
                        <div className="animate-fade-in">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2"><CreditCard size={18} className="text-pink-500" /> In-App Products</h3>
                                    <p className="text-xs text-gray-500">Manage consumable, non-consumable and subscription IDs.</p>
                                </div>
                                <button onClick={addInAppProduct} className="bg-pink-600/20 text-pink-400 border border-pink-500/30 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-pink-600/30 transition-colors">
                                    <Plus size={16} /> Add Product
                                </button>
                            </div>

                            <div className="space-y-3">
                                {formData.inAppProducts?.length === 0 && (
                                    <div className="bg-[#151518] border border-white/5 rounded-2xl p-8 text-center">
                                        <ShoppingBag size={32} className="text-gray-600 mx-auto mb-3" />
                                        <p className="text-gray-500 text-sm">No products added yet.</p>
                                    </div>
                                )}

                                {formData.inAppProducts?.map((product) => (
                                    <div key={product.id} className="bg-[#151518] border border-white/5 rounded-xl p-4 hover:border-pink-500/30 transition-all group">
                                        <div className="grid grid-cols-12 gap-4 items-center">
                                            {/* Product ID (Main Key) */}
                                            <div className="col-span-3 relative">
                                                <label className="text-[9px] text-gray-500 uppercase font-bold mb-1 block">Product ID</label>
                                                <input
                                                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-2 text-xs text-yellow-500 font-mono pr-8 focus:border-pink-500/50 outline-none"
                                                    value={product.productId}
                                                    onChange={(e) => updateInAppProduct(product.id, 'productId', e.target.value)}
                                                    placeholder="remove_ads"
                                                />
                                                <button onClick={() => copySingleId(product.productId)} className="absolute right-1 bottom-1 text-gray-600 hover:text-white p-1 rounded hover:bg-white/10" title="Copy ID">
                                                    <Copy size={12} />
                                                </button>
                                            </div>

                                            {/* Name */}
                                            <div className="col-span-3">
                                                <label className="text-[9px] text-gray-500 uppercase font-bold mb-1 block">Display Name</label>
                                                <input
                                                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-2 text-xs text-white focus:border-pink-500/50 outline-none"
                                                    value={product.name}
                                                    onChange={(e) => updateInAppProduct(product.id, 'name', e.target.value)}
                                                    placeholder="Remove Ads"
                                                />
                                            </div>

                                            {/* Type Dropdown */}
                                            <div className="col-span-3">
                                                <label className="text-[9px] text-gray-500 uppercase font-bold mb-1 block">Type</label>
                                                <select
                                                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-2 text-xs text-gray-300 focus:border-pink-500/50 outline-none"
                                                    value={product.type}
                                                    onChange={(e) => updateInAppProduct(product.id, 'type', e.target.value)}
                                                >
                                                    <option>Consumable</option>
                                                    <option>Non-Consumable</option>
                                                    <option>Subscription</option>
                                                </select>
                                            </div>

                                            {/* Delete Button */}
                                            <div className="col-span-3 flex items-end justify-end gap-2">
                                                {/* Description Field (Optional, taking remaining space visually or stacked) */}
                                                <div className="flex-1">
                                                    <label className="text-[9px] text-gray-500 uppercase font-bold mb-1 block">Note / Price</label>
                                                    <input
                                                        className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-2 text-xs text-gray-400 focus:border-pink-500/50 outline-none"
                                                        value={product.desc}
                                                        onChange={(e) => updateInAppProduct(product.id, 'desc', e.target.value)}
                                                        placeholder="e.g. $2.99"
                                                    />
                                                </div>
                                                <button onClick={() => removeInAppProduct(product.id)} className="text-gray-600 hover:text-red-400 p-2 rounded-lg bg-white/5 hover:bg-white/10 h-fit mt-5">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* EXISTING ADS TAB */}
                    {activeTab === 'ads' && (
                        <div className="animate-fade-in">
                            <div className="flex justify-between items-center mb-6"><h3 className="text-lg font-bold text-white">Ad Networks</h3><div className="flex gap-2"><button onClick={copyAllIds} className="bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2"><Copy size={16} /> Copy All</button>{!isQA && !isCreative && <button onClick={addNetwork} className="bg-blue-600/20 text-blue-400 border border-blue-500/30 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-blue-600/30"><Plus size={16} /> Add Network</button>}</div></div>
                            <div className="space-y-4">
                                {formData.adsVault?.map(net => {
                                    const isExpanded = expandedNetworkId === net.id;
                                    return (
                                        <div key={net.id} className={`bg-[#151518] border ${isExpanded ? 'border-blue-500/30' : 'border-white/5'} rounded-2xl overflow-hidden transition-all duration-300`}>
                                            <div className="bg-white/5 p-4 flex justify-between items-center cursor-pointer hover:bg-white/10 transition-colors" onClick={() => toggleNetwork(net.id)}>
                                                <div className="flex items-center gap-3"><div className={`p-1.5 rounded-full bg-white/10 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}><ChevronDown size={16} /></div><div><input className="bg-transparent text-white font-bold text-sm outline-none placeholder-gray-600 w-48 cursor-text" value={net.networkName} onChange={(e) => updateNetworkName(net.id, e.target.value)} onClick={(e) => e.stopPropagation()} placeholder="Network Name" readOnly={isQA || isCreative} /><p className="text-[10px] text-gray-500">{net.adUnits.length} Ad Units Configured</p></div></div>
                                                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}><button onClick={() => copyNetworkIds(net)} className="text-gray-500 hover:text-blue-400 p-2 rounded-lg hover:bg-white/5" title="Copy IDs"><Copy size={16} /></button>{!isQA && !isCreative && <button onClick={() => removeNetwork(net.id)} className="text-gray-500 hover:text-red-400 p-2 rounded-lg hover:bg-white/5"><Trash2 size={16} /></button>}</div>
                                            </div>
                                            {isExpanded && (<div className="p-4 space-y-3 bg-[#0a0a0a]/30 border-t border-white/5">{net.adUnits.map(unit => (<div key={unit.id} className="grid grid-cols-12 gap-2 items-center group"><div className="col-span-3"><input className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-2 text-xs text-gray-300 focus:border-blue-500/50 outline-none" value={unit.name} onChange={(e) => updateAdUnit(net.id, unit.id, 'name', e.target.value)} placeholder="Placement" readOnly={isQA || isCreative} /></div><div className="col-span-3"><select className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-2 text-xs text-gray-300 focus:border-blue-500/50 outline-none" value={unit.type} onChange={(e) => updateAdUnit(net.id, unit.id, 'type', e.target.value)} disabled={isQA || isCreative}><option>Banner</option><option>Interstitial</option><option>Rewarded</option><option>App Open</option><option>MREC</option><option>SDK Key</option><option>App ID</option><option>Other</option></select></div><div className="col-span-5 relative"><input className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-2 text-xs text-yellow-500 font-mono pr-8 focus:border-blue-500/50 outline-none" value={unit.unitId} onChange={(e) => updateAdUnit(net.id, unit.id, 'unitId', e.target.value)} placeholder="ID" readOnly={isQA || isCreative} /><button onClick={() => copySingleId(unit.unitId)} className="absolute right-1 top-1 text-gray-600 hover:text-white p-1 rounded hover:bg-white/10" title="Copy this key"><Copy size={12} /></button></div><div className="col-span-1 text-right">{!isQA && !isCreative && <button onClick={() => removeAdUnit(net.id, unit.id)} className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>}</div></div>))}{!isQA && !isCreative && <button onClick={() => addAdUnit(net.id)} className="text-xs text-blue-500 font-bold mt-2 hover:underline flex items-center gap-1"><Plus size={12} /> Add Unit</button>}</div>)}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {activeTab === 'store' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-[#151518] border border-white/5 p-6 rounded-2xl shadow-lg h-full flex flex-col">
                                    <h4 className="text-sm font-bold text-gray-400 uppercase mb-4 flex gap-2 items-center"><ShoppingBag size={16} /> Store Presence</h4>
                                    <div className="flex-1 space-y-4">
                                        <div className="space-y-3">
                                            <InputField label="Store URL" value={formData.store?.url} onChange={(v) => handleChange('url', v, 'store')} readOnly={isQA || isCreative} />
                                            {formData.store?.url && (
                                                <a href={formData.store.url} target="_blank" rel="noreferrer" className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.02]">
                                                    <ShoppingBag size={16} /> See App on Store
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-[#151518] border border-white/5 p-6 rounded-2xl shadow-lg h-full flex flex-col">
                                    <h4 className="text-sm font-bold text-blue-400 uppercase mb-4 flex gap-2 items-center"><Package size={16} /> Build Artifacts</h4>
                                    <div className="space-y-4">
                                        <InputField label="APK Download Link" value={formData.assets?.apk} onChange={(v) => handleChange('apk', v, 'assets')} placeholder="Drive / Dropbox..." readOnly={isQA || isCreative} />
                                        <InputField label="AAB Download Link" value={formData.assets?.aab} onChange={(v) => handleChange('aab', v, 'assets')} placeholder="Drive Link..." readOnly={isQA || isCreative} />
                                        {(isQA || isCreative) && (
                                            <div className="flex gap-2 pt-2">
                                                {formData.assets?.apk && <a href={formData.assets.apk} target="_blank" rel="noreferrer" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2 rounded-lg text-center flex justify-center items-center gap-2"><Download size={14} /> Download APK</a>}
                                                {formData.assets?.aab && <a href={formData.assets.aab} target="_blank" rel="noreferrer" className="flex-1 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold py-2 rounded-lg text-center flex justify-center items-center gap-2"><Download size={14} /> Download AAB</a>}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className={`bg-gradient-to-r from-blue-900/10 to-purple-900/10 border border-blue-500/20 p-6 rounded-2xl shadow-xl relative overflow-hidden ${isQA || isCreative ? 'opacity-70' : ''}`}>
                                <div className="absolute top-0 right-0 p-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                                <div className="flex justify-between items-center mb-6 relative z-10">
                                    <div><h3 className="text-lg font-bold text-white flex items-center gap-2"><Rocket size={20} className="text-blue-400" /> Release Zone</h3><p className="text-xs text-gray-500">Prepare and deploy a new version.</p></div>
                                    <button onClick={isQA || isCreative ? null : handleReleaseVersion} disabled={isQA || isCreative} className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition-all ${(isQA || isCreative) ? 'bg-[#1a1a1d] text-gray-500 border border-white/5 cursor-not-allowed opacity-50 grayscale' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20 hover:scale-105'}`} title={(isQA || isCreative) ? "Access restricted" : "Release this version"}><Rocket size={16} /> Release Version {(isQA || isCreative) && <Lock size={12} />}</button>
                                </div>
                                <div className="grid grid-cols-2 gap-6 relative z-10 mb-4">
                                    <InputField label="Version Code" value={formData.store?.versionCode} onChange={(v) => handleChange('versionCode', v, 'store')} placeholder="e.g. 15" readOnly={isQA || isCreative} />
                                    <InputField label="Version Name" value={formData.store?.versionName} onChange={(v) => handleChange('versionName', v, 'store')} placeholder="e.g. 1.2.5" readOnly={isQA || isCreative} />
                                </div>
                                <div className="relative z-10"><label className="block text-xs text-gray-500 mb-2 font-bold uppercase tracking-wide">Release Notes / Changelog</label><textarea rows={3} readOnly={isQA || isCreative} value={formData.store?.releaseNotes} onChange={(e) => handleChange('releaseNotes', e.target.value, 'store')} className="w-full bg-[#0a0a0a] border border-white/10 p-3 rounded-xl text-sm text-gray-200 outline-none focus:border-blue-500/50" placeholder="What's new in this update?" /></div>
                            </div>
                            <div className="bg-[#151518] border border-white/5 p-8 rounded-2xl shadow-xl">
                                <h4 className="text-sm font-bold text-gray-400 uppercase mb-6 flex gap-2 items-center"><History size={16} /> Deployment History</h4>
                                <div className="space-y-0 relative pl-2">
                                    <div className="absolute left-[13px] top-2 bottom-4 w-0.5 bg-white/5"></div>
                                    {formData.store.versionHistory?.map((ver, index) => (
                                        <div key={ver.id} className="relative pl-8 pb-8 group last:pb-0">
                                            <div className="absolute left-0 top-1 w-7 h-7 rounded-full bg-[#1a1a1d] border border-white/10 flex items-center justify-center z-10 shadow-sm group-hover:border-blue-500/50 transition-colors"><GitCommit size={14} className={index === 0 ? "text-green-500" : "text-gray-600"} /></div>
                                            <div className="bg-[#0a0a0a] border border-white/10 p-4 rounded-xl hover:border-white/20 transition-all">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div><h5 className="text-sm font-bold text-gray-200 flex items-center gap-2">v{ver.versionCode} <span className="text-xs font-normal text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">{ver.versionName}</span>{index === 0 && <span className="text-[9px] bg-green-500/20 text-green-400 px-1.5 rounded uppercase font-bold tracking-wider">Live</span>}</h5><p className="text-[10px] text-gray-500 mt-0.5 font-mono">{new Date(ver.date).toLocaleString()} • by {ver.updatedBy}</p></div>
                                                    <div className="flex gap-2">{ver.apk && <a href={ver.apk} target="_blank" rel="noreferrer" className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-1 rounded hover:bg-blue-500/20 transition-colors">APK</a>}{ver.aab && <a href={ver.aab} target="_blank" rel="noreferrer" className="text-[10px] bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-1 rounded hover:bg-orange-500/20 transition-colors">AAB</a>}</div>
                                                </div>
                                                {ver.notes && <p className="text-xs text-gray-400 italic bg-white/5 p-2 rounded-lg border-l-2 border-white/10">{ver.notes}</p>}
                                            </div>
                                        </div>
                                    ))}
                                    {(!formData.store.versionHistory || formData.store.versionHistory.length === 0) && <p className="text-xs text-gray-600 pl-8">No deployment history found.</p>}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'keystore' && !isQA && !isCreative && (<div className="bg-[#151518] border border-white/5 p-8 rounded-2xl shadow-xl animate-fade-in"><div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4"><div><h3 className="text-lg font-bold text-white">Keystore Files</h3><p className="text-xs text-gray-500">Securely store your signing keys.</p></div><button onClick={() => keyStoreInputRef.current?.click()} className="bg-red-500/20 text-red-400 border border-red-500/30 px-4 py-2 rounded-xl text-xs font-bold flex gap-2"><Upload size={14} /> Upload</button><input type="file" multiple ref={keyStoreInputRef} onChange={(e) => handleFileUpload(e, 'keystore')} className="hidden" /></div><div className="grid gap-3">{formData.keystore?.files.map(file => (<div key={file.id} className="bg-[#0a0a0a] border border-white/10 p-4 rounded-xl flex justify-between items-center"><div className="flex items-center gap-4"><div className="p-2 bg-red-900/20 rounded-lg text-red-500"><Key size={20} /></div><div className="text-sm font-bold text-gray-200">{file.name}</div></div><div className="flex gap-2"><button onClick={() => handleDownload(file, 'keystore')} className="text-gray-500 hover:text-blue-400 p-2 rounded hover:bg-white/5 transition-colors"><Download size={16} /></button><button onClick={() => removeFile(file.id, 'keystore')} className="text-gray-500 hover:text-red-400 p-2 rounded hover:bg-white/5 transition-colors"><Trash2 size={16} /></button></div></div>))}</div></div>)}

                    {activeTab === 'firebase' && !isQA && !isCreative && (<div className="bg-[#151518] border border-white/5 p-8 rounded-2xl shadow-xl animate-fade-in"><div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4"><div><h3 className="text-lg font-bold text-white">Firebase Config</h3></div><button onClick={() => fileInputRef.current?.click()} className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-4 py-2 rounded-xl text-xs font-bold flex gap-2"><Upload size={14} /> Upload JSON</button><input type="file" multiple ref={fileInputRef} onChange={(e) => handleFileUpload(e, 'firebase')} className="hidden" /></div><div className="grid gap-3">{formData.firebase?.files.map(file => (<div key={file.id} className="bg-[#0a0a0a] border border-white/10 p-4 rounded-xl flex justify-between items-center"><div className="flex items-center gap-4"><div className="p-2 bg-yellow-900/20 rounded-lg text-yellow-500"><FileJson size={20} /></div><div className="text-sm font-bold text-gray-200">{file.name}</div></div><div className="flex gap-2"><button onClick={() => handleDownload(file, 'firebase')} className="text-gray-500 hover:text-blue-400 p-2 rounded hover:bg-white/5 transition-colors"><Download size={16} /></button><button onClick={() => removeFile(file.id, 'firebase')} className="text-gray-500 hover:text-red-400 p-2 rounded hover:bg-white/5 transition-colors"><Trash2 size={16} /></button></div></div>))}</div></div>)}
                </div>
            </div>
        </div>
    );
};

export default ProjectVault;