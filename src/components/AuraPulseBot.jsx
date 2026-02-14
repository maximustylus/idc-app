import React, { useState, useRef, useEffect } from 'react';
import { db } from '../firebase';
import { doc, setDoc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { X, Send, ChevronUp, BrainCircuit, User, Ghost, RefreshCw, Shield } from 'lucide-react';
import { analyzeWellbeing } from '../utils/auraChat'; // Assuming this exists
import { STAFF_LIST } from '../utils';

const AuraPulseBot = () => {
    const [isOpen, setIsOpen] = useState(false);
    
    // STATES
    const [step, setStep] = useState('IDENTITY'); // IDENTITY -> MOOD -> LOGGING
    const [identifiedUser, setIdentifiedUser] = useState(null); 
    const [messages, setMessages] = useState([
        { 
            role: 'bot', 
            text: "Hi! AURA here, your Adaptive Understanding & Real-time Analytics Bot. Who am I chatting with? (Enter your name or input 'Anon')" 
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [pendingLog, setPendingLog] = useState(null); 
    const messagesEndRef = useRef(null);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, pendingLog, loading]);

    // --- LOGIC HANDLERS ---

    const handleIdentity = (userText) => {
        const lowerInput = userText.toLowerCase().trim();

        // 1. Check for Anonymous intent
        if (lowerInput.includes('anon') || lowerInput.includes('private')) {
            setIdentifiedUser('Anonymous');
            setMessages(prev => [...prev, { 
                role: 'bot', 
                text: "Privacy mode active. I'll keep this session off the record. How are you feeling right now?" 
            }]);
            setStep('MOOD');
            return;
        }

        // 2. Clean up name input (remove "I am", "My name is")
        const cleanName = userText.replace(/^(my name is|i am|i'm|this is)\s+/i, '').trim();
        
        // 3. Match against Staff List or use raw input
        const foundName = STAFF_LIST.find(name => cleanName.toLowerCase() === name.toLowerCase()) || cleanName;

        setIdentifiedUser(foundName);
        setMessages(prev => [...prev, { 
            role: 'bot', 
            text: `Good to see you, ${foundName}. Let’s check in—how are you feeling in this moment?` 
        }]);
        setStep('MOOD');
    };

    const handleMoodAnalysis = async (userText) => {
        setLoading(true);
        try {
            // Simulated delay for "Thinking" feel
            // await new Promise(r => setTimeout(r, 800)); 
            
            const analysis = await analyzeWellbeing(userText);
            
            setMessages(prev => [...prev, { role: 'bot', text: analysis.reply }]);
            
            setPendingLog({
                phase: analysis.phase,
                energy: analysis.energy,
                action: analysis.action,
                originalText: userText
            });
            setStep('LOGGING'); // Wait for confirmation

        } catch (error) {
            setMessages(prev => [...prev, { role: 'bot', text: `System Error: ${error.message}. Please try again.` }]);
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async () => {
        if (!input.trim()) return;
        const userText = input.trim();
        
        // Add user message
        setMessages(prev => [...prev, { role: 'user', text: userText }]);
        setInput('');

        if (step === 'IDENTITY') {
            handleIdentity(userText);
        } else if (step === 'MOOD') {
            handleMoodAnalysis(userText);
        }
    };

    const confirmLog = async () => {
        if (!pendingLog) return;
        setLoading(true);
        
        const timestamp = new Date().toISOString();
        const displayDate = new Date().toLocaleDateString();

        try {
            if (identifiedUser === 'Anonymous') {
                // --- ANONYMOUS LOGGING ---
                const anonRef = doc(db, 'wellbeing_history', '_anonymous_logs');
                // Ensure doc exists
                await setDoc(anonRef, { last_updated: timestamp }, { merge: true }); 
                
                await updateDoc(anonRef, {
                    logs: arrayUnion({
                        timestamp,
                        energy: pendingLog.energy,
                        phase: pendingLog.phase,
                        displayDate
                    })
                });
                setMessages(prev => [...prev, { role: 'bot', text: "✅ Data captured anonymously." }]);
            } else {
                // --- IDENTIFIED LOGGING ---
                const staffId = identifiedUser.toLowerCase().replace(/[^a-z0-9]/g, '_'); // Safer cleanup

                // 1. Log History
                const logRef = doc(db, 'wellbeing_history', staffId);
                await setDoc(logRef, {
                    logs: arrayUnion({
                        timestamp,
                        energy: pendingLog.energy,
                        phase: pendingLog.phase,
                        note: pendingLog.originalText, 
                        displayDate
                    })
                }, { merge: true });

                // 2. Dashboard Pulse (Real-time IDC Update)
                await setDoc(doc(db, 'system_data', 'daily_pulse'), {
                    [identifiedUser]: { 
                        energy: parseInt(pendingLog.energy / 10),
                        focus: parseInt(pendingLog.energy / 10), // Simplification
                        lastUpdate: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                        status: 'checked-in'
                    }
                }, { merge: true });

                setMessages(prev => [...prev, { role: 'bot', text: "✅ Insights synced to your profile." }]);
            }
        } catch (e) {
            console.error(e);
            setMessages(prev => [...prev, { role: 'bot', text: "Error syncing data. Please check connection." }]);
        } finally {
            setLoading(false);
            setPendingLog(null);
            
            // Reset Flow after short delay
            setTimeout(() => {
                setIsOpen(false);
                setStep('IDENTITY');
                setIdentifiedUser(null);
                setMessages([{ role: 'bot', text: "Hi! AURA here. Who am I chatting with? (Enter name or input 'Anon')" }]);
            }, 2500);
        }
    };

    const cancelLog = () => {
        setPendingLog(null);
        setStep('MOOD');
        setMessages(prev => [...prev, { role: 'bot', text: "Assessment discarded. Could you describe how you're feeling differently?" }]);
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
                    p-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center
                    ${isOpen ? 'bg-slate-800 rotate-180' : 'bg-gradient-to-r from-indigo-600 to-violet-600'}
                    text-white border-2 border-white/20
                `}
            >
                {isOpen ? <ChevronUp size={24} /> : <BrainCircuit size={24} className="animate-pulse" />}
            </button>

            {/* Main Chat Window */}
            {isOpen && (
                <div className="absolute bottom-20 right-0 w-[350px] md:w-[380px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in slide-in-from-bottom-4 flex flex-col max-h-[600px] h-[80vh]">
                    
                    {/* Header */}
                    <div className="bg-slate-900 p-4 text-white flex justify-between items-center shadow-lg bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900">
                        <div className="flex items-center gap-3">
                            <div className="bg-indigo-500/20 p-2 rounded-lg backdrop-blur-sm border border-indigo-400/30">
                                <BrainCircuit size={18} className="text-indigo-300" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm tracking-wide">AURA</h3>
                                <p className="text-[10px] text-indigo-200 opacity-80">Adaptive Understanding & Analytics</p>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition-colors"><X size={18} /></button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950/50 scroll-smooth">
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === 'bot' ? 'justify-start' : 'justify-end'}`}>
                                <div className={`max-w-[85%] p-3.5 rounded-2xl text-xs sm:text-sm font-medium leading-relaxed shadow-sm transition-all ${
                                    m.role === 'bot' 
                                        ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-tl-none border border-slate-100 dark:border-slate-700' 
                                        : 'bg-indigo-600 text-white rounded-tr-none shadow-indigo-200'
                                }`}>
                                    {m.text}
                                </div>
                            </div>
                        ))}
                        
                        {/* Loading Indicator */}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl rounded-tl-none shadow-sm border border-slate-100 flex gap-1.5">
                                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
                                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-75"></div>
                                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-150"></div>
                                </div>
                            </div>
                        )}

                        {/* Confirmation Card */}
                        {pendingLog && (
                            <div className="mx-2 mt-2 bg-white dark:bg-slate-800 rounded-xl border-2 border-indigo-100 dark:border-slate-700 p-4 shadow-xl animate-in fade-in zoom-in-95">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">AI Assessment</h4>
                                    <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-500">Preview</span>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    <div className={`p-2 rounded-lg text-center border ${getPhaseColor(pendingLog.phase)}`}>
                                        <div className="text-[9px] font-bold uppercase opacity-70">Zone</div>
                                        <div className="text-xs font-black truncate">{pendingLog.phase}</div>
                                    </div>
                                    <div className="p-2 rounded-lg text-center border bg-blue-50 text-blue-800 border-blue-100">
                                        <div className="text-[9px] font-bold uppercase opacity-70">Capacity</div>
                                        <div className="text-xs font-black">{pendingLog.energy}%</div>
                                    </div>
                                </div>

                                <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg mb-3 border border-slate-100 dark:border-slate-800">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Recommended Action:</p>
                                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300 italic">"{pendingLog.action}"</p>
                                </div>

                                <div className="flex gap-2">
                                    <button onClick={cancelLog} className="flex-1 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
                                        Retake
                                    </button>
                                    <button 
                                        onClick={confirmLog} 
                                        disabled={loading}
                                        className="flex-[2] py-2 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200 disabled:opacity-70 flex items-center justify-center gap-2"
                                    >
                                        {loading ? <RefreshCw size={14} className="animate-spin"/> : (identifiedUser === 'Anonymous' ? <Shield size={14}/> : <User size={14}/>)}
                                        {loading ? 'Syncing...' : 'Confirm Log'}
                                    </button>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                        
                        {/* Quick Actions for Identity Step */}
                        {step === 'IDENTITY' && !input && (
                            <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
                                <button 
                                    onClick={() => handleIdentity('Anon')}
                                    className="whitespace-nowrap px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-full border border-slate-200 hover:bg-slate-200 transition-colors"
                                >
                                    🕵️ Stay Anonymous
                                </button>
                                {STAFF_LIST.slice(0, 2).map(staff => (
                                    <button 
                                        key={staff}
                                        onClick={() => handleIdentity(staff)}
                                        className="whitespace-nowrap px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-full border border-indigo-100 hover:bg-indigo-100 transition-colors"
                                    >
                                        👤 {staff}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-full px-4 py-2 border border-slate-200 dark:border-slate-700 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                            <input 
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder={step === 'IDENTITY' ? "Enter Name..." : "Type here..."}
                                disabled={loading || pendingLog}
                                className="flex-1 bg-transparent text-sm font-medium text-slate-700 dark:text-white outline-none placeholder:text-slate-400 disabled:opacity-50"
                            />
                            <button 
                                onClick={handleSend} 
                                disabled={!input.trim() || loading || pendingLog}
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
