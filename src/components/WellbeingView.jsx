import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { Users, Battery, Activity, Clock, AlertCircle, CheckCircle, ChevronLeft, Zap, Coffee, Shield } from 'lucide-react';
import { STAFF_LIST } from '../utils';

const WellbeingView = () => {
  const [teamStatus, setTeamStatus] = useState({});
  const [selectedMember, setSelectedMember] = useState(null); // Stores the NAME (String) only

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

  // --- 2. UPDATE HANDLER (BUG FIXED) ---
  const handleUpdate = async (name, newEnergy, newFocus) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Create the updated object
    const updatedData = {
        ...teamStatus,
        [name]: {
            energy: parseInt(newEnergy),
            focus: parseInt(newFocus),
            lastUpdate: timestamp,
            status: 'checked-in'
        }
    };

    // 1. Immediate UI update (Optimistic)
    setTeamStatus(updatedData);
    
    // 2. Database Update (Debouncing recommended for production, but this works for v1.3)
    await setDoc(doc(db, 'system_data', 'daily_pulse'), updatedData, { merge: true });
  };

  // --- HELPERS ---
  const getBatteryColor = (level) => {
    if (level >= 8) return 'text-emerald-500';
    if (level >= 6) return 'text-blue-500';
    if (level >= 4) return 'text-amber-500';
    return 'text-red-500';
  };

  // --- NEW: SMART SOCIAL ANALYSIS ---
  const getSocialAnalysis = (energy, focus) => {
    const avg = (energy + focus) / 2;
    
    if (energy <= 3) return {
        title: "Social Saver Mode",
        desc: "Social battery is critical. Minimal interaction recommended.",
        action: "Please respect space. Use async text/email instead of face-to-face.",
        icon: Shield,
        style: "bg-slate-100 text-slate-600 border-slate-300"
    };

    if (energy >= 8 && focus >= 8) return {
        title: "Fully Engaged",
        desc: "High energy and high focus. Peak collaboration window.",
        action: "Great time for brainstorming, complex discussions, or team leads.",
        icon: Zap,
        style: "bg-emerald-50 text-emerald-700 border-emerald-200"
    };

    if (energy >= 6) return {
        title: "Socially Available",
        desc: "Good levels for routine work and standard meetings.",
        action: "Open to engagement and standard clinical coordination.",
        icon: CheckCircle,
        style: "bg-blue-50 text-blue-700 border-blue-200"
    };

    // Low Focus or Mixed
    return {
        title: "Preserve Focus",
        desc: "Energy is okay, but focus is varying.",
        action: "Keep interruptions brief. Good for routine tasks.",
        icon: Coffee,
        style: "bg-amber-50 text-amber-700 border-amber-200"
    };
  };

  // --- VIEW: INPUT MODE ---
  if (selectedMember) {
    // Safely get stats or default to 5/5
    const currentStats = teamStatus[selectedMember] || { energy: 5, focus: 5 };
    const analysis = getSocialAnalysis(currentStats.energy, currentStats.focus);
    const AnalysisIcon = analysis.icon;

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
                            <Battery size={14} /> Energy (Social Battery)
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
                        <span>Drained (Leave me alone)</span>
                        <span>Hyper (Let's talk)</span>
                    </div>
                </div>

                {/* Focus Slider */}
                <div>
                    <div className="flex justify-between mb-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Activity size={14} /> Focus (Cognitive Load)
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

                {/* SMART ANALYSIS CARD */}
                <div className={`p-5 rounded-2xl border-2 ${analysis.style} transition-all duration-300`}>
                    <div className="flex items-start gap-3">
                        <div className="mt-1"><AnalysisIcon size={20} /></div>
                        <div>
                            <h3 className="font-black uppercase text-sm mb-1">{analysis.title}</h3>
                            <p className="text-xs font-bold opacity-90 mb-2">{analysis.desc}</p>
                            <div className="text-[10px] font-bold uppercase tracking-wider bg-white/50 p-2 rounded inline-block">
                                Team Advice: {analysis.action}
                            </div>
                        </div>
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
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl p-6 text-white shadow-lg flex justify-between items-center">
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
                    <div key={name} onClick={() => setSelectedMember(name)} className="relative group cursor-pointer bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-black text-xl text-slate-800 dark:text-white">{name}</h3>
                                <p className="text-xs font-bold text-slate-400 flex items-center gap-1">
                                    <Clock size={12} /> {member.lastUpdate}
                                </p>
                            </div>
                            {/* MINI BADGE */}
                            <div className={`px-2 py-1 rounded text-[10px] font-black uppercase ${member.energy <= 3 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                {member.energy <= 3 ? 'Low Batt' : 'Active'}
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
