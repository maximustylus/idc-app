import React, { useState } from 'react';
import { db } from '../firebase'; 
import { doc, setDoc } from 'firebase/firestore'; 
import { 
    JOB_DESCRIPTIONS, 
    TIME_MATRIX, 
    COMPETENCY_FRAMEWORK, 
    CAREER_PATH 
} from '../knowledgeBase';
import { Sparkles, Lock, X, Bug, Radar, ShieldCheck } from 'lucide-react';

const SmartAnalysis = ({ teamData, staffLoads, onClose }) => {
    const [apiKey, setApiKey] = useState(localStorage.getItem('idc_gemini_key') || '');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('GENERATE EXECUTIVE BRIEF');
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [debugLog, setDebugLog] = useState('');

    const STAFF_PROFILES = {
        "Alif":      { role: "Senior CEP", grade: "JG14", focus: "Leadership, Research, Clinical" },
        "Fadzlynn":  { role: "CEP I",      grade: "JG13", focus: "Clinical Lead, Specialized Projects" },
        "Derlinder": { role: "CEP II",     grade: "JG12", focus: "Education, Clinical" },
        "Ying Xian": { role: "CEP II",     grade: "JG12", focus: "Admin Projects, Clinical" },
        "Brandon":   { role: "CEP III",    grade: "JG11", focus: "Clinical Execution, Basic Education" },
        "Nisa":      { role: "Administrator", grade: "Admin", focus: "Operations, Budget, Rostering" }
    };

    const handleAnalyze = async () => {
        const cleanKey = apiKey.trim();
        if (cleanKey) localStorage.setItem('idc_gemini_key', cleanKey);
        if (!cleanKey) { setError('Please enter your Gemini API Key.'); return; }

        setLoading(true); setError(''); setDebugLog('');
        
        try {
            // PHASE 1: FIND MODEL
            setStatus('Connecting to Gemini...');
            const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`;
            const listResponse = await fetch(listUrl);
            const listData = await listResponse.json();
            if (!listResponse.ok) throw new Error(`Connection Error: ${listData.error?.message}`);

            const chatModels = listData.models.filter(m => m.supportedGenerationMethods.includes("generateContent"));
            let bestModel = chatModels.find(m => m.name.includes('flash')) || chatModels.find(m => m.name.includes('pro')) || chatModels[0];
            const modelName = bestModel.name; 

            // PHASE 2: PREPARE DATA
            setStatus('Analyzing Team Data...');
            const snapshot = JSON.stringify({ projects: teamData, workload: staffLoads });
            
            // PHASE 3: SEND PROMPT
            const promptText = `
                ACT AS: Senior Clinical Lead at KKH.
                DATA: ${JSON.stringify(STAFF_PROFILES)}
                LIVE WORKLOAD: ${snapshot}

                TASK: Generate TWO reports.
                1. PRIVATE_EXECUTIVE_BRIEF (For Leads): Audit staff against their JG11-JG14 grades. Be critical.
                2. PUBLIC_TEAM_PULSE (For Staff): Remove JGs. Focus on "Joy at Work" and team wins.

                CRITICAL OUTPUT FORMAT:
                You must return valid JSON. Do not include markdown formatting (like \`\`\`json).
                Structure:
                {
                    "private": "Report text here...",
                    "public": "Report text here..."
                }
            `;

            const generateUrl = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${cleanKey}`;
            const genResponse = await fetch(generateUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
            });

            const genData = await genResponse.json();
            if (!genResponse.ok) throw new Error(genData.error?.message);

            // PHASE 4: ROBUST JSON PARSING (The Fix)
            const rawText = genData.candidates[0].content.parts[0].text;
            
            // 1. Extract JSON using Regex (ignores "Here is your JSON" text)
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("AI did not return valid JSON object.");
            
            const parsedObj = JSON.parse(jsonMatch[0]);

            // 2. Fuzzy Key Matching (Handles "Private" vs "private")
            const privateText = parsedObj.private || parsedObj.Private || parsedObj.privateReport || parsedObj.private_text || "Error: Private report missing.";
            const publicText = parsedObj.public || parsedObj.Public || parsedObj.publicReport || parsedObj.public_text || "Error: Public report missing.";

            setResult({ private: privateText, public: publicText });

        } catch (err) {
            console.error(err);
            setError('Analysis Failed');
            setDebugLog(err.message);
        } finally {
            setLoading(false);
            setStatus('GENERATE EXECUTIVE BRIEF');
        }
    };

    const handlePublish = async () => {
        if (!result) return;
        try {
            await setDoc(doc(db, 'system_data', 'dashboard_summary'), {
                privateText: result.private,
                publicText: result.public,
                timestamp: new Date()
            });
            alert("✅ SUCCESS: Reports published to Admin Panel!");
            onClose(); 
        } catch (e) {
            alert("❌ Error saving to database: " + e.message);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-700">
                <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-8 flex justify-between items-center text-white">
                    <div className="flex items-center gap-3">
                        <ShieldCheck size={28} />
                        <div>
                            <h2 className="text-2xl font-black tracking-tight uppercase">Dual-Stream Analysis</h2>
                            <p className="text-xs opacity-70 font-bold uppercase tracking-widest">Generating Secure Intelligence...</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors"><X size={28} /></button>
                </div>

                <div className="p-8 overflow-y-auto flex-1 bg-slate-50/50 dark:bg-slate-900/50">
                    {!result ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 max-w-md w-full text-center">
                                <h3 className="text-xl font-bold mb-4">Secure HR Integration</h3>
                                <div className="space-y-4">
                                    <input type="password" placeholder="Paste Gemini API Key..." value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border rounded-xl" />
                                    <button onClick={handleAnalyze} disabled={loading || !apiKey} className="w-full py-4 bg-slate-900 text-white font-black rounded-xl uppercase tracking-tighter">
                                        {loading ? status : 'Generate Analysis'}
                                    </button>
                                </div>
                                {error && <div className="mt-4 p-3 bg-red-50 text-red-600 text-xs font-bold rounded">{error} <br/> {debugLog}</div>}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="bg-white p-6 rounded-2xl border-2 border-indigo-500">
                                <h3 className="text-xs font-black text-indigo-500 mb-2 uppercase">Preview: Private Brief (Lead Only)</h3>
                                <div className="whitespace-pre-wrap text-sm text-slate-700 h-32 overflow-y-auto border p-2 rounded">{result.private}</div>
                            </div>
                            <div className="bg-slate-100 p-6 rounded-2xl border border-slate-300">
                                <h3 className="text-xs font-black text-slate-500 mb-2 uppercase">Preview: Team Pulse (Public)</h3>
                                <div className="whitespace-pre-wrap text-sm text-slate-600 h-24 overflow-y-auto border p-2 rounded">{result.public}</div>
                            </div>
                            <button onClick={handlePublish} className="w-full py-4 bg-indigo-600 text-white font-black rounded-xl shadow-lg uppercase tracking-tighter hover:bg-indigo-700">
                                CONFIRM & PUBLISH REPORT
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SmartAnalysis;
