import React, { useState } from 'react';
import { db } from '../firebase'; 
import { doc, setDoc } from 'firebase/firestore'; 
import { 
    JOB_DESCRIPTIONS, 
    TIME_MATRIX, 
    COMPETENCY_FRAMEWORK, 
    CAREER_PATH 
} from '../knowledgeBase';
import { Sparkles, Lock, X, Bug, Network } from 'lucide-react';

const SmartAnalysis = ({ teamData, staffLoads, onClose }) => {
    const [apiKey, setApiKey] = useState(localStorage.getItem('idc_gemini_key') || '');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('GENERATE EXECUTIVE BRIEF');
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [debugInfo, setDebugInfo] = useState('');

    const handleAnalyze = async () => {
        const cleanKey = apiKey.trim();
        if (cleanKey) localStorage.setItem('idc_gemini_key', cleanKey);

        if (!cleanKey) {
            setError('Please enter your Gemini API Key.');
            return;
        }

        setLoading(true);
        setError('');
        setDebugInfo('');
        
        try {
            // --- STEP 1: DISCOVER AVAILABLE MODELS (Like your Python Script) ---
            setStatus('Connecting to Google...');
            
            // We hit the 'v1beta' endpoint to list models. This usually works for everyone.
            const listResponse = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`
            );

            if (!listResponse.ok) {
                const errData = await listResponse.json();
                throw new Error(`Connection Failed: ${errData.error?.message || listResponse.statusText}`);
            }

            const listData = await listResponse.json();
            const models = listData.models || [];

            // --- STEP 2: SELECT THE BEST MODEL ---
            setStatus('Selecting best AI brain...');
            
            let selectedModel = '';
            
            // Priority 1: Flash (Fastest)
            if (models.some(m => m.name.includes('gemini-1.5-flash'))) {
                selectedModel = 'gemini-1.5-flash';
            } 
            // Priority 2: Pro (Stable)
            else if (models.some(m => m.name.includes('gemini-pro'))) {
                selectedModel = 'gemini-pro';
            }
            // Priority 3: Anything else that supports generation
            else if (models.length > 0) {
                selectedModel = models[0].name.replace('models/', '');
            } else {
                throw new Error("No available models found for this API Key.");
            }

            setDebugInfo(`Using Model: ${selectedModel}`);

            // --- STEP 3: GENERATE CONTENT ---
            setStatus('Analyzing Team Data...');
            
            const snapshot = JSON.stringify({
                projects_and_tasks: teamData,
                clinical_workload: staffLoads
            });

            const promptText = `
                ACT AS: A Senior Clinical Lead and HR Specialist at KK Women's and Children's Hospital (SingHealth).
                
                REFERENCE MATERIAL:
                - Job Descriptions: ${JOB_DESCRIPTIONS}
                - Time Matrix Rules: ${TIME_MATRIX}
                - Competency Levels: ${COMPETENCY_FRAMEWORK}
                - Career Path: ${CAREER_PATH}

                LIVE DATA TO ANALYZE:
                ${snapshot}

                TASK:
                Analyze the team's performance.
                Provide a "Clinical Leadership Executive Brief" in these 3 specific sections:
                1. 🚨 ROLE MISALIGNMENT & BURNOUT
                2. 📈 PROMOTION & TALENT READINESS
                3. ⚖️ JOY AT WORK RECOMMENDATIONS

                TONE: Professional, concise, and actionable.
            `;

            // Note: We use the same 'v1beta' endpoint for generation to match the discovery
            const genUrl = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${cleanKey}`;

            const genResponse = await fetch(genUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: promptText }] }]
                })
            });

            const genData = await genResponse.json();

            if (!genResponse.ok) {
                throw new Error(genData.error?.message || "Generation Failed");
            }

            if (genData.candidates && genData.candidates[0].content) {
                setResult(genData.candidates[0].content.parts[0].text);
            } else {
                throw new Error("AI returned no text. (Safety Blocked?)");
            }

        } catch (err) {
            console.error("Gemini Critical Failure:", err);
            setError('Analysis Failed');
            setDebugInfo(err.message);
        } finally {
            setLoading(false);
            setStatus('GENERATE EXECUTIVE BRIEF');
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
                <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-8 flex justify-between items-center text-white">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Sparkles size={20} className="animate-pulse" />
                            <h2 className="text-2xl font-black tracking-tight">IDC SMART ANALYSIS</h2>
                        </div>
                        <p className="text-indigo-100 text-sm font-bold uppercase tracking-widest opacity-80">Clinical Intelligence v1.2</p>
                    </div>
                    <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors">
                        <X size={28} />
                    </button>
                </div>

                <div className="p-8 overflow-y-auto flex-1 bg-slate-50/50 dark:bg-slate-900/50">
                    {!result ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 max-w-md w-full text-center">
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Secure AI Integration</h3>
                                
                                <div className="space-y-4">
                                    <div className="relative text-left">
                                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-1 block">Google Gemini API Key</label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-3.5 text-slate-300" size={16} />
                                            <input 
                                                type="password" 
                                                placeholder="Enter Key..." 
                                                value={apiKey}
                                                onChange={(e) => setApiKey(e.target.value)}
                                                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-700 dark:text-white"
                                            />
                                        </div>
                                    </div>
                                    <button 
                                        onClick={handleAnalyze} 
                                        disabled={loading || !apiKey}
                                        className="w-full py-4 bg-slate-900 dark:bg-indigo-600 text-white font-black rounded-xl hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                                    >
                                        {loading ? (
                                            <span className="flex items-center gap-2">
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                {status}
                                            </span>
                                        ) : 'GENERATE EXECUTIVE BRIEF'}
                                    </button>
                                    
                                    {error && (
                                        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-left">
                                            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold text-sm mb-1">
                                                <Bug size={16} />
                                                <span>{error}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-mono text-xs mb-1">
                                                <Network size={12} />
                                                <span>Debug: {debugInfo}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* RESULTS SECTION */}
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 prose dark:prose-invert max-w-none">
                                <div className="whitespace-pre-line text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                                    {result}
                                </div>
                            </div>
                            
                            {/* ACTION BUTTONS */}
                            <div className="flex flex-col md:flex-row gap-4 mt-8">
                                <button 
                                    onClick={handlePublish}
                                    className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl text-sm hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                                >
                                    <Sparkles size={16} />
                                    PUBLISH TO TEAM DASHBOARD
                                </button>
                                
                                <button 
                                    onClick={() => setResult(null)}
                                    className="px-8 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold rounded-xl text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                >
                                    Retry
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SmartAnalysis;
