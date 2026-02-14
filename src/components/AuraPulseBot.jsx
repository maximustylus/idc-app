import React, { useState, useRef, useEffect } from 'react';
import { db, auth } from '../firebase';
import { doc, setDoc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { X, Send, ChevronUp, BrainCircuit, Ghost, User } from 'lucide-react';
import { analyzeWellbeing } from '../utils/auraChat';

const AuraPulseBot = () => {
    const [isOpen, setIsOpen] = useState(false);
    
    // REMOVED: Settings state and LocalStorage check
    
    const [messages, setMessages] = useState([
        { role: 'bot', text: "Hi! I'm AURA. How are you feeling after your shift today?" }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [pendingLog, setPendingLog] = useState(null); 
    const messagesEndRef = useRef(null);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, pendingLog]);

    const handleSend = async () => {
        if (!input.trim()) return;

        // REMOVED: The check for localStorage key. 
        // We now rely 100% on the .env file in auraChat.js

        const userMsg = { role: 'user', text: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const analysis = await analyzeWellbeing(input);
            
            setMessages(prev => [...prev, { role: 'bot', text: analysis.reply }]);
            
            setPendingLog({
                phase: analysis.phase,
                energy: analysis.energy,
                action: analysis.action
            });

        } catch (error) {
            // Updated error message to point to the real issue
            setMessages(prev => [...prev, { role: 'bot', text: "Connection error. Please check that VITE_GEMINI_API_KEY is correct in your .env file." }]);
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const confirmLog = async (isAnonymous = false) => {
        if (!pendingLog) return;
        
        const timestamp = new Date().toISOString();
        const displayDate = new Date().toLocaleDateString();
        const user = auth.currentUser;

        try {
            if (isAnonymous || !user) {
                // --- ANONYMOUS LOGGING ---
                const anonRef = doc(db, 'wellbeing_history', '_anonymous_logs');
                
                const docSnap = await getDoc(anonRef);
                if (!docSnap.exists()) {
                    await setDoc(anonRef, { logs: [] });
                }

                await updateDoc(anonRef, {
                    logs: arrayUnion({
                        timestamp,
                        energy: pendingLog.energy,
                        phase: pendingLog.phase,
                        displayDate
                    })
                });
                
                setMessages(prev => [...prev, { role: 'bot', text: "✅ Logged Anonymously. Your data helps the team pulse without revealing your identity." }]);

            } else {
                // --- IDENTIFIED LOGGING ---
                const staffId = user.email.split('@')[0].replace('.', '_');

                // 1. Personal History
                const logRef = doc(db, 'wellbeing_history', staffId);
                await setDoc(logRef, {
                    logs: arrayUnion({
                        timestamp,
                        energy: pendingLog.energy,
                        phase: pendingLog.phase,
                        note: messages[messages.length - 2].text, 
                        displayDate
                    })
                }, { merge: true });

                // 2. Dashboard Pulse
                await setDoc(doc(db, 'system_data', 'daily_pulse'), {
                    [staffId]: {
                        energy: parseInt(pendingLog.energy / 10),
                        focus: parseInt(pendingLog.energy / 10),
                        lastUpdate: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                        status: 'checked-in'
                    }
                }, { merge: true });

                setMessages(prev => [...prev, { role: 'bot', text: "✅ Logged to your profile. Take care!" }]);
            }
        } catch (e) {
            console.error(e);
            setMessages(prev => [...prev, { role: 'bot', text: "Error saving log: " + e.message }]);
        }

        setPendingLog(null);
        setTimeout(() => setIsOpen(false), 4000);
    };

    const getPhaseColor = (phase) => {
        switch(phase) {
            case 'HEALTHY': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            case 'REACTING': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'INJURED': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'ILL': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-slate-100';
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-[200]">
            {/* TOGGLE BUTTON */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-2xl transition-all hover:scale-110 active:scale-95 flex items-center gap-2 group"
            >
                {isOpen ? <ChevronUp size={24} className="rotate-180" /> : <BrainCircuit size={24} className="group-hover:animate-pulse" />}
            </button>

            {/* CHAT WINDOW */}
            {isOpen && (
                <div className="absolute bottom-20 right-0 w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in slide-in-from-bottom-4 flex flex-col max-h-[600px]">
                    
                    {/* HEADER - No Settings Gear Anymore */}
                    <div className="bg-slate-900 p-4 text-white flex justify-between items-center shadow-md z-10">
                        <div className="flex items-center gap-2">
                            <div className="bg-indigo-500 p-1.5 rounded-lg"><BrainCircuit size={16} /></div>
                            <div>
                                <h3 className="font-black uppercase tracking-wider text-sm">AURA</h3>
                                <div className="flex items-center gap-1 opacity-70">
                                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
                                    <span className="text-[10px] font-bold">Online</span>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
                    </div>

                    {/* MESSAGES AREA */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950/50">
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === 'bot' ? 'justify-start' : 'justify-end'}`}>
                                <div className={`max-w-[85%] p-3 rounded-2xl text-xs font-medium leading-relaxed shadow-sm ${
                                    m.role === 'bot' 
                                        ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-tl-none' 
                                        : 'bg-indigo-600 text-white rounded-tr-none'
                                }`}>
                                    {m.text}
                                </div>
                            </div>
                        ))}
                        
                        {/* PENDING LOG CARD */}
                        {pendingLog && (
                            <div className="mx-4 mt-2 bg-white dark:bg-slate-800 rounded-xl border-2 border-indigo-100 dark:border-slate-700 p-4 shadow-lg animate-in fade-in zoom-in-95">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">AI Assessment</h4>
                                
                                <div className="flex gap-3 mb-4">
                                    <div className={`flex-1 p-2 rounded-lg text-center border ${getPhaseColor(pendingLog.phase)}`}>
                                        <div className="text-[9px] font-bold uppercase opacity-70">Continuum</div>
                                        <div className="text-xs font-black">{pendingLog.phase}</div>
                                    </div>
                                    <div className="flex-1 p-2 rounded-lg text-center border bg-blue-50 text-blue-800 border-blue-200">
                                        <div className="text-[9px] font-bold uppercase opacity-70">Battery</div>
                                        <div className="text-xs font-black">{pendingLog.energy}%</div>
                                    </div>
                                </div>

                                <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded mb-3">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase">Suggested Action:</span>
                                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300 italic">"{pendingLog.action}"</p>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <button 
                                        onClick={() => confirmLog(true)} 
                                        className="py-2 text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center justify-center gap-1"
                                    >
                                        <Ghost size={12} /> Log Anonymous
                                    </button>
                                    <button 
                                        onClick={() => confirmLog(false)} 
                                        className="py-2 text-[10px] font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-md transition-colors flex items-center justify-center gap-1"
                                    >
                                        <User size={12} /> Log to Profile
                                    </button>
                                </div>
                                <button onClick={() => setPendingLog(null)} className="w-full mt-2 text-[10px] text-slate-400 hover:text-red-400">Cancel</button>
                            </div>
                        )}

                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl rounded-tl-none shadow-sm flex gap-1">
                                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75"></div>
                                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150"></div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* INPUT AREA */}
                    <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-full px-4 py-2 border border-transparent focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                            <input 
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Type a message..."
                                disabled={loading || pendingLog}
                                className="flex-1 bg-transparent text-sm font-medium text-slate-700 dark:text-white outline-none placeholder:text-slate-400"
                            />
                            <button 
                                onClick={handleSend} 
                                disabled={!input.trim() || loading || pendingLog}
                                className="p-1.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
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
