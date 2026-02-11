import SmartAnalysis from './SmartAnalysis';
import { Sparkles } from 'lucide-react';
import React, { useState } from 'react';
import StaffLoadEditor from './StaffLoadEditor';
import { db } from '../firebase';
import { updateDoc, doc, arrayUnion, arrayRemove, getDoc, writeBatch } from 'firebase/firestore';
import { MONTHS, STAFF_LIST, DOMAIN_LIST, STATUS_OPTIONS } from '../utils';

// FIX 1: Added 'staffLoads' here so we can pass it to the AI
const AdminPanel = ({ teamData, staffLoads }) => {
    // States for "Add New" form
    const [newOwner, setNewOwner] = useState('');
    const [newDomain, setNewDomain] = useState('MANAGEMENT');
    const [newType, setNewType] = useState('Task');
    const [newTitle, setNewTitle] = useState('');
    
    // State for AI Modal
    const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
    
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    // --- 1. ADD NEW ITEM ---
    const handleAddItem = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (!newOwner || !newTitle) throw new Error("Owner and Title required");
            const staffRef = doc(db, 'cep_team', newOwner.toLowerCase().replace(' ', '_'));
            await updateDoc(staffRef, {
                projects: arrayUnion({
                    title: newTitle,
                    domain_type: newDomain,
                    item_type: newType,
                    status_dots: 2 // Default: Planning
                })
            });
            setMessage(`✅ Added "${newTitle}"`);
            setNewTitle('');
        } catch (error) { setMessage('❌ Error: ' + error.message); } 
        finally { setLoading(false); }
    };

    // --- 2. DELETE ITEM ---
    const handleDelete = async (staffId, item) => {
        if(!window.confirm(`Delete "${item.title}"?`)) return;
        setLoading(true);
        try {
            const staffRef = doc(db, 'cep_team', staffId);
            await updateDoc(staffRef, { projects: arrayRemove(item) });
            setMessage('🗑️ Item deleted');
        } catch (error) { setMessage('❌ Error: ' + error.message); } 
        finally { setLoading(false); }
    };

    // --- 3. EDIT ITEM (Status, Type, Domain) ---
    const handleEditField = async (staffId, itemIndex, field, newValue) => {
        setLoading(true);
        try {
            const staffRef = doc(db, 'cep_team', staffId);
            const snapshot = await getDoc(staffRef);
            if (!snapshot.exists()) throw new Error("Staff not found");
            
            const projects = snapshot.data().projects || [];
            projects[itemIndex] = { ...projects[itemIndex], [field]: newValue };
            
            await updateDoc(staffRef, { projects });
            setMessage(`✅ Updated ${field}`);
        } catch (error) { setMessage('❌ Error: ' + error.message); } 
        finally { setLoading(false); }
    };

    // --- 4. RE-DELEGATE (Change Owner) ---
    const handleChangeOwner = async (oldStaffId, item, newOwnerName) => {
        if (oldStaffId === newOwnerName.toLowerCase().replace(' ', '_')) return;
        if (!window.confirm(`Move "${item.title}" to ${newOwnerName}?`)) return;

        setLoading(true);
        try {
            const batch = writeBatch(db);
            const oldRef = doc(db, 'cep_team', oldStaffId);
            batch.update(oldRef, { projects: arrayRemove(item) });

            const newRef = doc(db, 'cep_team', newOwnerName.toLowerCase().replace(' ', '_'));
            const newItem = { ...item }; 
            batch.update(newRef, { projects: arrayUnion(newItem) });

            await batch.commit();
            setMessage(`✅ Moved to ${newOwnerName}`);
        } catch (error) { setMessage('❌ Move failed: ' + error.message); } 
        finally { setLoading(false); }
    };

    return (
        <div className="monday-card p-6 mt-6 mb-12 dark:bg-slate-800 dark:border-slate-700">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
                <button 
                    onClick={() => setIsAnalysisOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold rounded hover:opacity-90 shadow-lg"
                    >
                    <Sparkles size={14} />
                    GENERATE AI REPORT
                </button>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white uppercase">Admin Database</h2>
                {message && <span className="text-xs font-bold px-3 py-1 bg-blue-100 text-blue-700 rounded">{message}</span>}
            </div>

            {/* SECTION 1: ADD NEW TASK */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8 bg-slate-50 dark:bg-slate-900/50 p-4 rounded border border-slate-200 dark:border-slate-700">
                <select className="input-field" value={newOwner} onChange={(e)=>setNewOwner(e.target.value)}>
                    <option value="">+ Assign To...</option>
                    {STAFF_LIST.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <select className="input-field" value={newType} onChange={(e)=>setNewType(e.target.value)}>
                    <option value="Task">Task</option>
                    <option value="Project">Project</option>
                </select>
                <input className="input-field lg:col-span-2" placeholder="Item Title..." value={newTitle} onChange={(e)=>setNewTitle(e.target.value)} />
                <button onClick={handleAddItem} disabled={loading} className="lg:col-span-4 w-full py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 text-xs">ADD NEW ENTRY</button>
            </div>

            {/* SECTION 2: EXCEL GRID */}
            <StaffLoadEditor />

            {/* SECTION 3: MASTER TASK LIST */}
            <div className="overflow-x-auto border rounded border-slate-200 dark:border-slate-700 mt-8">
                <table className="w-full text-left bg-white dark:bg-slate-900">
                    <thead>
                        <tr>
                            <th className="admin-table-header">Owner (Re-delegate)</th>
                            <th className="admin-table-header w-1/3">Title</th>
                            <th className="admin-table-header">Type</th>
                            <th className="admin-table-header">Status</th>
                            <th className="admin-table-header text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {teamData.map(staff => (
                            (staff.projects || []).map((p, idx) => (
                                <tr key={`${staff.id}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    {/* 1. OWNER */}
                                    <td className="p-2">
                                        <select 
                                            className="bg-transparent text-sm font-medium text-blue-600 dark:text-blue-400 outline-none cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 rounded px-1"
                                            value={staff.staff_name}
                                            onChange={(e) => handleChangeOwner(staff.id, p, e.target.value)}
                                        >
                                            {STAFF_LIST.map(n => <option key={n} value={n}>{n}</option>)}
                                        </select>
                                    </td>

                                    {/* 2. TITLE */}
                                    <td className="p-2 text-sm text-slate-700 dark:text-slate-300">
                                        {p.title}
                                    </td>

                                    {/* 3. TYPE */}
                                    <td className="p-2">
                                        <select 
                                            className="bg-transparent text-xs font-bold uppercase outline-none cursor-pointer rounded px-1 py-0.5"
                                            style={{ color: p.item_type === 'Project' ? '#7e22ce' : '#1d4ed8' }}
                                            value={p.item_type || 'Task'}
                                            onChange={(e) => handleEditField(staff.id, idx, 'item_type', e.target.value)}
                                        >
                                            <option value="Task">TASK</option>
                                            <option value="Project">PROJECT</option>
                                        </select>
                                    </td>

                                    {/* 4. STATUS */}
                                    <td className="p-2">
                                        <select 
                                            className="text-xs font-bold text-white rounded px-2 py-1 outline-none cursor-pointer w-full text-center appearance-none"
                                            style={{ backgroundColor: STATUS_OPTIONS.find(s=>s.val===p.status_dots)?.val ? (STATUS_OPTIONS.find(s=>s.val===p.status_dots).val === 1 ? '#E2445C' : STATUS_OPTIONS.find(s=>s.val===p.status_dots).val === 2 ? '#A25DDC' : STATUS_OPTIONS.find(s=>s.val===p.status_dots).val === 3 ? '#FDAB3D' : STATUS_OPTIONS.find(s=>s.val===p.status_dots).val === 4 ? '#0073EA' : '#00C875') : '#ccc' }}
                                            value={p.status_dots}
                                            onChange={(e) => handleEditField(staff.id, idx, 'status_dots', parseInt(e.target.value))}
                                        >
                                            {STATUS_OPTIONS.map(s => (
                                                <option key={s.val} value={s.val} style={{color:'black'}}>{s.label}</option>
                                            ))}
                                        </select>
                                    </td>

                                    {/* 5. DELETE */}
                                    <td className="p-2 text-right">
                                        <button onClick={() => handleDelete(staff.id, p)} className="text-slate-400 hover:text-red-600 transition-colors">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ))}
                    </tbody>
                </table>
            </div>

            {/* FIX 2: MOVED THIS INSIDE THE RETURN STATEMENT */}
            {isAnalysisOpen && (
                <SmartAnalysis 
                    teamData={teamData} 
                    staffLoads={staffLoads} 
                    onClose={() => setIsAnalysisOpen(false)} 
                />
            )}
        </div>
    );
};

export default AdminPanel;
