import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, orderBy, limit, doc, updateDoc, increment, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { getTodayString, toDateObj } from "../utils/dateUtils";
import { playSound } from "../utils/soundUtils";
import { calculateLevelFromXP, getRank } from "../utils/gamificationUtils";
import toast from "react-hot-toast";

const DataContext = createContext();

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children, user }) => {
    const [projects, setProjects] = useState([]);
    const [folders, setFolders] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [activities, setActivities] = useState([]);
    const [inAppNotifications, setInAppNotifications] = useState([]);
    const [activityDate, setActivityDate] = useState(getTodayString());

    const appBootTime = useRef(new Date());
    const projectsRef = useRef([]);
    useEffect(() => { projectsRef.current = projects; }, [projects]);

    // --- 🌟 GAMIFICATION LOGIC ---

    // 1. Daily Login Reward System
    useEffect(() => {
        if (!user?.uid) return;

        const checkDailyLogin = async () => {
            const todayStr = getTodayString();
            const userRef = doc(db, "users", user.uid);

            try {
                const userSnap = await getDoc(userRef);
                if (!userSnap.exists()) return;

                const userData = userSnap.data();
                const lastLogin = userData.lastLoginDate;

                // If first login of the day
                if (lastLogin !== todayStr) {
                    // Reset Daily Counters & Award Login XP
                    await updateDoc(userRef, {
                        lastLoginDate: todayStr,
                        dailyChatXP: 0, // Reset chat limit
                        xp: increment(10)
                    });

                    toast.success("☀️ Daily Login Bonus: +10 XP!", {
                        icon: '🎁',
                        style: { background: '#333', color: '#FFD700', border: '1px solid #FFD700' }
                    });
                    playSound('success');
                }
            } catch (error) {
                console.error("Daily Login Error:", error);
            }
        };

        checkDailyLogin();
    }, [user?.uid]);

    // 2. Chat XP Handler (Max 50 XP per day)
    const awardChatXP = async () => {
        if (!user?.uid) return;
        const userRef = doc(db, "users", user.uid);

        try {
            const userSnap = await getDoc(userRef);
            const userData = userSnap.data();
            const currentDaily = userData.dailyChatXP || 0;

            if (currentDaily < 50) {
                await updateDoc(userRef, {
                    dailyChatXP: increment(5),
                    xp: increment(5)
                });
                // Small toast for chat XP (optional, maybe too spammy?)
                // toast.success("+5 XP", { position: 'bottom-left', duration: 1000, icon: '💬' });
            }
        } catch (error) {
            console.error(error);
        }
    };

    // 3. Universal Add XP
    const addXP = async (amount) => {
        if (!user?.uid) return;
        const userRef = doc(db, "users", user.uid);

        try {
            const userSnap = await getDoc(userRef);
            if (!userSnap.exists()) return;

            const userData = userSnap.data();
            const currentTotalXP = (userData.xp || 0) + amount;

            const { level: newLevel } = calculateLevelFromXP(currentTotalXP);
            const oldLevel = userData.level || 1;

            await updateDoc(userRef, {
                xp: increment(amount),
                level: newLevel
            });

            if (newLevel > oldLevel) {
                const newRank = getRank(newLevel);
                playSound('success');
                toast.success(`🎉 LEVEL UP! You are now Lvl ${newLevel} (${newRank.name})`, {
                    duration: 5000,
                    icon: '🆙',
                    style: { borderRadius: '10px', background: '#333', color: '#fff', border: '2px solid #ffd700' }
                });
                logActivity(`${user.name} leveled up to ${newRank.name} (Lvl ${newLevel})!`, 'LEVEL_UP');
            } else {
                toast(`+${amount} XP`, { icon: '✨', style: { borderRadius: '10px', background: '#333', color: '#fff' } });
            }

        } catch (error) {
            console.error("XP Error:", error);
        }
    };

    const logActivity = async (text, type, meta = {}) => {
        if (!user?.teamId) return;
        await addDoc(collection(db, 'artifacts', 'unity-work-os', 'public', 'data', 'activities'), {
            text, type, meta, timestamp: serverTimestamp(), teamId: user.teamId
        });
    };

    const addLocalNotification = (text) => {
        const newNotif = { id: crypto.randomUUID(), text, time: new Date().toLocaleTimeString() };
        setInAppNotifications(prev => [newNotif, ...prev]);
    };

    const requestNotificationPermission = () => {
        if ("Notification" in window && Notification.permission !== "granted") Notification.requestPermission();
    };

    const showDesktopNotification = (title, body) => {
        if (Notification.permission === "granted") {
            const notif = new Notification(title, { body, icon: '/icon.ico' });
            notif.onclick = () => window.focus();
        }
        playSound('notification');
    };

    const isNewItem = (timestamp) => {
        if (!timestamp) return false;
        const itemDate = toDateObj(timestamp);
        if (!itemDate) return false;
        return itemDate > appBootTime.current;
    };

    // --- DATA FETCHING ---
    useEffect(() => {
        if (!user?.teamId) return;
        requestNotificationPermission();

        const baseRef = (col) => collection(db, 'artifacts', 'unity-work-os', 'public', 'data', col);

        const unsubProjects = onSnapshot(query(baseRef('projects'), where('teamId', '==', user.teamId)), (s) => {
            const fetched = s.docs.map(d => ({ id: d.id, ...d.data() }));
            s.docChanges().forEach((change) => {
                if (change.type === "modified") {
                    const newData = change.doc.data();
                    const oldData = projectsRef.current.find(p => p.id === change.doc.id);
                    if (oldData) {
                        const wasAllowed = (oldData.allowedMembers || []).includes(user.uid);
                        const isAllowed = (newData.allowedMembers || []).includes(user.uid);
                        if (!wasAllowed && isAllowed && isNewItem(newData.lastUpdated || new Date())) {
                            showDesktopNotification("Access Granted", `Added to discussion: ${newData.name}`);
                            addLocalNotification(`Added to discussion: ${newData.name}`);
                        }
                    }
                }
            });
            setProjects(fetched);
        });

        const unsubFolders = onSnapshot(query(baseRef('folders'), where('teamId', '==', user.teamId)), (s) => {
            setFolders(s.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        const unsubTasks = onSnapshot(query(baseRef('tasks'), where('teamId', '==', user.teamId)), (snapshot) => {
            const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            snapshot.docChanges().forEach((change) => {
                const t = change.doc.data();
                if (change.type === "added" && t.assignedTo === user.uid && t.assignedBy !== user.uid) {
                    if (isNewItem(t.startTime)) {
                        showDesktopNotification("New Assignment", `Task: ${t.title}`);
                        addLocalNotification(`New Task: ${t.title}`);
                    }
                }
                if (change.type === "modified" && t.status === 'Completed' && t.assignedTo !== user.uid) {
                    if (isNewItem(t.completionTime)) {
                        showDesktopNotification("Task Completed", `${t.assignedByName} finished: ${t.title}`);
                        addLocalNotification(`${t.assignedByName} completed: ${t.title}`);
                    }
                }
            });
            setTasks(fetched);
        });

        const startOfDay = new Date(activityDate); startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(activityDate); endOfDay.setHours(23, 59, 59, 999);

        const unsubActivities = onSnapshot(query(baseRef('activities'),
            where('teamId', '==', user.teamId),
            where('timestamp', '>=', startOfDay),
            where('timestamp', '<=', endOfDay),
            orderBy('timestamp', 'desc')
        ), (snapshot) => {
            const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setActivities(fetched);
        });

        const unsubChat = onSnapshot(query(baseRef('messages'), where("teamId", "==", user.teamId), orderBy("createdAt", "desc"), limit(1)), (snapshot) => {
            if (!snapshot.empty) {
                const msg = snapshot.docs[0].data();
                if (msg.senderId !== user.uid && isNewItem(msg.createdAt)) {
                    if (msg.text.includes(`@${user.name}`)) {
                        showDesktopNotification("New Mention", `${msg.senderName}: ${msg.text}`);
                        addLocalNotification(`${msg.senderName} mentioned you`);
                    } else {
                        showDesktopNotification(`Message from ${msg.senderName}`, msg.text);
                    }
                }
            }
        });

        return () => { unsubProjects(); unsubFolders(); unsubTasks(); unsubActivities(); unsubChat(); };
    }, [user?.teamId, activityDate]);

    const clearNotifications = () => setInAppNotifications([]);

    return (
        <DataContext.Provider value={{
            projects, folders, tasks, activities,
            inAppNotifications, clearNotifications,
            activityDate, setActivityDate,
            logActivity, addXP, awardChatXP // 👈 Added awardChatXP
        }}>
            {children}
        </DataContext.Provider>
    );
};