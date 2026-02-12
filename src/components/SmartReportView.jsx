import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase'; // <--- FIX: Changed from ./firebase to ../firebase
import { doc, onSnapshot } from 'firebase/firestore';
import { Sparkles, Quote, Lock, Users, ShieldAlert } from 'lucide-react';

const SmartReportView = () => {
    const [reports, setReports] = useState({ publicText: '', privateText: '' });
    const [lastUpdated, setLastUpdated] = useState(null);
    const currentUser = auth.currentUser;

    // --- SECURITY GATE ---
    const isAuthorized = 
        currentUser?.email === 'muhammad.alif@kkh.com.sg' || 
        currentUser?.email === 'siti.nur.anisah.nh@kkh.com.sg'; 

    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'system_data', 'dashboard_summary'), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setReports({
                    publicText: data.publicText || '',
                    privateText: data.privateText || ''
                });
                setLastUpdated(data.timestamp?.toDate());
            }
        });
        return () => unsub();
    }, []);

    if (!reports.publicText && !reports.privateText) return null;

    return (
        <div className="space-y-6 mb-6">
            
            {/* PUBLIC VIEW (Visible to all) */}
            {reports.publicText && (
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-slate-800 dark:to-slate-800 p-6 rounded-2xl border border-emerald-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-emerald-600 p-2 rounded-lg text-white">
                            <Users size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tighter">Team Pulse & Joy at Work</h2>
                            {lastUpdated && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Updated: {lastUpdated.toLocaleDateString()}</p>}
                        </div>
                    </div>
                    <div className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                        {reports.publicText}
                    </div>
                </div>
            )}

            {/* PRIVATE VIEW (Visible Only to Alif & Nisa) */}
            {isAuthorized && reports.privateText && (
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-900/50 dark:to-slate-900/50 p-6 rounded-2xl border border-indigo-200 dark:border-indigo-800 shadow-lg relative animate-in fade-in slide-in-from-top-4">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-lg shadow-indigo-500/30">
                            <Lock size={20} />
                        </div>
                        <h2 className="text-lg font-black text-indigo-900 dark:text-white uppercase tracking-tighter">Executive Brief (Sensitive)</h2>
                    </div>
                    <div className="whitespace-pre-wrap text-sm text-indigo-950/80 dark:text-slate-200 font-bold leading-relaxed">
                        {reports.privateText}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SmartReportView;
