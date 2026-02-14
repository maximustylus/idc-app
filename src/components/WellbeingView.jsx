import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { Users, Battery, Activity, Clock, AlertCircle, CheckCircle, ChevronLeft } from 'lucide-react';
import { STAFF_LIST } from '../utils';

const WellbeingView = () => {
  const [teamStatus, setTeamStatus] = useState({});
  const [selectedMember, setSelectedMember] = useState(null);

  // --- 1. REAL-TIME SYNC ---
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'system_data', 'daily_pulse'), (docSnap) => {
      if (docSnap.exists()) {
        setTeamStatus(docSnap.data());
      } else {
        const initial = {};
        STAFF_LIST.forEach(name => initial[name] = { energy: 0, focus: 0, lastUpdate: null, status: 'not-checked-in' });
        setTeamStatus(initial);
      }
    });
    return () => unsub();
  }, []);

  // --- 2. UPDATE HANDLER ---
  const handleUpdate = async (name, newEnergy, newFocus) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const updatedData = {
        ...teamStatus,
        [name]: {
            energy: parseInt(newEnergy),
            focus: parseInt(newFocus),
            lastUpdate: timestamp,
            status: 'checked-in'
        }
    };

    setTeamStatus(updatedData);
    if (selectedMember) {
        setSelectedMember({ ...selectedMember, energy: newEnergy, focus: newFocus });
    }

    await setDoc(doc(db, 'system_data', 'daily_pulse'), updatedData, { merge: true });
  };

  // --- HELPERS ---
  const getBatteryColor = (level) => {
    if (level >= 8) return 'text-emerald-500';
    if (level >= 6) return 'text-blue-500';
    if (level >= 4) return 'text-amber-500';
    return 'text-red-500';
  };

  const getRecommendation = (energy, focus) => {
    const avg = (energy + focus) / 2;
    if (avg >= 8) return { text: "Peak Performance", sub: "Ready for complex tasks", icon: Activity, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" };
    if (avg >= 6) return { text: "Steady State", sub: "Good for routine work", icon: CheckCircle, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" };
    if (avg >= 4) return { text: "Low Battery", sub: "Take a micro-break", icon: Battery, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" };
    return { text: "Critical Drain", sub: "Support needed immediately", icon: AlertCircle, color: "text-red-600", bg: "bg-red-50 border-red-200" };
  };

  // --- VIEW: INPUT MODE ---
  if (selectedMember) {
    const currentStats = teamStatus[selectedMember] || { energy: 5, focus: 5 };
    const rec = getRecommendation(currentStats.energy, currentStats.focus);
    const RecIcon = rec.icon;

    return (
      <div className="md:col-span-2 min-h-[500px] flex items-center justify-center animate-in zoom-in-95 duration-200">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
            {/* Header */}
            <div className="bg-slate-900 p-6 text-white text-center relative">
                <button onClick={() => setSelectedMember(null)} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 hover:bg-white/20 rounded-full transition-colors">
                    <ChevronLeft size={24} />
                </button>
                <h2 className="text-2xl font-black uppercase tracking-widest">AURA Check-In</h2>
                <p className="text-slate-400 text-xs font-bold uppercase">{selectedMember}</p>
            </div>

            <div className="p-8 space-y-8">
                {/* Energy Slider */}
                <div>
                    <div className="flex justify-between mb-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Battery size={14} /> Energy
                        </label>
                        <span className={`text-xl font-black ${getBatteryColor(currentStats.energy)}`}>{currentStats.energy}/10</span>
                    </div>
                    <input 
                        type="range" min="1" max="10" step="1"
                        value={currentStats.energy || 5}
                        onChange={(e) => handleUpdate(selectedMember, parseInt(e.target.value), currentStats.focus || 5)}
                        className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:accent-blue-500"
                    />
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase mt-1">
                        <span>Drained</span>
                        <span>Hyper</span>
                    </div>
                </div>

                {/* Focus Slider */}
                <div>
                    <div className="flex justify-between mb-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Activity size={14} /> Focus
                        </label>
                        <span className={`text-xl font-black ${getBatteryColor(currentStats.focus)}`}>{currentStats.focus}/10</span>
                    </div>
                    <input 
                        type="range" min="1" max="10" step="1"
                        value={currentStats.focus || 5}
                        onChange={(e) => handleUpdate(selectedMember, currentStats.energy || 5, parseInt(e.target.value))}
                        className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600 hover:accent-purple-500"
                    />
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase mt-1">
                        <span>Scattered</span>
                        <span>Laser</span>
                    </div>
                </div>

                {/* Live Feedback */}
                <div className={`p-4 rounded-xl border-2 ${rec.bg} flex items-center gap-4`}>
                    <div className={`p-3 rounded-full bg-white shadow-sm ${rec.color}`}>
                        <RecIcon size={24} />
                    </div>
                    <div>
                        <h3 className={`font-black uppercase ${rec.color}`}>{rec.text}</h3>
                        <p className="text-xs font-bold text-slate-500">{rec.sub}</p>
                    </div>
                </div>
            </div>
        </div>
      </div>
    );
  }

  // --- VIEW: DASHBOARD MODE ---
  return (
    <div className="md:col-span-2 space-y-6 animate-in fade-in">
        
        {/* HERO HEADER */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm"><Activity /></div>
                    AURA PULSE
                </h1>
                <p className="text-blue-100 font-bold opacity-80 mt-1">Real-time Energy & Focus Tracking</p>
            </div>
            <div className="text-right">
                <div className="text-4xl font-black">{Object.values(teamStatus).filter(m => m.status === 'checked-in').length} / {STAFF_LIST.length}</div>
                <div className="text-xs font-bold uppercase tracking-widest opacity-70">Checked In Today</div>
            </div>
        </div>

        {/* TEAM GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {STAFF_LIST.map(name => {
                const member = teamStatus[name] || { status: 'not-checked-in', energy: 0, focus: 0 };
                const rec = getRecommendation(member.energy, member.focus);
                
                if (member.status === 'not-checked-in') {
                    return (
                        <div key={name} onClick={() => setSelectedMember(name)} className="group cursor-pointer bg-white dark:bg-slate-800 p-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 transition-all flex flex-col items-center justify-center text-center h-48 opacity-70 hover:opacity-100">
                            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <Users className="text-slate-400" />
                            </div>
                            <h3 className="font-bold text-slate-600 dark:text-slate-300">{name}</h3>
                            <span className="text-xs font-bold text-blue-500 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">Tap to Check-In</span>
                        </div>
                    );
                }

                return (
                    <div key={name} onClick={() => setSelectedMember(name)} className={`relative group cursor-pointer bg-white dark:bg-slate-800 p-6 rounded-2xl border-l-4 shadow-sm hover:shadow-md transition-all ${rec.color.replace('text-', 'border-')}`}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-black text-xl text-slate-800 dark:text-white">{name}</h3>
                                <p className="text-xs font-bold text-slate-400 flex items-center gap-1">
                                    <Clock size={12} /> {member.lastUpdate}
                                </p>
                            </div>
                            <div className={`p-2 rounded-lg bg-slate-50 dark:bg-slate-700 ${rec.color}`}>
                                <rec.icon size={20} />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                                    <span>Energy</span>
                                    <span>{member.energy}/10</span>
                                </div>
                                <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                                    <div className={`h-2 rounded-full transition-all duration-500 ${member.energy >= 7 ? 'bg-emerald-500' : member.energy >= 4 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${member.energy * 10}%` }}></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                                    <span>Focus</span>
                                    <span>{member.focus}/10</span>
                                </div>
                                <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                                    <div className={`h-2 rounded-full transition-all duration-500 ${member.focus >= 7 ? 'bg-purple-500' : member.focus >= 4 ? 'bg-blue-500' : 'bg-red-500'}`} style={{ width: `${member.focus * 10}%` }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    </div>
  );
};

export default WellbeingView;
