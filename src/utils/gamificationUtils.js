// src/utils/gamificationUtils.js

export const RANKS = [
    { name: "Bronze", minLevel: 1, color: "text-orange-700", border: "border-orange-700", bg: "bg-orange-900/20" },
    { name: "Silver", minLevel: 10, color: "text-gray-400", border: "border-gray-400", bg: "bg-gray-500/20" },
    { name: "Gold", minLevel: 20, color: "text-yellow-400", border: "border-yellow-400", bg: "bg-yellow-500/20" },
    { name: "Platinum", minLevel: 30, color: "text-cyan-400", border: "border-cyan-400", bg: "bg-cyan-500/20" },
    { name: "Diamond", minLevel: 40, color: "text-blue-500", border: "border-blue-500", bg: "bg-blue-600/20" },
    { name: "Crown", minLevel: 50, color: "text-purple-500", border: "border-purple-500", bg: "bg-purple-600/20" },
    { name: "Ace", minLevel: 60, color: "text-red-500", border: "border-red-500", bg: "bg-red-600/20" },
    { name: "Conqueror", minLevel: 80, color: "text-yellow-300 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]", border: "border-yellow-300", bg: "bg-yellow-500/30" }
];

export const BADGES = [
    { id: 'bug_hunter', label: 'Bug Hunter 🐞', desc: 'Reported 10+ Bugs' },
    { id: 'night_owl', label: 'Night Owl 🦉', desc: 'Worked after 2 AM' },
    { id: 'shipper', label: 'The Shipper 🚀', desc: 'Released a Version' },
    { id: 'pixel_perfect', label: 'Pixel Perfect 🎨', desc: 'Approved Design' },
    { id: 'clean_coder', label: 'Clean Coder 💻', desc: 'Code Approved without comments' },
    { id: 'task_master', label: 'Task Master ⚡', desc: 'Completed 50+ Tasks' }
];

export const getRank = (level) => {
    // Reverse loop ta k highest rank pehly check ho
    const rank = [...RANKS].reverse().find(r => level >= r.minLevel);
    return rank || RANKS[0];
};

export const getNextLevelXP = (level) => {
    // Formula: Level * 100 XP required (e.g. Lvl 1 needs 100, Lvl 2 needs 200)
    return level * 100;
};

export const calculateLevelFromXP = (totalXP) => {
    let level = 1;
    let xp = totalXP;
    // Iterate to find current level based on total XP
    while (xp >= getNextLevelXP(level)) {
        xp -= getNextLevelXP(level);
        level++;
    }
    // Returns: Current Level, XP in current level, XP needed for next level
    return { level, currentXP: xp, requiredXP: getNextLevelXP(level) };
};