import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const KpiChart = ({ data, staffNames }) => {
    // 1. Process Data: Sum up individual loads to get Team Total
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Calculate the dynamic target (e.g., 30 cases * number of staff)
    // If you have 6 staff, the team goal is 180.
    const staffCount = staffNames.length || 1;
    const teamTarget = staffCount * 30;

    const chartData = months.map(month => {
        let total = 0;
        data.forEach(staff => {
            const monthData = staff.clinical_load?.find(m => m.month === month);
            if (monthData) {
                total += parseInt(monthData.count || 0);
            }
        });
        return {
            name: month,
            Total: total,
            Target: teamTarget
        };
    });

    return (
        <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer>
                <LineChart
                    data={chartData}
                    margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 10,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
                    
                    <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#6b7280', fontSize: 12 }} 
                        dy={10}
                    />
                    
                    <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#6b7280', fontSize: 12 }} 
                    />
                    
                    <Tooltip 
                        contentStyle={{ 
                            backgroundColor: '#fff', 
                            border: '1px solid #e5e7eb', 
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' 
                        }}
                    />
                    
                    <Legend verticalAlign="top" height={36}/>
                    
                    {/* The Target Line (Red Dashed) */}
                    <Line 
                        type="monotone" 
                        dataKey="Target" 
                        stroke="#E2445C" 
                        strokeDasharray="5 5" 
                        strokeWidth={2} 
                        dot={false} 
                        name="Goal (30/pax)"
                    />
                    
                    {/* The Actual Data Line (Monday Blue) */}
                    <Line 
                        type="monotone" 
                        dataKey="Total" 
                        stroke="#0073ea" 
                        strokeWidth={3} 
                        activeDot={{ r: 8 }} 
                        name="Team Actual"
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default KpiChart;
