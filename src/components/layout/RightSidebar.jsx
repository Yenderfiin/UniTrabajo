import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function RightSidebar({ isOpen, onClose }) {
  const { signOut } = useAuth();

  const handleLogout = async () => {
    onClose();
    await signOut();
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={onClose}
        ></div>
      )}

      {/* Sidebar Menu */}
      <aside 
        className={`fixed top-0 right-0 h-full w-64 bg-brand-surface shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}
      >
        <div className="p-4 flex items-center justify-between border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">Menú</h2>
          <button 
            onClick={onClose}
            className="text-slate-500 hover:text-slate-900 focus:outline-none"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="p-4 flex-1 space-y-2 overflow-y-auto">
          <div className="md:hidden pb-4 mb-4 border-b border-slate-100 flex flex-col space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Vistas</span>
            <NavLink
              to="/"
              end
              onClick={onClose}
              className={({ isActive }) => 
                `block px-3 py-2 rounded-md transition-colors ${isActive ? 'bg-blue-50 text-brand-blue font-medium' : 'text-slate-600 hover:bg-slate-50'}`
              }
            >
              Micro-trabajos
            </NavLink>
            <NavLink
              to="/app/transporte"
              onClick={onClose}
              className={({ isActive }) => 
                `block px-3 py-2 rounded-md transition-colors ${isActive ? 'bg-blue-50 text-brand-blue font-medium' : 'text-slate-600 hover:bg-slate-50'}`
              }
            >
              Transporte Compartido
            </NavLink>
          </div>

          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Navegación</span>
          <NavLink
            to="/app/perfil"
            onClick={onClose}
            className={({ isActive }) => 
              `block px-3 py-2 rounded-md transition-colors ${isActive ? 'bg-blue-50 text-brand-blue font-medium' : 'text-slate-600 hover:bg-slate-50'}`
            }
          >
            Mi Perfil
          </NavLink>
          <NavLink
            to="/app/mis-vacantes"
            onClick={onClose}
            className={({ isActive }) => 
              `block px-3 py-2 rounded-md transition-colors ${isActive ? 'bg-blue-50 text-brand-blue font-medium' : 'text-slate-600 hover:bg-slate-50'}`
            }
          >
            Mis Vacantes
          </NavLink>
          <NavLink
            to="/app/mis-postulaciones"
            onClick={onClose}
            className={({ isActive }) => 
              `block px-3 py-2 rounded-md transition-colors ${isActive ? 'bg-blue-50 text-brand-blue font-medium' : 'text-slate-600 hover:bg-slate-50'}`
            }
          >
            Mis Postulaciones
          </NavLink>
          <NavLink
            to="/app/notificaciones"
            onClick={onClose}
            className={({ isActive }) => 
              `block px-3 py-2 rounded-md transition-colors ${isActive ? 'bg-blue-50 text-brand-blue font-medium' : 'text-slate-600 hover:bg-slate-50'}`
            }
          >
            Notificaciones
          </NavLink>
          {/* <a href="#" className="block px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-md">Mis Tareas</a>
          <a href="#" className="block px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-md">Historial de Viajes</a>
          <a href="#" className="block px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-md">Mensajes</a>
          <a href="#" className="block px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-md">Configuración</a> */}
        </nav>
        
        <div className="p-4 border-t border-slate-200">
           <button 
             onClick={handleLogout}
             className="w-full flex items-center justify-center space-x-2 text-red-600 hover:bg-red-50 px-4 py-2 rounded-md font-medium transition-colors"
           >
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
             <span>Cerrar Sesión</span>
           </button>
        </div>
      </aside>
    </>
  );
}
