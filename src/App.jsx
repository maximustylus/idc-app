import React, { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import ResponsiveLayout from './components/ResponsiveLayout';
import InteractiveProgressPips from './components/InteractiveProgressPips';
import KpiChart from './components/KpiChart';
import AdminPanel from './components/AdminPanel';
import Login from './components/Login';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { Settings, LogOut, User, Lock } from 'lucide-react';

// --- 1. CONFIGURATION ---
const PILLAR_COLORS = {
    'MANAGEMENT': '#3B82F6', // Blue
    'CLINICAL': '#F97316',   // Orange
    'RESEARCH': '#8B5CF6',   // Purple
    'EDUCATION': '#10B981',  // Green
    'A.O.B.': '#6B7280'      // Grey
};

function App() {
    const [teamData, setTeamData] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Auth State
    const [user, setUser] = useState(null);
    const [showLogin, setShowLogin] = useState(false);
    const [showAdmin, setShowAdmin] = useState(false);

    useEffect(() => {
        // --- 2. REAL-TIME LISTENERS ---
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (!currentUser) setShowAdmin(false);
        });

        const unsubscribeData = onSnapshot(collection(db, 'cep_team'), (snapshot) => {
            const data = [];
            snapshot.forEach((doc) => {
                data.push({ id: doc.id, ...doc.data() });
            });
            // Sort staff alphabetically for consistency
            data.sort((a, b) => a.staff_name.localeCompare(b.staff_name));
            setTeamData(data);
            setLoading(false);
        });

        return () => {
            unsubscribeAuth();
            unsubscribeData();
        };
    }, []);

    const handleLogout = async () => {
        await signOut(auth);
        setShowAdmin(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    // Prepare data for the Monthly Attendance Chart
    const staffNames = teamData.map(d => d.staff_name);

    return (
        <ResponsiveLayout>
            {/* --- 3. TOP NAVIGATION --- */}
            <div className="col-span-1 md:col-span-2 flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    {/* Logo Loader with Fallback */}
                    <img 
                        src="/logo.png" 
                        alt="SSMC Logo" 
                        className="h-10 w-auto object-contain" 
                        onError={(e) => {e.target.onerror = null; e.target.style.display='none'}}
                    />
                    <h1 className="text-xl font-bold text-white tracking-wide hidden sm:block">
                        LEADERSHIP DASHBOARD <span className="text-blue-400 text-sm font-normal">| 2026</span>
                    </h1>
                </div>

                <div className="flex gap-3">
                    {user ? (
                        <>
                            <button 
                                onClick={() => setShowAdmin(!showAdmin)}
                                className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all shadow-lg backdrop-blur-md border ${
                                    showAdmin 
                                        ? 'bg-blue-600/20 text-blue-300 border-blue-500/50' 
                                        : 'bg-gray-800/40 text-gray-300 border-gray-700 hover:bg-gray-700/50'
                                }`}
                            >
                                <Settings className="w-4 h-4 mr-2" />
                                {showAdmin ? 'Close Admin' : 'Admin Panel'}
                            </button>
                            <button 
                                onClick={handleLogout}
                                className="flex items-center px-4 py-2 text-sm font-medium text-red-400 bg-gray-800/40 border border-red-900/30 rounded-lg hover:bg-red-900/20 transition-all shadow-lg backdrop-blur-md"
                            >
                                <LogOut className="w-4 h-4 mr-2" />
                                Logout
                            </button>
                        </>
                    ) : (
                        <button 
                            onClick={() => setShowLogin(true)}
                            className="flex items-center px-4 py-2 text-sm font-medium text-blue-400 bg-gray-800/40 border border-blue-900/30 rounded-lg hover:bg-blue-900/20 transition-all shadow-lg backdrop-blur-md"
                        >
                            <User className="w-4 h-4 mr-2" />
                            Admin Login
                        </button>
                    )}
                </div>
            </div>

            {/* Login Modal */}
            {showLogin && <Login onClose={() => setShowLogin(false)} />}

            {/* Admin Panel (Conditional Render) */}
            {user && showAdmin && (
                <div className="col-span-1 md:col-span-2 animate-in fade-in slide-in-from-top-4 duration-500">
                    <AdminPanel teamData={teamData} />
                </div>
            )}
            
            {/* --- 4. SECTION: TEAM PROJECT PROGRESS --- */}
            <div className="bg-gray-800/50 backdrop-blur-xl p-6 rounded-2xl shadow-2xl border border-gray-700 col-span-1 md:col-span-2">
                <h2 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"></span>
                    Team Project Progress
                </h2>
                
                {teamData.length === 0 ? (
                    <div className="text-center py-10 text-gray-500">
                        <Lock className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No active projects found. Initialize database in Admin Panel.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm text-left text-gray-400">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-900/50">
                                <tr>
                                    <th className="px-6 py-3 rounded-tl-lg">Staff</th>
                                    <th className="px-6 py-3">Project</th>
                                    <th className="px-6 py-3">Domain</th>
                                    <th className="px-6 py-3 rounded-tr-lg">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {teamData.map((staff) => (
                                    staff.projects?.map((project, idx) => (
                                        <tr key={`${staff.id}-${idx}`} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors last:border-0">
                                            <td className="px-6 py-4 font-medium text-white whitespace-nowrap">
                                                {idx === 0 ? (
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-lg">
                                                            {staff.staff_name.charAt(0)}
                                                        </div>
                                                        {staff.staff_name}
                                                    </div>
                                                ) : ''}
                                            </td>
                                            <td className="px-6 py-4 text-gray-300 font-medium">
                                                {project.title}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span 
                                                    className="px-3 py-1 rounded-full text-[10px] font-bold tracking-wider text-white shadow-sm uppercase border border-white/10"
                                                    style={{ backgroundColor: PILLAR_COLORS[project.domain_type] || '#4B5563' }}
                                                >
                                                    {project.domain_type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <InteractiveProgressPips 
                                                    staffId={staff.id} 
                                                    projectIndex={idx} 
                                                    currentDots={project.status_dots} 
                                                    readOnly={!user} 
                                                />
                                            </td>
                                        </tr>
                                    ))
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* --- 5. SECTION: MONTHLY PATIENT ATTENDANCE (Target: 30) --- */}
            <div className="bg-gray-800/50 backdrop-blur-xl p-6 rounded-2xl shadow-2xl border border-gray-700 col-span-1 md:col-span-2">
                <h2 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.5)]"></span>
                    Monthly Patient Attendance
                </h2>
                <KpiChart data={teamData} staffNames={staffNames} />
            </div>

            {/* --- 6. SECTION: INDIVIDUAL DOMAIN DISTRIBUTION --- */}
            <div className="bg-gray-800/50 backdrop-blur-xl p-6 rounded-2xl shadow-2xl border border-gray-700 col-span-1 md:col-span-2">
                 <h2 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-purple-500 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.5)]"></span>
                    Individual Task Distribution
                 </h2>
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                     {teamData.map(staff => {
                         const domains = staff.domains || {};
                         const pieData = Object.keys(domains).map(key => ({
                             name: key.toUpperCase(),
                             value: domains[key]
                         }));
                         
                         return (
                             <div key={staff.id} className="flex flex-col items-center p-5 bg-gray-900/40 rounded-xl border border-gray-700/50 hover:border-gray-600 transition-all">
                                 <h3 className="mb-4 font-semibold text-gray-200">{staff.staff_name}</h3>
                                 <div className="w-40 h-40 drop-shadow-2xl">
                                     <ResponsiveContainer width="100%" height="100%">
                                         <PieChart>
                                             <Pie 
                                                 data={pieData} 
                                                 dataKey="value" 
                                                 nameKey="name" 
                                                 cx="50%" 
                                                 cy="50%" 
                                                 outerRadius={60}
                                                 innerRadius={35}
                                                 paddingAngle={4}
                                                 stroke="none"
                                             >
                                                 {pieData.map((entry, index) => (
                                                     <Cell key={`cell-${index}`} fill={PILLAR_COLORS[entry.name] || '#6B7280'} />
                                                 ))}
                                             </Pie>
                                             <RechartsTooltip 
                                                contentStyle={{ backgroundColor: '#1F2937', borderRadius: '8px', border: '1px solid #374151', color: '#fff' }}
                                             />
                                         </PieChart>
                                     </ResponsiveContainer>
                                 </div>
                             </div>
                         );
                     })}
                 </div>
            </div>

        </ResponsiveLayout>
    );
}

export default App;
