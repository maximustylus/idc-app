import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase'; 
import { doc, onSnapshot } from 'firebase/firestore';
import { Lock, Users, ShieldAlert, Loader, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown'; 

// NOW ACCEPTS A 'YEAR' PROP
const SmartReportView = ({ year = '2026' }) => {
    const [reports, setReports] = useState(null); 
    const [lastUpdated, setLastUpdated] = useState(null);
    const currentUser = auth.currentUser;

    const userEmail = currentUser?.email?.toLowerCase() || '';
    const allowedEmails = ['muhammad.alif@kkh.com.sg', 'siti.nur.anisah.nh@kkh.com.sg'];
    const isAuthorized = allowedEmails.includes(userEmail);

    useEffect(() => {
        // DYNAMIC DOC REFERENCE: reports_2026, reports_2025, etc.
        // Default to 'dashboard_summary' if year is 2026 for backward compatibility, 
        // OR better: migrate 2026 to reports_2026. 
        // For now, let's look for `reports_{year}`.
        // Note: You might need to re-publish 2026 once to save it to the new path!
        
        const docId = year === '2026' ? 'dashboard_summary' : `reports_${year}`;
        
        // Actually, let's standardize. The new SmartAnalysis saves to reports_2026.
        // But your old 2026 data is in dashboard_summary.
        // Let's try fetching the new one first.
        
        const collectionName = 'system_data';
        // Logic: if year is 2026, we check dashboard_summary (legacy) first? 
        // Simpler: Just rely on the prop.
        
        // FIX: The SmartAnalysis updated code saves 2026 to `reports_2026`. 
        // But your old 2026 report is at `dashboard_summary`.
        // Let's just point to `reports_{year}` and you can re-generate 2026 report once to sync it.
        const targetDoc = year === '2026' ? 'dashboard_summary' : `reports_${year}`;

        const unsub = onSnapshot(doc(db, collectionName, targetDoc), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setReports({
                    publicText: data.publicText || '',
                    privateText: data.privateText || ''
                });
                setLastUpdated(data.timestamp?.toDate());
            } else {
                setReports({ publicText: '', privateText: '' });
            }
        });
        return () => unsub();
    }, [year]); // Re-run when year changes

    if (!reports) return <div className="p-4 bg-slate-50 rounded flex gap-2 items-center"><Loader className="animate-spin" size={16}/><span className="text-xs text-slate-400">Loading {year} Intelligence...</span></div>;

    if (!reports.privateText && !reports.publicText) {
        return (
            <div className="p-6 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 text-center">
                <Sparkles className="mx-auto text-slate-300 mb-2" size={24} />
                <h3 className="text-slate-500 font-bold text-sm uppercase">No Report for {year}</h3>
                <p className="text-xs text-slate-400">Go to Admin > Generate Report and select {year}.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 mb-8 animate-in fade-in slide-in-from-top-4">
            {/* PRIVATE BRIEF */}
            {isAuthorized ? (
                reports.privateText && (
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-900/50 dark:to-slate-900/50 p-6 rounded-2xl border border-indigo-200 dark:border-indigo-800 shadow-lg relative">
                        <div className="flex items-center gap-3 mb-6 border-b border-indigo-100 pb-4">
                            <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-lg shadow-indigo-500/30">
                                <Lock size={20} />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-indigo-900 dark:text-white uppercase tracking-tighter">{year} Executive Brief</h2>
                                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Confidential Audit</span>
                            </div>
                        </div>
                        <div className="prose prose-sm max-w-none text-slate-700 dark:text-slate-300">
                            <ReactMarkdown components={{
                                h1: ({node, ...props}) => <h1 className="text-xl font-black text-indigo-900 mb-3 uppercase" {...props} />,
                                h2: ({node, ...props}) => <h2 className="text-lg font-bold text-indigo-800 mt-6 mb-3 border-l-4 border-indigo-500 pl-3" {...props} />,
                                strong: ({node, ...props}) => <span className="font-bold text-indigo-700 bg-indigo-50 px-1 rounded" {...props} />,
                            }}>{reports.privateText}</ReactMarkdown>
                        </div>
                    </div>
                )
            ) : (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                    <ShieldAlert className="text-red-500" size={20} />
                    <span className="text-xs text-red-600 font-bold">Restricted Access</span>
                </div>
            )}

            {/* PUBLIC PULSE */}
            {reports.publicText && (
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-slate-800 dark:to-slate-800 p-6 rounded-2xl border border-emerald-100 dark:border-slate-700 shadow-sm relative">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-emerald-600 p-2 rounded-lg text-white"><Users size={20} /></div>
                        <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tighter">{year} Team Pulse</h2>
                    </div>
                    <div className="prose prose-sm max-w-none text-slate-700 dark:text-slate-300">
                        <ReactMarkdown components={{
                            strong: ({node, ...props}) => <span className="font-bold text-emerald-700" {...props} />,
                        }}>{reports.publicText}</ReactMarkdown>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SmartReportView;
