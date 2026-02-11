import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase'; // Ensure auth is imported
import { doc, onSnapshot } from 'firebase/snapshot';
import { Sparkles, Quote, ShieldAlert } from 'lucide-react';

const SmartReportView = () => {
    const [report, setReport] = useState('');
    const [lastUpdated, setLastUpdated] = useState(null);
    const currentUser = auth.currentUser;

    // --- SECURITY GATE ---
    // Only Alif and Nisa are authorized to see this sensitive HR analysis.
    const isAuthorized = 
        currentUser?.email === 'alif@kkh.com.sg' || 
        currentUser?.email === 'nisa@kkh.com.sg'; 

    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'system_data', 'dashboard_summary'), (doc) => {
            if (doc.exists()) {
                setReport(doc.data().text);
                setLastUpdated(doc.data().timestamp?.toDate());
            }
        });
        return () => unsub();
    }, []);

    // If not authorized OR no report exists, hide the entire component.
    if (!isAuthorized || !report) return null; 

    return (
        <div className="md:col-span-2 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-800 dark:to-slate-800 p-6 rounded-2xl border border-indigo-100 dark:border-slate-700 shadow-sm mb-6 relative overflow-hidden group">
            
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Sparkles size={120} className="text-indigo-500" />
            </div>

            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-lg shadow-indigo-500/30">
                        <Quote size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-slate-800 dark:text-white tracking-tight uppercase">
                            Executive Briefing <span className="text-[10px] ml-2 text-indigo-500 bg-white px-2 py-0.5 rounded border border-indigo-200">SENSITIVE</span>
                        </h2>
                        {lastUpdated && (
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                Generated: {lastUpdated.toLocaleDateString()}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <div className="prose prose-sm dark:prose-invert max-w-none relative z-10">
                {/* Changed 'whitespace-pre-line' to 'whitespace-pre-wrap' for better preservation of AI formatting */}
                <div className="whitespace-pre-wrap text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                    {report}
                </div>
            </div>
        </div>
    );
};

export default SmartReportView;
