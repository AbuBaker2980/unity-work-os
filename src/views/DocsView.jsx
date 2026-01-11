import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { APP_VERSION } from "../constants";
import {
    Book, Shield, Download, MessageSquare, Users,
    FileText, Zap, ChevronRight, Menu, X, ArrowLeft,
    Layout, Briefcase, CheckSquare, Layers, AlertCircle,
    Database, Folder, Award, Mic, BarChart2
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
        { id: 'install', title: 'Installation', icon: <Download size={18} /> },
        { id: 'dashboard', title: 'Dashboard & Ranks', icon: <Layout size={18} /> },
        { id: 'projects', title: 'Project Vault', icon: <Briefcase size={18} /> },
        { id: 'archives', title: 'The Archives', icon: <Database size={18} /> },
        { id: 'tasks', title: 'Task Workflow', icon: <CheckSquare size={18} /> },
        { id: 'gamification', title: 'XP & Gamification', icon: <Award size={18} /> },
        { id: 'communication', title: 'Chat System', icon: <MessageSquare size={18} /> },
        { id: 'roles', title: 'Roles & Permissions', icon: <Users size={18} /> },
        { id: 'security', title: 'Security', icon: <Shield size={18} /> },
    ];

    return (
        <div className="flex h-screen bg-[#0a0a0a] text-gray-300 font-sans overflow-hidden">

            {/* --- MOBILE HEADER --- */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-4 border-b border-white/10 bg-[#151518]">
                <div className="font-bold text-white flex items-center gap-2">
                    <Book className="text-blue-500" /> Docs v1.0.5
                </div>
                <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-white p-2">
                    {mobileMenuOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* --- SIDEBAR NAVIGATION --- */}
            <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-[#151518] border-r border-white/10 flex flex-col transform transition-transform duration-300 md:relative md:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} pt-16 md:pt-0`}>
                <div className="p-6 border-b border-white/10">
                    <h1 className="text-2xl font-bold text-white tracking-tight">Unity <span className="text-blue-500">Docs</span></h1>
                    <p className="text-xs text-gray-500 mt-1">User Manual · v{APP_VERSION} (1.0.5)</p>
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
                            Unity Work OS is a unified platform designed to streamline communication, project management, and asset sharing. Version 1.0.5 introduces a complete <strong>Gamification System</strong>, enhanced chat capabilities, and a stricter QA workflow.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                            <FeatureCard icon={<Zap size={20} />} title="Real-Time" desc="Instant sync via Firestore. No refresh needed." />
                            <FeatureCard icon={<Award size={20} />} title="Gamified" desc="Earn XP, unlock Ranks, and equip Titles." />
                            <FeatureCard icon={<Shield size={20} />} title="Secure" desc="Encrypted data & role-based access control." />
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
                            <div className="bg-blue-900/10 border border-blue-500/20 p-4 rounded-xl flex gap-4 items-start">
                                <Zap size={20} className="text-blue-400 shrink-0 mt-1" />
                                <div>
                                    <h4 className="text-white font-bold text-sm">Auto-Update System</h4>
                                    <p className="text-sm text-gray-400 mt-1">
                                        The app checks for updates (v1.0.5 and beyond) in the background. New features like the Gamification Engine are applied automatically upon restart.
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
                        <p className="text-gray-400">The Mission Control center containing your daily stats and team activity.</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                            <InfoCard title="Rank Card" desc="Displays your current Level, XP progress bar, and equipped Title (e.g., 'The Shipper')." />
                            <InfoCard title="Daily Goals" desc="Shows completion percentage of tasks assigned to you for TODAY." />
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
                        <div className="bg-[#151518] p-5 rounded-xl border border-white/5">
                            <h4 className="text-white font-bold mb-2">Project Details</h4>
                            <ul className="grid grid-cols-2 gap-2 mt-3 text-sm text-gray-400">
                                <li className="bg-black/20 p-2 rounded border border-white/5">🔑 <strong>Keys:</strong> Store AdMob, Firebase, and Keystore files.</li>
                                <li className="bg-black/20 p-2 rounded border border-white/5">🚀 <strong>Release:</strong> Manage APK/AAB links and version history.</li>
                                <li className="bg-black/20 p-2 rounded border border-white/5">💬 <strong>Discussion:</strong> A private encrypted chat for this project.</li>
                            </ul>
                        </div>
                    </section>

                    <hr className="border-white/10" />

                    {/* 5. ARCHIVES (UPDATED) */}
                    <section id="archives" className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400"><Database /></div>
                            <h3 className="text-2xl font-bold text-white">The Archives (Enhanced)</h3>
                        </div>
                        <p className="text-gray-400">
                            A centralized knowledge base. Now supports direct code editing and drag-and-drop.
                        </p>

                        <div className="bg-[#151518] p-5 rounded-xl border border-white/5 border-l-4 border-l-emerald-500">
                            <h4 className="text-white font-bold mb-2 flex items-center gap-2"><Zap size={16} className="text-emerald-400" /> New in v1.0.5: Code Snippets</h4>
                            <ul className="space-y-2 text-sm text-gray-400 mt-2">
                                <li className="flex gap-2"><span className="text-emerald-500">1.</span> <strong>Drag & Drop:</strong> Drag `.cs`, `.js`, `.py`, `.json` files directly into a folder.</li>
                                <li className="flex gap-2"><span className="text-emerald-500">2.</span> <strong>In-App Editing:</strong> Click a file to open the built-in code editor to make quick changes without downloading.</li>
                                <li className="flex gap-2"><span className="text-emerald-500">3.</span> <strong>Folder Organization:</strong> Create nested folders to keep assets and docs organized.</li>
                            </ul>
                        </div>
                    </section>

                    <hr className="border-white/10" />

                    {/* 6. TASKS (UPDATED) */}
                    <section id="tasks" className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-pink-500/20 rounded-lg text-pink-400"><CheckSquare /></div>
                            <h3 className="text-2xl font-bold text-white">Task Workflow</h3>
                        </div>
                        <p className="text-gray-400">
                            The task system has been upgraded to a rigid workflow to ensure quality assurance.
                        </p>

                        <div className="bg-[#151518] border border-white/5 p-5 rounded-xl">
                            <h4 className="text-white font-bold text-sm mb-4">Development Lifecycle</h4>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-center">
                                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                    <div className="text-blue-400 font-bold text-xs uppercase mb-1">1. In Progress</div>
                                    <div className="text-[10px] text-gray-500">Developer is working.</div>
                                </div>
                                <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                                    <div className="text-purple-400 font-bold text-xs uppercase mb-1">2. Review</div>
                                    <div className="text-[10px] text-gray-500">Requesting approval.</div>
                                </div>
                                <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                                    <div className="text-orange-400 font-bold text-xs uppercase mb-1">3. QA Testing</div>
                                    <div className="text-[10px] text-gray-500">QA verifying the build.</div>
                                </div>
                                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                                    <div className="text-green-400 font-bold text-xs uppercase mb-1">4. Done</div>
                                    <div className="text-[10px] text-gray-500">Verified & XP Awarded.</div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <hr className="border-white/10" />

                    {/* 7. GAMIFICATION (NEW SECTION) */}
                    <section id="gamification" className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-yellow-500/20 rounded-lg text-yellow-400"><Award /></div>
                            <h3 className="text-2xl font-bold text-white">Gamification & XP</h3>
                        </div>
                        <p className="text-gray-400">
                            Version 1.0.5 introduces the Gamification Engine. Work hard, earn XP, and rank up.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-[#151518] p-5 rounded-xl border border-white/5">
                                <h4 className="text-white font-bold mb-2">Ranks & Levels</h4>
                                <ul className="space-y-2 text-sm text-gray-400">
                                    <li className="flex gap-2 items-center"><span className="w-2 h-2 bg-orange-500 rounded-full"></span> <strong>Bronze:</strong> Level 1 - 9</li>
                                    <li className="flex gap-2 items-center"><span className="w-2 h-2 bg-gray-400 rounded-full"></span> <strong>Silver:</strong> Level 10 - 19</li>
                                    <li className="flex gap-2 items-center"><span className="w-2 h-2 bg-yellow-400 rounded-full"></span> <strong>Gold:</strong> Level 20 - 29</li>
                                    <li className="flex gap-2 items-center"><span className="w-2 h-2 bg-purple-400 rounded-full"></span> <strong>Platinum:</strong> Level 30 - 49</li>
                                    <li className="flex gap-2 items-center"><span className="w-2 h-2 bg-cyan-400 rounded-full"></span> <strong>Diamond:</strong> Level 50+</li>
                                </ul>
                            </div>
                            <div className="bg-[#151518] p-5 rounded-xl border border-white/5">
                                <h4 className="text-white font-bold mb-2">How to Earn XP</h4>
                                <ul className="space-y-2 text-sm text-gray-400">
                                    <li>✅ <strong>Complete Task:</strong> +50 XP</li>
                                    <li>🚀 <strong>Release Version:</strong> +100 XP</li>
                                    <li>🐞 <strong>Report Bug:</strong> +20 XP</li>
                                    <li>🏆 <strong>Achievements:</strong> Earn special titles like "Night Owl" or "Bug Hunter" based on your activity.</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    <hr className="border-white/10" />

                    {/* 8. COMMUNICATION (UPDATED) */}
                    <section id="communication" className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-500/20 rounded-lg text-green-400"><MessageSquare /></div>
                            <h3 className="text-2xl font-bold text-white">Advanced Chat System</h3>
                        </div>
                        <p className="text-gray-400">
                            The communication module has been overhauled with powerful new tools.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FeatureCard
                                icon={<Users size={20} />}
                                title="One-on-One DM"
                                desc="Private messaging. Click any member in the Team Roster to start a direct secure chat."
                            />
                            <FeatureCard
                                icon={<Mic size={20} />}
                                title="Voice Notes"
                                desc="Record and send audio messages directly within the chat for quick updates."
                            />
                            <FeatureCard
                                icon={<BarChart2 size={20} />}
                                title="Poll System"
                                desc="Create voting polls in Team Chat to make quick decisions."
                            />
                        </div>
                    </section>

                    <hr className="border-white/10" />

                    {/* 9. ROLES */}
                    <section id="roles" className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><Users /></div>
                            <h3 className="text-2xl font-bold text-white">Roles & Permissions</h3>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            <RoleRow role="Team Lead (TL)" access="Admin" desc="Full control over projects, members, and settings. Can rename the team." color="text-purple-400" />
                            <RoleRow role="QA / Tester" access="Quality" desc="Can verify tasks (mark as Done) and release versions. Cannot delete projects." color="text-pink-400" />
                            <RoleRow role="Developer" access="Standard" desc="Can create projects, push code, and request reviews." color="text-blue-400" />
                        </div>
                    </section>

                    <hr className="border-white/10" />

                    {/* 10. SECURITY */}
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

// --- SUB-COMPONENTS ---

const FeatureCard = ({ icon, title, desc }) => (
    <div className="bg-[#151518] p-5 rounded-xl border border-white/5 hover:border-blue-500/30 transition-colors group h-full">
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