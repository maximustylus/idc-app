import React, { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { collection, onSnapshot, getDocs } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import ResponsiveLayout from './components/ResponsiveLayout';
import InteractiveProgressPips from './components/InteractiveProgressPips';
import KpiChart from './components/KpiChart';
import AdminPanel from './components/AdminPanel';
import Login from './components/Login';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { PILLAR_COLORS } from './utils';
import { Settings, LogOut, User } from 'lucide-react';

function App() {
    const [teamData, setTeamData] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Auth State
    const [user, setUser] = useState(null);
    const [showLogin, setShowLogin] = useState(false);
    const [showAdmin, setShowAdmin] = useState(false);

    useEffect(() => {
        // Auth Listener
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (!currentUser) setShowAdmin(false);
        });

        // Data Listener
        const unsubscribeData = onSnapshot(collection(db, 'cep_team'), (snapshot) => {
            const data = [];
            snapshot.forEach((doc) => {
                data.push({ id: doc.id, ...doc.data() });
            });
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
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const staffNames = teamData.map(d => d.staff_name);

    return (
        <ResponsiveLayout>
            {/* Top Bar Navigation Actions */}
            <div className="col-span-1 md:col-span-2 flex justify-end mb-4 gap-3">
                {user ? (
                    <>
                        <button 
                            onClick={() => setShowAdmin(!showAdmin)}
                            className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors shadow-sm ${
                                showAdmin 
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 ring-2 ring-blue-500' 
                                    : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600'
                            }`}
                        >
                            <Settings className="w-4 h-4 mr-2" />
                            {showAdmin ? 'Close Admin' : 'Admin Panel'}
                        </button>
                        <button 
                            onClick={handleLogout}
                            className="flex items-center px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 dark:bg-gray-800 dark:text-red-400 dark:border-red-900/30 dark:hover:bg-red-900/10 transition-colors shadow-sm"
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            Logout
                        </button>
                    </>
                ) : (
                    <button 
                        onClick={() => setShowLogin(true)}
                        className="flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 dark:bg-gray-800 dark:text-blue-400 dark:border-blue-900/30 dark:hover:bg-blue-900/10 transition-colors shadow-sm"
                    >
                        <User className="w-4 h-4 mr-2" />
                        Admin Login
                    </button>
                )}
            </div>

            {/* Login Modal */}
            {showLogin && <Login onClose={() => setShowLogin(false)} />}

            {/* Admin Panel */}
            {user && showAdmin && (
                <div className="col-span-1 md:col-span-2 animate-in fade-in slide-in-from-top-4 duration-300">
                    <AdminPanel teamData={teamData} />
                </div>
            )}
            
            {/* Section 1: Team Project Progress */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 col-span-1 md:col-span-2">
                <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-white flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-indigo-500 rounded-full"></span>
                    1. Team Project Progress
                </h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50/50 dark:bg-gray-700/50 dark:text-gray-400">
                            <tr>
                                <th scope="col" className="px-6 py-3 rounded-tl-lg">Staff</th>
                                <th scope="col" className="px-6 py-3">Project</th>
                                <th scope="col" className="px-6 py-3">Domain</th>
                                <th scope="col" className="px-6 py-3 rounded-tr-lg">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {teamData.map((staff) => (
                                staff.projects?.map((project, idx) => (
                                    <tr key={`${staff.id}-${idx}`} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors last:border-0">
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                                            {idx === 0 ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold text-xs">
                                                        {staff.staff_name.charAt(0)}
                                                    </div>
                                                    {staff.staff_name}
                                                </div>
                                            ) : ''}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-800 dark:text-gray-200">
                                            {project.title}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span 
                                                className="px-2.5 py-1 rounded-full text-xs font-semibold text-white shadow-sm"
                                                style={{ backgroundColor: PILLAR_COLORS[project.domain_type] || '#9ca3af' }}
                                            >
                                                {project.domain_type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <InteractiveProgressPips 
                                                staffId={staff.id} 
                                                projectIndex={idx} 
                                                currentDots={project.status_dots} 
                                                readOnly={!user} // Only editable if logged in
                                            />
                                        </td>
                                    </tr>
                                ))
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Section 2/3: Clinical Load KPI */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 col-span-1 md:col-span-2">
                <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-white flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-green-500 rounded-full"></span>
                    Clinical Load (KPI: 30)
                </h2>
                <KpiChart data={teamData} staffNames={staffNames} />
            </div>

            {/* Section 4: Individual Domain Distribution */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 col-span-1 md:col-span-2">
                 <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-white flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-purple-500 rounded-full"></span>
                    Individual Task Distribution
                 </h2>
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                     {teamData.map(staff => {
                         const domains = staff.domains || {};
                         const pieData = Object.keys(domains).map(key => ({
                             name: key.toUpperCase(),
                             value: domains[key]
                         }));
                         
                         return (
                             <div key={staff.id} className="flex flex-col items-center p-4 bg-gray-50/50 dark:bg-gray-700/30 rounded-xl">
                                 <h3 className="mb-4 font-semibold text-gray-700 dark:text-gray-200">{staff.staff_name}</h3>
                                 <div className="w-48 h-48 drop-shadow-lg">
                                     <ResponsiveContainer width="100%" height="100%">
                                         <PieChart>
                                             <Pie 
                                                 data={pieData} 
                                                 dataKey="value" 
                                                 nameKey="name" 
                                                 cx="50%" 
                                                 cy="50%" 
                                                 outerRadius={65}
                                                 innerRadius={30}
                                                 paddingAngle={2}
                                                 fill="#8884d8"
                                                 stroke="none"
                                             >
                                                 {pieData.map((entry, index) => (
                                                     <Cell key={`cell-${index}`} fill={PILLAR_COLORS[entry.name] || '#888'} />
                                                 ))}
                                             </Pie>
                                             <RechartsTooltip 
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
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