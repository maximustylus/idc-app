import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const STATUS_CONFIG = {
    1: { label: 'Stuck', color: '#E2445C' },
    2: { label: 'Planning', color: '#A25DDC' },
    3: { label: 'Working on it', color: '#FDAB3D' },
    4: { label: 'Review', color: '#0073EA' },
    5: { label: 'Done', color: '#00C875' }
};

const StatusBarChart = ({ data }) => {
    // 1. Count the statuses
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    
    data.forEach(staff => {
        if (staff.projects) {
            staff.projects.forEach(p => {
                const status = p.status_dots || 1;
                if (counts[status] !== undefined) {
                    counts[status]++;
                }
            });
        }
    });

    // 2. Format for Recharts
    const chartData = [
        { name: 'Stuck', count: counts[1], color: STATUS_CONFIG[1].color },
        { name: 'Planning', count: counts[2], color: STATUS_CONFIG[2].color },
        { name: 'Working', count: counts[3], color: STATUS_CONFIG[3].color },
        { name: 'Review', count: counts[4], color: STATUS_CONFIG[4].color },
        { name: 'Done', count: counts[5], color: STATUS_CONFIG[5].color },
    ];

    return (
        <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    layout="vertical"
                    data={chartData}
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                    <XAxis type="number" hide />
                    <YAxis 
                        dataKey="name" 
                        type="category" 
                        tick={{ fontSize: 12, fill: '#6b7280' }} 
                        width={60}
                    />
                    <Tooltip 
                        cursor={{ fill: 'transparent' }}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="count" barSize={20} radius={[0, 4, 4, 0]}>
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default StatusBarChart;
