import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, collection, getDocs } from 'firebase/firestore';
import { 
    Battery, BatteryCharging, BatteryWarning, BatteryFull, 
    Users, TrendingUp, Calendar, AlertTriangle, Activity 
} from 'lucide-react';
import { STAFF_LIST } from '../utils';

const WellbeingView = () => {
    const [viewMode, setViewMode] = useState('DAILY'); // 'DAILY' | 'TRENDS'
    const [pulseData, setPulseData] = useState({});
    const [historyData, setHistoryData] = useState({});
    const [stats, setStats] = useState({ avg: 0, active: 0, zone: 'HEALTHY' });
    const [loadingHistory, setLoadingHistory] = useState(false);

    // --- 1. FETCH DAILY REAL-TIME DATA ---
    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'system_data', 'daily_pulse'), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setPulseData(data);
                calculateStats(data);
            }
        });
        return () => unsub();
    }, []);

    // --- 2. FETCH HISTORICAL TRENDS (ON DEMAND) ---
    useEffect(() => {
        if (viewMode === 'TRENDS') {
            fetchHistory();
        }
    }, [viewMode]);

    const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
            const querySnapshot = await getDocs(collection(db, 'wellbeing_history'));
            const historyMap = {};
            
            querySnapshot.forEach((doc) => {
                // Map Firestore ID (e.g., 'alif') back to Capitalized Name if possible, 
                // or just store data by ID
                historyMap[doc.id] = doc.data().logs || [];
            });
            setHistoryData(historyMap);
        } catch (error) {
            console.error("Error fetching history:", error);
        } finally {
            setLoadingHistory(false);
        }
    };

    const calculateStats = (data) => {
        const values = Object.values(data);
        if (values.length === 0) return;

        const total = values.reduce((acc, curr) => acc + curr.energy, 0);
        const avg = Math.round(total / values.length);
        
        setStats({
            avg,
            active: values.length,
            zone: avg > 79 ? 'HEALTHY' : avg > 49 ? 'REACTING' : 'INJURED'
        });
    };

    // --- HELPERS ---
    const getBatteryIcon = (level) => {
        if (level > 75) return <BatteryFull className="text-emerald-500" />;
        if (level > 40) return <BatteryCharging className="text-yellow-500" />;
        return <BatteryWarning className="text-red-500" />;
    };

    const getBarColor = (level) => {
        if (level > 75) return 'bg-emerald-500 shadow-emerald-200';
        if (level > 40) return 'bg-yellow-500 shadow-yellow-200';
        return 'bg-red-500 shadow-red-200';
    };

    const getLast7Days = () => {
        const dates = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            dates.push(d.toLocaleDateString()); // Format: "M/D/YYYY"
        }
        return dates;
    };

    const getCellColor = (energy) => {
        if (energy === null || energy === undefined) return 'bg-slate-100 dark:bg-slate-800'; // No Data
        if (energy > 79) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        if (energy > 49) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        return 'bg-red-100 text-red-700 border-red-200 font-bold';
    };

    // --- RENDER ---
    return (
        <div className="p-4 sm:p-6 space-y-6 animate-in fade-in duration-500">
            
            {/* VIEW TOGGLE */}
            <div className="flex justify-between items-center">
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                    <button 
                        onClick={() => setViewMode('DAILY')}
                        className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${
                            viewMode === 'DAILY' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600' : 'text-slate-500'
                        }`}
                    >
                        Daily Pulse
                    </button>
                    <button 
                        onClick={() => setViewMode('TRENDS')}
                        className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${
                            viewMode === 'TRENDS' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600' : 'text-slate-500'
                        }`}
                    >
                        7-Day Trends
                    </button>
                </div>
                {viewMode === 'TRENDS' && (
                    <div className="text-[10px] text-slate-400 flex items-center gap-2">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full"></div> Healthy
                        <div className="w-2 h-2 bg-yellow-400 rounded-full"></div> Reacting
                        <div className="w-2 h-2 bg-red-400 rounded-full"></div> Injured
                    </div>
                )}
            </div>

            {/* --- VIEW 1: DAILY PULSE (Original) --- */}
            {viewMode === 'DAILY' && (
                <>
                    {/* HEADER CARD */}
                    <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-[100px] opacity-20 pointer-events-none"></div>
                        <div className="flex justify-between items-end relative z-10">
                            <div>
                                <h2 className="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-1 flex items-center gap-2">
                                    <Users size={14}/> Department Pulse
                                </h2>
                                <div className="flex items-baseline gap-4">
                                    <h1 className="text-5xl font-black">{stats.avg}%</h1>
                                    <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                                        stats.zone === 'HEALTHY' ? 'bg-emerald-500/20 text-emerald-300' :
                                        stats.zone === 'REACTING' ? 'bg-yellow-500/20 text-yellow-300' :
                                        'bg-red-500/20 text-red-300'
                                    }`}>
                                        ZONE: {stats.zone}
                                    </span>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-3xl font-bold">{stats.active} / {STAFF_LIST.length}</div>
                                <div className="text-xs text-slate-400">Active Check-ins Today</div>
                            </div>
                        </div>
                        <div className="mt-6 h-4 bg-slate-800 rounded-full overflow-hidden">
                            <div 
                                className={`h-full transition-all duration-1000 ${
                                    stats.zone === 'HEALTHY' ? 'bg-gradient-to-r from-emerald-500 to-teal-400' :
                                    stats.zone === 'REACTING' ? 'bg-gradient-to-r from-yellow-500 to-orange-400' :
                                    'bg-gradient-to-r from-red-500 to-rose-600'
                                }`} 
                                style={{ width: `${stats.avg}%` }}
                            />
                        </div>
                    </div>

                    {/* STAFF GRID */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {STAFF_LIST.map((name) => {
                            const dataKey = Object.keys(pulseData).find(k => k.toLowerCase().includes(name.toLowerCase()));
                            const staffData = pulseData[name] || pulseData[dataKey];
                            
                            return (
                                <div key={name} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="font-bold text-slate-700 dark:text-slate-200">{name}</h3>
                                            <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                                                {staffData ? staffData.lastUpdate : 'NO SIGNAL'}
                                            </p>
                                        </div>
                                        {staffData ? getBatteryIcon(staffData.energy) : <Battery className="text-slate-300" />}
                                    </div>
                                    <div className="flex items-end gap-2">
                                        <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full transition-all duration-700 ${staffData ? getBarColor(staffData.energy) : 'bg-slate-300'}`}
                                                style={{ width: `${staffData ? staffData.energy : 0}%` }}
                                            />
                                        </div>
                                        <span className="text-xs font-bold text-slate-500">{staffData ? staffData.energy : 0}%</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {/* --- VIEW 2: WEEKLY HEATMAP (New Phase 2) --- */}
            {viewMode === 'TRENDS' && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-between items-center">
                        <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                            <Calendar size={16} className="text-indigo-500"/> 7-Day Burnout Monitor
                        </h3>
                        {loadingHistory && <Activity size={16} className="animate-spin text-slate-400"/>}
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                            <thead className="text-[10px] text-slate-400 uppercase bg-slate-50 dark:bg-slate-800">
                                <tr>
                                    <th className="px-4 py-3 font-bold sticky left-0 bg-slate-50 dark:bg-slate-800 z-10">Staff Member</th>
                                    {getLast7Days().map(date => (
                                        <th key={date} className="px-2 py-3 text-center min-w-[60px]">
                                            {date.split('/')[0]}/{date.split('/')[1]} {/* M/D */}
                                        </th>
                                    ))}
                                    <th className="px-4 py-3 text-center font-bold">Risk Level</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {STAFF_LIST.map((name) => {
                                    const staffId = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
                                    const logs = historyData[staffId] || [];
                                    const dates = getLast7Days();
                                    
                                    // Calculate Weekly Average for Risk Assessment
                                    const weekEnergies = logs.map(l => l.energy).filter(e => e !== undefined);
                                    const weekAvg = weekEnergies.length > 0 
                                        ? Math.round(weekEnergies.reduce((a, b) => a + b, 0) / weekEnergies.length) 
                                        : null;

                                    return (
                                        <tr key={name} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300 sticky left-0 bg-white dark:bg-slate-900 z-10 border-r border-slate-100 dark:border-slate-800">
                                                {name}
                                            </td>
                                            {dates.map(dateStr => {
                                                // Find log for this specific date
                                                // Note: displayDate is formatted locally in the log (e.g., "2/15/2026")
                                                // We match strictly.
                                                const log = logs.find(l => l.displayDate === dateStr) || 
                                                            logs.find(l => new Date(l.timestamp).toLocaleDateString() === dateStr);
                                                
                                                return (
                                                    <td key={dateStr} className="p-1">
                                                        <div className={`w-full h-8 rounded-md flex items-center justify-center border ${getCellColor(log?.energy)}`}>
                                                            {log ? `${log.energy}%` : '-'}
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                            <td className="px-4 py-3 text-center">
                                                {weekAvg !== null ? (
                                                    weekAvg < 50 ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-600 font-bold border border-red-200">
                                                            <AlertTriangle size={10}/> High
                                                        </span>
                                                    ) : weekAvg < 70 ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-100 text-yellow-600 font-bold border border-yellow-200">
                                                            Med
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 font-bold border border-emerald-100">
                                                            Low
                                                        </span>
                                                    )
                                                ) : <span className="text-slate-300 italic">No Data</span>}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-950 text-[10px] text-slate-400 text-center border-t border-slate-200 dark:border-slate-800">
                        * Trends are calculated based on the last 7 days of AURA check-ins.
                    </div>
                </div>
            )}
        </div>
    );
};

export default WellbeingView;
