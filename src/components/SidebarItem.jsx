import React from 'react';

const SidebarItem = ({ icon: Icon, label, active, onClick, isOpen }) => {
    return (
        <button
            onClick={onClick}
            title={!isOpen ? label : ""}
            className={`
                group relative flex items-center h-12 w-[92%] mx-auto mb-2 rounded-xl transition-all duration-300 outline-none
                ${active ? "bg-white/5" : "hover:bg-white/5"}
            `}
        >
            {/* 1. ACTIVE GLOW BACKGROUND (Only visible when active) */}
            <div className={`absolute inset-0 rounded-xl transition-all duration-300 border border-transparent
                ${active
                    ? "bg-gradient-to-r from-blue-600/20 via-blue-600/5 to-transparent border-blue-500/30 shadow-[0_0_15px_rgba(37,99,235,0.15)] opacity-100"
                    : "opacity-0"
                }`}
            />

            {/* 2. NEON INDICATOR BAR (Fixed Left Position) */}
            <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-r-full transition-all duration-300 shadow-[0_0_10px_#3b82f6]
                ${active ? "opacity-100 h-8" : "opacity-0 h-0"}`}
            />

            {/* 3. ICON CONTAINER (Fixed Width for Perfect Alignment) */}
            {/* min-w-[48px] ensures every icon takes exact same space, keeping text aligned */}
            <div className="relative z-10 flex items-center justify-center min-w-[48px] h-full">
                <Icon
                    size={20}
                    className={`transition-all duration-300 ${active
                            ? "text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.8)] scale-110"
                            : "text-gray-500 group-hover:text-gray-200 group-hover:scale-105"
                        }`}
                />
            </div>

            {/* 4. LABEL (Slides in/out but stays aligned) */}
            <div className={`flex items-center h-full overflow-hidden transition-all duration-300
                ${isOpen ? "w-full opacity-100" : "w-0 opacity-0"}`}
            >
                <span className={`text-sm font-bold tracking-wide whitespace-nowrap ml-1
                    ${active ? "text-white" : "text-gray-500 group-hover:text-gray-200"}`}
                >
                    {label}
                </span>
            </div>
        </button>
    );
};

export default SidebarItem;