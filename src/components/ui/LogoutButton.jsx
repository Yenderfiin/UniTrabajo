import React from 'react';

/**
 * LogoutButton - Componente visual del botón de cerrar sesión.

 */
export function LogoutButton({ className = '' }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold
        text-red-500 border border-red-200 bg-red-50
        hover:bg-red-100 hover:border-red-300 hover:text-red-600
        transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-1
        disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {/* Icono de salida */}
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
        />
      </svg>
      Cerrar Sesión
    </button>
  );
}
