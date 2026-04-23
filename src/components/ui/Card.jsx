import React from 'react';

export function Card({ children, className = '' }) {
  return (
    <div className={`bg-brand-surface rounded-lg shadow-sm border border-slate-200 overflow-hidden ${className}`}>
      {children}
    </div>
  );
}
