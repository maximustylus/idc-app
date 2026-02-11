import React, { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend 
} from 'recharts';
import { Sun, Moon, LogOut } from 'lucide-react';

// Components
import AdminPanel from './components/AdminPanel';
import Login from './components/Login';
import ResponsiveLayout from './components/ResponsiveLayout';

// Utils
import { STAFF_LIST, MONTHS, DOMAIN_LIST, STATUS_OPTIONS } from './utils';

// --- COLORS ---
const COLORS = ['#FFC107', '#FF9800', '#FF5722', '#4CAF50', '#2196F3']; // Management, Clinical, Edu, Research, Other
const STATUS_COLORS = {
  1: '#EF4444', // Stuck (Red)
  2: '#A855F7', // Planning (Purple)
  3: '#F59E0B', // Working (Orange)
  4: '#3B82F6', // Review (Blue)
  5: '#10B981'  // Done (Green)
};

// Placeholder Data for Patient Attendance
const ATTENDANCE_DATA = [
  { name: 'Jan', value: 300 }, { name: 'Feb', value: 10 }, { name: 'Mar', value: 5 }, 
  { name: 'Apr', value: 8 }, { name: 'May', value: 12 }, { name: 'Jun', value: 15 }, 
  { name: 'Jul', value: 20 }, { name: 'Aug', value: 18 }, { name: 'Sep', value: 25 }, 
  { name: 'Oct', value: 30 }, { name: 'Nov', value: 35 }, { name: 'Dec', value: 40 }
];

function App() {
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [user, setUser] = useState(null);
  
  // Data States
  const [teamData, setTeamData] = useState([]); 
  const [staffLoads, setStaffLoads] = useState({});

  // 0. Auth Listener
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => setUser(u));
    return () => unsubscribe();
  }, []);

  // 1. Fetch Swimlane Data
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'cep_team'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const sortedData = STAFF_LIST.map(name => {
        return data.find(d => d.staff_name === name) || { staff_name: name, projects: [] };
      });
      setTeamData(sortedData);
    });
    return () => unsubscribe();
  }, []);

  // 2. Fetch Clinical Load Data
  useEffect(() => {
    const unsubscribes = STAFF_LIST.map(staff => {
      return onSnapshot(doc(db, 'staff_loads', staff), (docSnap) => {
        if (docSnap.exists()) {
          setStaffLoads(prev => ({ ...prev, [staff]: docSnap.data().data }));
        } else {
          setStaffLoads(prev => ({ ...prev, [staff]: Array(12).fill(0) }));
        }
      });
    });
    return () => unsubscribes.forEach(u => u());
  }, []);

  // --- HELPERS FOR CHARTS ---

  // A. Pie Chart Data
  const getPieData = () => {
    const counts = { MANAGEMENT: 0, CLINICAL: 0, EDUCATION: 0, RESEARCH: 0 };
    teamData.forEach(staff => {
      (staff.projects || []).forEach(p => {
        if (counts[p.domain_type] !== undefined) counts[p.domain_type]++;
      });
    });
    return Object.keys(counts).map((key, index) => ({
      name: key, value: counts[key], fill: COLORS[index]
    })).filter(d => d.value > 0);
  };

  // B. Status Bar Data
  const getStatusData = () => {
    const tasks = { name: 'Tasks', 1:0, 2:0, 3:0, 4:0, 5:0 };
    const projects = { name: 'Projects', 1:0, 2:0, 3:0, 4:0, 5:0 };

    teamData.forEach(staff => {
      (staff.projects || []).forEach(p => {
        const status = p.status_dots || 2;
        if (p.item_type === 'Project') projects[status]++;
        else tasks[status]++;
      });
    });
    return [tasks, projects];
  };

  // C. Clinical Load Data
  const getClinicalData = (staffName) => {
    const data = staffLoads[staffName] || Array(12).fill(0);
    return MONTHS.map((m, i) => ({ name: m, value: data[i] || 0 }));
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  const handleLogout = async () => {
    await signOut(auth);
    setIsAdminOpen(false);
  };

  // Custom Label for Pie Chart Percentages
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
  
    return (
      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-xs font-bold">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <ResponsiveLayout>
      {/* --- HEADER --- */}
      <div className="md:col-span-2 flex justify-between items-center mb-6 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-4">
          <img src="/logo.png" alt="SSMC Logo" className="h-12 w-auto object-contain" />
          
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight leading-none">SSMC@KKH</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Leadership Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-slate-300">
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          
          {user ? (
            <div className="flex gap-2">
              <button onClick={() => setIsAdminOpen(!isAdminOpen)} className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-500/30">
                {isAdminOpen ? 'Close Admin' : 'Admin Panel'}
              </button>
              <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                <LogOut size={20} />
              </button>
            </div>
          ) : (
            <button onClick={() => setIsLoginOpen(true)} className="px-4 py-2 bg-slate-800 text-white text-sm font-bold rounded-lg hover:bg-slate-700 transition-colors">
              Admin Login
            </button>
          )}
        </div>
      </div>

      {isLoginOpen && <Login onClose={() => setIsLoginOpen(false)} />}
      
      {isAdminOpen && (
        <div className="md:col-span-2">
          <AdminPanel teamData={teamData} />
        </div>
      )}

      {/* --- ROW 1: DOMAIN & STATUS --- */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Domain Distribution</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={getPieData()}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={80}
                dataKey="value"
              >
                {getPieData().map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Task & Project Completion</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={getStatusData()} layout="vertical">
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 12}} />
              <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
              <Legend />
              <Bar dataKey="1" stackId="a" fill={STATUS_COLORS[1]} name="Stuck" radius={[4, 0, 0, 4]} barSize={30} />
              <Bar dataKey="2" stackId="a" fill={STATUS_COLORS[2]} name="Planning" barSize={30} />
              <Bar dataKey="3" stackId="a" fill={STATUS_COLORS[3]} name="Working" barSize={30} />
              <Bar dataKey="4" stackId="a" fill={STATUS_COLORS[4]} name="Review" barSize={30} />
              <Bar dataKey="5" stackId="a" fill={STATUS_COLORS[5]} name="Done" radius={[0, 4, 4, 0]} barSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* --- ROW 2: ATTENDANCE LINE CHART --- */}
      <div className="md:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 mt-6">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6">Monthly Patient Attendance (Team)</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={ATTENDANCE_DATA}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
              <Line type="monotone" dataKey={() => 180} stroke="#ef4444" strokeDasharray="5 5" strokeWidth={1} dot={false} name="Target" />
              <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={{r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* --- ROW 3: INDIVIDUAL CLINICAL LOAD (FILTERED) --- */}
      <div className="md:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 mt-6">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6">Individual Clinical Load</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* NISA REMOVED HERE */}
          {STAFF_LIST.filter(n => n !== 'Nisa').map((staff) => (
            <div key={staff} className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-700 dark:text-slate-200">{staff}</h3>
                <span className="text-xs font-bold px-2 py-1 bg-blue-100 text-blue-700 rounded">
                  Total: {(staffLoads[staff] || []).reduce((a, b) => a + b, 0)}
                </span>
              </div>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getClinicalData(staff)}>
                    <Tooltip 
                      cursor={{fill: 'transparent'}}
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {getClinicalData(staff).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.value > 40 ? '#ef4444' : '#3b82f6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-between mt-2 px-1">
                {['Jan', 'Apr', 'Jul', 'Oct'].map(m => (
                  <span key={m} className="text-[10px] text-slate-400 font-bold">{m}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- ROW 4: DEPARTMENT OVERVIEW --- */}
      <div className="md:col-span-2 mt-8">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6">Department Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {DOMAIN_LIST.map((domain) => (
            <div key={domain} className="flex flex-col gap-3">
              <div className={`p-3 rounded-lg text-center border-b-4 shadow-sm ${
                domain === 'MANAGEMENT' ? 'bg-amber-50 border-amber-300' :
                domain === 'CLINICAL' ? 'bg-orange-50 border-orange-300' :
                domain === 'EDUCATION' ? 'bg-blue-50 border-blue-300' :
                'bg-emerald-50 border-emerald-300'
              }`}>
                <h3 className="font-black text-slate-800 text-sm tracking-wide">{domain}</h3>
              </div>
              <div className="flex flex-col gap-2">
                {teamData.map(staff => (
                  (staff.projects || [])
                    .filter(p => p.domain_type === domain)
                    .map((p, idx) => (
                      <div key={`${staff.staff_name}-${idx}`} className="bg-white dark:bg-slate-800 p-3 rounded border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow group relative">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">{staff.staff_name}</span>
                          {p.item_type === 'Project' && <span className="text-[10px] font-bold text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded">PROJ</span>}
                        </div>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-tight mb-2">{p.title}</p>
                        <div className="flex gap-1 justify-end">
                          {[1,2,3,4,5].map(val => (
                            <div 
                              key={val} 
                              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                                p.status_dots >= val 
                                  ? (p.status_dots === 5 ? 'bg-emerald-500' : p.status_dots === 1 ? 'bg-red-500' : 'bg-blue-500') 
                                  : 'bg-slate-100 dark:bg-slate-700'
                              }`} 
                            />
                          ))}
                        </div>
                      </div>
                    ))
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </ResponsiveLayout>
  );
}

export default App;
