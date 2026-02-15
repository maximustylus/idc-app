import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Battery, BatteryCharging, BatteryWarning, BatteryFull, Users, Activity, Zap } from 'lucide-react';
import { STAFF_LIST } from '../utils';

const WellbeingView = () => {
    const [pulseData, setPulseData] = useState({});
    const [stats, setStats] = useState({ avg: 0, active: 0, zone: 'HEALTHY' });

    // REAL-TIME LISTENER
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
        // FIX 1: Added overflow-x-hidden to prevent horizontal scrolling on mobile
        <div className="w-full px-4 py-6 md:px-8 md:py-8 space-y-8 animate-in fade-in duration-700 flex flex-col items-center overflow-x-hidden">
            
            {/* HERO SECTION */}
            {/* FIX 2: Reduced padding on mobile (p-6 vs p-10) */}
            <div className="w-full bg-slate-900 rounded-3xl p-6 md:p-10 text-white shadow-2xl relative overflow-hidden border border-slate-800 flex flex-col xl:flex-row items-center justify-between gap-8 lg:gap-10">
                
                {/* Background Decor */}
                <div className="absolute -top-40 -left-20 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none"></div>
                <div className="absolute -bottom-40 -right-20 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[100px] pointer-events-none"></div>

                {/* LEFT: Capacity Stats */}
                <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 text-center sm:text-left w-full sm:w-auto">
                    <div className="p-3 sm:p-4 bg-slate-800/80 rounded-2xl border border-slate-700 backdrop-blur-sm shadow-inner">
                        <Activity className="text-indigo-400 w-6 h-6 sm:w-8 sm:h-8" />
                    </div>
                    <div>
                        <h2 className="text-xs sm:text-sm font-bold text-indigo-300 uppercase tracking-widest mb-1">
                            Department Capacity
                        </h2>
                        
                        {/* FIX 3: Responsive Text Sizes (text-5xl on mobile, text-7xl on desktop) */}
                        <div className="flex items-baseline justify-center sm:justify-start gap-1">
                            <span className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tighter text-white drop-shadow-lg">
                                {stats.avg}
                            </span>
                            <span className="text-2xl sm:text-3xl font-bold text-slate-500">%</span>
                        </div>
                        
                        <div className={`mt-3 inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-bold border backdrop-blur-md ${
                             stats.zone === 'HEALTHY' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                             stats.zone === 'REACTING' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' :
                             'bg-red-500/10 text-red-400 border-red-500/30'
                        }`}>
                            <div className={`w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] ${
                                stats.zone === 'HEALTHY' ? 'bg-emerald-400 animate-pulse' : 
                                stats.zone === 'REACTING' ? 'bg-yellow-400 animate-pulse' : 'bg-red-400 animate-pulse'
                            }`}></div>
                            ZONE: {stats.zone}
                        </div>
                    </div>
                </div>

                {/* MIDDLE: The Wide Progress Bar */}
                <div className="w-full flex-1 max-w-5xl flex flex-col justify-center space-y-3 px-1 sm:px-2 lg:px-8 z-10">
                    <div className="flex justify-between text-[8px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">
                        <span>Critical</span>
                        <span className="hidden sm:inline">Sustainable Load</span>
                        <span>Optimal</span>
                    </div>
                    
                    <div className="h-6 sm:h-8 w-full bg-slate-800/60 rounded-full overflow-hidden backdrop-blur-sm border border-slate-700/50 relative shadow-inner">
                        {/* Tick Marks */}
                        <div className="absolute top-0 bottom-0 left-[33%] w-0.5 bg-slate-700/50 z-10"></div>
                        <div className="absolute top-0 bottom-0 left-[66%] w-0.5 bg-slate-700/50 z-10"></div>
                        
                        {/* The Fill */}
                        <div 
                            className={`h-full transition-all duration-1000 ease-out shadow-[0_0_30px_rgba(0,0,0,0.5)] ${
                                stats.zone === 'HEALTHY' ? 'bg-gradient-to-r from-emerald-600 to-teal-400' :
                                stats.zone === 'REACTING' ? 'bg-gradient-to-r from-yellow-500 to-orange-400' :
                                'bg-gradient-to-r from-red-600 to-rose-500'
                            }`} 
                            style={{ width: `${stats.avg}%` }}
                        />
                    </div>
                    <div className="flex justify-center sm:justify-end items-center gap-2 text-[10px] sm:text-xs text-slate-400 font-medium pt-1">
                        <Users size={12} />
                        <span>{stats.active} of {STAFF_LIST.length} Checked In</span>
                    </div>
                </div>
            </div>

            {/* LIVE STATUS GRID */}
            <div className="w-full">
                <div className="flex items-center gap-3 mb-4 sm:mb-6 pl-1">
                    <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                        <Zap className="text-indigo-500 w-5 h-5" />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight">
                        Live Team Status
                    </h3>
                </div>
                
                <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4 sm:gap-6">
                    {STAFF_LIST.map((name) => {
                        const dataKey = Object.keys(pulseData).find(k => k.toLowerCase().includes(name.toLowerCase()));
                        const staffData = pulseData[name] || pulseData[dataKey];
                        
                        return (
                            <div key={name} className="group bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-[160px] sm:h-[180px]">
                                
                                {/* Card Header */}
                                <div className="flex justify-between items-start">
                                    <div className="overflow-hidden">
                                        <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 transition-colors truncate pr-2">
                                            {name}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${staffData ? 'bg-emerald-400 animate-pulse' : 'bg-slate-300'}`}></span>
                                            <p className="text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                                                {staffData ? staffData.lastUpdate : 'OFFLINE'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-700/50 p-2 rounded-xl shrink-0">
                                        {staffData ? getBatteryIcon(staffData.energy) : <Battery className="text-slate-300 w-5 h-5 sm:w-6 sm:h-6" />}
                                    </div>
                                </div>

                                {/* Battery Bar Section */}
                                <div className="space-y-2 mt-auto">
                                    <div className="flex justify-between items-end">
                                        <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase">Energy</span>
                                        <span className={`text-lg sm:text-xl font-black ${staffData ? 'text-slate-800 dark:text-white' : 'text-slate-300'}`}>
                                            {staffData ? staffData.energy : 0}%
                                        </span>
                                    </div>
                                    <div className="h-2.5 sm:h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
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
