import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Battery, BatteryCharging, BatteryWarning, BatteryFull, Users, Activity, Zap } from 'lucide-react';
import { STAFF_LIST } from '../utils';

const WellbeingView = () => {
    const [pulseData, setPulseData] = useState({});
    const [stats, setStats] = useState({ avg: 0, active: 0, zone: 'HEALTHY' });

    // REAL-TIME LISTENER (Daily Only)
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

    // --- VISUAL HELPERS ---
    const getBatteryIcon = (level) => {
        if (level > 75) return <BatteryFull className="text-emerald-500" size={24} />;
        if (level > 40) return <BatteryCharging className="text-yellow-500" size={24} />;
        return <BatteryWarning className="text-red-500" size={24} />;
    };

    const getBarColor = (level) => {
        if (level > 75) return 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]';
        if (level > 40) return 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.4)]';
        return 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]';
    };

    return (
        <div className="p-6 space-y-8 animate-in fade-in duration-700 max-w-7xl mx-auto">
            
            {/* 1. HERO SECTION: DEPARTMENT PULSE (Expanded) */}
            <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden border border-slate-800">
                {/* Background Decor */}
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500 rounded-full blur-[120px] opacity-20 pointer-events-none"></div>
                <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-emerald-500 rounded-full blur-[100px] opacity-10 pointer-events-none"></div>

                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-end">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-indigo-500/20 rounded-lg backdrop-blur-md border border-indigo-400/30">
                                <Activity size={20} className="text-indigo-300"/>
                            </div>
                            <h2 className="text-sm font-bold text-indigo-300 uppercase tracking-widest">
                                Real-Time Department Capacity
                            </h2>
                        </div>
                        
                        <div className="flex items-baseline gap-6 mt-4">
                            <h1 className="text-7xl lg:text-8xl font-black tracking-tighter">
                                {stats.avg}<span className="text-4xl lg:text-5xl text-slate-400">%</span>
                            </h1>
                            <div className="flex flex-col">
                                <span className={`text-sm lg:text-base font-bold px-4 py-1.5 rounded-full mb-2 border ${
                                    stats.zone === 'HEALTHY' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                                    stats.zone === 'REACTING' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' :
                                    'bg-red-500/20 text-red-300 border-red-500/30'
                                }`}>
                                    ZONE: {stats.zone}
                                </span>
                                <span className="text-xs text-slate-400 flex items-center gap-1">
                                    <Users size={12}/> {stats.active} / {STAFF_LIST.length} Checking In
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Giant Progress Bar */}
                    <div className="w-full space-y-2">
                        <div className="flex justify-between text-xs text-slate-400 font-medium uppercase tracking-wider">
                            <span>Critical</span>
                            <span>Reacting</span>
                            <span>Optimal</span>
                        </div>
                        <div className="h-6 bg-slate-800/50 rounded-full overflow-hidden backdrop-blur-sm border border-slate-700/50">
                            <div 
                                className={`h-full transition-all duration-1000 ease-out ${
                                    stats.zone === 'HEALTHY' ? 'bg-gradient-to-r from-emerald-600 to-teal-400' :
                                    stats.zone === 'REACTING' ? 'bg-gradient-to-r from-yellow-500 to-orange-400' :
                                    'bg-gradient-to-r from-red-600 to-rose-500'
                                }`} 
                                style={{ width: `${stats.avg}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. STAFF BATTERY GRID (Bigger Cards) */}
            <div>
                <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                    <Zap className="text-indigo-500" size={20}/> Live Status
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {STAFF_LIST.map((name) => {
                        const dataKey = Object.keys(pulseData).find(k => k.toLowerCase().includes(name.toLowerCase()));
                        const staffData = pulseData[name] || pulseData[dataKey];
                        
                        return (
                            <div key={name} className="group bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 transition-colors">{name}</h3>
                                        <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-1 font-semibold">
                                            {staffData ? `Updated ${staffData.lastUpdate}` : 'OFFLINE'}
                                        </p>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-700/50 p-2 rounded-xl">
                                        {staffData ? getBatteryIcon(staffData.energy) : <Battery className="text-slate-300" size={24} />}
                                    </div>
                                </div>

                                {/* Large Battery Bar */}
                                <div className="relative pt-2">
                                    <div className="flex justify-between text-xs font-bold mb-1">
                                        <span className={staffData ? 'text-slate-600 dark:text-slate-300' : 'text-slate-300'}>Energy</span>
                                        <span className={staffData ? 'text-slate-800 dark:text-white' : 'text-slate-300'}>
                                            {staffData ? staffData.energy : 0}%
                                        </span>
                                    </div>
                                    <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-700 ${staffData ? getBarColor(staffData.energy) : 'bg-slate-300'}`}
                                            style={{ width: `${staffData ? staffData.energy : 0}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default WellbeingView;
