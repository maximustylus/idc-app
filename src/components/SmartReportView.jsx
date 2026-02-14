import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Lock, Globe, FileText, Calendar } from 'lucide-react';

const SmartReportView = ({ year = '2026' }) => {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'system_data', `reports_${year}`), (docSnap) => {
            if (docSnap.exists()) {
                setReport(docSnap.data());
            } else {
                setReport(null);
            }
            setLoading(false);
        });
        return () => unsub();
    }, [year]);

    // --- TEXT FORMATTER ---
    // Cleans up AI text: removes highlights, adds spacing, handles dark mode
    const formatReportContent = (text) => {
        if (!text) return <p className="text-slate-400 italic">No report data available.</p>;

        // Split by newlines to handle paragraphs
        return text.split('\n').map((line, index) => {
            const cleanLine = line.trim();
            if (!cleanLine) return <div key={index} className="h-4" />; // Spacer for empty lines

            // Detection: Is this a Header/Name? (e.g., "Alif (JG14):" or "Overall Assessment:")
            // We check if the line starts with a name or standard header and has a colon
            const isHeader = /^(Overall Assessment|Individual Staff Audit|Alif|Nisa|Fadzlynn|Derlinder|Ying Xian|Brandon|Conclusion|.*:)/i.test(cleanLine);

            if (isHeader && cleanLine.length < 150) {
                // Render as a Title Block
                const parts = cleanLine.split(':');
                const title = parts[0];
                const content = parts.slice(1).join(':').trim();

                return (
                    <div key={index} className="mb-6">
                        <h4 className="text-lg font-black text-indigo-700 dark:text-indigo-400 mb-2 uppercase tracking-tight">
                            {title}
                        </h4>
                        {content && (
                            <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-base">
                                {content}
                            </p>
                        )}
                    </div>
                );
            }

            // Standard Paragraph
            return (
                <p key={index} className="mb-4 text-slate-700 dark:text-slate-300 leading-relaxed text-base">
                    {cleanLine.replace(/^\*|\-/, '') /* Remove bullet points if AI adds them */}
                </p>
            );
        });
    };

    if (loading) return <div className="p-4 text-slate-400 text-xs font-bold animate-pulse">Loading Report...</div>;

    if (!report) return (
        <div className="bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-8 text-center">
            <FileText className="mx-auto text-slate-300 mb-3" size={32} />
            <h3 className="text-slate-500 dark:text-slate-400 font-bold uppercase">No Report for {year}</h3>
            <p className="text-xs text-slate-400 mt-1">Generate one in the Admin Panel.</p>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-top-4">
            
            {/* PRIVATE BRIEF CARD */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="bg-indigo-50 dark:bg-indigo-900/30 p-4 border-b border-indigo-100 dark:border-indigo-800 flex items-center gap-3">
                    <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-sm">
                        <Lock size={18} />
                    </div>
                    <div>
                        <h3 className="font-black text-indigo-900 dark:text-indigo-200 uppercase tracking-wider text-sm">
                            {year} Executive Brief
                        </h3>
                        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Confidential Audit</p>
                    </div>
                </div>
                <div className="p-8">
                    {formatReportContent(report.privateText)}
                </div>
            </div>

            {/* PUBLIC PULSE CARD */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="bg-emerald-50 dark:bg-emerald-900/30 p-4 border-b border-emerald-100 dark:border-emerald-800 flex items-center gap-3">
                    <div className="p-2 bg-emerald-600 rounded-lg text-white shadow-sm">
                        <Globe size={18} />
                    </div>
                    <div>
                        <h3 className="font-black text-emerald-900 dark:text-emerald-200 uppercase tracking-wider text-sm">
                            {year} Team Pulse
                        </h3>
                        <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Public Celebration</p>
                    </div>
                </div>
                <div className="p-8">
                    {formatReportContent(report.publicText)}
                </div>
            </div>

            <div className="flex justify-end text-[10px] font-bold text-slate-400 uppercase gap-2 items-center">
                <Calendar size={12} />
                Generated: {report.timestamp?.toDate ? report.timestamp.toDate().toLocaleString() : new Date().toLocaleString()}
            </div>
        </div>
    );
};

export default SmartReportView;
