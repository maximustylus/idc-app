import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase'; 
import { doc, onSnapshot } from 'firebase/firestore';
import { Sparkles, Quote, Lock, Users, ShieldAlert, Loader } from 'lucide-react';

const SmartReportView = () => {
    const [reports, setReports] = useState(null); // Start as null to distinguish "loading" from "empty"
    const [lastUpdated, setLastUpdated] = useState(null);
    const currentUser = auth.currentUser;

    // --- SECURITY GATE (Case Insensitive Fix) ---
    // We lowercase both the logged-in email and the allowed list to prevent mismatch errors.
    const userEmail = currentUser?.email?.toLowerCase() || '';
    const allowedEmails = [
        'muhammad.alif@kkh.com.sg',
        'siti.nur.anisah.nh@kkh.com.sg'
    ];
    
    const isAuthorized = allowedEmails.includes(userEmail);

    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'system_data', 'dashboard_summary'), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setReports({
                    publicText: data.publicText || '',
                    privateText: data.privateText || ''
                });
                setLastUpdated(data.timestamp?.toDate());
            } else {
                setReports({ publicText: '', privateText: '' }); // Document doesn't exist yet
            }
        });
        return () => unsub();
    }, []);

    // --- DEBUGGING STATES (So you know what's wrong) ---

    // 1. Loading State
    if (!reports) {
        return (
            <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 flex items-center gap-2 text-slate-400">
                <Loader className="animate-spin" size={16} />
                <span className="text-xs font-bold uppercase">Connecting to Secure Database...</span>
            </div>
        );
    }

    // 2. Empty State (Report hasn't been generated yet)
    if (!reports.privateText && !reports.publicText) {
        return (
            <div className="p-6 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 text-center">
                <Sparkles className="mx-auto text-slate-300 mb-2" size={24} />
                <h3 className="text-slate-500 font-bold text-sm uppercase">No Intelligence Report Found</h3>
                <p className="text-xs text-slate-400">Click "Generate New Report" to analyze the team.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 mb-8 animate-in fade-in slide-in-from-top-4">
            
            {/* PRIVATE EXECUTIVE BRIEF (Visible Only to Alif & Nisa) */}
            {isAuthorized ? (
                reports.privateText && (
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-900/50 dark:to-slate-900/50 p-6 rounded-2xl border border-indigo-200 dark:border-indigo-800 shadow-lg relative">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-lg shadow-indigo-500/30">
                                <Lock size={20} />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-indigo-900 dark:text-white uppercase tracking-tighter">Executive Brief (Sensitive)</h2>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Job Grade Audit • Lead Access Only</span>
                                    {lastUpdated && <span className="text-[10px] text-slate-400">• {lastUpdated.toLocaleDateString()}</span>}
                                </div>
                            </div>
                        </div>
                        <div className="whitespace-pre-wrap text-sm text-indigo-950/80 dark:text-slate-200 font-bold leading-relaxed">
                            {reports.privateText}
                        </div>
                    </div>
                )
            ) : (
                // UNAUTHORIZED MESSAGE (Only shows if you are logged in as someone else)
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                    <ShieldAlert className="text-red-500" size={20} />
                    <div>
                        <h4 className="text-xs font-black text-red-700 uppercase">Access Restricted</h4>
                        <p className="text-[10px] text-red-600">You are logged in as <strong>{userEmail}</strong>. This report is visible only to Leads.</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SmartReportView;
