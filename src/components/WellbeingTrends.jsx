import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, ReferenceLine } from 'recharts';
import { STAFF_LIST } from '../utils';
import { Activity, Shield, Users } from 'lucide-react';

const PHASE_MAP = { 'HEALTHY': 4, 'REACTING': 3, 'INJURED': 2, 'ILL': 1 };
const REVERSE_PHASE_MAP = { 4: 'HEALTHY', 3: 'REACTING', 2: 'INJURED', 1: 'ILL' };

const WellbeingTrends = () => {
    const [history, setHistory] = useState({});
    const [anonLogs, setAnonLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 1. Fetch Individual Logs
        const unsubscribes = STAFF_LIST.map(staff => {
            const staffId = staff.toLowerCase().replace(/ /g, '_');
            return onSnapshot(doc(db, 'wellbeing_history', staffId), (docSnap) => {
                if (docSnap.exists()) {
                    setHistory(prev => ({ ...prev, [staff]: docSnap.data().logs || [] }));
                }
            });
        });

        // 2. Fetch Anonymous Logs
        const anonUnsub = onSnapshot(doc(db, 'wellbeing_history', '_anonymous_logs'), (docSnap) => {
            if (docSnap.exists()) {
                setAnonLogs(docSnap.data().logs || []);
            }
        });

        setLoading(false);
        return () => {
            unsubscribes.forEach(u => u());
            anonUnsub();
        };
    }, []);

    // --- HELPER: Process Data for Charts ---
    const processChartData = (logs) => {
        // Sort by timestamp
        const sorted = [...logs].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        // Take last 14 entries for readability
        return sorted.slice(-14).map(l => ({
            date: new Date(l.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' }),
            energy: parseInt(l.energy),
            phaseVal: PHASE_MAP[l.phase] || 4,
            phase: l.phase,
            note: l.note || ''
        }));
    };

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-slate-800 text-white p-3 rounded-lg text-xs shadow-xl border border-slate-700">
                    <p className="font-bold mb-1">{label}</p>
                    <p className="text-emerald-400">🔋 Energy: {data.energy}%</p>
                    <p className="text-indigo-400">🧠 Phase: {data.phase}</p>
                    {data.note && <p className="italic text-slate-400 mt-1 border-t border-slate-700 pt-1">"{data.note}"</p>}
                </div>
            );
        }
        return null;
    };

    if (loading) return <div className="p-8 text-center text-slate-400 animate-pulse">Loading Intelligence...</div>;

    return (
        <div className="space-y-8 animate-in fade-in">
            
            {/* 1. ANONYMOUS TEAM PULSE */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-indigo-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
                <div className="flex items-center gap-3 mb-6 relative z-10">
                    <div className="p-2 bg-indigo-600 rounded-lg text-white"><Users size={20} /></div>
                    <div>
                        <h3 className="font-black text-slate-800 dark:text-white uppercase">Department Pulse (Anonymous)</h3>
                        <p className="text-xs text-slate-500 font-bold uppercase">Aggregated data including 'Anon' check-ins</p>
                    </div>
                </div>
                
                <div className="h-48 relative z-10">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={processChartData(anonLogs)}>
                            <defs>
                                <linearGradient id="colorEnergy" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="date" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="energy" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorEnergy)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 2. INDIVIDUAL TRIAGE */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {STAFF_LIST.map(staff => {
                    const data = processChartData(history[staff] || []);
                    const latest = data[data.length - 1] || { phase: 'N/A', energy: 0 };
                    
                    // Alert logic
                    const isRisk = latest.phase === 'INJURED' || latest.phase === 'ILL';

                    return (
                        <div key={staff} className={`bg-white dark:bg-slate-800 p-4 rounded-xl border-2 ${isRisk ? 'border-red-400' : 'border-slate-100 dark:border-slate-700'} shadow-sm`}>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h4 className="font-black text-slate-700 dark:text-slate-200">{staff}</h4>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                                        latest.phase === 'HEALTHY' ? 'bg-emerald-100 text-emerald-700' :
                                        latest.phase === 'REACTING' ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-red-100 text-red-700'
                                    }`}>
                                        {latest.phase}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-black text-indigo-600">{latest.energy}%</div>
                                    <div className="text-[9px] text-slate-400 font-bold uppercase">Battery</div>
                                </div>
                            </div>

                            <div className="h-24">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={data}>
                                        <Line type="step" dataKey="energy" stroke={isRisk ? '#ef4444' : '#10b981'} strokeWidth={2} dot={false} />
                                        <Tooltip content={<CustomTooltip />} cursor={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default WellbeingTrends;
