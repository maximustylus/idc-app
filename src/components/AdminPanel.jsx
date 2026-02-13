import React, { useState } from 'react';
import { db } from '../firebase';
import { updateDoc, doc, arrayUnion, arrayRemove, getDoc, writeBatch } from 'firebase/firestore';
import { Sparkles, LayoutList, CalendarClock, FileJson, X } from 'lucide-react'; // Added FileJson, X

// Components
import SmartAnalysis from './SmartAnalysis';
import SmartReportView from './SmartReportView';
import StaffLoadEditor from './StaffLoadEditor';

// Utils
import { STAFF_LIST, STATUS_OPTIONS, DOMAIN_LIST } from '../utils';

const AdminPanel = ({ teamData, staffLoads }) => {
    // States for "Add New" form
    const [newOwner, setNewOwner] = useState('');
    const [newDomain, setNewDomain] = useState('MANAGEMENT');
    const [newType, setNewType] = useState('Task');
    const [newTitle, setNewTitle] = useState('');
    const [newYear, setNewYear] = useState('2026'); 
    
    // State for Modals
    const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false); // <--- NEW IMPORT STATE
    const [jsonInput, setJsonInput] = useState(''); // <--- NEW JSON INPUT
    
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
                    status_dots: 2, 
                    year: newYear 
                })
            });
            setMessage(`✅ Added to ${newYear}: "${newTitle}"`);
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

    // --- 3. EDIT ITEM ---
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

    // --- 4. RE-DELEGATE ---
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

    // --- 5. BULK IMPORT JSON (THE AGENT LINK) ---
    const handleBulkImport = async () => {
        setLoading(true);
        try {
            const data = JSON.parse(jsonInput);
            if (!Array.isArray(data)) throw new Error("Data must be an array []");

            const batch = writeBatch(db);
            let count = 0;

            // Group by Staff to minimize writes
            // Structure expected: { owner: "Alif", title: "XYZ", year: "2025", ... }
            for (const item of data) {
                if (!item.owner || !item.title) continue;
                
                const staffId = item.owner.toLowerCase().replace(' ', '_');
                const staffRef = doc(db, 'cep_team', staffId);
                
                // Note: Firestore batch doesn't support arrayUnion on same doc multiple times easily
                // So we do individual updates for simplicity in this logic, or we group them.
                // For safety/simplicity in this script, we will use updateDoc inside loop (slower but safer)
                // OR better:
                
                await updateDoc(staffRef, {
                    projects: arrayUnion({
                        title: item.title,
                        domain_type: item.domain || 'MANAGEMENT',
                        item_type: item.type || 'Task',
                        status_dots: item.status || 2,
                        year: item.year || '2026'
                    })
                });
                count++;
            }

            setMessage(`✅ Successfully imported ${count} items!`);
            setIsImportOpen(false);
            setJsonInput('');
        } catch (error) {
            alert("Import Failed: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="monday-card p-6 mt-6 mb-12 dark:bg-slate-800 dark:border-slate-700">
            
            {/* SECTION 1: REPORT */}
            <div className="mb-8 animate-in fade-in slide-in-from-top-4">
                <SmartReportView />
            </div>

            {/* HEADER */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex gap-2">
                    <button 
                        onClick={() => setIsAnalysisOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold rounded hover:opacity-90 shadow-lg"
                        >
                        <Sparkles size={14} />
                        GENERATE REPORT
                    </button>
                    <button 
                        onClick={() => setIsImportOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white text-xs font-bold rounded hover:bg-slate-600 shadow-lg"
                        >
                        <FileJson size={14} />
                        BULK IMPORT
                    </button>
                </div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white uppercase">Admin Database</h2>
                {message && <span className="text-xs font-bold px-3 py-1 bg-blue-100 text-blue-700 rounded">{message}</span>}
            </div>

            {/* SECTION 2: CLINICAL LOADS */}
            <StaffLoadEditor />

            <div className="my-10 border-t-2 border-slate-100 dark:border-slate-700"></div>

            {/* SECTION 3: TASKS & PROJECTS */}
            <div className="mb-6 flex items-center gap-2">
                <LayoutList className="text-slate-400" size={24} />
                <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Tasks & Projects</h2>
            </div>

            {/* ADD NEW ENTRY FORM */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                
                {/* 1. Target Year */}
                <div className="relative">
                    <CalendarClock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                    <select 
                        className="input-field w-full pl-12 font-bold text-indigo-600" 
                        value={newYear} 
                        onChange={(e)=>setNewYear(e.target.value)}
                    >
                        <option value="2026">2026 (Current)</option>
                        <option value="2025">2025</option>
                        <option value="2024">2024</option>
                        <option value="2023">2023</option>
                    </select>
                </div>

                {/* 2. Owner */}
                <select className="input-field w-full" value={newOwner} onChange={(e)=>setNewOwner(e.target.value)}>
                    <option value="">+ Assign To...</option>
                    {STAFF_LIST.map(n => <option key={n} value={n}>{n}</option>)}
                </select>

                {/* 3. Domain */}
                <select className="input-field w-full" value={newDomain} onChange={(e)=>setNewDomain(e.target.value)}>
                    {DOMAIN_LIST.map(d => <option key={d} value={d}>{d}</option>)}
                </select>

                {/* 4. Type */}
                <select className="input-field w-full" value={newType} onChange={(e)=>setNewType(e.target.value)}>
                    <option value="Task">Task</option>
                    <option value="Project">Project</option>
                </select>

                {/* 5. Title */}
                <input className="input-field w-full lg:col-span-2" placeholder="Item Title..." value={newTitle} onChange={(e)=>setNewTitle(e.target.value)} />

                {/* 6. Add Button */}
                <button onClick={handleAddItem} disabled={loading} className="lg:col-span-6 w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 text-sm shadow-md transition-all">
                    ADD ENTRY TO {newYear}
                </button>
            </div>

            {/* MASTER LIST */}
            <div className="overflow-x-auto border rounded-xl border-slate-200 dark:border-slate-700 shadow-sm">
                <table className="w-full text-left bg-white dark:bg-slate-900">
                    <thead className="bg-slate-50 dark:bg-slate-800">
                        <tr>
                            <th className="admin-table-header py-3 pl-4">Year</th>
                            <th className="admin-table-header py-3">Owner</th>
                            <th className="admin-table-header py-3">Domain</th>
                            <th className="admin-table-header py-3 w-1/3">Title</th>
                            <th className="admin-table-header py-3">Type</th>
                            <th className="admin-table-header py-3">Status</th>
                            <th className="admin-table-header py-3 text-right pr-4">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {teamData.map(staff => (
                            (staff.projects || []).map((p, idx) => (
                                <tr key={`${staff.id}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                    {/* 1. YEAR */}
                                    <td className="p-2 pl-4">
                                        <select 
                                            className="bg-transparent text-xs font-bold text-slate-400 outline-none cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 rounded px-1"
                                            value={p.year || '2026'} 
                                            onChange={(e) => handleEditField(staff.id, idx, 'year', e.target.value)}
                                        >
                                            <option value="2023">2023</option>
                                            <option value="2024">2024</option>
                                            <option value="2025">2025</option>
                                            <option value="2026">2026</option>
                                        </select>
                                    </td>
                                    {/* 2. OWNER */}
                                    <td className="p-2">
                                        <select 
                                            className="bg-transparent text-sm font-bold text-blue-600 dark:text-blue-400 outline-none cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 rounded px-2 py-1"
                                            value={staff.staff_name}
                                            onChange={(e) => handleChangeOwner(staff.id, p, e.target.value)}
                                        >
                                            {STAFF_LIST.map(n => <option key={n} value={n}>{n}</option>)}
                                        </select>
                                    </td>
                                    {/* 3. DOMAIN */}
                                    <td className="p-2">
                                        <select 
                                            className="bg-transparent text-xs font-bold text-slate-500 uppercase outline-none cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 rounded px-2 py-1"
                                            value={p.domain_type || 'MANAGEMENT'}
                                            onChange={(e) => handleEditField(staff.id, idx, 'domain_type', e.target.value)}
                                        >
                                            {DOMAIN_LIST.map(d => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                    </td>
                                    {/* 4. TITLE */}
                                    <td className="p-2 text-sm text-slate-700 dark:text-slate-300 font-medium">
                                        {p.title}
                                    </td>
                                    {/* 5. TYPE */}
                                    <td className="p-2">
                                        <select 
                                            className="bg-transparent text-xs font-bold uppercase outline-none cursor-pointer rounded px-2 py-1"
                                            style={{ color: p.item_type === 'Project' ? '#7e22ce' : '#1d4ed8' }}
                                            value={p.item_type || 'Task'}
                                            onChange={(e) => handleEditField(staff.id, idx, 'item_type', e.target.value)}
                                        >
                                            <option value="Task">TASK</option>
                                            <option value="Project">PROJECT</option>
                                        </select>
                                    </td>
                                    {/* 6. STATUS */}
                                    <td className="p-2">
                                        <select 
                                            className="text-xs font-bold text-white rounded-full px-3 py-1 outline-none cursor-pointer w-32 text-center appearance-none"
                                            style={{ backgroundColor: STATUS_OPTIONS.find(s=>s.val===p.status_dots)?.val ? (STATUS_OPTIONS.find(s=>s.val===p.status_dots).val === 1 ? '#E2445C' : STATUS_OPTIONS.find(s=>s.val===p.status_dots).val === 2 ? '#A25DDC' : STATUS_OPTIONS.find(s=>s.val===p.status_dots).val === 3 ? '#FDAB3D' : STATUS_OPTIONS.find(s=>s.val===p.status_dots).val === 4 ? '#0073EA' : '#00C875') : '#ccc' }}
                                            value={p.status_dots}
                                            onChange={(e) => handleEditField(staff.id, idx, 'status_dots', parseInt(e.target.value))}
                                        >
                                            {STATUS_OPTIONS.map(s => (
                                                <option key={s.val} value={s.val} style={{color:'black'}}>{s.label}</option>
                                            ))}
                                        </select>
                                    </td>
                                    {/* 7. DELETE */}
                                    <td className="p-2 text-right pr-4">
                                        <button onClick={() => handleDelete(staff.id, p)} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ))}
                    </tbody>
                </table>
            </div>

            {/* AI REPORT MODAL */}
            {isAnalysisOpen && (
                <SmartAnalysis 
                    teamData={teamData} 
                    staffLoads={staffLoads} 
                    onClose={() => setIsAnalysisOpen(false)} 
                />
            )}

            {/* BULK IMPORT MODAL (THE AGENT PORT) */}
            {isImportOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl p-6 border border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Agent Bulk Import</h3>
                            <button onClick={() => setIsImportOpen(false)} className="text-slate-400 hover:text-red-500"><X size={24} /></button>
                        </div>
                        <p className="text-sm text-slate-500 mb-4">
                            Paste the JSON code generated by Gemini Agent here. This will automatically populate the database for the years specified in the code.
                        </p>
                        <textarea 
                            className="w-full h-64 bg-slate-900 text-emerald-400 font-mono text-xs p-4 rounded-xl border border-slate-700 mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            placeholder='[ { "owner": "Alif", "title": "...", "year": "2025" } ]'
                            value={jsonInput}
                            onChange={(e) => setJsonInput(e.target.value)}
                        />
                        <button 
                            onClick={handleBulkImport} 
                            disabled={loading || !jsonInput}
                            className="w-full py-3 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 shadow-lg uppercase tracking-wider"
                        >
                            {loading ? 'Processing Agent Data...' : 'Execute Import'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPanel;
