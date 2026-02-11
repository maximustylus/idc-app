import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase'; // Ensure auth is imported to check the user
import { doc, onSnapshot } from 'firebase/firestore';
import { Sparkles, Quote, Lock, Users } from 'lucide-react';

const SmartReportView = () => {
    const [reports, setReports] = useState({ publicText: '', privateText: '' });
    const [lastUpdated, setLastUpdated] = useState(null);
    const currentUser = auth.currentUser;

    // --- SECURITY GATE ---
    // Only Alif and Nisa can see the Private Executive Brief.
    const isAuthorized = 
        currentUser?.email === 'muhammad.alif@kkh.com.sg' || 
        currentUser?.email === 'siti.nur.anisah.nh@kkh.com.sg'; 

    useEffect(() => {
        // Listen to the 'dashboard_summary' document
        const unsub = onSnapshot(doc(db, 'system_data', 'dashboard_summary'), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                // FIX: Map the new keys (publicText/privateText) instead of 'text'
                setReports({
                    publicText: data.publicText || '',
                    privateText: data.privateText || ''
                });
                setLastUpdated(data.timestamp?.toDate());
            }
        });
        return () => unsub();
    }, []);

    // Hide the entire component if there is no public report yet
    if (!reports.publicText) return null;

    return (
        <div className="space-y-6 md:col-span-2 mb-6">
            
            {/* --- PUBLIC TEAM PULSE (Visible to Brandon, Derlinder, etc.) --- */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-slate-800 dark:to-slate-800 p-6 rounded-2xl border border-emerald-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
                <div className="flex items-center gap-3 mb-4 relative z-10">
                    <div className="bg-emerald-600 p-2 rounded-lg text-white">
                        <Users size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-slate-800 dark:text-white tracking-tight uppercase">Team Pulse & Joy at Work</h2>
                        {lastUpdated && (
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                Updated: {lastUpdated.toLocaleDateString()}
                            </p>
                        )}
                    </div>
                </div>
                <div className="prose prose-sm dark:prose-invert max-w-none relative z-10">
                    <div className="whitespace-pre-wrap text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                        {reports.publicText}
                    </div>
                </div>
            </div>

            {/* --- PRIVATE EXECUTIVE BRIEF (Visible ONLY to Alif and Nisa) --- */}
            {isAuthorized && reports.privateText && (
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-900 dark:to-slate-900 p-6 rounded-2xl border border-indigo-200 dark:border-indigo-800 shadow-lg relative overflow-hidden animate-in fade-in slide-in-from-top-4">
                    {/* Security Icon Background */}
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Lock size={100} className="text-indigo-500" />
                    </div>

                    <div className="flex items-center gap-3 mb-4 relative z-10">
                        <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-lg shadow-indigo-500/30">
                            <Lock size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-indigo-900 dark:text-white tracking-tight uppercase">
                                Executive Intelligence (Sensitive)
                            </h2>
                            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                                Lead Access Only • Job Grade Audit
                            </p>
                        </div>
                    </div>

                    <div className="prose prose-sm dark:prose-invert max-w-none relative z-10">
                        <div className="whitespace-pre-wrap text-indigo-950/80 dark:text-slate-300 font-bold leading-relaxed">
                            {reports.privateText}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SmartReportView;
