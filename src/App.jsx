import React, { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import ResponsiveLayout from './components/ResponsiveLayout';
import KpiChart from './components/KpiChart';
import TaskProjectBarChart from './components/TaskProjectBarChart';
import StaffLoadChart from './components/StaffLoadChart';
import AdminPanel from './components/AdminPanel';
import Login from './components/Login';
import { Sun, Moon } from 'lucide-react'; // <--- ADDED ICONS HERE

// Config
const PILLAR_COLORS = { 'MANAGEMENT': '#FFF2CC', 'CLINICAL': '#FCE4D6', 'EDUCATION': '#FBE5D6', 'RESEARCH': '#E2EFDA', 'A.O.B.': '#E2F0D9' };
const HEADER_COLORS = { 'MANAGEMENT': '#FFD966', 'CLINICAL': '#F4B084', 'EDUCATION': '#FFC000', 'RESEARCH': '#A9D08E', 'A.O.B.': '#548235' };
const PIE_COLORS = { 'MANAGEMENT': '#FFD966', 'CLINICAL': '#F4B084', 'EDUCATION': '#FFC000', 'RESEARCH': '#A9D08E', 'A.O.B.': '#548235' };

// Label Function (Math to center text in slice)
const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
        <text x={x} y={y} fill="#1f2937" textAnchor="middle" dominantBaseline="central" style={{ fontSize: '11px', fontWeight: 'bold', pointerEvents: 'none' }}>
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};

function App() {
    const [teamData, setTeamData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [showLogin, setShowLogin] = useState(false);
    const [showAdmin, setShowAdmin] = useState(false);
    
    // Theme Logic
    const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
    useEffect(() => {
        if (darkMode) { document.documentElement.classList.add('dark'); localStorage.setItem('theme', 'dark'); } 
        else { document.documentElement.classList.remove('dark'); localStorage.setItem('theme', 'light'); }
    }, [darkMode]);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, setUser);
        const unsubscribeData = onSnapshot(collection(db, 'cep_team'), (snapshot) => {
            const data = [];
            snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
            data.sort((a, b) => a.staff_name.localeCompare(b.staff_name));
            setTeamData(data);
            setLoading(false);
        });
        return () => { unsubscribeAuth(); unsubscribeData(); };
    }, []);

    const handleLogout = async () => { await signOut(auth); setShowAdmin(false); };

    const getPieData = () => {
        const counts = { 'MANAGEMENT': 0, 'CLINICAL': 0, 'EDUCATION': 0, 'RESEARCH': 0 };
        teamData.forEach(staff => {
            staff.projects?.forEach(p => {
                if (counts[p.domain_type] !== undefined) counts[p.domain_type]++;
            });
        });
        return Object.keys(counts).map(key => ({ name: key, value: counts[key] })).filter(d => d.value > 0);
    };

    if (loading) return <div className="flex h-screen items-center justify-center bg-[#f1f5f9] dark:bg-[#0f172a]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

    const staffNames = teamData.map(d => d.staff_name);

    return (
        <ResponsiveLayout>
            {/* HEADER */}
            <div className="col-span-1 md:col-span-2 flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <img src="/logo.png" alt="SSMC" className="h-10 w-auto object-contain" onError={(e) => {e.target.style.display='none'}} />
                    <div className="hidden sm:block border-l border-slate-300 dark:border-slate-600 pl-4">
                        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight">SSMC@KKH</h1>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-bold">Leadership Dashboard</p>
                    </div>
                </div>
                <div className="flex gap-3 items-center">
                    
                    {/* --- THEME TOGGLE ICON --- */}
                    <button 
                        onClick={() => setDarkMode(!darkMode)} 
                        className="p-2 rounded-full text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700 transition-all"
                        title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    >
                        {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                    {/* ------------------------- */}

                    {user ? (
                        <>
                            <button onClick={() => setShowAdmin(!showAdmin)} className={`px-4 py-2 text-xs font-bold uppercase tracking-wide rounded transition-all border ${showAdmin ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600'}`}>
                                {showAdmin ? 'Close Panel' : 'Admin Panel'}
                            </button>
                            <button onClick={handleLogout} className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-red-600 bg-white border border-slate-300 rounded hover:bg-red-50 dark:bg-slate-800 dark:text-red-400 dark:border-slate-600">
                                Logout
                            </button>
                        </>
                    ) : (
                        <button onClick={() => setShowLogin(true)} className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-blue-600 bg-white border border-blue-600 rounded hover:bg-blue-50 dark:bg-slate-800 dark:text-blue-400 dark:border-blue-500">
                            Login
                        </button>
                    )}
                </div>
            </div>

            {showLogin && <Login onClose={() => setShowLogin(false)} />}
            {user && showAdmin && <div className="col-span-1 md:col-span-2"><AdminPanel teamData={teamData} /></div>}
            
            {/* ROW 1: KEY METRICS */}
            <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* DOMAIN DISTRIBUTION (With % Labels) */}
                <div className="monday-card p-6 min-h-[360px] flex flex-col">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-6">
                        Domain Distribution
                    </h2>
                    <div className="flex-grow w-full">
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie 
                                    data={getPieData()} 
                                    cx="50%" 
                                    cy="50%" 
                                    labelLine={false} 
                                    label={renderCustomizedLabel} 
                                    outerRadius={90} 
                                    dataKey="value"
                                >
                                    {getPieData().map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[entry.name] || '#94a3b8'} stroke="none"/>
                                    ))}
                                </Pie>
                                <RechartsTooltip contentStyle={{ borderRadius: '6px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', fontSize: '12px' }}/>
                                <Legend 
                                    verticalAlign="bottom" 
                                    height={36} 
                                    iconType="circle" 
                                    wrapperStyle={{ 
                                        fontSize: '11px', 
                                        color: darkMode ? '#ffffff' : '#000000',
                                        transition: 'color 0.3s ease'
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* TASK STATUS (Horizontal) */}
                <div className="monday-card p-6 min-h-[360px] flex flex-col">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-6">
                        Task & Project Completion
                    </h2>
                    <div className="flex-grow">
                        <TaskProjectBarChart data={teamData} />
                    </div>
                </div>
            </div>

            {/* ROW 2: LINE CHART */}
            <div className="monday-card p-6 col-span-1 md:col-span-2 mb-6">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-6">
                    Monthly Patient Attendance (Team)
                </h2>
                <KpiChart data={teamData} staffNames={staffNames} />
            </div>

            {/* ROW 3: STAFF WORKLOAD */}
            <div className="monday-card p-6 col-span-1 md:col-span-2 mb-8">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-6">
                    Individual Clinical Load (OAS Data)
                </h2>
                <StaffLoadChart data={teamData} staffNames={staffNames} />
            </div>

            {/* ROW 4: SWIMLANES */}
            <div className="col-span-1 md:col-span-2">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4 px-1">
                    Department Overview
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { name: 'MANAGEMENT', lead: 'Alif / Nisa' },
                        { name: 'CLINICAL', lead: 'Fadzlynn / Derlinder' },
                        { name: 'EDUCATION', lead: 'Derlinder / Brandon' },
                        { name: 'RESEARCH', lead: 'Alif / Ying Xian' }
                    ].map(col => (
                        <div key={col.name} className="monday-card overflow-hidden flex flex-col h-[600px] border-t-0 bg-slate-50 dark:bg-slate-900/50">
                            <div className="p-3 text-center border-t-4" style={{ backgroundColor: PILLAR_COLORS[col.name], borderColor: HEADER_COLORS[col.name] }}>
                                <span className="font-bold text-xs text-slate-800 uppercase tracking-widest">{col.name}</span>
                                <div className="text-[10px] font-medium opacity-80 mt-1 text-slate-700">Leads: {col.lead}</div>
                            </div>
                            <div className="p-2 flex-grow overflow-y-auto space-y-2">
                                {teamData.flatMap(staff => 
                                    (staff.projects || []).filter(p => p.domain_type === col.name)
                                    .map((p, idx) => (
                                        <div key={`${staff.id}-${idx}`} className="bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700 shadow-sm text-[11px]">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="font-bold text-blue-600 dark:text-blue-400">{staff.staff_name.split(' ')[0]}</span>
                                                {p.item_type === 'Project' && (
                                                    <span className="text-[9px] bg-purple-50 text-purple-600 px-1 rounded border border-purple-100 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-300">PROJ</span>
                                                )}
                                            </div>
                                            <div className="text-slate-700 dark:text-slate-300 leading-snug">{p.title}</div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </ResponsiveLayout>
    );
}

export default App;
