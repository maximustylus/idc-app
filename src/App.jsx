import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// Components
import AdminPanel from './components/AdminPanel';
import Login from './components/Login';
import ResponsiveLayout from './components/ResponsiveLayout';

// Utils
import { STAFF_LIST, MONTHS, DOMAIN_LIST } from './utils';

// --- MAIN APP COMPONENT ---
function App() {
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [teamData, setTeamData] = useState([]); // For Swimlanes (Tasks)
  const [staffLoads, setStaffLoads] = useState({}); // For Clinical Loads (Charts)

  // 1. Fetch Swimlane Data (Tasks/Projects)
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'cep_team'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort manually to match STAFF_LIST order
      const sortedData = STAFF_LIST.map(name => {
        return data.find(d => d.staff_name === name) || { staff_name: name, projects: [] };
      });
      setTeamData(sortedData);
    });
    return () => unsubscribe();
  }, []);

  // 2. Fetch Clinical Load Data (The "New Channel")
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

  // Helper: Format data for Recharts
  const getChartData = (staffName) => {
    const data = staffLoads[staffName] || Array(12).fill(0);
    return MONTHS.map((m, i) => ({ name: m, value: data[i] || 0 }));
  };

  return (
    <ResponsiveLayout>
      {/* --- HEADER --- */}
      <div className="md:col-span-2 flex justify-between items-center mb-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">SSMC@KKH</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Leadership Dashboard</p>
        </div>
        <div>
          {!isAdminOpen ? (
            <button 
              onClick={() => setIsLoginOpen(true)}
              className="px-4 py-2 bg-slate-800 text-white text-sm font-bold rounded hover:bg-slate-700 transition-colors"
            >
              ADMIN PANEL
            </button>
          ) : (
            <button 
              onClick={() => setIsAdminOpen(false)}
              className="px-4 py-2 bg-slate-200 text-slate-700 text-sm font-bold rounded hover:bg-slate-300 transition-colors"
            >
              CLOSE PANEL
            </button>
          )}
        </div>
      </div>

      {/* --- MODALS --- */}
      {isLoginOpen && <Login onClose={() => { setIsLoginOpen(false); setIsAdminOpen(true); }} />}

      {/* --- ADMIN PANEL --- */}
      {isAdminOpen && (
        <div className="md:col-span-2">
          <AdminPanel teamData={teamData} />
        </div>
      )}

      {/* --- INDIVIDUAL CLINICAL LOAD (UPDATED) --- */}
      <div className="md:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6">Individual Clinical Load</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {STAFF_LIST.map((staff) => (
            <div key={staff} className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-700 dark:text-slate-200">{staff}</h3>
                <span className="text-xs font-bold px-2 py-1 bg-blue-100 text-blue-700 rounded">
                  {/* Calculate Total for the year */}
                  Total: {(staffLoads[staff] || []).reduce((a, b) => a + b, 0)}
                </span>
              </div>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getChartData(staff)}>
                    <Tooltip 
                      cursor={{fill: 'transparent'}}
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    />
                    <XAxis dataKey="name" hide />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {getChartData(staff).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.value > 40 ? '#ef4444' : '#3b82f6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {/* Mini Month Labels */}
              <div className="flex justify-between mt-2 px-1">
                {['Jan', 'Apr', 'Jul', 'Oct'].map(m => (
                  <span key={m} className="text-[10px] text-slate-400 font-bold">{m}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- SWIMLANES (DEPARTMENT OVERVIEW) --- */}
      <div className="md:col-span-2 mt-8">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6">Department Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {DOMAIN_LIST.map((domain) => (
            <div key={domain} className="flex flex-col gap-3">
              {/* Header */}
              <div className={`p-3 rounded-lg text-center border-b-4 shadow-sm ${
                domain === 'MANAGEMENT' ? 'bg-amber-50 border-amber-300' :
                domain === 'CLINICAL' ? 'bg-orange-50 border-orange-300' :
                domain === 'EDUCATION' ? 'bg-blue-50 border-blue-300' :
                'bg-emerald-50 border-emerald-300'
              }`}>
                <h3 className="font-black text-slate-800 text-sm tracking-wide">{domain}</h3>
              </div>

              {/* Cards */}
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
                        
                        {/* Status Dots */}
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
