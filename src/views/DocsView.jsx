import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { APP_VERSION } from "../constants";
import {
    Book, Shield, Download, MessageSquare, Users,
    FileText, Zap, ChevronRight, Menu, X, ArrowLeft,
    Layout, Briefcase, CheckSquare, Layers, AlertCircle,
    Database, Folder
} from 'lucide-react';

const DocsView = () => {
    const [activeSection, setActiveSection] = useState('intro');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const scrollToSection = (id) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
            setActiveSection(id);
            setMobileMenuOpen(false);
        }
    };

    const sections = [
        { id: 'intro', title: 'Introduction', icon: <Book size={18} /> },
        { id: 'install', title: 'Installation & Setup', icon: <Download size={18} /> },
        { id: 'dashboard', title: 'The Dashboard', icon: <Layout size={18} /> },
        { id: 'projects', title: 'Project Vault', icon: <Briefcase size={18} /> },
        { id: 'archives', title: 'The Archives', icon: <Database size={18} /> }, // 👈 Added Archives
        { id: 'tasks', title: 'Task Management', icon: <CheckSquare size={18} /> },
        { id: 'communication', title: 'Chat & Files', icon: <MessageSquare size={18} /> },
        { id: 'roles', title: 'Roles & Permissions', icon: <Users size={18} /> },
        { id: 'security', title: 'Security', icon: <Shield size={18} /> },
    ];

    return (
        <div className="flex h-screen bg-[#0a0a0a] text-gray-300 font-sans overflow-hidden">

            {/* --- MOBILE HEADER --- */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-4 border-b border-white/10 bg-[#151518]">
                <div className="font-bold text-white flex items-center gap-2">
                    <Book className="text-blue-500" /> Docs
                </div>
                <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-white p-2">
                    {mobileMenuOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* --- SIDEBAR NAVIGATION --- */}
            <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-[#151518] border-r border-white/10 flex flex-col transform transition-transform duration-300 md:relative md:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} pt-16 md:pt-0`}>
                <div className="p-6 border-b border-white/10">
                    <h1 className="text-2xl font-bold text-white tracking-tight">Unity <span className="text-blue-500">Docs</span></h1>
                    <p className="text-xs text-gray-500 mt-1">Full User Manual · v{APP_VERSION}</p> {/* 👈 Version Updated */}
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
                    {sections.map((section) => (
                        <button
                            key={section.id}
                            onClick={() => scrollToSection(section.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all ${activeSection === section.id
                                ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
                                : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            {section.icon}
                            {section.title}
                            {activeSection === section.id && <ChevronRight size={14} className="ml-auto" />}
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-white/10 bg-[#0f0f12]">
                    <Link to="/" className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg hover:shadow-blue-500/20">
                        <ArrowLeft size={16} /> Back to App
                    </Link>
                </div>
            </aside>

            {/* --- MAIN CONTENT --- */}
            <main className="flex-1 h-full overflow-y-auto custom-scrollbar scroll-smooth pt-16 md:pt-0 relative">
                <div className="max-w-4xl mx-auto p-6 md:p-12 space-y-16 pb-32">

                    {/* 1. INTRODUCTION */}
                    <section id="intro" className="space-y-6 animate-fade-in">
                        <div className="space-y-2">
                            <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">Unity Work OS</h2>
                            <p className="text-xl text-blue-400 font-medium">The central operating system for modern dev teams.</p>
                        </div>
                        <p className="text-gray-400 leading-relaxed text-lg">
                            Unity Work OS is a unified platform designed to streamline communication, project management, and asset sharing for software development teams. It replaces scattered tools (Trello, Slack, Google Drive) with a single, encrypted digital workspace.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                            <FeatureCard icon={<Zap size={20} />} title="Real-Time" desc="Instant sync via Firestore. No refresh needed." />
                            <FeatureCard icon={<Shield size={20} />} title="Secure" desc="Encrypted data & role-based access control." />
                            <FeatureCard icon={<FileText size={20} />} title="Organized" desc="Drag & Drop file and project management." />
                        </div>
                    </section>

                    <hr className="border-white/10" />

                    {/* 2. INSTALLATION */}
                    <section id="install" className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><Download /></div>
                            <h3 className="text-2xl font-bold text-white">Installation & Updates</h3>
                        </div>
                        <div className="prose prose-invert max-w-none text-gray-400 space-y-4">
                            <p>Unity Work OS is a native Windows application built on Electron for maximum performance.</p>

                            <div className="bg-[#151518] p-6 rounded-xl border border-white/5 space-y-4">
                                <h4 className="font-bold text-white">System Requirements</h4>
                                <ul className="list-disc pl-5 space-y-1 text-sm">
                                    <li>Windows 10 or Windows 11 (64-bit)</li>
                                    <li>4GB RAM Minimum (8GB Recommended)</li>
                                    <li>Active Internet Connection (for Real-time Sync)</li>
                                </ul>
                            </div>

                            <div className="bg-blue-900/10 border border-blue-500/20 p-4 rounded-xl flex gap-4 items-start">
                                <Zap size={20} className="text-blue-400 shrink-0 mt-1" />
                                <div>
                                    <h4 className="text-white font-bold text-sm">Auto-Update System</h4>
                                    <p className="text-sm text-gray-400 mt-1">
                                        The app checks for updates (e.g., v{APP_VERSION}) in the background. If a new version is found, it downloads silently and applies automatically the next time you restart the app.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    <hr className="border-white/10" />

                    {/* 3. DASHBOARD */}
                    <section id="dashboard" className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400"><Layout /></div>
                            <h3 className="text-2xl font-bold text-white">The Dashboard</h3>
                        </div>
                        <p className="text-gray-400">The Mission Control center. It gives you a snapshot of your day and team progress.</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                            <InfoCard title="Daily Goals" desc="Shows completion percentage of tasks assigned to you for TODAY." />
                            <InfoCard title="Project Stats" desc="Visual breakdown of active projects by platform (Android/iOS/PC)." />
                            <InfoCard title="Team Activity" desc="A live terminal-style feed showing who completed tasks, uploaded files, or created projects." />
                            <InfoCard title="Announcements" desc="Pinned messages from the Team Lead appear at the top of the dashboard." />
                        </div>
                    </section>

                    <hr className="border-white/10" />

                    {/* 4. PROJECTS */}
                    <section id="projects" className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-500/20 rounded-lg text-orange-400"><Briefcase /></div>
                            <h3 className="text-2xl font-bold text-white">Project Vault</h3>
                        </div>
                        <p className="text-gray-400">
                            The Vault is where all development work lives. It uses a folder-based system for organization.
                        </p>

                        <div className="space-y-4">
                            <div className="bg-[#151518] p-5 rounded-xl border border-white/5">
                                <h4 className="text-white font-bold mb-2">Folders & Organization</h4>
                                <p className="text-sm text-gray-400 mb-3">
                                    Projects are organized into custom folders (e.g., "Active Games", "Prototypes").
                                </p>
                                <ul className="space-y-2 text-sm text-gray-400">
                                    <li className="flex gap-2"><span className="text-blue-500">1.</span> <strong>Create Folder:</strong> Use the "Folder" button in the bottom bar.</li>
                                    <li className="flex gap-2"><span className="text-blue-500">2.</span> <strong>Move Projects:</strong> Simply <strong>Drag & Drop</strong> a project card into any folder to organize it.</li>
                                    <li className="flex gap-2"><span className="text-blue-500">3.</span> <strong>Unassigned:</strong> Projects not in a folder appear in the "Unassigned" area at the bottom.</li>
                                </ul>
                            </div>

                            <div className="bg-[#151518] p-5 rounded-xl border border-white/5">
                                <h4 className="text-white font-bold mb-2">Project Details</h4>
                                <p className="text-sm text-gray-400">Clicking a project opens the <strong>Command Center</strong> for that specific project, containing:</p>
                                <ul className="grid grid-cols-2 gap-2 mt-3 text-sm text-gray-400">
                                    <li className="bg-black/20 p-2 rounded border border-white/5">🔑 <strong>Keys & Credentials:</strong> Store API Keys, Passwords securely.</li>
                                    <li className="bg-black/20 p-2 rounded border border-white/5">📦 <strong>Assets:</strong> Links to Figma, Trello, GitHub, and Drive.</li>
                                    <li className="bg-black/20 p-2 rounded border border-white/5">💬 <strong>Discussion:</strong> A private encrypted chat for this project.</li>
                                    <li className="bg-black/20 p-2 rounded border border-white/5">📜 <strong>History:</strong> Automated log of all changes made to the project.</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    <hr className="border-white/10" />

                    {/* 5. ARCHIVES (NEW SECTION) */}
                    <section id="archives" className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400"><Database /></div>
                            <h3 className="text-2xl font-bold text-white">The Archives</h3>
                        </div>
                        <p className="text-gray-400">
                            A centralized knowledge base and file repository for your team. Store snippets, docs, and resources.
                        </p>

                        <div className="space-y-4">
                            <div className="bg-[#151518] p-5 rounded-xl border border-white/5 border-l-4 border-l-emerald-500">
                                <h4 className="text-white font-bold mb-2 flex items-center gap-2"><Zap size={16} className="text-emerald-400" /> New Feature: Drag & Drop Upload</h4>
                                <p className="text-sm text-gray-400">
                                    You can now drag files directly from your desktop into the Archives.
                                </p>
                                <ul className="list-disc pl-5 mt-2 space-y-1 text-xs text-gray-500">
                                    <li>Drop files into a folder to upload them directly there.</li>
                                    <li>Supports text-based files: <code>.txt</code>, <code>.cs</code>, <code>.json</code>, <code>.md</code>, etc.</li>
                                </ul>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-[#151518] p-4 rounded-xl border border-white/5">
                                    <h4 className="text-blue-400 font-bold text-sm mb-2">Categories</h4>
                                    <ul className="space-y-2 text-xs text-gray-400">
                                        <li className="flex gap-2 items-center"><span className="bg-blue-500/10 p-1 rounded text-blue-400 font-mono">Snippets</span> Reusable code blocks (C#, JS).</li>
                                        <li className="flex gap-2 items-center"><span className="bg-yellow-500/10 p-1 rounded text-yellow-400 font-mono">Docs</span> GDDs, Mechanics, Lore.</li>
                                        <li className="flex gap-2 items-center"><span className="bg-purple-500/10 p-1 rounded text-purple-400 font-mono">Links</span> External URLs (Asset Store, Drive).</li>
                                    </ul>
                                </div>
                                <div className="bg-[#151518] p-4 rounded-xl border border-white/5">
                                    <h4 className="text-emerald-400 font-bold text-sm mb-2">Folder Management</h4>
                                    <p className="text-xs text-gray-400 leading-relaxed">
                                        Organize items into folders (e.g., "Ads", "Controllers"). You can nest items and navigate using breadcrumbs. Use the Drag & Drop feature to move items between folders.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    <hr className="border-white/10" />

                    {/* 6. TASKS */}
                    <section id="tasks" className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-pink-500/20 rounded-lg text-pink-400"><CheckSquare /></div>
                            <h3 className="text-2xl font-bold text-white">Task Management</h3>
                        </div>
                        <p className="text-gray-400">
                            Assign, track, and complete daily tasks.
                        </p>
                        <div className="bg-[#151518] border-l-4 border-pink-500 p-4 rounded-r-xl">
                            <h4 className="text-white font-bold text-sm">Task Workflow</h4>
                            <p className="text-xs text-gray-400 mt-1">
                                Tasks are assigned to specific dates. A task stays in "Pending" until marked "Completed".
                                Team Leads can assign tasks to any member. Developers can assign tasks to themselves.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-4 bg-[#1a1a1d] rounded-xl border border-white/5">
                                <span className="text-xs font-bold text-red-400 uppercase tracking-wider">High Priority</span>
                                <p className="text-xs text-gray-500 mt-1">Critical bugs or deadlines.</p>
                            </div>
                            <div className="p-4 bg-[#1a1a1d] rounded-xl border border-white/5">
                                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Medium Priority</span>
                                <p className="text-xs text-gray-500 mt-1">Regular feature development.</p>
                            </div>
                            <div className="p-4 bg-[#1a1a1d] rounded-xl border border-white/5">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Low Priority</span>
                                <p className="text-xs text-gray-500 mt-1">Cleanup or documentation.</p>
                            </div>
                        </div>
                    </section>

                    <hr className="border-white/10" />

                    {/* 7. COMMUNICATION */}
                    <section id="communication" className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-500/20 rounded-lg text-green-400"><MessageSquare /></div>
                            <h3 className="text-2xl font-bold text-white">Chat & File Sharing</h3>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-[#151518] p-6 rounded-xl border border-white/5 hover:border-blue-500/30 transition-colors">
                                <h4 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                                    Drag & Drop System
                                </h4>
                                <p className="text-sm text-gray-400 mb-4">
                                    We use Cloudinary for high-speed asset delivery. You can drag files directly into any chat window.
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="bg-black/30 p-3 rounded-lg text-center">
                                        <div className="text-blue-400 font-bold text-sm">Images</div>
                                        <div className="text-[10px] text-gray-500">PNG, JPG, GIF<br />(Auto Preview)</div>
                                    </div>
                                    <div className="bg-black/30 p-3 rounded-lg text-center">
                                        <div className="text-purple-400 font-bold text-sm">Videos</div>
                                        <div className="text-[10px] text-gray-500">MP4, WEBM<br />(In-App Player)</div>
                                    </div>
                                    <div className="bg-black/30 p-3 rounded-lg text-center">
                                        <div className="text-yellow-400 font-bold text-sm">Docs</div>
                                        <div className="text-[10px] text-gray-500">ZIP, PDF, RAR<br />(Download Link)</div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-1 bg-[#151518] p-4 rounded-xl border border-white/5">
                                    <h4 className="text-white font-bold text-sm">Global Team Chat</h4>
                                    <p className="text-xs text-gray-500">Visible to everyone in the team.</p>
                                </div>
                                <div className="flex-1 bg-[#151518] p-4 rounded-xl border border-white/5">
                                    <h4 className="text-white font-bold text-sm">Project Discussion</h4>
                                    <p className="text-xs text-gray-500">Isolated inside each project vault.</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    <hr className="border-white/10" />

                    {/* 8. ROLES */}
                    <section id="roles" className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-yellow-500/20 rounded-lg text-yellow-400"><Users /></div>
                            <h3 className="text-2xl font-bold text-white">Roles & Permissions</h3>
                        </div>
                        <p className="text-gray-400">
                            Your role determines what you can see and delete.
                        </p>

                        <div className="grid grid-cols-1 gap-3">
                            <RoleRow
                                role="Team Lead (TL)"
                                access="Full Admin"
                                desc="Can create/delete projects, manage folders, remove members, and post announcements."
                                color="text-purple-400"
                            />
                            <RoleRow
                                role="Developer / ASO"
                                access="Standard"
                                desc="Can create projects and folders. Can assign tasks to self. Cannot delete projects."
                                color="text-blue-400"
                            />
                            <RoleRow
                                role="Designer / QA"
                                access="Restricted"
                                desc="View-only access to projects. Can chat and complete assigned tasks."
                                color="text-pink-400"
                            />
                        </div>
                    </section>

                    <hr className="border-white/10" />

                    {/* 9. SECURITY */}
                    <section id="security" className="space-y-6 pb-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400"><Shield /></div>
                            <h3 className="text-2xl font-bold text-white">Security</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-[#151518] p-5 rounded-xl border border-white/5">
                                <h4 className="text-white font-bold mb-2 flex items-center gap-2"><Users size={16} className="text-blue-500" /> Team Isolation</h4>
                                <p className="text-xs text-gray-400 leading-relaxed">
                                    Every piece of data (Task, Message, Project) is tagged with a <code>teamId</code>.
                                    It is mathematically impossible for User A to see User B's data if they are in different teams.
                                </p>
                            </div>
                            <div className="bg-[#151518] p-5 rounded-xl border border-white/5">
                                <h4 className="text-white font-bold mb-2 flex items-center gap-2"><Shield size={16} className="text-green-500" /> Encryption</h4>
                                <p className="text-xs text-gray-400 leading-relaxed">
                                    Connections to the server are encrypted via SSL/TLS.
                                    File uploads are secured via signed tokens.
                                </p>
                            </div>
                        </div>
                    </section>

                </div>
            </main>
        </div>
    );
};

// --- SUB-COMPONENTS FOR CLEANER CODE ---

const FeatureCard = ({ icon, title, desc }) => (
    <div className="bg-[#151518] p-5 rounded-xl border border-white/5 hover:border-blue-500/30 transition-colors group">
        <div className="text-gray-500 group-hover:text-blue-400 transition-colors mb-3">{icon}</div>
        <h4 className="text-white font-bold mb-1">{title}</h4>
        <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
    </div>
);

const InfoCard = ({ title, desc }) => (
    <div className="bg-[#151518] p-4 rounded-lg border border-white/5">
        <h4 className="text-blue-400 font-bold text-sm mb-1">{title}</h4>
        <p className="text-xs text-gray-500">{desc}</p>
    </div>
);

const RoleRow = ({ role, access, desc, color }) => (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-4 bg-[#151518] border border-white/5 rounded-xl">
        <div className={`w-32 font-bold ${color} shrink-0`}>{role}</div>
        <div className="px-2 py-0.5 bg-white/5 rounded text-[10px] text-gray-400 uppercase font-mono tracking-wider shrink-0 w-fit">{access}</div>
        <div className="text-xs text-gray-500 leading-snug">{desc}</div>
    </div>
);

export default DocsView;