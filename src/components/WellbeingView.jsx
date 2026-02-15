// src/components/WellbeingView.jsx
import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Battery, BatteryCharging, BatteryWarning, BatteryFull, Zap, TrendingUp, Users } from 'lucide-react';
import { STAFF_LIST } from '../utils'; // Ensure this matches your utils file

const WellbeingView = () => {
    const [pulseData, setPulseData] = useState({});
    const [stats, setStats] = useState({ avg: 0, active: 0, zone: 'HEALTHY' });

    useEffect(() => {
        // Real-time listener for the Pulse Data
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

        // Calculate average energy (Handle 0-10 or 0-100 scale)
        const total = values.reduce((acc, curr) => {
            // Normalize: If value < 11, assume it's 0-10 scale and multiply by 10
            const val = curr.energy <= 10 ? curr.energy * 10 : curr.energy;
            return acc + val;
        }, 0);
        
        const avg = Math.round(total / values.length);
        
        setStats({
            avg,
            active: values.length,
            zone: avg > 79 ? 'HEALTHY' : avg > 49 ? 'REACTING' : 'INJURED'
        });
    };

    const getBatteryIcon = (level) => {
        // Normalize 0-10 to 0-100 for display
        const pct = level <= 10 ? level * 10 : level;
        
        if (pct > 75) return <BatteryFull className="text-emerald-500" />;
        if (pct > 40) return <BatteryCharging className="text-yellow-500" />;
        return <BatteryWarning className="text-red-500" />;
    };

    const getBarColor = (level) => {
        const pct = level <= 10 ? level * 10 : level;
        if (pct > 75) return 'bg-emerald-500 shadow-emerald-200';
        if (pct > 40) return 'bg-yellow-500 shadow-yellow-200';
        return 'bg-red-500 shadow-red-200';
    };

    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-500">
            {/* 1. DEPARTMENT PULSE HEADER */}
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

                {/* Progress Bar Visual */}
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

            {/* 2. STAFF BATTERY GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {STAFF_LIST.map((name) => {
                    // Try to match exact name, or try lowercased/fuzzy match in data keys
                    const dataKey = Object.keys(pulseData).find(k => k.toLowerCase().includes(name.toLowerCase()));
                    const staffData = pulseData[name] || pulseData[dataKey]; // Fallback to fuzzy match
                    
                    const batteryLevel = staffData ? (staffData.energy <= 10 ? staffData.energy * 10 : staffData.energy) : 0;
                    
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

                            {/* Battery Bar */}
                            <div className="flex items-end gap-2">
                                <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-700 ${staffData ? getBarColor(staffData.energy) : 'bg-slate-300'}`}
                                        style={{ width: `${staffData ? batteryLevel : 0}%` }}
                                    />
                                </div>
                                <span className="text-xs font-bold text-slate-500">{staffData ? batteryLevel : 0}%</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default WellbeingView;
