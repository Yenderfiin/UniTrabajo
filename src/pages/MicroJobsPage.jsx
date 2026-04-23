import React from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export function MicroJobsPage() {
  const jobs = [
    { id: 1, title: 'Limpieza de patio', price: '$15', time: 'hace 2 horas', user: 'Ana G.', location: 'Centro' },
    { id: 2, title: 'Ayuda con mudanza', price: '$40', time: 'hace 5 horas', user: 'Carlos M.', location: 'Norte' },
    { id: 3, title: 'Reparación de plomería básica', price: '$25', time: 'hace 1 día', user: 'Luis R.', location: 'Sur' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="hidden lg:block lg:col-span-1">
        <Card className="p-4 sticky top-20">
          <div className="flex flex-col items-center mb-4">
            <div className="w-16 h-16 rounded-full bg-slate-200 mb-2"></div>
            <h3 className="font-semibold text-slate-800">Mi Perfil</h3>
            <p className="text-sm text-slate-500">Trabajador Activo</p>
          </div>
          <div className="border-t border-slate-100 pt-3 mt-3">
            <div className="flex justify-between text-sm text-slate-600 mb-2">
              <span>Trabajos completados</span>
              <span className="font-semibold text-brand-blue">12</span>
            </div>
            <div className="flex justify-between text-sm text-slate-600">
              <span>Reseñas positivas</span>
              <span className="font-semibold text-green-600">95%</span>
            </div>
          </div>
        </Card>
      </div>

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

        {jobs.map(job => (
          <Card key={job.id} className="p-0">
            <div className="p-4 flex space-x-3">
               <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                 <span className="text-indigo-600 font-bold">{job.user.charAt(0)}</span>
               </div>
               <div className="flex-1">
                 <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-slate-900">{job.title}</h4>
                      <p className="text-xs text-slate-500">{job.user} • {job.location}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{job.time}</p>
                    </div>
                    <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded flex items-center">
                      {job.price}
                    </span>
                 </div>
                 <p className="text-sm text-slate-700 mt-3">
                   Necesito a alguien para ayudar con {job.title.toLowerCase()}. El trabajo tomará aproximadamente un par de horas. Pagos en efectivo o transferencia.
                 </p>
                 <div className="mt-4 flex space-x-2">
                   <Button variant="primary">Aplicar al trabajo</Button>
                   <Button variant="outline">Mensaje</Button>
                 </div>
               </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="hidden lg:block lg:col-span-1">
        <Card className="p-4 sticky top-20">
          <h3 className="font-semibold text-slate-800 mb-3">Trabajos Destacados</h3>
          <ul className="space-y-3">
            <li className="text-sm">
              <span className="font-medium text-slate-700 block">Jardinería fin de semana</span>
              <span className="text-xs text-slate-500 block">Hace 3 horas • Norte</span>
            </li>
            <li className="text-sm">
              <span className="font-medium text-slate-700 block">Pasear perros (recurrente)</span>
              <span className="text-xs text-slate-500 block">Hace 4 horas • Centro</span>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
