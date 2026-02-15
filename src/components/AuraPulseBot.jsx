import React, { useState, useRef, useEffect } from 'react';
import { db, auth } from '../firebase'; 
import { doc, setDoc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { GoogleGenerativeAI } from "@google/generative-ai"; 
import { X, Send, BrainCircuit, User, Shield, Activity, Sparkles } from 'lucide-react';
import { analyzeWellbeing } from '../utils/auraChat'; 
import { STAFF_LIST } from '../utils';

// --- CONFIGURATION ---
// FIX: Use the Environment Variable you already set up
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY; 
const genAI = new GoogleGenerativeAI(API_KEY);

// --- SMART IDENTITY MATCHER ---
const findClosestMatch = (input, list) => {
    const cleanInput = input
        .toLowerCase()
        .replace(/^(my name is|i am|i'm|this is|it's|me|its)\s+/g, '')
        .replace(/\s+(here|speaking|logging in|signing in)$/g, '')
        .replace(/[^a-z0-9\s]/g, '')
        .trim();

    const exactMatch = list.find(name => name.toLowerCase() === cleanInput);
    if (exactMatch) return exactMatch;

    const partialMatch = list.find(name => 
        cleanInput.includes(name.toLowerCase()) || 
        name.toLowerCase().includes(cleanInput)
    );
    
    return partialMatch || cleanInput.charAt(0).toUpperCase() + cleanInput.slice(1);
};

const AuraPulseBot = () => {
    const [isOpen, setIsOpen] = useState(false);
    
    // STATES
    const [step, setStep] = useState('IDENTITY'); 
    const [identifiedUser, setIdentifiedUser] = useState(null); 
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [pendingLog, setPendingLog] = useState(null); 
    
    // NEW PHASE 3 & 4 STATES
    const [longTermMemory, setLongTermMemory] = useState(''); 
    const [hasNudge, setHasNudge] = useState(false); 

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // --- 1. INITIALIZATION & NUDGE LOGIC ---
    useEffect(() => {
        const initAura = async () => {
            const user = auth.currentUser;
            
            // A. Check for Nudge (Wednesdays +)
            const today = new Date();
            const dayOfWeek = today.getDay(); // 0=Sun, 3=Wed
            const currentHour = today.getHours();

            // Logic: If Wed(3) or later, and past 2 PM (14:00)
            if (dayOfWeek >= 3 && currentHour >= 14) {
                const docRef = doc(db, 'system_data', 'daily_pulse');
                const docSnap = await getDoc(docRef);
                
                if (docSnap.exists() && user) {
                    const data = docSnap.data();
                    const userName = user.displayName || "User";
                    // Fuzzy check if this user logged data yet
                    const userLog = Object.keys(data).find(key => key.toLowerCase().includes(userName.toLowerCase()));

                    if (!userLog) {
                        setHasNudge(true); // Trigger Red Dot
                    }
                }
            }

            // B. Auto-Login & Memory Load
            if (user) {
                // Auto-identify based on Auth (skip manual entry)
                const smartName = findClosestMatch(user.displayName || "Staff", STAFF_LIST);
                setIdentifiedUser(smartName);
                setStep('CHAT');

                // Load Memory
                try {
                    const memRef = doc(db, 'users', user.uid);
                    const memSnap = await getDoc(memRef);
                    if (memSnap.exists() && memSnap.data().aura_memory) {
                        setLongTermMemory(memSnap.data().aura_memory);
                        
                        // Set Initial Greeting with Memory context
                        if (messages.length === 0) {
                            setMessages([{ 
                                role: 'bot', 
                                text: `Welcome back, ${smartName}. Last time you mentioned: "${memSnap.data().aura_memory}". How is that feeling today?` 
                            }]);
                        }
                    } else if (messages.length === 0) {
                        // Standard Greeting if no memory
                        setMessages([{ 
                            role: 'bot', 
                            text: `Welcome to the NEXUS, ${smartName}. I'm AURA. How can I help you today?` 
                        }]);
                    }
                } catch (e) {
                    console.error("Memory Load Error", e);
                }
            } else {
                // Fallback for unauthenticated/manual flow
                if (messages.length === 0) {
                    setMessages([{ 
                        role: 'bot', 
                        text: "Welcome to the NEXUS. I'm AURA, your Adaptive Understanding & Real-time Analytics Bot. Who am I chatting with? (Enter your name or select 'Anonymous')"
                    }]);
                }
            }
        };

        initAura();
    }, []);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, pendingLog, loading, isOpen]);

    // Focus input
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current.focus(), 300);
            // Clear nudge when opened
            if (hasNudge) setHasNudge(false);
        }
    }, [isOpen]);

    // --- LOGIC HANDLERS ---

    const handleIdentity = async (userText) => {
        let finalName = userText;
        if (userText.toLowerCase().includes('anon') || userText.toLowerCase().includes('private')) {
            finalName = 'Anonymous';
        } else {
            finalName = findClosestMatch(userText, STAFF_LIST);
        }

        setIdentifiedUser(finalName);
        setStep('CHAT');

        const newHistory = [...messages, { role: 'user', text: userText }];
        setMessages(newHistory);
        setInput('');
        await runAiAnalysis(newHistory);
    };

    const runAiAnalysis = async (currentHistory) => {
        setLoading(true);
        try {
            // INJECT MEMORY into the history sent to the analysis engine
            // We prepend it as a "System Note" so the AI considers it
            let analysisHistory = [...currentHistory];
            if (longTermMemory) {
                analysisHistory = [
                    { role: 'system', text: `USER CONTEXT FROM PREVIOUS SESSION: ${longTermMemory}. Use this to be empathetic.` },
                    ...currentHistory
                ];
            }

            const analysis = await analyzeWellbeing(analysisHistory);
            
            setMessages(prev => [...prev, { role: 'bot', text: analysis.reply }]);
            
            if (analysis.diagnosis_ready) {
                setPendingLog({
                    phase: analysis.phase,
                    energy: analysis.energy,
                    action: analysis.action,
                    originalText: currentHistory[currentHistory.length - 1].text 
                });
            } else {
                setPendingLog(null); 
            }

        } catch (error) {
            setMessages(prev => [...prev, { role: 'bot', text: "Connection to Nexus interrupted. Please try again." }]);
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async () => {
        if (!input.trim()) return;
        const userText = input.trim();
        
        if (pendingLog) setPendingLog(null);

        if (step === 'IDENTITY') {
            handleIdentity(userText);
        } else {
            const newHistory = [...messages, { role: 'user', text: userText }];
            setMessages(newHistory);
            setInput('');
            await runAiAnalysis(newHistory);
        }
    };

    // --- PHASE 4: MEMORY GENERATOR ---
    const generateSummary = async () => {
        if (!auth.currentUser) return;
        
        try {
            // Convert chat to text block
            const conversation = messages
                .filter(m => m.role !== 'system')
                .map(m => `${m.role}: ${m.text}`)
                .join('\n');

            const model = genAI.getGenerativeModel({ model: "gemini-pro" });
            const prompt = `Summarize the user's physical/mental state in this conversation. Max 10 words. Ignore greetings. Text: ${conversation}`;
            
            const result = await model.generateContent(prompt);
            const summary = result.response.text();

            // Save to Firestore
            await setDoc(doc(db, 'users', auth.currentUser.uid), { 
                aura_memory: summary,
                last_interaction: new Date()
            }, { merge: true });

        } catch (e) {
            console.error("Memory Gen Failed", e);
        }
    };

    const confirmLog = async () => {
        if (!pendingLog) return;
        setLoading(true);
        
        const timestamp = new Date().toISOString();
        const displayDate = new Date().toLocaleDateString();

        try {
            const logData = {
                timestamp,
                energy: pendingLog.energy,
                phase: pendingLog.phase,
                note: pendingLog.originalText, 
                displayDate
            };

            if (identifiedUser === 'Anonymous') {
                const anonRef = doc(db, 'wellbeing_history', '_anonymous_logs');
                await setDoc(anonRef, { last_updated: timestamp }, { merge: true }); 
                await updateDoc(anonRef, { logs: arrayUnion(logData) });
            } else {
                const staffId = identifiedUser.toLowerCase().replace(/[^a-z0-9]/g, '_'); 
                const logRef = doc(db, 'wellbeing_history', staffId);
                await setDoc(logRef, { logs: arrayUnion(logData) }, { merge: true });

                await setDoc(doc(db, 'system_data', 'daily_pulse'), {
                    [identifiedUser]: { 
                        energy: pendingLog.energy, 
                        focus: pendingLog.energy,  
                        lastUpdate: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                        status: 'checked-in'
                    }
                }, { merge: true });
                
                // SAVE MEMORY ON CONFIRMATION
                await generateSummary();
            }

            setMessages(prev => [...prev, { role: 'bot', text: "✅ Logged. Take care of yourself out there." }]);
            setPendingLog(null);
            
            setTimeout(() => {
                setIsOpen(false);
            }, 3000);

        } catch (e) {
            console.error(e);
            setMessages(prev => [...prev, { role: 'bot', text: "Error syncing data. Network issue?" }]);
        } finally {
            setLoading(false);
        }
    };

    const getPhaseColor = (phase) => {
        switch(phase?.toUpperCase()) {
            case 'HEALTHY': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'REACTING': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
            case 'INJURED': return 'bg-orange-50 text-orange-700 border-orange-200';
            case 'ILL': return 'bg-red-50 text-red-700 border-red-200';
            default: return 'bg-slate-100 text-slate-600';
        }
    };

    // --- RENDER ---
    return (
        <div className="fixed bottom-6 right-6 z-[9999] font-sans">
            {/* FAB Toggle */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    relative group p-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 flex items-center justify-center
                    ${isOpen ? 'bg-slate-800 rotate-90' : 'bg-gradient-to-r from-indigo-600 to-violet-600'}
                    text-white border-2 border-white/20
                `}
            >
                {/* NUDGE BADGE (Phase 3) */}
                {hasNudge && !isOpen && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
                    </span>
                )}

                {isOpen ? <X size={24} /> : <BrainCircuit size={24} className="animate-pulse" />}
                
                {/* Tooltip for Nudge */}
                {!isOpen && hasNudge && (
                    <span className="absolute right-full mr-4 top-1/2 -translate-y-1/2 px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg">
                        ⚠️ Weekly Check-in Pending
                    </span>
                )}
            </button>

            {/* Main Chat Window */}
            {isOpen && (
                <div className="absolute bottom-20 right-0 w-[90vw] max-w-[380px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in slide-in-from-bottom-4 flex flex-col max-h-[600px] h-[75vh]">
                    
                    {/* Header */}
                    <div className="bg-slate-900 p-4 text-white flex justify-between items-center shadow-lg bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="bg-indigo-500/20 p-2 rounded-lg backdrop-blur-sm border border-indigo-400/30">
                                    <Activity size={18} className="text-indigo-300" />
                                </div>
                                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                </span>
                            </div>
                            <div>
                                <h3 className="font-bold text-sm tracking-wide flex items-center gap-2">
                                    NEXUS <span className="text-[10px] font-normal bg-white/10 px-1.5 py-0.5 rounded text-indigo-200">AURA v2.1</span>
                                </h3>
                                <p className="text-[10px] text-slate-400">Episodic Memory Active</p>
                            </div>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950/50 scroll-smooth">
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === 'bot' ? 'justify-start' : 'justify-end'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                                <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                                    m.role === 'bot' 
                                    ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-tl-none border border-slate-100 dark:border-slate-700' 
                                    : 'bg-indigo-600 text-white rounded-tr-none shadow-indigo-200'
                                }`}>
                                    {m.text}
                                </div>
                            </div>
                        ))}
                        
                        {/* Thinking Indicator */}
                        {loading && (
                            <div className="flex justify-start animate-in fade-in">
                                <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl rounded-tl-none shadow-sm border border-slate-100 flex items-center gap-2">
                                    <Sparkles size={14} className="text-indigo-400 animate-pulse" />
                                    <span className="text-xs text-slate-400 font-medium">Analyzing...</span>
                                </div>
                            </div>
                        )}

                        {/* Confirmation Card */}
                        {pendingLog && !loading && (
                            <div className="mx-1 mt-4 bg-white dark:bg-slate-800 rounded-xl border-2 border-indigo-100 dark:border-slate-700 p-4 shadow-xl animate-in fade-in zoom-in-95">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                        <BrainCircuit size={12}/> Analysis Ready
                                    </h4>
                                    <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded font-bold">5A Action Plan</span>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    <div className={`p-2 rounded-lg text-center border ${getPhaseColor(pendingLog.phase)} transition-colors`}>
                                        <div className="text-[9px] font-bold uppercase opacity-70">Zone</div>
                                        <div className="text-xs font-black truncate">{pendingLog.phase}</div>
                                    </div>
                                    <div className="p-2 rounded-lg text-center border bg-blue-50 text-blue-800 border-blue-100">
                                        <div className="text-[9px] font-bold uppercase opacity-70">Energy</div>
                                        <div className="text-xs font-black">{pendingLog.energy}%</div>
                                    </div>
                                </div>

                                <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg mb-3 border border-slate-100 dark:border-slate-800">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Recommended Action:</p>
                                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300 italic">"{pendingLog.action}"</p>
                                </div>

                                <button 
                                    onClick={confirmLog} 
                                    className="w-full py-2.5 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 active:scale-95"
                                >
                                    {identifiedUser === 'Anonymous' ? <Shield size={14}/> : <User size={14}/>}
                                    Confirm Log & Close
                                </button>
                                <p className="text-[10px] text-center text-slate-400 mt-2">
                                    Type below to ignore this and keep chatting.
                                </p>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                        {step === 'IDENTITY' && !input && (
                            <div className="flex gap-2 mb-2 overflow-x-auto pb-1 no-scrollbar">
                                <button 
                                    onClick={() => handleIdentity('Anon')}
                                    className="whitespace-nowrap px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold rounded-full border border-slate-200 transition-colors"
                                >
                                    🕵️ Stay Anonymous
                                </button>
                            </div>
                        )}

                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-full px-4 py-2 border border-slate-200 dark:border-slate-700 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                            <input 
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder={step === 'IDENTITY' ? "Enter your name..." : "Type your message..."}
                                disabled={loading}
                                className="flex-1 bg-transparent text-sm font-medium text-slate-700 dark:text-white outline-none placeholder:text-slate-400 disabled:opacity-50"
                            />
                            <button 
                                onClick={handleSend} 
                                disabled={!input.trim() || loading}
                                className="p-1.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors transform hover:scale-105 active:scale-95"
                            >
                                <Send size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AuraPulseBot;
