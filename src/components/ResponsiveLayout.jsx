import React from 'react';

const ResponsiveLayout = ({ children }) => {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-6 transition-colors duration-300">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                {children}
            </div>
        </div>
    );
};

export default ResponsiveLayout;
