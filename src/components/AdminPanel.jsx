import React, { useState } from 'react';
import { db } from '../firebase';
import { updateDoc, doc, arrayUnion, writeBatch } from 'firebase/firestore';
import { MONTHS } from '../utils';
import { Loader2, AlertCircle, CheckCircle2, Database } from 'lucide-react';

const AdminPanel = ({ teamData }) => {
    const STAFF_LIST = ['Alif', 'Nisa', 'Fadzlynn', 'Derlinder', 'Ying Xian', 'Brandon'];
    const DOMAIN_LIST = ['MANAGEMENT', 'CLINICAL', 'EDUCATION', 'RESEARCH', 'A.O.B.'];

    const [selectedStaff, setSelectedStaff] = useState('');
    const [selectedDomain, setSelectedDomain] = useState('MANAGEMENT');
    const [projectTask, setProjectTask] = useState('');
    
    const [selectedMonth, setSelectedMonth] = useState('Jan');
    const [clinicalLoadCount, setClinicalLoadCount] = useState(0);

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleInitializeDatabase = async () => {
        if (!window.confirm("This will reset all project lists to the default 2026 template. Continue?")) return;
        
        setLoading(true);
        setMessage('Initializing SSMC 2026 Leadership Structure...');
        try {
            const batch = writeBatch(db);
            const managementTasks = ["Appraisal", "Budgeting Exercise", "CEP - COP | CDP | IDP", "Committee involvement", "Costing and charging", "EPIC Implementation", "Fitness Centre facade", "In service meetings", "Joy @ Work", "Manpower Requisition", "OAS", "Office logistics", "Preventive Maintenance", "RMA & Patient Safety", "Service developments", "Site Visits", "Staff Development", "Staffing & Rostering"];
            const clinicalTasks = ["CPET | VMAX", "EST", "FSG", "GDM GPAC", "INDV", "IGNITE EDNOS", "IGNITE NAI", "IGNITE IWM", "IGNITE PO", "IGNITE CR", "IGNITE WF", "NC", "PAC", "POWERS", "SKG", "VC", "VCGRP"];
            const researchTasks = ["C.A.R.E.", "e-IMPACT", "ENDO EST", "ImmersiFit", "SuperDads", "Telefit4Kids"];
            const educationTasks = ["Antenatal Education", "Conferences and Talks", "Dynamite Daisies", "EIMS Principles", "Exercise Resources", "ITE Teaching", "KKH EOP v2", "Observeship", "Project ARIF", "Social Media", "Student Internship", "Survivors Talks", "Women's Health Forum"];

            const staffConfig = [
                { id: 'alif', name: 'Alif', tasks: [...managementTasks.slice(0, 10), ...researchTasks.slice(0, 3)] },
                { id: 'nisa', name: 'Nisa', tasks: managementTasks.slice(10) },
                { id: 'fadzlynn', name: 'Fadzlynn', tasks: clinicalTasks.slice(0, 9) },
                { id: 'derlinder', name: 'Derlinder', tasks: [...clinicalTasks.slice(9), ...educationTasks.slice(0, 6)] },
                { id: 'ying_xian', name: 'Ying Xian', tasks: researchTasks.slice(3) },
                { id: 'brandon', name: 'Brandon', tasks: educationTasks.slice(6) }
            ];

            for (const person of staffConfig) {
                const docRef = doc(db, 'cep_team', person.id);
                const projects = person.tasks.map(t => {
                    let domain = 'MANAGEMENT';
                    if (clinicalTasks.includes(t)) domain = 'CLINICAL';
                    if (researchTasks.includes(t)) domain = 'RESEARCH';
                    if (educationTasks.includes(t)) domain = 'EDUCATION';
                    return { title: t, domain_type: domain, status_dots: 1 };
                });

                batch.set(docRef, {
                    staff_name: person.name,
                    projects: projects,
                    clinical_load: [], 
                    domains: { management: 25, clinical: 25, research: 25, education: 25 } 
                }, { merge: true });
            }

            await batch.commit();
            setMessage('✅ SSMC Board Initialized! Refresh the page.');
        } catch (error) {
            setMessage('❌ Error: ' + error.message);
        } finally {
            setLoading(false); // <--- This forces the spinner to stop
        }
    };

    const handleAddProject = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        try {
            if (!selectedStaff) throw new Error("Select a staff member");
            if (!projectTask) throw new Error("Enter a project task");

            const staffId = selectedStaff.toLowerCase().replace(' ', '_');
            const staffRef = doc(db, 'cep_team', staffId);
            
            await updateDoc(staffRef, {
                projects: arrayUnion({
                    title: projectTask,
                    domain_type: selectedDomain,
                    status_dots: 1
                })
            });
            setMessage(`✅ Added "${projectTask}" for ${selectedStaff}`);
            setProjectTask('');
        } catch (error) {
            setMessage('❌ Error: ' + error.message);
        } finally {
            setLoading(false); // <--- Safety catch
        }
    };

    const handleUpdateClinicalLoad = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        try {
            if (!teamData || teamData.length === 0) throw new Error("No staff found. Initialize Database first.");

            const numStaff = teamData.length;
            const countPerStaff = Math.floor(parseInt(clinicalLoadCount) / numStaff);
            const remainder = parseInt(clinicalLoadCount) % numStaff;
            const batch = writeBatch(db);

            teamData.forEach((staff, index) => {
                const staffRef = doc(db, 'cep_team', staff.id);
                let currentLoad = [...(staff.clinical_load || [])];
                currentLoad = currentLoad.filter(m => m.month !== selectedMonth);
                
                const newCount = countPerStaff + (index === 0 ? remainder : 0);
                currentLoad.push({ month: selectedMonth, count: newCount });
                
                const monthOrder = { "Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4, "May": 5, "Jun": 6, "Jul": 7, "Aug": 8, "Sep": 9, "Oct": 10, "Nov": 11, "Dec": 12 };
                currentLoad.sort((a, b) => monthOrder[a.month] - monthOrder[b.month]);

                batch.update(staffRef, { clinical_load: currentLoad });
            });

            await batch.commit();
            setMessage(`✅ Updated ${selectedMonth} attendance to ${clinicalLoadCount}`);
        } catch (error) {
            setMessage('❌ Error updating load: ' + error.message);
        } finally {
            setLoading(false); // <--- Safety catch
        }
    };

    return (
        <div className="monday-card p-6 mt-6 mb-8">
            <h2 className="text-xl font-bold mb-6 text-[#323338] flex items-center gap-2">
                <span className="w-2 h-8 bg-[#0073ea] rounded-full"></span>
                Admin Data Entry
            </h2>
            
            {message && (
                <div className={`p-4 mb-6 rounded-lg text-sm font-medium flex items-center gap-2 ${message.includes('Error') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                    {message.includes('Error') ? <AlertCircle size={18}/> : <CheckCircle2 size={18}/>}
                    {message}
                </div>
            )}

            <div className={`mb-8 p-6 rounded-lg border text-center transition-all bg-gray-50 border-gray-100`}>
                <p className="text-gray-500 mb-3 text-sm">Need to reset the board?</p>
                <button onClick={handleInitializeDatabase} disabled={loading} className="px-6 py-2 bg-[#ffcb00] hover:bg-[#e6b800] text-[#323338] rounded-md font-bold shadow-sm transition-all flex items-center justify-center mx-auto gap-2">
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <><Database size={16}/> Initialize / Reset Board</>}
                </button>
            </div>

            <div className={`grid grid-cols-1 md:grid-cols-2 gap-8`}>
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-[#323338] border-b pb-2">Add New Item</h3>
                    <form onSubmit={handleAddProject} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Owner</label>
                            <select className="w-full px-4 py-2 rounded-md border bg-white" value={selectedStaff} onChange={(e) => setSelectedStaff(e.target.value)} required>
                                <option value="">Select Staff...</option>
                                {STAFF_LIST.map(name => <option key={name} value={name}>{name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Group (Domain)</label>
                            <select className="w-full px-4 py-2 rounded-md border bg-white" value={selectedDomain} onChange={(e) => setSelectedDomain(e.target.value)}>
                                {DOMAIN_LIST.map(domain => <option key={domain} value={domain}>{domain}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Item Name</label>
                            <input type="text" className="w-full px-4 py-2 rounded-md border bg-white" value={projectTask} onChange={(e) => setProjectTask(e.target.value)} placeholder="e.g., Annual Report" required />
                        </div>
                        <button type="submit" disabled={loading} className="w-full py-2 px-4 bg-[#0073ea] hover:bg-[#0060b9] text-white rounded-md font-medium shadow-sm flex justify-center">
                            {loading ? <Loader2 className="animate-spin" /> : 'Add Item'}
                        </button>
                    </form>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-[#323338] border-b pb-2">Update Attendance Target</h3>
                    <form onSubmit={handleUpdateClinicalLoad} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Month</label>
                            <select className="w-full px-4 py-2 rounded-md border bg-white" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
                                {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Total Count (Target: 30)</label>
                            <input type="number" className="w-full px-4 py-2 rounded-md border bg-white" value={clinicalLoadCount} onChange={(e) => setClinicalLoadCount(e.target.value)} placeholder="e.g. 32" required />
                        </div>
                        <button type="submit" disabled={loading} className="w-full py-2 px-4 bg-[#00c875] hover:bg-[#00b065] text-white rounded-md font-medium shadow-sm flex justify-center">
                            {loading ? <Loader2 className="animate-spin" /> : 'Update Stats'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;
