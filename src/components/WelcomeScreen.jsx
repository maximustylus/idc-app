import React, { useState, useEffect } from 'react';
import { Sun, Moon, ArrowRight, Activity, ShieldCheck, Cpu } from 'lucide-react';

const WelcomeScreen = ({ onStart }) => {
    const [isDark, setIsDark] = useState(false);
    const [animate, setAnimate] = useState(false);

    // --- THEME LOGIC ---
    useEffect(() => {
        // 1. Check LocalStorage or System Preference
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
        setAnimate(true);
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

    return (
        <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-900 transition-colors duration-500 flex flex-col items-center justify-center relative overflow-hidden">
            
            {/* BACKGROUND BLOBS */}
            <div className={`absolute top-0 left-0 w-[500px] h-[500px] bg-indigo-500/20 rounded-full blur-[120px] transition-all duration-1000 ${animate ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'}`}></div>
            <div className={`absolute bottom-0 right-0 w-[500px] h-[500px] bg-emerald-500/20 rounded-full blur-[120px] transition-all duration-1000 ${animate ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}></div>

            {/* --- TOP RIGHT TOGGLE --- */}
            <div className="absolute top-6 right-6 z-50">
                <button 
                    onClick={toggleTheme}
                    className="p-3 rounded-full bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:scale-110 transition-transform duration-300"
                    title="Toggle Theme"
                >
                    {isDark ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} className="text-indigo-600" />}
                </button>
            </div>

            {/* MAIN CONTENT CARD */}
            <div className={`relative z-10 max-w-md w-full mx-4 p-8 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 dark:border-slate-700 text-center transition-all duration-700 ${animate ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                
                {/* Logo / Icon */}
                <div className="mx-auto w-20 h-20 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center shadow-indigo-500/30 shadow-lg mb-6 rotate-3 hover:rotate-6 transition-transform">
                    <Activity size={40} className="text-white" />
                </div>

                {/* Title */}
                <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight mb-2">
                    NEXUS <span className="text-indigo-600">IDC</span>
                </h1>
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-8">
                    Interactive Dashboard for Clinicians
                </p>

                {/* Feature List (Micro) */}
                <div className="flex justify-center gap-4 mb-8 text-xs font-medium text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-900/50 rounded-full border border-slate-200 dark:border-slate-700">
                        <ShieldCheck size={14} className="text-emerald-500"/> Secure
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-900/50 rounded-full border border-slate-200 dark:border-slate-700">
                        <Cpu size={14} className="text-blue-500"/> AI Powered
                    </div>
                </div>

                {/* Entry Button */}
                <button 
                    onClick={onStart} // This connects to your existing login flow
                    className="group relative w-full py-4 bg-slate-900 dark:bg-indigo-600 text-white font-bold rounded-xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                        ENTER SYSTEM <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform"/>
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-violet-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </button>

                <p className="mt-6 text-[10px] text-slate-400">
                    © 2026 SSMC @ KKH. All Rights Reserved.
                </p>
            </div>
        </div>
    );
};

export default WelcomeScreen;
