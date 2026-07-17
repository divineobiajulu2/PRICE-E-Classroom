import React from 'react';

const FullPageSkeleton: React.FC = () => (
  <div className="p-8 max-w-6xl mx-auto animate-pulse">
    <div className="h-8 w-1/3 bg-slate-200 rounded mb-6" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-24 bg-slate-200 rounded-xl" />
      ))}
    </div>
    <div className="h-64 bg-slate-200 rounded-xl" />
  </div>
);

export default FullPageSkeleton;
