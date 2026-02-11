import React, { useState } from 'react';
import { db } from '../firebase'; 
import { doc, setDoc } from 'firebase/firestore'; 
import { 
    JOB_DESCRIPTIONS, 
    TIME_MATRIX, 
    COMPETENCY_FRAMEWORK, 
    CAREER_PATH 
} from '../knowledgeBase';
import { Sparkles, Lock, X, Bug, ShieldAlert, WifiOff } from 'lucide-react';

const SmartAnalysis = ({ teamData, staffLoads, onClose }) => {
    const [apiKey, setApiKey] = useState(localStorage.getItem('idc_gemini_key') || '');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [debugLog, setDebugLog] = useState([]); // Store exact error logs

    // HELPER: Add to on-screen log
    const log = (msg) => setDebugLog(prev => [...prev, `${new Date().toLocaleTimeString()} > ${msg}`]);

    const handleAnalyze = async () => {
        const cleanKey = apiKey.trim();
        if (cleanKey) localStorage.setItem('idc_gemini_key', cleanKey);

        if (!cleanKey) {
            log("❌ Error: API Key missing");
            return;
        }

        setLoading(true);
        setDebugLog([]); // Clear previous logs
        log("🚀 Starting Diagnostic Run...");

        // 1. Prepare Data
        const snapshot = JSON.stringify({
            projects_and_tasks: teamData,
            clinical_workload: staffLoads
        });

        const promptText = `
            ACT AS: A Senior Clinical Lead... [Truncated for speed]...
            ANALYZE: ${snapshot}
        `;

        // 2. DEFINE THE TEST TARGET (Gemini 1.5 Flash)
        // This is the correct URL for Flash. If this fails, it's the network/key.
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${cleanKey}`;

        try {
            log(`📡 Connecting to: .../v1beta/models/gemini-1.5-flash...`);
            
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: promptText }] }]
                })
            });

            log(`📥 Response Status: ${response.status} (${response.statusText})`);

            const data = await response.json();

            // 3. ANALYZE THE RESULT
            if (!response.ok) {
                // FAILURE CASE: Print the EXACT Google Error
                log(`❌ GOOGLE ERROR: ${JSON.stringify(data.error, null, 2)}`);
                throw new Error(data.error?.message || "Unknown API Error");
            }

            // SUCCESS CASE
            if (data.candidates && data.candidates[0].content) {
                log("✅ SUCCESS! Text received.");
                setResult(data.candidates[0].content.parts[0].text);
            } else {
                log(`⚠️ Warning: valid response but no text. Safety filter?`);
                log(JSON.stringify(data));
            }

        } catch (err) {
            log(`💥 CRASH: ${err.message}`);
            if (err.message.includes("Failed to fetch")) {
                log("🛑 NETWORK BLOCK DETECTED. The hospital firewall might be blocking Google AI.");
            }
        } finally {
            setLoading(false);
        }
    };

    // FUNCTION TO PUBLISH REPORT TO DASHBOARD
    const handlePublish = async () => {
        if (!result) return;
        try {
            await setDoc(doc(db, 'system_data', 'dashboard_summary'), {
                text: result,
                timestamp: new Date()
            });
            alert("✅ Report Published to Main Dashboard!");
            onClose(); 
        } catch (e) {
            alert("❌ Error publishing: " + e.message);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-700">
                
                {/* Header */}
                <div className="bg-gradient-to-r from-red-600 to-orange-600 p-6 flex justify-between items-center text-white">
                    <div className="flex items-center gap-2">
                        <ShieldAlert size={24} />
                        <h2 className="text-xl font-black">DIAGNOSTIC MODE</h2>
                    </div>
                    <button onClick={onClose}><X size={28} /></button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 bg-slate-50 dark:bg-slate-900">
                    
                    {/* INPUT SECTION */}
                    {!result && (
                        <div className="max-w-xl mx-auto space-y-4">
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <label className="text-xs font-bold text-slate-400 uppercase block mb-2">API Key</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 text-slate-300" size={16} />
                                    <input 
                                        type="password" 
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-900 rounded-lg border-none focus:ring-2 focus:ring-red-500"
                                    />
                                </div>
                                <button 
                                    onClick={handleAnalyze} 
                                    disabled={loading}
                                    className="w-full mt-4 py-3 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-colors"
                                >
                                    {loading ? 'RUNNING TEST...' : 'RUN DIAGNOSTIC'}
                                </button>
                            </div>

                            {/* THE DEBUG LOG WINDOW */}
                            <div className="bg-black text-green-400 font-mono text-xs p-4 rounded-xl h-64 overflow-y-auto shadow-inner border border-slate-700">
                                {debugLog.length === 0 ? (
                                    <span className="opacity-50">Waiting for logs...</span>
                                ) : (
                                    debugLog.map((line, i) => (
                                        <div key={i} className="mb-1 border-b border-white/10 pb-1">{line}</div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {/* SUCCESS RESULT */}
                    {result && (
                        <div className="animate-in fade-in slide-in-from-bottom-4">
                            <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4 text-green-800 font-bold">
                                ✅ CONNECTIVITY SUCCESS! The issue is resolved.
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border prose dark:prose-invert max-w-none">
                                <div className="whitespace-pre-line text-slate-700 dark:text-slate-300">
                                    {result}
                                </div>
                            </div>
                            <button onClick={handlePublish} className="mt-8 w-full py-4 bg-indigo-600 text-white font-bold rounded-xl shadow-lg">
                                PUBLISH REPORT
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SmartAnalysis;
