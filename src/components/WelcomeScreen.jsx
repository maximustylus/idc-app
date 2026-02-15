import React, { useState, useEffect } from 'react';
import { auth } from '../firebase'; // Ensure this path is correct
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { Sun, Moon, ArrowRight, Activity, ShieldCheck, Cpu, Database, Lock, AlertCircle, ChevronLeft } from 'lucide-react';

const WelcomeScreen = (props) => {
    // Determine the parent function to call on success
    const onAuthSuccess = props.onStart || props.onLogin || props.onEnter;

    // UI STATES
    const [view, setView] = useState('SPLASH'); // 'SPLASH' | 'AUTH'
    const [isDark, setIsDark] = useState(false);
    const [animate, setAnimate] = useState(false);

    // AUTH STATES
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // --- THEME & ANIMATION ON MOUNT ---
    useEffect(() => {
        const storedTheme = localStorage.getItem('nexus-theme');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (storedTheme === 'dark' || (!storedTheme && systemPrefersDark)) {
            setIsDark(true);
            document.documentElement.classList.add('dark');
        } else {
            setIsDark(false);
            document.documentElement.classList.remove('dark');
        }
        
        // Trigger entry animation
        setTimeout(() => setAnimate(true), 100);
    }, []);

    const toggleTheme = () => {
        const newTheme = !isDark;
        setIsDark(newTheme);
        
        if (newTheme) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('nexus-theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('nexus-theme', 'light');
        }
    };

    // --- AUTH LOGIC ---
    const handleAuth = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Domain Lock (Optional but recommended)
        // if (!isLoginMode && !email.toLowerCase().endsWith('@kkh.com.sg')) {
        //     setError("Access Restricted: Only @kkh.com.sg addresses are allowed.");
        //     setLoading(false);
        //     return;
        // }

        try {
            if (isLoginMode) {
                await signInWithEmailAndPassword(auth, email, password);
                // Parent App.js usually listens to auth state changes, 
                // but we can also trigger the callback manually if needed.
                if (onAuthSuccess) onAuthSuccess();
            } else {
                if (!name) throw new Error("Please enter your display name.");
                if (password.length < 6) throw new Error("Password must be at least 6 characters.");
                
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await updateProfile(userCredential.user, { displayName: name });
                if (onAuthSuccess) onAuthSuccess();
            }
        } catch (err) {
            console.error(err);
            if (err.code === 'auth/invalid-credential') setError("Incorrect email or password.");
            else if (err.code === 'auth/email-already-in-use') setError("Email already registered. Please Login.");
            else if (err.code === 'auth/weak-password') setError("Password must be 6+ characters.");
            else setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 transition-colors duration-700 flex flex-col items-center justify-center relative overflow-hidden px-4 md:px-6">
            
            {/* AMBIENT BACKGROUND */}
            <div className={`absolute top-0 left-0 w-[800px] h-[800px] bg-indigo-600/20 rounded-full blur-[150px] transition-all duration-1000 ${animate ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'}`}></div>
            <div className={`absolute bottom-0 right-0 w-[800px] h-[800px] bg-emerald-600/10 rounded-full blur-[150px] transition-all duration-1000 ${animate ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}></div>

            {/* THEME TOGGLE (Top Right) */}
            <div className="absolute top-6 right-6 z-50">
                <button 
                    onClick={toggleTheme}
                    className="p-3 md:p-4 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-md shadow-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:scale-110 transition-transform duration-300 group"
                >
                    {isDark ? 
                        <Sun size={20} className="text-amber-400 group-hover:rotate-90 transition-transform duration-500" /> : 
                        <Moon size={20} className="text-indigo-600 group-hover:-rotate-12 transition-transform duration-500" />
                    }
                </button>
            </div>

            {/* MAIN CARD CONTAINER */}
            <div className={`relative z-10 w-full max-w-5xl mx-auto bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-white/40 dark:border-slate-700/50 overflow-hidden transition-all duration-1000 transform ${animate ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-20 opacity-0 scale-95'}`}>
                
                <div className="flex flex-col md:flex-row min-h-[600px]">
                    
                    {/* LEFT SIDE: BRANDING (Always Visible) */}
                    <div className={`md:w-1/2 p-10 md:p-16 flex flex-col justify-center items-center text-center transition-all duration-500 ${view === 'AUTH' ? 'hidden md:flex' : 'flex'}`}>
                         {/* Logo */}
                        <div className="w-24 h-24 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-500/40 rotate-3 hover:rotate-0 transition-transform duration-500 mb-8 cursor-pointer">
                            <Activity className="text-white w-12 h-12" strokeWidth={1.5} />
                        </div>

                        <h1 className="text-5xl md:text-6xl font-black text-slate-800 dark:text-white tracking-tighter mb-4 leading-none drop-shadow-sm">
                            NEXUS <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-500">IDC</span>
                        </h1>
                        
                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.25em] mb-8">
                            Interactive Dashboard for Clinicians v1.3
                        </p>

                        {/* Tech Pills */}
                        <div className="flex flex-wrap justify-center gap-3 mb-10">
                            <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800/80 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                <ShieldCheck size={14} className="text-emerald-500"/> SECURE
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800/80 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                <Cpu size={14} className="text-indigo-500"/> GEMINI AI
                            </div>
                        </div>

                        {/* SPLASH BUTTON (Only visible in Splash View) */}
                        {view === 'SPLASH' && (
                            <button 
                                onClick={() => setView('AUTH')}
                                className="group relative px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-sm rounded-xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden w-full max-w-xs"
                            >
                                <span className="relative z-10 flex items-center justify-center gap-3">
                                    INITIALIZE SYSTEM <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform"/>
                                </span>
                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-violet-600 opacity-0 group-hover:opacity-10 dark:group-hover:opacity-100 dark:group-hover:text-white transition-all duration-300"></div>
                            </button>
                        )}
                        
                         <p className="mt-8 text-[10px] text-slate-400 font-medium">
                            © 2026 SSMC @ KK Women's and Children's Hospital.
                        </p>
                    </div>

                    {/* RIGHT SIDE: AUTH FORM (Only visible in Auth View) */}
                    {view === 'AUTH' && (
                        <div className="md:w-1/2 bg-white/50 dark:bg-slate-950/50 p-8 md:p-12 flex flex-col justify-center animate-in slide-in-from-right duration-500 border-l border-white/20 dark:border-slate-800">
                            
                            <button onClick={() => setView('SPLASH')} className="self-start mb-6 text-slate-400 hover:text-indigo-500 transition-colors flex items-center gap-1 text-xs font-bold uppercase">
                                <ChevronLeft size={16}/> Back
                            </button>

                            <div className="text-center mb-8">
                                <div className="bg-indigo-50 dark:bg-indigo-900/30 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-600 dark:text-indigo-400 shadow-inner">
                                    <Lock size={24} />
                                </div>
                                <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">
                                    {isLoginMode ? 'Clinician Login' : 'New Staff Registration'}
                                </h2>
                                <p className="text-slate-500 text-xs font-medium mt-1">
                                    {isLoginMode ? 'Secure access to your clinical dashboard' : 'Join the KKH IDC Workspace'}
                                </p>
                            </div>

                            {error && (
                                <div className="mb-6 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl flex items-start gap-3 text-xs font-bold border border-red-100 dark:border-red-800/50">
                                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleAuth} className="space-y-4 max-w-sm mx-auto w-full">
                                {!isLoginMode && (
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Full Name</label>
                                        <input 
                                            type="text" 
                                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm font-bold text-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                                            placeholder="e.g. Alif (Senior CEP)" 
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Email</label>
                                    <input 
                                        type="email" 
                                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm font-bold text-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                                        placeholder="name@kkh.com.sg" 
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Password</label>
                                    <input 
                                        type="password" 
                                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm font-bold text-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                                        placeholder="••••••••" 
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>

                                <button 
                                    type="submit" 
                                    disabled={loading}
                                    className="w-full py-3.5 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none active:scale-95 flex justify-center items-center gap-2 mt-4"
                                >
                                    {loading ? 'Verifying...' : (isLoginMode ? 'ACCESS DASHBOARD' : 'CREATE ACCOUNT')}
                                    {!loading && <ArrowRight size={18} />}
                                </button>
                            </form>

                            <div className="mt-6 text-center pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
                                <p className="text-xs text-slate-500 font-medium">
                                    {isLoginMode ? "New to the team?" : "Already have an account?"}
                                </p>
                                <button 
                                    onClick={() => { setIsLoginMode(!isLoginMode); setError(''); }}
                                    className="text-indigo-600 dark:text-indigo-400 font-black text-xs uppercase tracking-wide mt-1 hover:underline"
                                >
                                    {isLoginMode ? "Register New Account" : "Back to Login"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WelcomeScreen;
