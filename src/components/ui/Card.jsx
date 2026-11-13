import React from 'react';

// ...props pasa onClick e id al div. Sin esto las tarjetas de vacantes y
// postulaciones recibían onClick pero no abrían el detalle al hacer clic.
export function Card({ children, className = '', ...props }) {
  return (
    <div className={`bg-brand-surface rounded-lg shadow-sm border border-slate-200 overflow-hidden ${className}`} {...props}>
      {children}
    </div>
  );
}
