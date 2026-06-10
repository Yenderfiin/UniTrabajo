import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';

export function LandingPage() {
  const { user } = useAuth();

  // Si el usuario ya está autenticado, redirigir al espacio de trabajo protegido
  if (user) {
    return <Navigate to="/app" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans relative overflow-hidden selection:bg-brand-blue selection:text-white">
      {/* Elementos visuales decorativos - Fondos con gradientes difuminados */}
      <div className="absolute top-0 right-0 -mr-24 -mt-24 w-[500px] h-[500px] rounded-full bg-blue-600/10 opacity-70 blur-3xl pointer-events-none z-0"></div>
      <div className="absolute bottom-0 left-0 -ml-24 -mb-24 w-[600px] h-[600px] rounded-full bg-indigo-600/10 opacity-60 blur-3xl pointer-events-none z-0"></div>
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-sky-600/5 opacity-50 blur-3xl pointer-events-none z-0"></div>

      <Navbar />

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 py-12 sm:py-20 flex flex-col items-center justify-center min-h-[calc(screen-16)]">

        {/* Hero Section */}
        <section className="text-center max-w-3xl mb-16 sm:mb-20 space-y-6">
          <h1 className="text-4xl sm:text-6xl font-black text-white leading-tight tracking-tight">
            Conecta, trabaja y viaja{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
              seguro
            </span>{' '}
            en tu universidad
          </h1>
          <p className="text-lg sm:text-xl text-slate-300 leading-relaxed max-w-2xl mx-auto">
            La plataforma diseñada exclusivamente para estudiantes universitarios. Encuentra micro-trabajos flexibles adaptados a tus horarios y comparte transporte seguro con tus compañeros.
          </p>
          <div className="pt-4 flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link 
              to="/register" 
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-full font-bold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/35 transition-all transform hover:-translate-y-0.5 duration-200 text-center"
            >
              Registrarse
            </Link>
            <Link 
              to="/login" 
              className="w-full sm:w-auto px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-full font-bold border border-slate-700 hover:border-slate-600 shadow-md transition-all transform hover:-translate-y-0.5 duration-200 text-center"
            >
              Iniciar Sesión
            </Link>
          </div>
          <div className="flex justify-center items-center gap-4 pt-4 text-sm text-slate-400">
            <span className="flex items-center gap-1.5">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
              100% Estudiantil
            </span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center gap-1.5">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
              Seguridad Validada
            </span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center gap-1.5">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
              Ahorro y Flexibilidad
            </span>
          </div>
        </section>

        {/* Modules/Services Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl mb-16">
          
          {/* Card 1: Micro-Trabajos */}
          <div className="group relative rounded-2xl bg-slate-800/40 border border-slate-700/50 p-8 hover:border-blue-500/50 hover:bg-slate-800/60 transition-all duration-300 shadow-xl overflow-hidden backdrop-blur-sm">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all duration-300"></div>
            
            {/* Icon */}
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>

            {/* Content */}
            <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-blue-400 transition-colors">
              Micro-Trabajos
            </h3>
            <p className="text-slate-300 leading-relaxed mb-6">
              Encuentra tareas rápidas y flexibles, tanto en el campus como en remoto. Ideal para financiar tus estudios sin descuidar las clases.
            </p>

            {/* List of services / features */}
            <ul className="space-y-3 text-sm text-slate-400">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                Tutorías académicas de tus asignaturas
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                Apoyo en eventos y logística universitaria
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                Digitalización, transcripción y tareas cortas
              </li>
            </ul>
          </div>

          {/* Card 2: Transporte Compartido */}
          <div className="group relative rounded-2xl bg-slate-800/40 border border-slate-700/50 p-8 hover:border-indigo-500/50 hover:bg-slate-800/60 transition-all duration-300 shadow-xl overflow-hidden backdrop-blur-sm">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all duration-300"></div>

            {/* Icon */}
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </div>

            {/* Content */}
            <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-indigo-400 transition-colors">
              Transporte Compartido
            </h3>
            <p className="text-slate-300 leading-relaxed mb-6">
              Viaja de forma económica, ecológica y sumamente segura coordinando rutas diarias al campus con otros estudiantes universitarios.
            </p>

            {/* List of services / features */}
            <ul className="space-y-3 text-sm text-slate-400">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                Rutas con origen/destino a tu campus
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                Gastos compartidos y ahorro garantizado
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                Perfiles verificados de tu misma institución
              </li>
            </ul>
          </div>

        </section>

        {/* Section: ¿Cómo funciona? */}
        <section className="w-full max-w-4xl text-center border-t border-slate-800/80 pt-16">
          <h2 className="text-3xl font-bold text-white mb-10">¿Cómo funciona UniTrabajo?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-left">
            <div className="p-4 space-y-3">
              <div className="text-2xl font-black text-blue-500/80">01.</div>
              <h4 className="text-lg font-bold text-white">Regístrate</h4>
              <p className="text-sm text-slate-400 leading-relaxed">
                Crea tu perfil con tu correo institucional y cédula. Validamos que seas miembro activo de la universidad.
              </p>
            </div>
            <div className="p-4 space-y-3">
              <div className="text-2xl font-black text-blue-500/80">02.</div>
              <h4 className="text-lg font-bold text-white">Explora</h4>
              <p className="text-sm text-slate-400 leading-relaxed">
                Filtra trabajos en tu zona horaria y disponibilidad, o busca conductores y rutas de transporte para tu horario.
              </p>
            </div>
            <div className="p-4 space-y-3">
              <div className="text-2xl font-black text-blue-500/80">03.</div>
              <h4 className="text-lg font-bold text-white">Conecta</h4>
              <p className="text-sm text-slate-400 leading-relaxed">
                Postúlate a trabajos o reserva tu asiento. Realiza tu acuerdo de forma rápida, directa y 100% segura.
              </p>
            </div>
          </div>
        </section>
        
      </div>
      <Footer />
    </div>
  );
}
