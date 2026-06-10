import React from 'react';
import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="w-full bg-slate-950 text-slate-400 border-t border-slate-900 py-12 relative z-10 selection:bg-brand-blue selection:text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Grid Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          
          {/* Column 1: Brand Info */}
          <div className="space-y-4">
            <span className="font-extrabold text-2xl text-white bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
              UniTrabajo
            </span>
            <p className="text-sm text-slate-400 leading-relaxed">
              El ecosistema universitario diseñado para conectar a estudiantes con micro-trabajos flexibles y rutas de transporte seguro.
            </p>
          </div>

          {/* Column 2: Services */}
          <div>
            <h4 className="text-white font-semibold text-sm tracking-wider uppercase mb-4">Servicios</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/login" className="hover:text-white transition-colors">Micro-Trabajos</Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-white transition-colors">Transporte Compartido</Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-white transition-colors">Verificación de Cuentas</Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Institutional Links */}
          <div>
            <h4 className="text-white font-semibold text-sm tracking-wider uppercase mb-4">Institucional</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <span className="hover:text-white transition-colors cursor-pointer">Sobre Nosotros</span>
              </li>
              <li>
                <span className="hover:text-white transition-colors cursor-pointer">Preguntas Frecuentes</span>
              </li>
              <li>
                <span className="hover:text-white transition-colors cursor-pointer">Políticas de Privacidad</span>
              </li>
              <li>
                <span className="hover:text-white transition-colors cursor-pointer">Términos de Servicio</span>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact */}
          <div className="space-y-3">
            <h4 className="text-white font-semibold text-sm tracking-wider uppercase mb-1">Contacto</h4>
            <p className="text-sm">
              ¿Tienes dudas o propuestas? Escríbenos:
            </p>
            <div className="text-sm font-semibold text-white">
              <a href="mailto:soporte@unitrabajo.edu.co" className="hover:text-blue-400 transition-colors">
                soporte@unitrabajo.edu.co
              </a>
            </div>
            <p className="text-xs text-slate-500 leading-normal">
              Desarrollado en alianza con la Red de Universidades y Bienestar Estudiantil.
            </p>
          </div>

        </div>

        {/* Bottom copyright and disclaimer */}
        <div className="border-t border-slate-900 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-slate-500 space-y-4 md:space-y-0">
          <p>© {new Date().getFullYear()} UniTrabajo. Todos los derechos reservados.</p>
          <div className="flex space-x-6">
            <span className="hover:text-slate-400 cursor-pointer">Seguridad</span>
            <span>•</span>
            <span className="hover:text-slate-400 cursor-pointer">Estudiantes</span>
            <span>•</span>
            <span className="hover:text-slate-400 cursor-pointer">Universidades</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
