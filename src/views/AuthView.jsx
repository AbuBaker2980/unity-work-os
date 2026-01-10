import { useState } from "react";
import { Link } from "react-router-dom";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, sendEmailVerification, signOut } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { Box, Mail, Lock, User, ArrowRight, AlertTriangle, CheckCircle, RefreshCw, Book, LogIn } from "lucide-react";
import { auth, db } from "../firebase/config";

const AuthView = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [isReset, setIsReset] = useState(false);

    // Form State
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // UI State
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [awaitingVerification, setAwaitingVerification] = useState(false);

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setMessage("");

        try {
            if (isReset) {
                await sendPasswordResetEmail(auth, email);
                setMessage("Reset link sent! Please check your email inbox.");
                setIsReset(false);
            } else if (isLogin) {
                // --- LOGIN LOGIC ---
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                if (!user.emailVerified) {
                    await signOut(auth); // Sign out immediately if not verified
                    setAwaitingVerification(true); // Show verification screen
                    return;
                }
                // If verified, App.jsx handles the redirect automatically
            } else {
                // --- SIGNUP LOGIC ---
                if (password !== confirmPassword) throw new Error("Passwords do not match!");
                if (password.length < 6) throw new Error("Password must be at least 6 characters.");

                const res = await createUserWithEmailAndPassword(auth, email, password);

                // Create User Doc
                await setDoc(doc(db, "users", res.user.uid), {
                    email: email,
                    name: name,
                    createdAt: serverTimestamp(),
                    role: 'Developer',
                    teamId: null
                });

                await sendEmailVerification(res.user);
                await signOut(auth); // Sign out so they have to login after verifying

                setAwaitingVerification(true);
                setPassword("");
                setConfirmPassword("");
            }
        } catch (err) {
            console.error(err);
            let msg = err.message.replace("Firebase: ", "").replace("auth/", "");
            // User friendly errors
            if (msg.includes("invalid-credential")) msg = "Invalid Email or Password.";
            if (msg.includes("email-already-in-use")) msg = "Email already registered.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    // --- VERIFICATION SCREEN ---
    if (awaitingVerification) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/10 to-purple-900/10 pointer-events-none" />

                <div className="bg-[#151518]/80 backdrop-blur-xl border border-blue-500/30 p-8 rounded-2xl shadow-[0_0_50px_rgba(59,130,246,0.15)] max-w-sm w-full text-center relative z-10 animate-fade-in">
                    <div className="bg-blue-500/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-400 border border-blue-500/30 animate-pulse">
                        <Mail size={36} />
                    </div>

                    <h3 className="text-2xl font-bold text-white mb-2">Check your Email</h3>
                    <p className="text-sm text-gray-400 mb-6">
                        We sent a verification link to <br /> <span className="text-blue-400 font-mono">{email}</span>
                    </p>

                    <div className="bg-amber-900/20 border border-amber-700/30 p-3 rounded-lg mb-6 text-left">
                        <p className="text-xs text-amber-500 flex gap-2">
                            <AlertTriangle size={14} className="shrink-0" />
                            Please check your Spam folder.
                        </p>
                    </div>

                    <button
                        onClick={() => { setAwaitingVerification(false); setIsLogin(true); }}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-blue-900/20 mb-3 flex items-center justify-center gap-2"
                    >
                        <LogIn size={18} /> Back to Login
                    </button>

                    <p className="text-xs text-gray-500">
                        After verifying, log in again to access your dashboard.
                    </p>
                </div>
            </div>
        );
    }

    // --- MAIN AUTH FORM ---
    return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center font-sans relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-600/5 via-transparent to-purple-600/5 pointer-events-none" />

            <div className="w-full max-w-md bg-[#151518]/80 backdrop-blur-2xl border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.5)] p-8 rounded-3xl relative z-10 animate-fade-in">
                <div className="flex items-center justify-center mb-8">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-900/30 mr-3">
                        <Box className="w-6 h-6 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-wide">Unity Work OS</h1>
                </div>

                <h2 className="text-center text-lg font-bold text-gray-200 mb-8 tracking-wide">
                    {isReset ? "Reset Password" : (isLogin ? "Welcome Back" : "Create Account")}
                </h2>

                <form onSubmit={handleAuth} className="space-y-4">
                    {!isLogin && !isReset && (
                        <div className="group">
                            <label className="block text-xs uppercase font-bold text-gray-500 mb-1 group-focus-within:text-blue-500 transition-colors">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 text-gray-600" size={18} />
                                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-[#0a0a0a] border border-white/10 p-3 pl-10 text-sm text-white rounded-xl outline-none focus:border-blue-500/50 transition-all placeholder-gray-700" placeholder="John Doe" />
                            </div>
                        </div>
                    )}

                    <div className="group">
                        <label className="block text-xs uppercase font-bold text-gray-500 mb-1 group-focus-within:text-blue-500 transition-colors">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 text-gray-600" size={18} />
                            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-[#0a0a0a] border border-white/10 p-3 pl-10 text-sm text-white rounded-xl outline-none focus:border-blue-500/50 transition-all placeholder-gray-700" placeholder="dev@studio.com" />
                        </div>
                    </div>

                    {!isReset && (
                        <div className="group">
                            <label className="block text-xs uppercase font-bold text-gray-500 mb-1 group-focus-within:text-blue-500 transition-colors">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 text-gray-600" size={18} />
                                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-[#0a0a0a] border border-white/10 p-3 pl-10 text-sm text-white rounded-xl outline-none focus:border-blue-500/50 transition-all placeholder-gray-700" placeholder="••••••" />
                            </div>
                        </div>
                    )}

                    {!isLogin && !isReset && (
                        <div className="group">
                            <label className="block text-xs uppercase font-bold text-gray-500 mb-1 group-focus-within:text-blue-500 transition-colors">Confirm Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 text-gray-600" size={18} />
                                <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full bg-[#0a0a0a] border border-white/10 p-3 pl-10 text-sm text-white rounded-xl outline-none focus:border-blue-500/50 transition-all placeholder-gray-700" placeholder="••••••" />
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center gap-2 text-red-400 text-xs bg-red-900/10 p-3 border border-red-500/20 rounded-xl animate-fade-in">
                            <AlertTriangle size={16} /> {error}
                        </div>
                    )}

                    {message && (
                        <div className="text-emerald-400 text-xs bg-emerald-900/10 p-3 border border-emerald-500/20 rounded-xl text-center font-bold flex items-center justify-center gap-2 animate-fade-in">
                            <CheckCircle size={14} /> {message}
                        </div>
                    )}

                    <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-3.5 px-4 text-sm transition-all rounded-xl shadow-lg shadow-blue-900/20 flex justify-center gap-2 items-center hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0">
                        {loading ? <RefreshCw className="animate-spin" size={18} /> : (isReset ? "Send Reset Link" : (isLogin ? "Log In" : "Sign Up"))}
                        {!loading && !isReset && <ArrowRight size={16} />}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-white/5 flex justify-between text-xs text-gray-500 font-medium">
                    {isReset ? (
                        <button onClick={() => { setIsReset(false); setMessage(""); setError(""); }} className="hover:text-white transition-colors">Back to Login</button>
                    ) : (
                        <>
                            <button onClick={() => { setIsReset(true); setMessage(""); setError(""); }} className="hover:text-blue-400 transition-colors">Forgot Password?</button>
                            <button onClick={() => { setIsLogin(!isLogin); setMessage(""); setError(""); }} className="hover:text-white transition-colors">
                                {isLogin ? "Create an account" : "Log In instead"}
                            </button>
                        </>
                    )}
                </div>

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