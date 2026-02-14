import React, { useState } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { Activity, Shield, Users, Calendar, ArrowRight, Lock, AlertCircle } from 'lucide-react';

const WelcomeScreen = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState(''); // For registration
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleAuth = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // 1. DOMAIN LOCK CHECK
        // We strictly enforce KKH emails only
        if (!email.toLowerCase().endsWith('@kkh.com.sg') && !email.toLowerCase().endsWith('@singhealth.com.sg')) {
            setError("Access Restricted: Only @kkh.com.sg or @singhealth.com.sg addresses are allowed.");
            setLoading(false);
            return;
        }

        try {
            if (isLogin) {
                // LOGIN FLOW
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                // REGISTER FLOW
                if (!name) throw new Error("Please enter your display name.");
                
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                
                // Set the Display Name immediately
                await updateProfile(userCredential.user, {
                    displayName: name
                });
            }
        } catch (err) {
            console.error(err);
            // Friendly error messages
            if (err.code === 'auth/invalid-credential') setError("Incorrect email or password.");
            else if (err.code === 'auth/email-already-in-use') setError("This email is already registered. Please Login.");
            else if (err.code === 'auth/weak-password') setError("Password should be at least 6 characters.");
            else setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col md:flex-row">
            
            {/* LEFT SIDE: BRANDING & INFO */}
            <div className="md:w-1/2 bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 p-12 text-white flex flex-col justify-between relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                    <Activity size={400} className="absolute -right-20 -bottom-20 rotate-12" />
                </div>

                <div className="relative z-10">
                    <img src="/logo.png" alt="SSMC Logo" className="h-16 mb-8 bg-white/10 p-2 rounded-lg backdrop-blur-sm w-auto object-contain" />
                    <h1 className="text-5xl font-black tracking-tight mb-4">IDC APP v1.3</h1>
                    <p className="text-xl text-blue-200 font-medium max-w-md leading-relaxed">
                        The Interactive Dashboard for Clinicians. 
                        Streamlining workload, roster management, and team wellbeing in one secure platform.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-6 relative z-10 mt-12">
                    <div className="flex items-start gap-4">
                        <div className="bg-blue-500/20 p-3 rounded-xl border border-blue-400/30">
                            <Activity size={24} className="text-blue-300" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">Smart Workload Tracking</h3>
                            <p className="text-sm text-blue-200 opacity-80">Monitor clinical, research, and education projects in real-time.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4">
                        <div className="bg-emerald-500/20 p-3 rounded-xl border border-emerald-400/30">
                            <Shield size={24} className="text-emerald-300" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">Wellbeing Intelligence</h3>
                            <p className="text-sm text-blue-200 opacity-80">AURA AI monitors team social battery and burnout risks anonymously.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4">
                        <div className="bg-purple-500/20 p-3 rounded-xl border border-purple-400/30">
                            <Calendar size={24} className="text-purple-300" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">Automated Rostering</h3>
                            <p className="text-sm text-blue-200 opacity-80">Conflict-free scheduling with integrated clinical load balancing.</p>
                        </div>
                    </div>
                </div>

                <div className="text-xs font-bold text-slate-500 mt-12 uppercase tracking-widest relative z-10">
                    © 2026 Sport & Exercise Medicine Centre
                </div>
            </div>

            {/* RIGHT SIDE: AUTHENTICATION */}
            <div className="md:w-1/2 flex items-center justify-center p-6 md:p-12">
                <div className="max-w-md w-full bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700">
                    <div className="text-center mb-8">
                        <div className="bg-indigo-50 dark:bg-indigo-900/30 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-600 dark:text-indigo-400">
                            <Lock size={32} />
                        </div>
                        <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">
                            {isLogin ? 'Clinician Login' : 'New Staff Registration'}
                        </h2>
                        <p className="text-slate-500 text-sm font-medium mt-1">
                            {isLogin ? 'Secure access to your dashboard' : 'Join the KKH IDC Workspace'}
                        </p>
                    </div>

                    {error && (
                        <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-xl flex items-start gap-3 text-sm font-bold border border-red-100">
                            <AlertCircle size={20} className="shrink-0" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleAuth} className="space-y-4">
                        {!isLogin && (
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Full Name</label>
                                <input 
                                    type="text" 
                                    className="input-field w-full" 
                                    placeholder="e.g. Alif (Senior CEP)" 
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Corporate Email</label>
                            <input 
                                type="email" 
                                className="input-field w-full" 
                                placeholder="name@kkh.com.sg" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Password</label>
                            <input 
                                type="password" 
                                className="input-field w-full" 
                                placeholder="••••••••" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full py-4 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95 flex justify-center items-center gap-2"
                        >
                            {loading ? 'Verifying...' : (isLogin ? 'ACCESS DASHBOARD' : 'CREATE ACCOUNT')}
                            {!loading && <ArrowRight size={18} />}
                        </button>
                    </form>

                    <div className="mt-8 text-center pt-6 border-t border-slate-100 dark:border-slate-700">
                        <p className="text-sm text-slate-500 font-medium">
                            {isLogin ? "New to the team?" : "Already have an account?"}
                        </p>
                        <button 
                            onClick={() => { setIsLogin(!isLogin); setError(''); }}
                            className="text-indigo-600 font-black text-sm uppercase tracking-wide mt-2 hover:underline"
                        >
                            {isLogin ? "Register with Corporate Email" : "Back to Login"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WelcomeScreen;
