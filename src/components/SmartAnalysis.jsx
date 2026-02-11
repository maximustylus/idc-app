import React, { useState } from 'react';
import { db } from '../firebase'; 
import { doc, setDoc } from 'firebase/firestore'; 
import { 
    JOB_DESCRIPTIONS, 
    TIME_MATRIX, 
    COMPETENCY_FRAMEWORK, 
    CAREER_PATH 
} from '../knowledgeBase';
import { Sparkles, Lock, X, Bug } from 'lucide-react';

const SmartAnalysis = ({ teamData, staffLoads, onClose }) => {
    const [apiKey, setApiKey] = useState(localStorage.getItem('idc_gemini_key') || '');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [errorDetails, setErrorDetails] = useState('');
    const [currentModel, setCurrentModel] = useState('gemini-1.5-flash'); // Track which model we are trying

    // --- HELPER: GENERIC API CALL ---
    const callGeminiAPI = async (modelName, prompt, key) => {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            }
        );
        
        const data = await response.json();
        
        if (!response.ok) {
            // Throw specific error object to catch in main loop
            throw { status: response.status, message: data.error?.message || "API Error" };
        }
        
        return data.candidates[0].content.parts[0].text;
    };

    const handleAnalyze = async () => {
        const cleanKey = apiKey.trim();
        if (cleanKey) localStorage.setItem('idc_gemini_key', cleanKey);

        if (!cleanKey) {
            setError('Please enter your Gemini API Key.');
            return;
        }

        setLoading(true);
        setError('');
        setErrorDetails('');

        // 1. Prepare Data
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

        // 2. SMART FALLBACK LOGIC
        try {
            try {
                // ATTEMPT 1: Try Flash (Fastest)
                setCurrentModel('gemini-1.5-flash');
                const text = await callGeminiAPI('gemini-1.5-flash', promptText, cleanKey);
                setResult(text);
            } catch (firstError) {
                // ATTEMPT 2: If Flash fails (404), try Pro (Stable)
                console.warn("Flash failed, switching to Gemini Pro...", firstError);
                
                setCurrentModel('gemini-pro');
                const text = await callGeminiAPI('gemini-pro', promptText, cleanKey);
                setResult(text);
            }
        } catch (finalError) {
            // If BOTH fail, show the error
            console.error("All models failed:", finalError);
            setError(`Analysis failed on model: ${currentModel}`);
            setErrorDetails(finalError.message || JSON.stringify(finalError));
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
                                                {currentModel === 'gemini-1.5-flash' ? 'TRYING FLASH...' : 'SWITCHING TO PRO...'}
                                            </span>
                                        ) : 'GENERATE EXECUTIVE BRIEF'}
                                    </button>
                                    
                                    {error && (
                                        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-left">
                                            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold text-sm mb-1">
                                                <Bug size={16} />
                                                <span>{error}</span>
                                            </div>
                                            <p className="text-xs font-mono text-red-500 dark:text-red-300 break-all">
                                                {errorDetails}
                                            </p>
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
