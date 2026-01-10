import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase/config";
import { getTodayString, toDateObj } from "../utils/dateUtils"; // toDateObj import zaroori hai
import { playSound } from "../utils/soundUtils";

const DataContext = createContext();

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children, user }) => {
    const [projects, setProjects] = useState([]);
    const [folders, setFolders] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [activities, setActivities] = useState([]);
    const [inAppNotifications, setInAppNotifications] = useState([]);
    const [activityDate, setActivityDate] = useState(getTodayString());

    // ✅ FIX: Capture the exact time App started
    // Notifications will ONLY show for items created AFTER this time.
    const appBootTime = useRef(new Date());

    // Notification Helpers
    const projectsRef = useRef([]);
    useEffect(() => { projectsRef.current = projects; }, [projects]);

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

    // ✅ Helper to check if item is NEW (created after app open)
    const isNewItem = (timestamp) => {
        if (!timestamp) return false;
        const itemDate = toDateObj(timestamp); // Using utils to safely parse
        if (!itemDate) return false;
        // Check if item time is GREATER than App Boot Time
        return itemDate > appBootTime.current;
    };

    // --- DATA FETCHING ---
    useEffect(() => {
        if (!user?.teamId) return;
        requestNotificationPermission();

        const baseRef = (col) => collection(db, 'artifacts', 'unity-work-os', 'public', 'data', col);

        // 1. Projects
        const unsubProjects = onSnapshot(query(baseRef('projects'), where('teamId', '==', user.teamId)), (s) => {
            const fetched = s.docs.map(d => ({ id: d.id, ...d.data() }));

            s.docChanges().forEach((change) => {
                if (change.type === "modified") {
                    const newData = change.doc.data();
                    const oldData = projectsRef.current.find(p => p.id === change.doc.id);

                    // Logic: Only notify if I was JUST added to allowedMembers
                    if (oldData) {
                        const wasAllowed = (oldData.allowedMembers || []).includes(user.uid);
                        const isAllowed = (newData.allowedMembers || []).includes(user.uid);

                        // ✅ FIX: Check if modification happened NOW
                        if (!wasAllowed && isAllowed && isNewItem(newData.lastUpdated || new Date())) {
                            showDesktopNotification("Access Granted", `Added to discussion: ${newData.name}`);
                            addLocalNotification(`Added to discussion: ${newData.name}`);
                        }
                    }
                }
            });
            setProjects(fetched);
        });

        // 2. Folders
        const unsubFolders = onSnapshot(query(baseRef('folders'), where('teamId', '==', user.teamId)), (s) => {
            setFolders(s.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // 3. Tasks
        const unsubTasks = onSnapshot(query(baseRef('tasks'), where('teamId', '==', user.teamId)), (snapshot) => {
            const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

            snapshot.docChanges().forEach((change) => {
                const t = change.doc.data();

                // ✅ FIX: Strict Timestamp Check
                // Task must be created/completed AFTER app started
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

        // 4. Activities (Filtered by Date)
        const startOfDay = new Date(activityDate); startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(activityDate); endOfDay.setHours(23, 59, 59, 999);

        const unsubActivities = onSnapshot(query(baseRef('activities'),
            where('teamId', '==', user.teamId),
            where('timestamp', '>=', startOfDay),
            where('timestamp', '<=', endOfDay),
            orderBy('timestamp', 'desc')
        ), (snapshot) => {
            const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

            // ✅ OPTIONAL: Notify on critical activities (Delete/Upload) happening NOW
            snapshot.docChanges().forEach((change) => {
                const act = change.doc.data();
                if (change.type === "added" && isNewItem(act.timestamp)) {
                    if (act.type.includes("DELETE") || act.type.includes("UPLOAD")) {
                        // Only internal notification, no desktop popup to avoid spam
                        // console.log("New activity:", act.text); 
                    }
                }
            });

            setActivities(fetched);
        });

        // 5. Global Chat Notification
        const unsubChat = onSnapshot(query(baseRef('messages'), where("teamId", "==", user.teamId), orderBy("createdAt", "desc"), limit(1)), (snapshot) => {
            if (!snapshot.empty) {
                const msg = snapshot.docs[0].data();

                // ✅ FIX: Strict Time Check for Messages
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
            logActivity
        }}>
            {children}
        </DataContext.Provider>
    );
};