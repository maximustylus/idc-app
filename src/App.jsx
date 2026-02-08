import React, { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore'; // Added updateDoc
import { onAuthStateChanged, signOut } from 'firebase/auth';
import ResponsiveLayout from './components/ResponsiveLayout';
import KpiChart from './components/KpiChart';
import AdminPanel from './components/AdminPanel';
import Login from './components/Login';
import { Settings, LogOut, User } from 'lucide-react';

// --- CONFIGURATION ---
const PILLAR_COLORS = {
    'MANAGEMENT': '#FFF2CC',
    'CLINICAL': '#FCE4D6',
    'EDUCATION': '#FBE5D6',
    'RESEARCH': '#E2EFDA',
    'A.O.B.': '#E2F0D9'
};

const HEADER_COLORS = {
    'MANAGEMENT': '#FFD966',
    'CLINICAL': '#F4B084',
    'EDUCATION': '#FFC000',
    'RESEARCH': '#A9D08E',
    'A.O.B.': '#548235'
};

const STATUS_CONFIG = {
    1: { label: 'Stuck', color: '#E2445C' },
    2: { label: 'Planning', color: '#A25DDC' },
    3: { label: 'Working on it', color: '#FDAB3D' },
    4: { label: 'Review', color: '#0073EA' },
    5: { label: 'Done', color: '#00C875' }
};

const getStatusStyle = (dots) => STATUS_CONFIG[dots] || { label: '-', color: '#c4c4c4' };

function App() {
    const [teamData, setTeamData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [showLogin, setShowLogin] = useState(false);
    const [showAdmin, setShowAdmin] = useState(false);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => setUser(currentUser));
        const unsubscribeData = onSnapshot(collection(db, 'cep_team'), (snapshot) => {
            const data = [];
            snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
            data.sort((a, b) => a.staff_name.localeCompare(b.staff_name));
            setTeamData(data);
            setLoading(false);
        });
        return () => { unsubscribeAuth(); unsubscribeData(); };
    }, []);

    // --- NEW: HANDLE STATUS CLICK ---
    const handleStatusClick = async (staffId, projectIndex, currentStatus) => {
        if (!user) return; // Only allow updates if logged in

        // Cycle status: 1->2->3->4->5->1
        const newStatus = currentStatus >= 5 ? 1 : currentStatus + 1;

        try {
            // We must update the specific item in the array
            const staffMember = teamData.find(s => s.id === staffId);
            if (!staffMember) return;

            const updatedProjects = [...staffMember.projects];
            updatedProjects[projectIndex] = {
                ...updatedProjects[projectIndex],
                status_dots: newStatus
            };

            const staffRef = doc(db, 'cep_team', staffId);
            await updateDoc(staffRef, { projects: updatedProjects });
            // No need to alert; the snapshot listener will auto-update the UI
        } catch (error) {
            console.error("Error updating status:", error);
            alert("Failed to update status. Check console.");
        }
    };

    const handleLogout = async () => { await signOut(auth); setShowAdmin(false); };

    if (loading) return <div className="flex h-screen items-center justify-center bg-[#eceff8]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

    const staffNames = teamData.map(d => d.staff_name);

    return (
        <ResponsiveLayout>
            <div className="col-span-1 md:col-span-2 flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <img src="/logo.png" alt="SSMC" className="h-12 w-auto object-contain" onError={(e) => {e.target.style.display='none'}} />
                    <div className="hidden sm:block">
                        <h1 className="text-xl font-bold text-[#323338]">SSMC@KKH</h1>
                        <p className="text-xs text-gray-500 font-medium">LEADERSHIP DASHBOARD 2026</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    {user ? (
                        <>
                            <button onClick={() => setShowAdmin(!showAdmin)} className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-all shadow-sm border ${showAdmin ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
                                <Settings className="w-4 h-4 mr-2" /> {showAdmin ? 'Close Admin' : 'Admin Panel'}
                            </button>
                            <button onClick={handleLogout} className="flex items-center px-4 py-2 text-sm font-medium text-red-600 bg-white border border-gray-300 rounded-md hover:bg-red-50 shadow-sm">
                                <LogOut className="w-4 h-4 mr-2" /> Logout
                            </button>
                        </>
                    ) : (
                        <button onClick={() => setShowLogin(true)} className="flex items-center px-4 py-2 text-sm font-medium text-[#0073ea] bg-white border border-[#0073ea] rounded-md hover:bg-blue-50 shadow-sm">
                            <User className="w-4 h-4 mr-2" /> Login
                        </button>
                    )}
                </div>
            </div>

            {showLogin && <Login onClose={() => setShowLogin(false)} />}
            {user && showAdmin && <div className="col-span-1 md:col-span-2"><AdminPanel teamData={teamData} /></div>}
            
            {/* MAIN BOARD */}
            <div className="monday-card p-0 mb-8 col-span-1 md:col-span-2 overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                     <h2 className="text-lg font-bold text-[#323338] flex items-center gap-2">
                        <span className="text-xl">📊</span> Main Board <span className="text-xs font-normal text-gray-500 bg-white border px-2 py-0.5 rounded-full">2026 Roadmap</span>
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <div className="min-w-full inline-block align-middle">
                        <div className="border-b border-gray-200 bg-white">
                            <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wide">
                                <div className="col-span-4">Item</div>
                                <div className="col-span-3">Owner</div>
                                <div className="col-span-2">Group</div>
                                <div className="col-span-3 text-center">Status</div>
                            </div>
                        </div>
                        <div className="bg-white divide-y divide-gray-100">
                             {teamData.map((staff) => (
                                staff.projects?.map((project, idx) => {
                                    const status = getStatusStyle(project.status_dots);
                                    return (
                                        <div key={`${staff.id}-${idx}`} className="grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-[#f5f6f8] transition-colors group">
                                            <div className="col-span-4 font-medium text-[#323338] truncate border-l-4 border-transparent pl-2 group-hover:border-[#0073ea] transition-all">
                                                {project.title}
                                            </div>
                                            <div className="col-span-3 flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-[#e5f4ff] text-[#0073ea] flex items-center justify-center font-bold text-[10px] border border-[#cce5ff]">
                                                    {staff.staff_name.charAt(0)}
                                                </div>
                                                <span className="text-sm text-gray-600 truncate">{staff.staff_name}</span>
                                            </div>
                                            <div className="col-span-2">
                                                <span className="px-2 py-1 rounded text-[10px] font-bold text-gray-700 uppercase" style={{ backgroundColor: PILLAR_COLORS[project.domain_type] }}>
                                                    {project.domain_type.substring(0, 4)}
                                                </span>
                                            </div>
                                            <div className="col-span-3">
                                                {/* CLICKABLE STATUS PILL */}
                                                <div 
                                                    onClick={() => handleStatusClick(staff.id, idx, project.status_dots)}
                                                    className={`status-pill shadow-sm select-none ${user ? 'cursor-pointer hover:scale-105' : 'cursor-default opacity-80'}`} 
                                                    style={{ backgroundColor: status.color }}
                                                    title={user ? "Click to change status" : "Login to edit"}
                                                >
                                                    {status.label}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="monday-card p-6 col-span-1 md:col-span-2">
                <h2 className="text-lg font-bold mb-6 text-[#323338] flex items-center gap-2">
                    <span className="text-xl">📈</span> Monthly Patient Attendance
                </h2>
                <KpiChart data={teamData} staffNames={staffNames} />
            </div>

            <div className="col-span-1 md:col-span-2 mt-4">
                <h2 className="text-lg font-bold mb-4 text-[#323338] px-1 flex items-center gap-2">
                    <span className="text-xl">📋</span> Domain Overview
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { name: 'MANAGEMENT', lead: 'Alif / Nisa' },
                        { name: 'CLINICAL', lead: 'Fadzlynn / Derlinder' },
                        { name: 'EDUCATION', lead: 'Derlinder / Brandon' },
                        { name: 'RESEARCH', lead: 'Alif / Ying Xian' }
                    ].map(col => (
                        <div key={col.name} className="monday-card overflow-hidden flex flex-col h-[500px] border-t-0">
                            <div className="p-3 text-center font-bold text-sm border-t-4" style={{ backgroundColor: PILLAR_COLORS[col.name], borderColor: HEADER_COLORS[col.name] }}>
                                {col.name}
                                <div className="text-[10px] font-normal opacity-70 mt-0.5 text-gray-700">Leads: {col.lead}</div>
                            </div>
                            <div className="p-2 flex-grow overflow-y-auto space-y-2 bg-[#fdfdfd]">
                                {teamData.flatMap(staff => 
                                    (staff.projects || []).filter(p => p.domain_type === col.name)
                                    .map((p, idx) => (
                                        <div key={`${staff.id}-${idx}`} className="bg-white p-2 rounded shadow-sm text-[11px] border border-gray-100 hover:border-blue-300 transition-colors">
                                            <div className="flex justify-between items-start">
                                                <span className="font-bold text-[#0073ea] mr-1">{staff.staff_name.split(' ')[0]}:</span>
                                            </div>
                                            <div className="text-gray-700 leading-tight mt-0.5">{p.title}</div>
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
