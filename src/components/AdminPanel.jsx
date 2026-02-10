import React, { useState } from 'react';
import { db } from '../firebase';
import { updateDoc, doc, arrayUnion, getDoc, writeBatch } from 'firebase/firestore';
import { MONTHS } from '../utils';

// Configuration
const STAFF_LIST = ['Alif', 'Nisa', 'Fadzlynn', 'Derlinder', 'Ying Xian', 'Brandon'];
const DOMAIN_LIST = ['MANAGEMENT', 'CLINICAL', 'EDUCATION', 'RESEARCH', 'A.O.B.'];
const STATUS_CONFIG = { 1: { label: 'Stuck', color: '#E2445C' }, 2: { label: 'Planning', color: '#A25DDC' }, 3: { label: 'Working', color: '#FDAB3D' }, 4: { label: 'Review', color: '#0073EA' }, 5: { label: 'Done', color: '#00C875' } };
const PILLAR_COLORS = { 'MANAGEMENT': '#FFF2CC', 'CLINICAL': '#FCE4D6', 'EDUCATION': '#FBE5D6', 'RESEARCH': '#E2EFDA', 'A.O.B.': '#E2F0D9' };

const AdminPanel = ({ teamData }) => {
    // Form States
    const [selectedStaff, setSelectedStaff] = useState('');
    const [selectedDomain, setSelectedDomain] = useState('MANAGEMENT');
    const [itemType, setItemType] = useState('Task'); // New: Task vs Project
    const [projectTask, setProjectTask] = useState('');
    
    // KPI States
    const [selectedMonth, setSelectedMonth] = useState('Jan');
    const [clinicalLoadCount, setClinicalLoadCount] = useState(0);

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    // --- 1. ADD ITEM (With Delegation & Type) ---
    const handleAddItem = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        try {
            if (!selectedStaff) throw new Error("Select a staff member");
            if (!projectTask) throw new Error("Enter a title");

            const staffId = selectedStaff.toLowerCase().replace(' ', '_');
            const staffRef = doc(db, 'cep_team', staffId);
            
            await updateDoc(staffRef, {
                projects: arrayUnion({
                    title: projectTask,
                    domain_type: selectedDomain,
                    item_type: itemType, // Saved to DB
                    status_dots: 2 // Default: Planning
                })
            });
            setMessage(`✅ Saved: "${projectTask}" for ${selectedStaff}`);
            setProjectTask('');
        } catch (error) {
            setMessage('❌ Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // --- 2. DELETE ITEM (New Feature) ---
    const handleDeleteItem = async (staffId, itemToDelete) => {
        if(!window.confirm(`Permanently delete "${itemToDelete.title}"?`)) return;
        setLoading(true);
        try {
            const staffRef = doc(db, 'cep_team', staffId);
            const staffDoc = await getDoc(staffRef);
            if (staffDoc.exists()) {
                const currentProjects = staffDoc.data().projects || [];
                // Remove the specific item
                const updatedProjects = currentProjects.filter(p => p.title !== itemToDelete.title);
                await updateDoc(staffRef, { projects: updatedProjects });
                setMessage('🗑️ Item deleted.');
            }
        } catch (error) {
            setMessage("❌ Delete failed: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    // --- 3. UPDATE KPI ---
    const handleUpdateLoad = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (!teamData.length) throw new Error("No data found");
            const batch = writeBatch(db);
            const countPerStaff = Math.floor(parseInt(clinicalLoadCount) / teamData.length);
            const remainder = parseInt(clinicalLoadCount) % teamData.length;

            teamData.forEach((staff, index) => {
                const staffRef = doc(db, 'cep_team', staff.id);
                let currentLoad = (staff.clinical_load || []).filter(m => m.month !== selectedMonth);
                const newCount = countPerStaff + (index === 0 ? remainder : 0);
                currentLoad.push({ month: selectedMonth, count: newCount });
                // Simple sort for months
                const mOrder = { "Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4, "May": 5, "Jun": 6, "Jul": 7, "Aug": 8, "Sep": 9, "Oct": 10, "Nov": 11, "Dec": 12 };
                currentLoad.sort((a,b) => mOrder[a.month] - mOrder[b.month]);
                batch.update(staffRef, { clinical_load: currentLoad });
            });
            await batch.commit();
            setMessage(`✅ Updated ${selectedMonth} target to ${clinicalLoadCount}`);
        } catch (error) {
            setMessage('❌ Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="monday-card p-6 mt-6 mb-12 dark:bg-slate-800 dark:border-slate-700">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 border-b border-slate-200 dark:border-slate-700 pb-4">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white uppercase tracking-wide">
                    Admin Command Center
                </h2>
                {message && (
                    <span className={`text-xs font-bold px-3 py-1 rounded ${message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {message}
                    </span>
                )}
            </div>

            {/* Forms Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
                {/* ADD ITEM FORM */}
                <div className="lg:col-span-2 bg-slate-50 dark:bg-slate-900/50 p-5 rounded border border-slate-200 dark:border-slate-700">
                    <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-4 text-xs uppercase tracking-wider">Create New Entry</h3>
                    <form onSubmit={handleAddItem} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Delegate To (Owner)</label>
                                <select className="input-field" value={selectedStaff} onChange={(e) => setSelectedStaff(e.target.value)} required>
                                    <option value="">Select Staff...</option>
                                    {STAFF_LIST.map(n => <option key={n} value={n}>{n}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Type</label>
                                <select className="input-field" value={itemType} onChange={(e) => setItemType(e.target.value)}>
                                    <option value="Task">Task</option>
                                    <option value="Project">Project</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Domain</label>
                                <select className="input-field" value={selectedDomain} onChange={(e) => setSelectedDomain(e.target.value)}>
                                    {DOMAIN_LIST.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Title</label>
                                <input type="text" className="input-field" value={projectTask} onChange={(e) => setProjectTask(e.target.value)} placeholder="e.g., Q1 Budget" required />
                            </div>
                        </div>
                        <button type="submit" disabled={loading} className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition-colors text-sm shadow-sm">
                            {loading ? 'Processing...' : '+ Add Entry'}
                        </button>
                    </form>
                </div>

                {/* KPI FORM */}
                <div className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded border border-slate-200 dark:border-slate-700">
                    <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-4 text-xs uppercase tracking-wider">Set Team Targets</h3>
                    <form onSubmit={handleUpdateLoad} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Month</label>
                            <select className="input-field" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
                                {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Total Patient Load</label>
                            <input type="number" className="input-field" value={clinicalLoadCount} onChange={(e) => setClinicalLoadCount(e.target.value)} placeholder="180" required />
                        </div>
                        <button type="submit" disabled={loading} className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded transition-colors text-sm shadow-sm">
                            {loading ? 'Updating...' : 'Update Targets'}
                        </button>
                    </form>
                </div>
            </div>

            {/* MASTER DATABASE TABLE (Only visible here) */}
            <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-4 text-xs uppercase tracking-wider">
                    Master Database (Edit & Delete)
                </h3>
                <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-left bg-white dark:bg-slate-900">
                        <thead>
                            <tr>
                                <th className="admin-table-header">Owner</th>
                                <th className="admin-table-header">Type</th>
                                <th className="admin-table-header w-1/3">Title</th>
                                <th className="admin-table-header">Domain</th>
                                <th className="admin-table-header text-center">Status</th>
                                <th className="admin-table-header text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {teamData.map(staff => (
                                (staff.projects || []).map((p, idx) => (
                                    <tr key={`${staff.id}-${idx}`} className="admin-table-row">
                                        <td className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200">
                                            {staff.staff_name}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide ${p.item_type === 'Project' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}`}>
                                                {p.item_type || 'Task'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                                            {p.title}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold text-slate-700 bg-opacity-80" style={{ backgroundColor: PILLAR_COLORS[p.domain_type] }}>
                                                {p.domain_type.substring(0,4)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span style={{ color: STATUS_CONFIG[p.status_dots]?.color }} className="text-xs font-bold">
                                                {STATUS_CONFIG[p.status_dots]?.label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button 
                                                onClick={() => handleDeleteItem(staff.id, p)}
                                                className="text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded transition-colors"
                                            >
                                                DELETE
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;
