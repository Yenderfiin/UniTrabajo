// ============================================================
// UniTrabajo - Datos sintéticos para probar el modelo no relacional
// Ejecutar después de 01_esquema_mongodb.js:
//   mongosh "mongodb://127.0.0.1:27017/unitrabajo_nosql" 02_datos_prueba.js
// Los volúmenes imitan los de Supabase (≈1000 usuarios, ≈1000 vacantes,
// ≈1000 postulaciones). Ningún dato corresponde a una persona real.
// Generador congruencial con semilla fija: cada ejecución produce lo mismo.
// ============================================================

let seed = 20261029;
const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));

const NOMBRES = ['Camilo', 'Laura', 'Diego', 'Yeimy', 'Andrés', 'Natalia', 'Sergio', 'Daniela', 'Jhon', 'Paola',
  'Brayan', 'Karen', 'Luis', 'Valeria', 'Edwin', 'Leidy', 'Fabián', 'Yuliana', 'Óscar', 'Marcela'];
const APELLIDOS = ['Quintero', 'Sanjuán', 'Pacheco', 'Carrascal', 'Ropero', 'Ascanio', 'Navarro', 'Pallares',
  'Bayona', 'Sánchez', 'Rincón', 'Jaime', 'Velásquez', 'Torrado', 'Guerrero', 'Lázaro', 'Arévalo', 'Ortiz'];
const CATEGORIAS = ['Limpieza', 'Mantenimiento', 'Asesoría', 'Tecnología', 'Mensajería', 'Ayuda con tareas', 'Otro'];
const TIPOS = ['Trabajo', 'Tutoría', 'Mensajería', 'Servicio'];
const LUGARES = ['Barrio La Primavera', 'Centro, calle 11', 'Sede Algodonal UFPSO', 'Barrio El Carmen',
  'Barrio Santa Clara', 'Barrio Cristo Rey', 'Biblioteca Argemiro Bayona', 'Plaza 29 de Mayo'];
const TITULOS = {
  'Limpieza': 'Aseo de apartamento', 'Mantenimiento': 'Pintar una habitación', 'Asesoría': 'Repaso de cálculo diferencial',
  'Tecnología': 'Formatear e instalar Windows', 'Mensajería': 'Entrega de documentos en el centro',
  'Ayuda con tareas': 'Apoyo en tareas de primaria', 'Otro': 'Apoyo en evento del sábado',
};
const UFPSO = { id: NumberInt(1), nombre: 'Universidad Francisco de Paula Santander Ocaña' };
const base = new Date('2026-01-15T12:00:00Z').getTime();
const fecha = (diasMax) => new Date(base + Math.floor(rnd() * diasMax * 86400000));

// ---------- usuarios ----------
const usuarios = [];
for (let i = 0; i < 1000; i++) {
  const estudiante = rnd() < 0.51;
  const n1 = pick(NOMBRES), a1 = pick(APELLIDOS), a2 = pick(APELLIDOS);
  const doc = String(1090000000 + i * 37);
  usuarios.push({
    _id: doc,
    nombres: { primero: n1, segundo: null },
    apellidos: { primero: a1, segundo: a2 },
    telefono: '3' + String(100000000 + int(0, 899999999)).slice(0, 9),
    correo: `${n1}.${a1}.${i}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') +
      (estudiante ? '@ufpso.edu.co' : '@correo.co'),
    tipo: estudiante ? 'Estudiante' : 'Externo',
    estado: 'A',
    universidad: estudiante ? UFPSO : null,
    descripcion: null,
    reputacion: { promedio: Double(0), total: NumberInt(0) },
    autorizacion_datos: fecha(30),
    creado_en: fecha(30),
  });
}
db.usuarios.insertMany(usuarios);
const estudiantes = usuarios.filter((u) => u.tipo === 'Estudiante');
const nombre = (u) => `${u.nombres.primero} ${u.apellidos.primero}`;

// ---------- vacantes con postulaciones y calificaciones embebidas ----------
const vacantes = [];
const usados = new Set();
let totalPostulaciones = 0;
for (let i = 0; i < 1000; i++) {
  let id;
  do { id = 'OFR-' + int(10000, 99999); } while (usados.has(id));
  usados.add(id);
  const empleador = pick(usuarios);
  const categoria = pick(CATEGORIAS);
  const estado = pick(['Pendiente', 'Pendiente', 'Activa', 'En curso', 'Cerrada', 'Finalizada']);
  const creada = fecha(280);
  const postulaciones = [];
  const cuantas = int(0, 2);
  for (let k = 0; k < cuantas; k++) {
    const e = pick(estudiantes);
    if (e._id === empleador._id || postulaciones.some((p) => p.documento === e._id)) continue;
    postulaciones.push({ documento: e._id, nombre: nombre(e), estado: 'Pendiente', postulado_en: new Date(creada.getTime() + 3600000) });
  }
  let trabajador = null;
  const calificaciones = [];
  if (['En curso', 'Cerrada', 'Finalizada'].includes(estado) && postulaciones.length) {
    postulaciones.forEach((p, k) => { p.estado = k === 0 ? 'Aceptada' : 'Rechazada'; });
    trabajador = { documento: postulaciones[0].documento, nombre: postulaciones[0].nombre };
    if (estado === 'Finalizada') {
      calificaciones.push({ de: empleador._id, para: trabajador.documento, puntaje: NumberInt(int(1, 5)), comentario: null, creada_en: new Date(creada.getTime() + 5 * 86400000) });
      calificaciones.push({ de: trabajador.documento, para: empleador._id, puntaje: NumberInt(int(1, 5)), comentario: null, creada_en: new Date(creada.getTime() + 5 * 86400000) });
    }
  }
  totalPostulaciones += postulaciones.length;
  vacantes.push({
    _id: id,
    // El tipo de oferta depende de la categoría, como en la aplicación
    tipo: categoria === 'Mensajería' ? 'Mensajería' : categoria === 'Asesoría' ? 'Tutoría' : pick(['Trabajo', 'Servicio']),
    titulo: TITULOS[categoria],
    descripcion: `${TITULOS[categoria]}. Se paga al terminar.`,
    ubicacion: pick(LUGARES),
    fecha_servicio: new Date(creada.getTime() + int(1, 15) * 86400000),
    categoria,
    pago: NumberDecimal(String(int(10, 200) * 1000)),
    horas: NumberInt(int(1, 8)),
    estado,
    empleador: { documento: empleador._id, nombre: nombre(empleador) },
    trabajador,
    postulaciones,
    calificaciones,
    creada_en: creada,
  });
}
db.vacantes.insertMany(vacantes);

// Patrón computado: reputación de cada usuario a partir de las calificaciones
db.vacantes.aggregate([
  { $unwind: '$calificaciones' },
  { $group: { _id: '$calificaciones.para', promedio: { $avg: '$calificaciones.puntaje' }, total: { $sum: 1 } } },
]).forEach((r) => db.usuarios.updateOne({ _id: r._id }, { $set: { reputacion: { promedio: Double(r.promedio), total: NumberInt(r.total) } } }));

// ---------- conversaciones y mensajes ----------
const conAsignado = vacantes.filter((v) => v.trabajador);
const convs = [];
const mensajes = [];
for (let i = 0; i < Math.min(60, conAsignado.length); i++) {
  const v = conAsignado[i];
  const cid = 'CONV-' + String(100000 + i);
  const inicio = new Date(v.creada_en.getTime() + 7200000);
  const n = int(3, 15);
  let ultimo = null;
  for (let k = 0; k < n; k++) {
    const remitente = k % 2 === 0 ? v.trabajador.documento : v.empleador.documento;
    ultimo = { texto: `Mensaje ${k + 1} sobre "${v.titulo}"`, remitente, enviado_en: new Date(inicio.getTime() + k * 600000) };
    mensajes.push({ conversacion_id: cid, remitente, cuerpo: ultimo.texto, enviado_en: ultimo.enviado_en });
  }
  convs.push({
    _id: cid,
    vacante: { id: v._id, titulo: v.titulo },
    participantes: [v.empleador.documento, v.trabajador.documento],
    ultimo_mensaje: ultimo,
    leido_hasta: { [v.empleador.documento]: ultimo.enviado_en },
    creada_en: inicio,
  });
}
db.conversaciones.insertMany(convs);
db.mensajes.insertMany(mensajes);

// ---------- notificaciones ----------
const notifs = [];
vacantes.forEach((v) => v.postulaciones.forEach((p) => notifs.push({
  usuario: v.empleador.documento, tipo: 'new_application', mensaje: `${p.nombre} se postuló a "${v.titulo}"`,
  leida: rnd() < 0.6, creada_en: p.postulado_en,
})));
db.notificaciones.insertMany(notifs);

printjson({
  usuarios: db.usuarios.countDocuments(),
  vacantes: db.vacantes.countDocuments(),
  postulaciones: totalPostulaciones,
  conversaciones: db.conversaciones.countDocuments(),
  mensajes: db.mensajes.countDocuments(),
  notificaciones: db.notificaciones.countDocuments(),
});
