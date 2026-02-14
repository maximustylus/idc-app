import React, { useState } from 'react';
import { db, auth } from '../firebase';
import { doc, setDoc, arrayUnion } from 'firebase/firestore';
import { X, BrainCircuit, ChevronUp } from 'lucide-react';

const AuraPulseBot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState(0); 
    const [chat, setChat] = useState([{ role: 'bot', text: 'Hello! I am AURA Pulse. Where are you on the continuum today?' }]);
    const [stats, setStats] = useState({ energy: 50, phase: 'HEALTHY' });

    // Continuum definitions
    const PHASES = [
        { label: 'HEALTHY', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', desc: 'Normal functioning' },
        { label: 'REACTING', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', desc: 'Irritable / Nervous' },
        { label: 'INJURED', color: 'bg-orange-100 text-orange-700 border-orange-200', desc: 'Anxiety / Fatigue' },
        { label: 'ILL', color: 'bg-red-100 text-red-700 border-red-200', desc: 'Distress / Illness' }
    ];

    const handleCheckIn = async () => {
        const user = auth.currentUser;
        if (!user) {
            setChat([...chat, { role: 'bot', text: 'Please log in to save your check-in.' }]);
            return;
        }

        const staffId = user.email.split('@')[0].replace('.', '_');
        const logRef = doc(db, 'wellbeing_history', staffId);

        // Also update daily pulse for the dashboard view
        await setDoc(doc(db, 'system_data', 'daily_pulse'), {
            [staffId]: {
                energy: parseInt(stats.energy / 10), // Scale to 1-10 for dashboard
                focus: parseInt(stats.energy / 10),  // mirroring for now
                lastUpdate: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                status: 'checked-in'
            }
        }, { merge: true });

        // Log history
        await setDoc(logRef, {
            logs: arrayUnion({
                timestamp: new Date().toISOString(),
                energy: stats.energy,
                phase: stats.phase,
                displayDate: new Date().toLocaleDateString()
            })
        }, { merge: true });

        setChat([...chat, { role: 'bot', text: `Logged: ${stats.phase} at ${stats.energy}%. Take care!` }]);
        setTimeout(() => { setIsOpen(false); setStep(0); }, 2000);
    };

    return (
        <div className="fixed bottom-6 right-6 z-[200]">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-2xl transition-all hover:scale-110 active:scale-95 flex items-center gap-2"
            >
                {isOpen ? <ChevronUp size={24} className="rotate-180" /> : <BrainCircuit size={24} />}
            </button>

            {isOpen && (
                <div className="absolute bottom-20 right-0 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in slide-in-from-bottom-4">
                    <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
                        <span className="font-black uppercase tracking-widest text-xs">AURA Assistant</span>
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    </div>

                    <div className="h-48 overflow-y-auto p-4 space-y-3 bg-slate-50/50 dark:bg-slate-950/50">
                        {chat.map((m, i) => (
                            <div key={i} className={`flex ${m.role === 'bot' ? 'justify-start' : 'justify-end'}`}>
                                <div className={`max-w-[85%] p-3 rounded-xl text-xs font-medium ${m.role === 'bot' ? 'bg-white text-slate-700 shadow-sm' : 'bg-indigo-600 text-white'}`}>
                                    {m.text}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                        {step === 0 && (
                            <div className="grid grid-cols-2 gap-2">
                                {PHASES.map(p => (
                                    <button 
                                        key={p.label} 
                                        onClick={() => {
                                            setChat([...chat, { role: 'user', text: p.label }]);
                                            setStats({ ...stats, phase: p.label });
                                            setStep(1);
                                        }}
                                        className={`py-2 px-1 text-[10px] font-bold border rounded-lg transition-colors uppercase flex flex-col items-center ${p.color}`}
                                    >
                                        <span>{p.label}</span>
                                        <span className="opacity-60 text-[8px]">{p.desc}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {step === 1 && (
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <label className="text-[10px] font-black text-slate-400 uppercase">Social Battery</label>
                                    <span className="text-xs font-bold text-indigo-600">{stats.energy}%</span>
                                </div>
                                <input 
                                    type="range" className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" 
                                    min="0" max="100"
                                    value={stats.energy} 
                                    onChange={(e) => setStats({...stats, energy: e.target.value})}
                                />
                                <button 
                                    onClick={handleCheckIn}
                                    className="w-full py-3 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors"
                                >
                                    Log Check-in
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AuraPulseBot;
