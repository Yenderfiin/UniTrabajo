import React from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export function TransportPage() {
  const rides = [
    { id: 1, route: 'Centro -> Universidad', price: '$2.50', time: 'Hoy, 14:00', driver: 'Mario T.', seats: 3 },
    { id: 2, route: 'Terminal Sur -> Norte', price: '$3.00', time: 'Hoy, 15:30', driver: 'Sofia L.', seats: 1 },
    { id: 3, route: 'Plaza Mayor -> Aeropuerto', price: '$5.00', time: 'Mañana, 08:00', driver: 'Javier C.', seats: 2 },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="hidden lg:block lg:col-span-1">
        <Card className="p-4 sticky top-20">
          <div className="flex flex-col items-center mb-4">
            <div className="w-16 h-16 rounded-full bg-slate-200 mb-2"></div>
            <h3 className="font-semibold text-slate-800">Mi Perfil</h3>
            <p className="text-sm text-slate-500">Pasajero Frecuente</p>
          </div>
          <div className="border-t border-slate-100 pt-3 mt-3">
            <div className="flex justify-between text-sm text-slate-600 mb-2">
              <span>Viajes compartidos</span>
              <span className="font-semibold text-brand-blue">24</span>
            </div>
            <div className="flex justify-between text-sm text-slate-600">
              <span>Calificación media</span>
              <span className="font-semibold text-brand-blue">4.9 ★</span>
            </div>
          </div>
          <Button variant="outline" className="w-full mt-4">Ofrecer Viaje</Button>
        </Card>
      </div>

      <div className="lg:col-span-2 space-y-4">
        <Card className="p-4 bg-white border border-slate-200">
           <div className="flex flex-col space-y-3">
             <div className="flex items-center space-x-2">
                 <input 
                   type="text" 
                   placeholder="Origen..." 
                   className="flex-1 bg-slate-100 rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                 />
                 <span className="text-slate-400">→</span>
                 <input 
                   type="text" 
                   placeholder="Destino..." 
                   className="flex-1 bg-slate-100 rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                 />
                 <Button variant="primary" className="rounded-md">Buscar</Button>
             </div>
           </div>
        </Card>

        {rides.map(ride => (
          <Card key={ride.id} className="p-0 hover:shadow-md transition-shadow">
            <div className="p-4 flex space-x-3">
               <div className="w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center shrink-0">
                 <span className="text-sky-600 font-bold">{ride.driver.charAt(0)}</span>
               </div>
               <div className="flex-1">
                 <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-slate-900">{ride.route}</h4>
                      <p className="text-sm text-slate-500 font-medium">{ride.time}</p>
                      <p className="text-xs text-slate-400 mt-0.5">Conductor: {ride.driver} • Asientos disp: {ride.seats}</p>
                    </div>
                    <div className="text-right">
                      <span className="bg-sky-100 text-sky-800 text-sm font-bold px-2 py-1 rounded block mb-1">
                        {ride.price}
                      </span>
                    </div>
                 </div>
                 <div className="mt-4 flex space-x-2">
                   <Button variant="primary">Reservar Asiento</Button>
                   <Button variant="outline">Consultar</Button>
                 </div>
               </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="hidden lg:block lg:col-span-1">
         <Card className="p-4 bg-blue-50 border-blue-100 sticky top-20">
            <h3 className="font-semibold text-brand-blue flex items-center mb-2">
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Conduce Seguro
            </h3>
            <p className="text-sm text-slate-700">
              Todos nuestros conductores pasan por un proceso de verificación de identidad y antecedentes. Para tu seguridad, no compartas datos bancarios por los chats.
            </p>
         </Card>
      </div>
    </div>
  );
}
