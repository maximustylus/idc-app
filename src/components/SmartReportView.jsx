import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Sparkles, Quote } from 'lucide-react';

const SmartReportView = () => {
    const [report, setReport] = useState('');
    const [lastUpdated, setLastUpdated] = useState(null);

    useEffect(() => {
        // Listen to the 'dashboard_summary' document in 'system_data' collection
        const unsub = onSnapshot(doc(db, 'system_data', 'dashboard_summary'), (doc) => {
            if (doc.exists()) {
                setReport(doc.data().text);
                setLastUpdated(doc.data().timestamp?.toDate());
            }
        });
        return () => unsub();
    }, []);

    if (!report) return null; // Don't show anything if no report exists

    return (
        <div className="md:col-span-2 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-800 dark:to-slate-800 p-6 rounded-2xl border border-indigo-100 dark:border-slate-700 shadow-sm mb-6 relative overflow-hidden group">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Sparkles size={120} className="text-indigo-500" />
            </div>

            <div className="flex items-center gap-3 mb-4">
                <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-lg shadow-indigo-500/30">
                    <Quote size={20} />
                </div>
                <div>
                    <h2 className="text-lg font-black text-slate-800 dark:text-white tracking-tight">Executive Brief</h2>
                    {lastUpdated && (
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                            Last Updated: {lastUpdated.toLocaleDateString()}
                        </p>
                    )}
                </div>
            </div>

            <div className="prose prose-sm dark:prose-invert max-w-none">
                <div className="whitespace-pre-line text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                    {report}
                </div>
            </div>
        </div>
    );
};

export default SmartReportView;
