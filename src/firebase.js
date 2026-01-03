// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase config (tumhara hi hai – correct)
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyBV8-5u6MSLIX8Hpht5evyuCtohwkVD1Q8",
    authDomain: "unity-work-os.firebaseapp.com",
    projectId: "unity-work-os",
    storageBucket: "unity-work-os.firebasestorage.app",
    messagingSenderId: "508390444930",
    appId: "1:508390444930:web:941545e8be55ee29a2499b",
    measurementId: "G-LE5G4K89G8"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
