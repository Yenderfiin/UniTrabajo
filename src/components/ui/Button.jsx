import React from 'react';

export function Button({ 
  children, 
  variant = 'primary', 
  className = '', 
  ...props 
}) {
  const baseStyles = "inline-flex items-center justify-center font-semibold rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-brand-blue text-white hover:bg-brand-blue-hover focus:ring-brand-blue",
    outline: "border border-brand-blue text-brand-blue hover:bg-blue-50 focus:ring-brand-blue",
    ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:ring-slate-200"
  };

  const styles = `${baseStyles} px-4 py-2 text-sm ${variants[variant] || variants.primary} ${className}`;

  return (
    <button className={styles} {...props}>
      {children}
    </button>
  );
}
