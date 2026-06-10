import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export function TransportPage() {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRides() {
      // Obtenemos los viajes conectando con su detalle
      const { data, error } = await supabase
        .from('offers')
        .select(`
          id_offer,
          description,
          create_at,
          status,
          users!document_employer ( frt_name, frt_last_name ),
          detail_travels ( origin, destination, departure_time, avaliable_seats )
        `)
        .eq('type_offer', 'Transporte')
        .eq('status', 'Pendiente')
        .order('create_at', { ascending: false });

      if (data) {
        setRides(data);
      }
      setLoading(false);
    }
    
    fetchRides();
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="hidden lg:block lg:col-span-1">
        <Card className="p-4 sticky top-20">
          <div className="flex flex-col items-center mb-4">
            <div className="w-16 h-16 rounded-full bg-slate-200 mb-2"></div>
            <h3 className="font-semibold text-slate-800">Mi Perfil</h3>
            <p className="text-sm text-slate-500">Pasajero Frecuente</p>
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

        {loading ? (
          <div className="text-center py-10 text-slate-500">Buscando viajes...</div>
        ) : rides.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-slate-500 mb-2">Aún no hay viajes de transporte registrados.</p>
            <p className="text-xs text-slate-400">Asegúrate de agregar rutas en tu base de datos vinculando 'offers' con 'detail_travels'.</p>
          </div>
        ) : (
          rides.map(ride => {
            const user = ride.users;
            const details = ride.detail_travels || {}; // Relación de uno a uno en la BD
            const driverName = user ? `${user.frt_name} ${user.frt_last_name}` : 'Conductor';
            const departureTime = details.departure_time ? new Date(details.departure_time).toLocaleString() : 'Fecha por definir';

            return (
          <Card key={ride.id_offer} className="p-0 hover:shadow-md transition-shadow">
            <div className="p-4 flex space-x-3">
               <div className="w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center shrink-0">
                 <span className="text-sky-600 font-bold">{driverName.charAt(0)}</span>
               </div>
               <div className="flex-1">
                 <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-slate-900">{details.origin || '?'} ➔ {details.destination || '?'}</h4>
                      <p className="text-sm text-slate-500 font-medium">{departureTime}</p>
                      <p className="text-xs text-slate-400 mt-0.5">Conductor: {driverName} • Asientos disp: {details.avaliable_seats || 0}</p>
                    </div>
                 </div>
                 <p className="text-sm text-slate-700 mt-2 line-clamp-2">{ride.description}</p>
                 <div className="mt-4 flex space-x-2">
                   <Button variant="primary">Reservar Asiento</Button>
                   <Button variant="outline">Consultar</Button>
                 </div>
               </div>
            </div>
          </Card>
        )}))}
      </div>

      <div className="hidden lg:block lg:col-span-1">
         <Card className="p-4 bg-blue-50 border-blue-100 sticky top-20">
            <h3 className="font-semibold text-brand-blue flex items-center mb-2">
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Conduce Seguro
            </h3>
            <p className="text-sm text-slate-700">
              Todos nuestros conductores pasan por un proceso de verificación de identidad. No compartas datos personales o bancarios en chats.
            </p>
         </Card>
      </div>
    </div>
  );
}
