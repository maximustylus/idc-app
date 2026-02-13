import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase'; 
import { doc, onSnapshot } from 'firebase/firestore';
import { Lock, Users, ShieldAlert, Loader, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown'; // <--- NEW IMPORT

const SmartReportView = () => {
    const [reports, setReports] = useState(null); 
    const [lastUpdated, setLastUpdated] = useState(null);
    const currentUser = auth.currentUser;

    // --- SECURITY GATE ---
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
                setReports({ publicText: '', privateText: '' });
            }
        });
        return () => unsub();
    }, []);

    // --- LOADING STATE ---
    if (!reports) {
        return (
            <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 flex items-center gap-2 text-slate-400">
                <Loader className="animate-spin" size={16} />
                <span className="text-xs font-bold uppercase">Connecting to Secure Database...</span>
            </div>
        );
    }

    // --- EMPTY STATE ---
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
                        {/* Header */}
                        <div className="flex items-center gap-3 mb-6 border-b border-indigo-100 pb-4">
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

                        {/* RENDERED MARKDOWN CONTENT */}
                        <div className="prose prose-sm max-w-none text-slate-700 dark:text-slate-300 leading-relaxed">
                            <ReactMarkdown
                                components={{
                                    // Custom styling for Markdown elements
                                    h1: ({node, ...props}) => <h1 className="text-xl font-black text-indigo-900 mb-3 uppercase tracking-tight" {...props} />,
                                    h2: ({node, ...props}) => <h2 className="text-lg font-bold text-indigo-800 mt-6 mb-3 border-l-4 border-indigo-500 pl-3" {...props} />,
                                    h3: ({node, ...props}) => <h3 className="text-md font-bold text-slate-800 mt-4 mb-2 uppercase tracking-wide" {...props} />,
                                    strong: ({node, ...props}) => <span className="font-bold text-indigo-700 bg-indigo-50 px-1 rounded" {...props} />,
                                    ul: ({node, ...props}) => <ul className="list-disc pl-5 space-y-2 my-2" {...props} />,
                                    li: ({node, ...props}) => <li className="text-sm" {...props} />,
                                    p: ({node, ...props}) => <p className="mb-3 text-sm" {...props} />,
                                }}
                            >
                                {reports.privateText}
                            </ReactMarkdown>
                        </div>
                    </div>
                )
            ) : (
                // UNAUTHORIZED MESSAGE
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                    <ShieldAlert className="text-red-500" size={20} />
                    <div>
                        <h4 className="text-xs font-black text-red-700 uppercase">Access Restricted</h4>
                        <p className="text-[10px] text-red-600">You are logged in as <strong>{userEmail}</strong>. This report is visible only to Leads.</p>
                    </div>
                </div>
            )}

            {/* PUBLIC TEAM PULSE (Visible to Everyone, also rendered with Markdown) */}
            {reports.publicText && (
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-slate-800 dark:to-slate-800 p-6 rounded-2xl border border-emerald-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-emerald-600 p-2 rounded-lg text-white">
                            <Users size={20} />
                        </div>
                        <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tighter">Team Pulse & Joy at Work</h2>
                    </div>
                    <div className="prose prose-sm max-w-none text-slate-700 dark:text-slate-300">
                        <ReactMarkdown
                             components={{
                                h3: ({node, ...props}) => <h3 className="text-sm font-bold text-emerald-800 mt-4 mb-2 uppercase" {...props} />,
                                strong: ({node, ...props}) => <span className="font-bold text-emerald-700" {...props} />,
                                ul: ({node, ...props}) => <ul className="list-disc pl-5 space-y-1" {...props} />,
                            }}
                        >
                            {reports.publicText}
                        </ReactMarkdown>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SmartReportView;
