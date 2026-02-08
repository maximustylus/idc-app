import React, { useState } from 'react';
import { db } from '../firebase';
import { updateDoc, doc, arrayUnion, writeBatch, getDoc } from 'firebase/firestore';
import { MONTHS } from '../utils';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

const AdminPanel = ({ teamData }) => {
    // Standardize to the 5 core members from your Summary + Nisa if she is new
    const STAFF_LIST = ['Alif', 'Brandon', 'Fadzlynn', 'Derlinder', 'Ying Xian', 'Nisa'];
    const DOMAIN_LIST = ['MANAGEMENT', 'CLINICAL', 'RESEARCH', 'EDUCATION'];

    const [selectedStaff, setSelectedStaff] = useState('');
    const [selectedDomain, setSelectedDomain] = useState('MANAGEMENT');
    const [projectTask, setProjectTask] = useState('');
    const [statusDots, setStatusDots] = useState(1);
    
    // For Month Update
    const [selectedMonth, setSelectedMonth] = useState('Jan');
    const [clinicalLoadCount, setClinicalLoadCount] = useState(0);

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    // --- 1. THE SMART SEEDER (Merged from your seed_data.js) ---
    const handleInitializeDatabase = async () => {
        setLoading(true);
        setMessage('Starting 2026 initialization...');
        try {
            const batch = writeBatch(db);
            
            // Rich task data mapped to domains
            const managementTasks = ["Appraisal", "Budgeting", "Joy @ Work", "Rostering"];
            const clinicalTasks = ["CPET | VMAX", "GDM GPAC", "IGNITE PO", "POWERS"];
            const researchTasks = ["C.A.R.E.", "e-IMPACT", "SuperDads"];
            const educationTasks = ["Project ARIF", "Student Internship", "EIMS Teaching"];

            for (const name of STAFF_LIST) {
                // Create consistent ID: 'Alif' -> 'alif'
                const id = name.toLowerCase().replace(' ', '_'); 
                const docRef = doc(db, 'cep_team', id);
                
                // Check if exists to avoid overwriting existing progress
                const docSnap = await getDoc(docRef);
                
                if (!docSnap.exists()) {
                    // Assign random starter projects for immediate dashboard visualization
                    const starterProjects = [];
                    // Give everyone 1 management, 1 clinical, 1 research
                    starterProjects.push({ title: managementTasks[Math.floor(Math.random()*managementTasks.length)], domain_type: 'MANAGEMENT', status_dots: 2 });
                    starterProjects.push({ title: clinicalTasks[Math.floor(Math.random()*clinicalTasks.length)], domain_type: 'CLINICAL', status_dots: 1 });
                    
                    // Specific assignments based on your logic
                    if(name === 'Alif' || name === 'Ying Xian') {
                         starterProjects.push({ title: "Project ARIF Manuscript", domain_type: 'RESEARCH', status_dots: 3 });
                    }

                    batch.set(docRef, {
                        staff_name: name,
                        projects: starterProjects,
                        clinical_load: [], 
                        domains: { management: 25, clinical: 25, research: 25, education: 25 } 
                    });
                }
            }

            await batch.commit();
            setMessage('✅ Success! Database seeded. Refresh the page to see the staff.');
        } catch (error) {
            setMessage('❌ Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // --- 2. ADD PROJECT FIX ---
    const handleAddProject = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        
        try {
            if (!selectedStaff) throw new Error("Select a staff member");
            if (!projectTask) throw new Error("Enter a project task");

            // Robust ID generation matching the seeder
            const staffId = selectedStaff.toLowerCase().replace(' ', '_');
            const staffRef = doc(db, 'cep_team', staffId);
            
            // Direct update (don't rely on teamData prop for the ID)
            await updateDoc(staffRef, {
                projects: arrayUnion({
                    title: projectTask,
                    domain_type: selectedDomain,
                    status_dots: parseInt(statusDots)
                })
            });

            setMessage(`✅ Added "${projectTask}" for ${selectedStaff}`);
            setProjectTask('');
        } catch (error) {
            setMessage('❌ Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // --- 3. CLINICAL LOAD FIX ---
    const handleUpdateClinicalLoad = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            // Safety check
            if (!teamData || teamData.length === 0) {
                 throw new Error("No staff found. Click 'Initialize Database' first.");
            }

            const numStaff = teamData.length;
            const countPerStaff = Math.floor(parseInt(clinicalLoadCount) / numStaff);
            const remainder = parseInt(clinicalLoadCount) % numStaff;

            const batch = writeBatch(db);

            teamData.forEach((staff, index) => {
                const staffRef = doc(db, 'cep_team', staff.id);
                let currentLoad = [...(staff.clinical_load || [])];
                
                // Remove existing entry for this month if it exists
                currentLoad = currentLoad.filter(m => m.month !== selectedMonth);
                
                // Add new entry
                const newCount = countPerStaff + (index === 0 ? remainder : 0);
                currentLoad.push({ month: selectedMonth, count: newCount });

                // Sort months correctly
                const monthOrder = { "Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4, "May": 5, "Jun": 6, "Jul": 7, "Aug": 8, "Sep": 9, "Oct": 10, "Nov": 11, "Dec": 12 };
                currentLoad.sort((a, b) => monthOrder[a.month] - monthOrder[b.month]);

                batch.update(staffRef, { clinical_load: currentLoad });
            });

            await batch.commit();
            setMessage(`✅ Updated ${selectedMonth} attendance to ${clinicalLoadCount} (Target: 30)`);

        } catch (error) {
            setMessage('❌ Error updating load: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Logic: If teamData is empty, we MUST show the initialize button
    const needsInitialization = !teamData || teamData.length === 0;

    return (
        <div className="bg-white/80 dark:bg-gray-800/90 backdrop-blur-md p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 mt-6 mb-8">
            <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-white flex items-center gap-2">
                <span className="w-2 h-8 bg-blue-500 rounded-full"></span>
                Admin Data Entry
            </h2>
            
            {message && (
                <div className={`p-4 mb-6 rounded-xl text-sm font-medium flex items-center gap-2 ${message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {message.includes('Error') ? <AlertCircle size={18}/> : <CheckCircle2 size={18}/>}
                    {message}
                </div>
            )}

            {/* --- INITIALIZATION BUTTON --- */}
            <div className={`mb-8 p-6 rounded-lg border text-center transition-all ${needsInitialization ? 'bg-yellow-50 border-yellow-200 shadow-md scale-100' : 'bg-gray-50 border-gray-200 opacity-70 scale-95'}`}>
                {needsInitialization ? (
                    <p className="text-yellow-800 font-bold mb-3">⚠️ Database is empty. Click below to load 2026 Staff Data.</p>
                ) : (
                    <p className="text-gray-500 mb-3 text-sm">Database is connected. Use this only if you need to reset missing staff.</p>
                )}
                <button
                    onClick={handleInitializeDatabase}
                    disabled={loading}
                    className="px-6 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-semibold shadow-sm transition-all flex items-center justify-center mx-auto gap-2"
                >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : 'Initialize / Reset Database'}
                </button>
            </div>

            {/* --- DATA ENTRY FORMS --- */}
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 ${needsInitialization ? 'opacity-40 pointer-events-none blur-[1px]' : ''}`}>
                
                {/* 1. Add Project */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 border-b pb-2">Add New Project</h3>
                    <form onSubmit={handleAddProject} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Staff Member</label>
                            <select 
                                className="w-full px-4 py-2 rounded-lg border bg-white dark:bg-gray-700 dark:text-white"
                                value={selectedStaff}
                                onChange={(e) => setSelectedStaff(e.target.value)}
                                required
                            >
                                <option value="">Select Staff...</option>
                                {STAFF_LIST.map(name => (
                                    <option key={name} value={name}>{name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Domain</label>
                            <select 
                                className="w-full px-4 py-2 rounded-lg border bg-white dark:bg-gray-700 dark:text-white"
                                value={selectedDomain}
                                onChange={(e) => setSelectedDomain(e.target.value)}
                            >
                                {DOMAIN_LIST.map(domain => (
                                    <option key={domain} value={domain}>{domain}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Task Name</label>
                            <input 
                                type="text" 
                                className="w-full px-4 py-2 rounded-lg border bg-white dark:bg-gray-700 dark:text-white"
                                value={projectTask}
                                onChange={(e) => setProjectTask(e.target.value)}
                                placeholder="e.g., C.A.R.E. Pilot"
                                required
                            />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Status (1-5)</label>
                            <input 
                                type="range" min="1" max="5"
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                value={statusDots}
                                onChange={(e) => setStatusDots(e.target.value)}
                            />
                            <div className="text-right text-blue-600 font-bold">{statusDots} Dots</div>
                        </div>
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-md flex justify-center"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : 'Add Project'}
                        </button>
                    </form>
                </div>

                {/* 2. Monthly Attendance */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 border-b pb-2">Update Attendance (Target: 30)</h3>
                    <form onSubmit={handleUpdateClinicalLoad} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Month</label>
                            <select 
                                className="w-full px-4 py-2 rounded-lg border bg-white dark:bg-gray-700 dark:text-white"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                            >
                                {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total Team Count</label>
                            <input 
                                type="number" 
                                className="w-full px-4 py-2 rounded-lg border bg-white dark:bg-gray-700 dark:text-white"
                                value={clinicalLoadCount}
                                onChange={(e) => setClinicalLoadCount(e.target.value)}
                                placeholder="e.g. 163"
                                required
                            />
                        </div>
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full py-2.5 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold shadow-md flex justify-center"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : 'Update Attendance'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;
