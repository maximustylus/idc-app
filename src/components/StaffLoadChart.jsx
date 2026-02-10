import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Distinct colors for each staff member to make them distinguishable
const STAFF_COLORS = [
    '#3b82f6', // Blue (Alif)
    '#8b5cf6', // Violet (Nisa)
    '#10b981', // Emerald (Fadzlynn)
    '#f59e0b', // Amber (Derlinder)
    '#ef4444', // Red (Ying Xian)
    '#6366f1'  // Indigo (Brandon)
];

const StaffLoadChart = ({ data, staffNames }) => {
    // 1. Prepare Data: Transform from "Staff-Centric" to "Month-Centric"
    // We need: [{name: 'Jan', Alif: 12, Nisa: 15...}, {name: 'Feb', ...}]
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const chartData = months.map(month => {
        const entry = { name: month };
        data.forEach(staff => {
            // Find the load for this specific month
            const loadRecord = (staff.clinical_load || []).find(m => m.month === month);
            // Use staff name as key, default to 0
            entry[staff.staff_name] = loadRecord ? parseInt(loadRecord.count) : 0;
        });
        return entry;
    });

    return (
        <div className="w-full h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={chartData}
                    margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#64748b', fontSize: 12 }} 
                    />
                    <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#64748b', fontSize: 12 }} 
                    />
                    <Tooltip 
                        cursor={{ fill: '#f1f5f9' }}
                        contentStyle={{ 
                            borderRadius: '6px', 
                            border: 'none', 
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            backgroundColor: '#fff',
                            fontSize: '12px'
                        }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px', fontSize: '11px' }} />
                    
                    {/* Create a Bar for each staff member */}
                    {staffNames.map((name, index) => (
                        <Bar 
                            key={name} 
                            dataKey={name} 
                            fill={STAFF_COLORS[index % STAFF_COLORS.length]} 
                            radius={[2, 2, 0, 0]}
                            barSize={8} // Slim bars to fit 6 per month
                        />
                    ))}
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default StaffLoadChart;
