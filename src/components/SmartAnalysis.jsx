import React, { useState } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { 
    JOB_DESCRIPTIONS, 
    TIME_MATRIX, 
    COMPETENCY_FRAMEWORK, 
    CAREER_PATH 
} from '../knowledgeBase';
import { Sparkles, Lock, X, AlertCircle, TrendingUp, Scale } from 'lucide-react';

const SmartAnalysis = ({ teamData, staffLoads, onClose }) => {
    const [apiKey, setApiKey] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    const handleAnalyze = async () => {
        if (!apiKey) {
            setError('Please enter your Gemini API Key to continue.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

            // Prepare the snapshot for the AI
            const snapshot = JSON.stringify({
                projects_and_tasks: teamData,
                clinical_workload: staffLoads
            });

            const prompt = `
                ACT AS: A Senior Clinical Lead and HR Specialist at KK Women's and Children's Hospital (SingHealth).
                
                REFERENCE MATERIAL:
                - Job Descriptions: ${JOB_DESCRIPTIONS}
                - Time Matrix Rules: ${TIME_MATRIX}
                - Competency Levels: ${COMPETENCY_FRAMEWORK}
                - Career Path: ${CAREER_PATH}

                LIVE DATA TO ANALYZE:
                ${snapshot}

                TASK:
                Perform a deep analysis of the team's current performance against their JDs and Competency levels.
                Provide a "Clinical Leadership Executive Brief" in these 3 specific sections:

                1. 🚨 ROLE MISALIGNMENT & BURNOUT: 
                Compare Clinical Loads vs Admin/Research tasks. Using the Time Matrix, flag anyone doing work below or significantly above their expected JG level.
                
                2. 📈 PROMOTION & TALENT READINESS: 
                Identify staff members whose current project types (Management, Research, Education) suggest they are operating at a higher Competency Level than their current role.
                
                3. ⚖️ JOY AT WORK RECOMMENDATIONS: 
                Suggest specific task re-distributions. If someone is "Stuck" and "Overloaded," suggest who has the capacity to assist based on the data.

                TONE: High-level leadership tone. Professional, concise, and actionable.
            `;

            const aiResult = await model.generateContent(prompt);
            const response = await aiResult.response;
            const text = response.text();
            
            // Basic formatting for the display
            setResult(text);
            
        } catch (err) {
            console.error(err);
            setError('Analysis failed. Ensure your API Key is correct and has Gemini 1.5 access.');
        } finally {
            setLoading(false);
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
                                <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 leading-relaxed">
                                    Cross-reference current team data with KKH Job Descriptions and SingHealth Competency Frameworks.
                                </p>
                                
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
                                                PROCESSING...
                                            </span>
                                        ) : 'GENERATE EXECUTIVE BRIEF'}
                                    </button>
                                    {error && <p className="text-red-500 text-xs font-bold mt-2">{error}</p>}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800/30 flex items-center gap-3">
                                    <AlertCircle className="text-red-600" />
                                    <span className="text-xs font-bold text-red-800 dark:text-red-300">Burnout Risks</span>
                                </div>
                                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800/30 flex items-center gap-3">
                                    <TrendingUp className="text-indigo-600" />
                                    <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300">Talent Readiness</span>
                                </div>
                                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800/30 flex items-center gap-3">
                                    <Scale className="text-emerald-600" />
                                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Workload Balance</span>
                                </div>
                            </div>
                            
                            {/* AI Output Content */}
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 prose dark:prose-invert max-w-none">
                                <div className="whitespace-pre-line text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                                    {result}
                                </div>
                            </div>
                            
                            <button 
                                onClick={() => setResult(null)}
                                className="mt-8 px-8 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold rounded-xl text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                Run New Analysis
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SmartAnalysis;
