import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Battery, BatteryCharging, BatteryWarning, BatteryFull, Users, Activity, Zap, TrendingUp } from 'lucide-react';
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
        if (level > 75) return <BatteryFull className="text-emerald-500" size={20} />;
        if (level > 40) return <BatteryCharging className="text-yellow-500" size={20} />;
        return <BatteryWarning className="text-red-500" size={20} />;
    };

    const getBarColor = (level) => {
        if (level > 75) return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]';
        if (level > 40) return 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.3)]';
        return 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]';
    };

    return (
        // 1. MAIN CONTAINER: Full Width + Centered + Padding
        <div className="w-full max-w-[1600px] mx-auto p-6 md:p-8 space-y-8 animate-in fade-in duration-700">
            
            {/* 2. HERO SECTION: WIDE DASHBOARD STRIP */}
            <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden border border-slate-800 w-full flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-16">
                
                {/* Background FX */}
                <div className="absolute -top-1/2 -left-10 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none"></div>
                <div className="absolute -bottom-1/2 -right-10 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none"></div>

                {/* LEFT: The Big Number */}
                <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left min-w-fit">
                    <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700 backdrop-blur-sm">
                        <Activity size={32} className="text-indigo-400" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-indigo-300 uppercase tracking-widest mb-1">Department Capacity</h2>
                        <div className="flex items-baseline justify-center md:justify-start gap-1">
                            <span className="text-7xl font-black tracking-tighter text-white">{stats.avg}</span>
                            <span className="text-3xl font-bold text-slate-500">%</span>
                        </div>
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border mt-2 ${
                             stats.zone === 'HEALTHY' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                             stats.zone === 'REACTING' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                             'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                            <div className={`w-2 h-2 rounded-full ${
                                stats.zone === 'HEALTHY' ? 'bg-emerald-400 animate-pulse' : 
                                stats.zone === 'REACTING' ? 'bg-yellow-400 animate-pulse' : 'bg-red-400 animate-pulse'
                            }`}></div>
                            ZONE: {stats.zone}
                        </div>
                    </div>
                </div>

                {/* MIDDLE: The Progress Bar (Stretches to fill space) */}
                <div className="w-full max-w-4xl flex-1 flex flex-col justify-center space-y-3">
                    <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">
                        <span>Critical Load</span>
                        <span>Sustainable</span>
                        <span>Optimal Flow</span>
                    </div>
                    
                    {/* The Bar Track */}
                    <div className="h-6 w-full bg-slate-800/80 rounded-full overflow-hidden border border-slate-700/50 relative">
                        {/* Tick Marks */}
                        <div className="absolute top-0 bottom-0 left-[33%] w-0.5 bg-slate-700/50 z-10"></div>
                        <div className="absolute top-0 bottom-0 left-[66%] w-0.5 bg-slate-700/50 z-10"></div>
                        
                        {/* The Fill */}
                        <div 
                            className={`h-full transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(0,0,0,0.5)] ${
                                stats.zone === 'HEALTHY' ? 'bg-gradient-to-r from-emerald-600 to-teal-400' :
                                stats.zone === 'REACTING' ? 'bg-gradient-to-r from-yellow-500 to-orange-400' :
                                'bg-gradient-to-r from-red-600 to-rose-500'
                            }`} 
                            style={{ width: `${stats.avg}%` }}
                        />
                    </div>
                    <p className="text-xs text-slate-400 text-center md:text-right pt-1">
                        Based on {stats.active} active check-ins today
                    </p>
                </div>

                {/* RIGHT: Quick Stats */}
                <div className="relative z-10 hidden xl:flex flex-col gap-3 min-w-[140px]">
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 backdrop-blur-sm">
                        <div className="flex items-center gap-2 text-slate-400 mb-1">
                            <Users size={14} /> <span className="text-[10px] font-bold uppercase">Response Rate</span>
                        </div>
                        <div className="text-2xl font-bold text-white">
                            {Math.round((stats.active / STAFF_LIST.length) * 100)}%
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. GRID SECTION: LIVE STATUS (Stretches to fill) */}
            <div className="w-full">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                        <Zap className="text-indigo-500" size={20} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight">Live Team Status</h3>
                </div>
                
                {/* GRID LOGIC: 
                   - Mobile: 1 col
                   - Tablet: 2 cols
                   - Laptop: 3 cols
                   - Desktop: 4 cols
                   - Ultra-Wide: 5 cols 
                   This ensures cards are always sized appropriately and fill the width.
                */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                    {STAFF_LIST.map((name) => {
                        const dataKey = Object.keys(pulseData).find(k => k.toLowerCase().includes(name.toLowerCase()));
                        const staffData = pulseData[name] || pulseData[dataKey];
                        
                        return (
                            <div key={name} className="group bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-[180px]">
                                
                                {/* Card Header */}
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 transition-colors truncate">
                                            {name}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <span className={`w-2 h-2 rounded-full ${staffData ? 'bg-emerald-400 animate-pulse' : 'bg-slate-300'}`}></span>
                                            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                                                {staffData ? staffData.lastUpdate : 'OFFLINE'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-700/50 p-2 rounded-xl">
                                        {staffData ? getBatteryIcon(staffData.energy) : <Battery className="text-slate-300" size={20} />}
                                    </div>
                                </div>

                                {/* Battery Bar Section */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-end">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Current Load</span>
                                        <span className={`text-xl font-black ${staffData ? 'text-slate-800 dark:text-white' : 'text-slate-300'}`}>
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
