import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { Calendar, Download, Settings, ChevronLeft, ChevronRight, Play, FileSpreadsheet } from 'lucide-react';
import { generateRoster, downloadICS, downloadCSV } from '../utils/auraEngine';

const RosterView = () => {
    // --- STATE ---
    const [currentDate, setCurrentDate] = useState(new Date());
    const [rosterData, setRosterData] = useState({});
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    
    // Default Config (Editable via Wizard)
    const [config, setConfig] = useState({
        staff: ["Brandon", "Ying Xian", "Derlinder", "Fadzlynn"],
        tasks: ["EFT", "IPT+SKG", "NC", "FSG+WI"],
        startDate: "2026-01-05",
        weeks: 26
    });

    // --- FIREBASE SYNC ---
    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'system_data', 'roster_2026'), (doc) => {
            if (doc.exists()) setRosterData(doc.data());
        });
        return () => unsub();
    }, []);

    // --- ACTIONS ---
    const handleGenerate = async () => {
        if(!window.confirm("Overwrite existing roster with new AURA configuration?")) return;
        const newData = generateRoster(config);
        await setDoc(doc(db, 'system_data', 'roster_2026'), newData);
        setIsConfigOpen(false);
        alert("✅ AURA has generated a conflict-free roster.");
    };

    const handleMonthChange = (offset) => {
        const newDate = new Date(currentDate.setMonth(currentDate.getMonth() + offset));
        setCurrentDate(new Date(newDate));
    };

    // --- RENDER HELPERS ---
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth(); 
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();

    const getShifts = (day) => {
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return rosterData[dateKey] || [];
    };

    return (
        <div className="md:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 animate-in fade-in">
            
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex items-center gap-4">
                    <div className="bg-indigo-100 dark:bg-indigo-900/50 p-3 rounded-xl text-indigo-600 dark:text-indigo-400">
                        <Calendar size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">AURA Roster</h2>
                        
                        {/* --- FIXED: DATE NAVIGATOR --- */}
                        <div className="flex items-center gap-3 mt-1">
                            <button onClick={() => handleMonthChange(-1)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors text-slate-500">
                                <ChevronLeft size={18} />
                            </button>
                            
                            {/* Changed w-28 to min-w-[140px] and added whitespace-nowrap */}
                            <span className="text-sm font-bold text-slate-600 dark:text-slate-300 uppercase min-w-[140px] text-center whitespace-nowrap">
                                {currentDate.toLocaleString('default', { month: 'long' })} {year}
                            </span>
                            
                            <button onClick={() => handleMonthChange(1)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors text-slate-500">
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button onClick={() => setIsConfigOpen(true)} className="flex gap-2 items-center px-4 py-2 rounded bg-slate-100 font-bold text-xs hover:bg-slate-200 text-slate-600 transition-colors">
                        <Settings size={14} /> Configure
                    </button>
                    <button onClick={() => downloadCSV(rosterData)} className="flex gap-2 items-center px-4 py-2 rounded bg-green-100 text-green-700 font-bold text-xs hover:bg-green-200 transition-colors">
                        <FileSpreadsheet size={14} /> CSV
                    </button>
                    <button onClick={() => downloadICS(rosterData)} className="flex gap-2 items-center px-4 py-2 rounded bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 shadow-lg transition-colors">
                        <Download size={14} /> ICS
                    </button>
                </div>
            </div>

            {/* CALENDAR GRID */}
            <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-700 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <div key={d} className="bg-slate-50 dark:bg-slate-800 p-2 text-center text-xs font-bold text-slate-400 uppercase">
                        {d}
                    </div>
                ))}
                
                {/* Empty Cells */}
                {Array.from({ length: firstDayIndex }).map((_, i) => (
                    <div key={`empty-${i}`} className="bg-white dark:bg-slate-900 h-32" />
                ))}

                {/* Days */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const shifts = getShifts(day);
                    return (
                        <div key={day} className="bg-white dark:bg-slate-900 h-32 p-1 hover:bg-slate-50 transition-colors relative group border-t border-l border-transparent hover:border-slate-200">
                            <span className="text-xs font-bold text-slate-400 absolute top-1 right-2">{day}</span>
                            <div className="mt-5 flex flex-col gap-1 overflow-y-auto max-h-[90px] custom-scrollbar">
                                {shifts.map((s, idx) => (
                                    <div key={idx} className={`text-[9px] font-bold px-1.5 py-1 rounded flex flex-col leading-tight shadow-sm ${
                                        s.category === 'VC' ? 'bg-orange-50 text-orange-800 border border-orange-100' :
                                        'bg-blue-50 text-blue-700 border border-blue-100'
                                    }`}>
                                        <span className="uppercase tracking-tighter opacity-80">{s.task}</span>
                                        <span className="text-slate-800">{s.staff}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* CONFIGURATION WIZARD MODAL */}
            {isConfigOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 border border-slate-200 dark:border-slate-700 animate-in zoom-in-95">
                        <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase mb-4 flex items-center gap-2">
                            <Settings size={20} /> AURA Configuration Wizard
                        </h3>
                        
                        <div className="space-y-4 mb-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase">Start Date</label>
                                    <input 
                                        type="date" 
                                        className="input-field w-full mt-1 font-bold" 
                                        value={config.startDate} 
                                        onChange={(e) => setConfig({...config, startDate: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase">Weeks</label>
                                    <input 
                                        type="number" 
                                        className="input-field w-full mt-1 font-bold" 
                                        value={config.weeks} 
                                        onChange={(e) => setConfig({...config, weeks: parseInt(e.target.value)})}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase">Staff Pool (Order Matters for Rotation)</label>
                                <textarea 
                                    className="input-field w-full mt-1 h-20 font-mono text-xs" 
                                    value={config.staff.join(', ')} 
                                    onChange={(e) => setConfig({...config, staff: e.target.value.split(',').map(s => s.trim())})}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase">Core Tasks (Mon-Fri)</label>
                                <textarea 
                                    className="input-field w-full mt-1 h-20 font-mono text-xs" 
                                    value={config.tasks.join(', ')} 
                                    onChange={(e) => setConfig({...config, tasks: e.target.value.split(',').map(t => t.trim())})}
                                />
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button onClick={() => setIsConfigOpen(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                            <button onClick={handleGenerate} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-lg transition-colors flex justify-center items-center gap-2">
                                <Play size={16} /> Generate Roster
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RosterView;
