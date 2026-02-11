import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Sparkles, Quote, Lock, Users } from 'lucide-react';

const SmartReportView = () => {
    const [reports, setReports] = useState({ publicText: '', privateText: '' });
    const currentUser = auth.currentUser;

    // SECURITY CHECK
    const isAuthorized = 
        currentUser?.email === 'muhammad.alif@kkh.com.sg' || 
        currentUser?.email === 'siti.nur.anisah.nh@kkh.com.sg'; 

    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'system_data', 'dashboard_summary'), (doc) => {
            if (doc.exists()) setReports(doc.data());
        });
        return () => unsub();
    }, []);

    if (!reports.publicText) return null;

    return (
        <div className="space-y-6 md:col-span-2">
            {/* --- PUBLIC TEAM PULSE (Visible to All) --- */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-slate-800 dark:to-slate-800 p-6 rounded-2xl border border-green-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-emerald-600 p-2 rounded-lg text-white">
                        <Users size={20} />
                    </div>
                    <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tighter">Team Pulse & Joy at Work</h2>
                </div>
                <div className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                    {reports.publicText}
                </div>
            </div>

            {/* --- PRIVATE EXECUTIVE BRIEF (Visible only to Alif/Nisa) --- */}
            {isAuthorized && reports.privateText && (
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-slate-900 p-6 rounded-2xl border border-indigo-200 dark:border-indigo-800 shadow-lg animate-in fade-in slide-in-from-top-4">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-indigo-600 p-2 rounded-lg text-white">
                            <Lock size={20} />
                        </div>
                        <h2 className="text-lg font-black text-indigo-900 dark:text-white uppercase tracking-tighter">Executive Intelligence (Sensitive)</h2>
                    </div>
                    <div className="whitespace-pre-wrap text-sm text-indigo-950/80 dark:text-slate-300 font-bold leading-relaxed">
                        {reports.privateText}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SmartReportView;
