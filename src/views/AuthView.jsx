import { useState, useEffect } from "react";
import { Link } from "react-router-dom"; // 👈 ✅ 1. Import Link
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, sendEmailVerification, signOut, reload } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { Box, Mail, Lock, User, ArrowRight, AlertTriangle, CheckCircle, RefreshCw, X, Book } from "lucide-react"; // 👈 ✅ 2. Import Book Icon
import { auth, db } from "../firebase/config";

const AuthView = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [isReset, setIsReset] = useState(false);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [awaitingVerification, setAwaitingVerification] = useState(false);
    const VERIFICATION_EXPIRY_MINUTES = 30;

    useEffect(() => {
        if (localStorage.getItem("needsVerification") === "true") { setAwaitingVerification(true); setIsLogin(true); }
    }, []);

    const checkVerificationStatus = async () => {
        setLoading(true);
        try {
            const user = auth.currentUser;
            if (user) {
                await reload(user);
                if (user.emailVerified) { localStorage.removeItem("needsVerification"); window.location.reload(); }
                else { setError("Email is not verified yet. Please check your inbox."); }
            } else { setError("Session expired. Please log in again."); setAwaitingVerification(false); localStorage.removeItem("needsVerification"); }
        } catch (err) { setError("Error checking status."); } finally { setLoading(false); }
    };

    const handleAuth = async (e) => {
        e.preventDefault(); setLoading(true); setError(""); setMessage("");
        try {
            if (isReset) {
                await sendPasswordResetEmail(auth, email); setMessage("Reset link sent! Please check your email inbox."); setIsReset(false);
            } else if (isLogin) {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                if (!user.emailVerified) {
                    const diffMinutes = (new Date().getTime() - new Date(user.metadata.creationTime).getTime()) / 60000;
                    await signOut(auth);
                    if (diffMinutes > VERIFICATION_EXPIRY_MINUTES) setError("Account does not exist or verification link expired.");
                    else { localStorage.setItem("needsVerification", "true"); setAwaitingVerification(true); setError(""); }
                    return;
                }
            } else {
                if (password !== confirmPassword) throw new Error("Passwords do not match!");
                if (password.length < 6) throw new Error("Password must be at least 6 characters.");
                const res = await createUserWithEmailAndPassword(auth, email, password);
                await setDoc(doc(db, "users", res.user.uid), { email: email, name: name, createdAt: serverTimestamp(), role: 'Developer', teamId: null });
                await sendEmailVerification(res.user);
                localStorage.setItem("needsVerification", "true"); setAwaitingVerification(true); setPassword(""); setConfirmPassword("");
            }
        } catch (err) { setError(err.message.replace("Firebase: ", "")); } finally { setLoading(false); }
    };

    if (awaitingVerification) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/10 to-purple-900/10 pointer-events-none" />
                <div className="bg-[#151518]/80 backdrop-blur-xl border border-blue-500/30 p-8 rounded-2xl shadow-[0_0_50px_rgba(59,130,246,0.15)] max-w-sm w-full text-center relative z-10">
                    <div className="bg-blue-500/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-400 border border-blue-500/30 animate-pulse"><Mail size={36} /></div>
                    <h3 className="text-2xl font-bold text-white mb-2">Check your Email</h3>
                    <p className="text-sm text-gray-400 mb-6">Link sent to <span className="text-blue-400 font-mono">{email}</span></p>
                    <div className="bg-amber-900/20 border border-amber-700/30 p-3 rounded-lg mb-6 text-left"><p className="text-xs text-amber-500 flex gap-2"><AlertTriangle size={14} className="shrink-0" /> Check Spam folder. Link expires in {VERIFICATION_EXPIRY_MINUTES} mins.</p></div>
                    {error && <div className="mb-4 text-xs text-red-400 bg-red-900/20 p-2 rounded border border-red-900/30">{error}</div>}
                    <button onClick={checkVerificationStatus} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-blue-900/20 mb-3">{loading ? <RefreshCw size={18} className="animate-spin mx-auto" /> : "I Have Verified Email"}</button>
                    <button onClick={() => { signOut(auth); setAwaitingVerification(false); localStorage.removeItem("needsVerification"); setError(""); window.location.reload(); }} className="text-xs text-gray-500 hover:text-white underline">Back to Login</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center font-sans relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-600/5 via-transparent to-purple-600/5 pointer-events-none" />

            <div className="w-full max-w-md bg-[#151518]/80 backdrop-blur-2xl border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.5)] p-8 rounded-3xl relative z-10 animate-fade-in">
                <div className="flex items-center justify-center mb-8">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-900/30 mr-3"><Box className="w-6 h-6 text-white" /></div>
                    <h1 className="text-2xl font-bold text-white tracking-wide">Unity Work OS</h1>
                </div>

                <h2 className="text-center text-lg font-bold text-gray-200 mb-8 tracking-wide">{isReset ? "Reset Password" : (isLogin ? "Welcome Back" : "Create Account")}</h2>

                <form onSubmit={handleAuth} className="space-y-4">
                    {!isLogin && !isReset && (
                        <div className="group">
                            <label className="block text-xs uppercase font-bold text-gray-500 mb-1 group-focus-within:text-blue-500 transition-colors">Full Name</label>
                            <div className="relative"><User className="absolute left-3 top-3 text-gray-600" size={18} /><input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-[#0a0a0a] border border-white/10 p-3 pl-10 text-sm text-white rounded-xl outline-none focus:border-blue-500/50 transition-all placeholder-gray-700" placeholder="John Doe" /></div>
                        </div>
                    )}
                    <div className="group">
                        <label className="block text-xs uppercase font-bold text-gray-500 mb-1 group-focus-within:text-blue-500 transition-colors">Email</label>
                        <div className="relative"><Mail className="absolute left-3 top-3 text-gray-600" size={18} /><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-[#0a0a0a] border border-white/10 p-3 pl-10 text-sm text-white rounded-xl outline-none focus:border-blue-500/50 transition-all placeholder-gray-700" placeholder="dev@studio.com" /></div>
                    </div>
                    {!isReset && (
                        <div className="group">
                            <label className="block text-xs uppercase font-bold text-gray-500 mb-1 group-focus-within:text-blue-500 transition-colors">Password</label>
                            <div className="relative"><Lock className="absolute left-3 top-3 text-gray-600" size={18} /><input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-[#0a0a0a] border border-white/10 p-3 pl-10 text-sm text-white rounded-xl outline-none focus:border-blue-500/50 transition-all placeholder-gray-700" placeholder="••••••" /></div>
                        </div>
                    )}
                    {!isLogin && !isReset && (
                        <div className="group">
                            <label className="block text-xs uppercase font-bold text-gray-500 mb-1 group-focus-within:text-blue-500 transition-colors">Confirm Password</label>
                            <div className="relative"><Lock className="absolute left-3 top-3 text-gray-600" size={18} /><input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full bg-[#0a0a0a] border border-white/10 p-3 pl-10 text-sm text-white rounded-xl outline-none focus:border-blue-500/50 transition-all placeholder-gray-700" placeholder="••••••" /></div>
                        </div>
                    )}

                    {error && <div className="flex items-center gap-2 text-red-400 text-xs bg-red-900/10 p-3 border border-red-500/20 rounded-xl"><AlertTriangle size={16} /> {error}</div>}
                    {message && <div className="text-emerald-400 text-xs bg-emerald-900/10 p-3 border border-emerald-500/20 rounded-xl text-center font-bold flex items-center justify-center gap-2"><CheckCircle size={14} /> {message}</div>}

                    <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-3.5 px-4 text-sm transition-all rounded-xl shadow-lg shadow-blue-900/20 flex justify-center gap-2 items-center hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0">
                        {loading ? "Processing..." : (isReset ? "Send Reset Link" : (isLogin ? "Log In" : "Sign Up"))} {!loading && <ArrowRight size={16} />}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-white/5 flex justify-between text-xs text-gray-500 font-medium">
                    {isReset ? <button onClick={() => { setIsReset(false); setMessage(""); setError(""); }} className="hover:text-white transition-colors">Back to Login</button> : <>
                        <button onClick={() => { setIsReset(true); setMessage(""); setError(""); }} className="hover:text-blue-400 transition-colors">Forgot Password?</button>
                        <button onClick={() => { setIsLogin(!isLogin); setMessage(""); setError(""); }} className="hover:text-white transition-colors">{isLogin ? "Create an account" : "Log In instead"}</button>
                    </>}
                </div>

                {/* 👇 ✅ 3. NEW DOCS LINK ADDED HERE */}
                <div className="mt-6 text-center">
                    <Link to="/docs" className="text-xs text-gray-600 hover:text-blue-400 flex items-center justify-center gap-2 transition-colors">
                        <Book size={14} /> Read Documentation
                    </Link>
                </div>

            </div>
        </div>
    );
};

export default AuthView;