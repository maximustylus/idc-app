import React, { useState, useEffect } from 'react';
import { auth } from '../firebase'; 
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { Sun, Moon, ArrowRight, Activity, ShieldCheck, Cpu, Database, Lock, AlertCircle, ChevronLeft, Building2, Globe, Calendar } from 'lucide-react';

const WelcomeScreen = (props) => {
    const onAuthSuccess = props.onStart || props.onLogin || props.onEnter;

    // VIEW STATES: 'SPLASH' | 'AUTH' | 'ORG_REGISTER'
    const [view, setView] = useState('SPLASH'); 
    const [isDark, setIsDark] = useState(false);
    const [animate, setAnimate] = useState(false);

    // AUTH STATES
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // --- THEME & ANIMATION ---
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

    const handleAuth = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (isLoginMode) {
                await signInWithEmailAndPassword(auth, email, password);
                if (onAuthSuccess) onAuthSuccess();
            } else {
                if (!name) throw new Error("Please enter your display name.");
                if (password.length < 6) throw new Error("Password must be 6+ chars.");
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await updateProfile(userCredential.user, { displayName: name });
                if (onAuthSuccess) onAuthSuccess();
            }
        } catch (err) {
            console.error(err);
            setError(err.message.replace('Firebase:', '').trim());
        } finally {
            setLoading(false);
        }
    };

    // --- DYNAMIC STYLES ---
    const isSplitView = view === 'AUTH' || view === 'ORG_REGISTER';

    return (
        <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 transition-colors duration-700 flex flex-col items-center justify-center relative overflow-hidden px-4 md:px-6">
            
            {/* AMBIENT BACKGROUND */}
            <div className={`absolute top-0 left-0 w-[800px] h-[800px] bg-indigo-600/20 rounded-full blur-[150px] transition-all duration-1000 ${animate ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'}`}></div>
            <div className={`absolute bottom-0 right-0 w-[800px] h-[800px] bg-emerald-600/10 rounded-full blur-[150px] transition-all duration-1000 ${animate ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}></div>

            {/* THEME TOGGLE */}
            <div className="absolute top-6 right-6 z-50">
                <button onClick={toggleTheme} className="p-3 md:p-4 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-md shadow-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:scale-110 transition-transform">
                    {isDark ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} className="text-indigo-600" />}
                </button>
            </div>

            {/* MAIN CARD CONTAINER */}
            <div className={`relative z-10 w-full max-w-7xl mx-auto shadow-2xl transition-all duration-1000 transform ${animate ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-20 opacity-0 scale-95'}`}>
                
                <div className="flex flex-col md:flex-row min-h-[750px] bg-transparent">
                    
                    {/* LEFT PANEL: BRANDING (Morphs from Center to Left) */}
                    <div className={`
                        relative z-20 flex flex-col justify-center items-center text-center p-8 md:p-12
                        bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-white/40 dark:border-slate-700/50
                        transition-all duration-700 ease-in-out
                        ${isSplitView 
                            ? 'w-full md:w-1/2 rounded-t-[2.5rem] md:rounded-l-[2.5rem] md:rounded-tr-none' 
                            : 'w-full rounded-[2.5rem]'
                        }
                    `}>
                        {/* --- [CUSTOM LOGO] --- */}
                        <img 
                            src="/nexus.png" 
                            alt="NEXUS Logo" 
                            className="w-24 h-24 mb-6 object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-500"
                        />
                        
                        <h1 className="text-4xl md:text-6xl font-black text-slate-800 dark:text-white tracking-tighter mb-2 leading-none">
                            NEXUS <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-500">IDC</span>
                        </h1>
                        
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.25em] mb-4">
                            App v1.3 | KK Women's and Children's Hospital
                        </p>

                        {/* --- [SYNERGY: RESTORED CONTEXT] --- */}
                        {/* This section provides the "What is this?" context but hides when user logs in */}
                        <div className={`max-w-xl transition-all duration-500 ${isSplitView ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100 h-auto'}`}>
                            <p className="text-base text-slate-600 dark:text-slate-300 font-medium mb-8 leading-relaxed">
                                The Interactive Dashboard for Clinicians. Streamlining workload tracking, roster management, and team wellbeing intelligence in one secure, AI-powered platform.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10 text-left">
                                <div className="p-4 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-indigo-500/30 transition-colors">
                                    <div className="bg-blue-500/10 p-2 rounded-lg w-fit mb-2"><Activity size={18} className="text-blue-500"/></div>
                                    <h3 className="font-bold text-xs text-slate-800 dark:text-white">Smart Workload</h3>
                                    <p className="text-[10px] text-slate-500 mt-1">Real-time tracking of clinical & research loads.</p>
                                </div>
                                <div className="p-4 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-emerald-500/30 transition-colors">
                                    <div className="bg-emerald-500/10 p-2 rounded-lg w-fit mb-2"><ShieldCheck size={18} className="text-emerald-500"/></div>
                                    <h3 className="font-bold text-xs text-slate-800 dark:text-white">AURA Intelligence</h3>
                                    <p className="text-[10px] text-slate-500 mt-1">AI-powered burnout risk monitoring.</p>
                                </div>
                                <div className="p-4 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-purple-500/30 transition-colors">
                                    <div className="bg-purple-500/10 p-2 rounded-lg w-fit mb-2"><Calendar size={18} className="text-purple-500"/></div>
                                    <h3 className="font-bold text-xs text-slate-800 dark:text-white">Auto Rostering</h3>
                                    <p className="text-[10px] text-slate-500 mt-1">Conflict-free scheduling & balancing.</p>
                                </div>
                            </div>
                        </div>

                        {/* BUTTONS */}
                        <div className={`w-full max-w-xs space-y-3 transition-all duration-500 ${isSplitView ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100 h-auto'}`}>
                            <button 
                                onClick={() => setView('AUTH')}
                                className="group relative px-8 py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-sm rounded-xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden w-full"
                            >
                                <span className="relative z-10 flex items-center justify-center gap-2">
                                    INITIALIZE SYSTEM <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform"/>
                                </span>
                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-violet-600 opacity-0 group-hover:opacity-10 dark:group-hover:opacity-100 dark:group-hover:text-white transition-all duration-300"></div>
                            </button>

                            <button 
                                onClick={() => setView('ORG_REGISTER')}
                                className="w-full py-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-lg transition-all flex items-center justify-center gap-2"
                            >
                                <Building2 size={14}/> Want to deploy NEXUS for your team?
                            </button>
                        </div>
                        
                        <p className={`mt-6 text-[10px] text-slate-400 font-medium transition-opacity duration-500 ${isSplitView ? 'opacity-0' : 'opacity-100'}`}>
                            © 2026 Muhammad Alif.
                        </p>
                    </div>

                    {/* RIGHT PANEL: CONTENT CONTAINER (Slides/Fades In) */}
                    <div className={`
                        relative z-10 flex flex-col justify-center
                        bg-white/60 dark:bg-slate-950/60 backdrop-blur-xl border-y border-r border-white/40 dark:border-slate-700/50
                        transition-all duration-700 ease-in-out overflow-hidden
                        ${isSplitView 
                            ? 'w-full md:w-1/2 opacity-100 rounded-b-[2.5rem] md:rounded-r-[2.5rem] md:rounded-bl-none p-8 md:p-12' 
                            : 'w-0 opacity-0 p-0 border-none'
                        }
                    `}>
                        
                        {/* --- VIEW 1: AUTHENTICATION FORM --- */}
                        {view === 'AUTH' && (
                            <div className="w-full max-w-sm mx-auto animate-in slide-in-from-right duration-700 fade-in">
                                <button onClick={() => setView('SPLASH')} className="self-start mb-6 text-slate-400 hover:text-indigo-500 transition-colors flex items-center gap-1 text-xs font-bold uppercase">
                                    <ChevronLeft size={16}/> Back
                                </button>

                                <div className="text-center mb-8">
                                    <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">
                                        {isLoginMode ? 'Clinician Login' : 'Staff Registration'}
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

                                <form onSubmit={handleAuth} className="space-y-4">
                                    {!isLoginMode && (
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Full Name</label>
                                            <input type="text" className="w-full input-field-modern" placeholder="e.g. Alif" value={name} onChange={(e) => setName(e.target.value)}/>
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Email</label>
                                        <input type="email" className="w-full input-field-modern" placeholder="name@kkh.com.sg" value={email} onChange={(e) => setEmail(e.target.value)}/>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Password</label>
                                        <input type="password" className="w-full input-field-modern" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}/>
                                    </div>
                                    <button type="submit" disabled={loading} className="w-full py-3.5 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 transition-all shadow-lg active:scale-95 flex justify-center items-center gap-2 mt-4">
                                        {loading ? 'Verifying...' : (isLoginMode ? 'ACCESS DASHBOARD' : 'CREATE ACCOUNT')}
                                        {!loading && <ArrowRight size={18} />}
                                    </button>
                                </form>

                                <div className="mt-6 text-center pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
                                    <button onClick={() => { setIsLoginMode(!isLoginMode); setError(''); }} className="text-indigo-600 dark:text-indigo-400 font-black text-xs uppercase tracking-wide hover:underline">
                                        {isLoginMode ? "Register New Account" : "Back to Login"}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* --- VIEW 2: ORG REGISTRATION (Roadmap) --- */}
                        {view === 'ORG_REGISTER' && (
                            <div className="w-full max-w-sm mx-auto animate-in slide-in-from-right duration-700 fade-in text-center">
                                <button onClick={() => setView('SPLASH')} className="self-start mb-8 text-slate-400 hover:text-indigo-500 transition-colors flex items-center gap-1 text-xs font-bold uppercase">
                                    <ChevronLeft size={16}/> Back
                                </button>

                                <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mb-6 border border-emerald-500/30 mx-auto">
                                    <Globe className="text-emerald-400" size={32}/>
                                </div>
                                
                                <h2 className="text-3xl font-black mb-2 text-slate-800 dark:text-white">Scale NEXUS.</h2>
                                <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                                    We are actively building multi-tenant support. Soon you can deploy a private NEXUS instance for your department.
                                </p>

                                <div className="space-y-3 mb-8 text-left">
                                    <div className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                                        <Building2 className="text-indigo-400 shrink-0"/>
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-700 dark:text-white">Custom Branding</h4>
                                            <p className="text-[10px] text-slate-400">Upload your own logo.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                                        <Database className="text-blue-400 shrink-0"/>
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-700 dark:text-white">Isolated Database</h4>
                                            <p className="text-[10px] text-slate-400">Private staff/patient data.</p>
                                        </div>
                                    </div>
                                </div>

                                <button disabled className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-400 font-bold rounded-xl border border-slate-200 dark:border-slate-700 cursor-not-allowed flex items-center justify-center gap-2">
                                    <Activity size={16} className="animate-pulse"/> Beta Access Coming Soon
                                </button>
                            </div>
                        )}

                    </div>
                </div>
            </div>
            
            {/* GLOBAL STYLES FOR INPUTS */}
            <style>{`
                .input-field-modern {
                    @apply w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm font-bold text-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all;
                }
            `}</style>
        </div>
    );
};

export default WelcomeScreen;
