import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export function MicroJobsPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchJobs() {
      // Obtenemos las ofertas conectando con sus detalles y dueño
      const { data, error } = await supabase
        .from('offers')
        .select(`
          id_offer,
          description,
          create_at,
          status,
          users!document_employer ( frt_name, frt_last_name ),
          job_details ( category, payment, hours )
        `)
        .in('type_offer', ['Trabajo', 'Tutoría', 'Mensajería'])
        .eq('status', 'Pendiente')
        .order('create_at', { ascending: false });

      if (data) {
        setJobs(data);
      }
      setLoading(false);
    }
    
    fetchJobs();
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Columna Izquierda */}
      <div className="hidden lg:block lg:col-span-1">
        <Card className="p-4 sticky top-20">
          <div className="flex flex-col items-center mb-4">
            <div className="w-16 h-16 rounded-full bg-slate-200 mb-2"></div>
            <h3 className="font-semibold text-slate-800">Mi Perfil</h3>
            <p className="text-sm text-slate-500">Trabajador Activo</p>
          </div>
        </Card>
      </div>

      {/* Columna Central */}
      <div className="lg:col-span-2 space-y-4">
        <Card className="p-4 bg-white border border-slate-200">
           <div className="flex space-x-3 items-center">
             <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0"></div>
             <input 
               type="text" 
               placeholder="Buscar o publicar un micro-trabajo..." 
               className="flex-1 bg-slate-100 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
             />
           </div>
        </Card>

        {loading ? (
          <div className="text-center py-10 text-slate-500">Cargando trabajos...</div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-slate-500 mb-2">Aún no hay trabajos registrados.</p>
            <p className="text-xs text-slate-400">Intenta registrar ofertas en tu base de datos y aparecerán aquí automáticamente.</p>
          </div>
        ) : (
          jobs.map(job => {
            const user = job.users;
            const details = job.job_details || {}; // Relación de uno a uno en la BD
            const employerName = user ? `${user.frt_name} ${user.frt_last_name}` : 'Usuario Anónimo';
            
            return (
            <Card key={job.id_offer} className="p-0">
              <div className="p-4 flex space-x-3">
                 <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                   <span className="text-indigo-600 font-bold">{employerName.charAt(0)}</span>
                 </div>
                 <div className="flex-1">
                   <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-slate-900">{details.category || 'Trabajo General'}</h4>
                        <p className="text-xs text-slate-500">{employerName}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{new Date(job.create_at).toLocaleDateString()}</p>
                      </div>
                      <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded flex items-center">
                        ${details.payment || 'A convenir'}
                      </span>
                   </div>
                   <p className="text-sm text-slate-700 mt-3 whitespace-pre-wrap">
                     {job.description}
                   </p>
                   {details.hours && (
                     <p className="text-xs font-medium text-slate-500 mt-2">Duración estimada: {details.hours} horas</p>
                   )}
                   <div className="mt-4 flex space-x-2">
                     <Button variant="primary">Aplicar al trabajo</Button>
                     <Button variant="outline">Mensaje</Button>
                   </div>
                 </div>
              </div>
            </Card>
          )})
        )}
      </div>

      {/* Columna Derecha */}
      <div className="hidden lg:block lg:col-span-1">
        <Card className="p-4 sticky top-20">
          <h3 className="font-semibold text-slate-800 mb-3">Trabajos Destacados</h3>
          <p className="text-sm text-slate-500">Pronto verás aquí las oportunidades más relevantes para ti.</p>
        </Card>
      </div>
    </div>
  );
}
