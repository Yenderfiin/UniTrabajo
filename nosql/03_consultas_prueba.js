// ============================================================
// UniTrabajo - Consultas del modelo no relacional con medición
// Ejecutar después de 02_datos_prueba.js:
//   mongosh "mongodb://127.0.0.1:27017/unitrabajo_nosql" 03_consultas_prueba.js
// Cada consulta reproduce una pantalla de la aplicación y se mide con
// explain('executionStats'): documentos examinados, devueltos, índice y ms.
// ============================================================

const resultados = [];
function medir(codigo, pantalla, cursorFn) {
  const plan = cursorFn().explain('executionStats');
  const st = plan.executionStats;
  const etapas = JSON.stringify(plan.queryPlanner.winningPlan);
  const indice = (etapas.match(/"indexName":"([^"]+)"/) || [null, 'COLLSCAN'])[1];
  resultados.push({
    codigo, pantalla,
    devueltos: st.nReturned,
    examinados: st.totalDocsExamined,
    claves: st.totalKeysExamined,
    indice,
    ms: st.executionTimeMillis,
  });
}

const estudiante = db.vacantes.findOne({ 'postulaciones.0': { $exists: true } }).postulaciones[0].documento;
const empleador = db.vacantes.findOne().empleador.documento;
const conConv = db.conversaciones.findOne();
const participante = conConv.participantes[0];
const conAviso = db.notificaciones.findOne({ leida: false }).usuario;

medir('NQ-01', 'Listado de vacantes abiertas', () =>
  db.vacantes.find({ estado: { $in: ['Pendiente', 'Activa'] } }).sort({ creada_en: -1 }));
medir('NQ-02', 'Mis postulaciones (estudiante)', () =>
  db.vacantes.find({ 'postulaciones.documento': estudiante }, { titulo: 1, estado: 1, 'postulaciones.$': 1 }));
medir('NQ-03', 'Mis vacantes (empleador)', () =>
  db.vacantes.find({ 'empleador.documento': empleador }).sort({ creada_en: -1 }));
const calificado = db.vacantes.findOne({ 'calificaciones.0': { $exists: true } }).calificaciones[0].para;
medir('NQ-04', 'Calificaciones recibidas', () =>
  db.vacantes.find({ 'calificaciones.para': calificado }, { titulo: 1, calificaciones: 1 }));
medir('NQ-05', 'Bandeja de conversaciones', () =>
  db.conversaciones.find({ participantes: participante }).sort({ 'ultimo_mensaje.enviado_en': -1 }));
medir('NQ-06', 'Historial de un chat', () =>
  db.mensajes.find({ conversacion_id: conConv._id }).sort({ enviado_en: 1 }));
medir('NQ-07', 'Notificaciones sin leer', () =>
  db.notificaciones.find({ usuario: conAviso, leida: false }).sort({ creada_en: -1 }));
medir('NQ-08', 'Búsqueda por texto "cálculo"', () =>
  db.vacantes.find({ $text: { $search: 'cálculo' } }));

print('\n=== Consultas ===');
console.table(resultados);

// ------------------------------------------------------------
// NP-01: selección atómica de candidato.
// En Supabase la selección son tres peticiones separadas (aceptar, rechazar
// al resto y cambiar la oferta). Aquí es un solo updateOne sobre un documento,
// atómico por diseño en MongoDB.
// ------------------------------------------------------------
const v = db.vacantes.findOne({ estado: 'Pendiente', 'postulaciones.1': { $exists: true } });
const elegido = v.postulaciones[0];
const r = db.vacantes.updateOne(
  { _id: v._id, estado: 'Pendiente' },
  {
    $set: {
      estado: 'En curso',
      trabajador: { documento: elegido.documento, nombre: elegido.nombre },
      'postulaciones.$[sel].estado': 'Aceptada',
      'postulaciones.$[otro].estado': 'Rechazada',
    },
  },
  { arrayFilters: [{ 'sel.documento': elegido.documento }, { 'otro.documento': { $ne: elegido.documento } }] },
);
const despues = db.vacantes.findOne({ _id: v._id }, { estado: 1, trabajador: 1, 'postulaciones.estado': 1 });
print('\n=== NP-01 selección atómica ===');
printjson({ modificados: r.modifiedCount, estado: despues.estado, postulaciones: despues.postulaciones.map((p) => p.estado) });

// Segunda selección sobre la misma vacante: ya no está Pendiente, no cambia nada
const r2 = db.vacantes.updateOne({ _id: v._id, estado: 'Pendiente' }, { $set: { estado: 'En curso' } });
printjson({ NP02_doble_seleccion_modificados: r2.modifiedCount });

// ------------------------------------------------------------
// NV: el validador $jsonSchema rechaza datos inválidos
// ------------------------------------------------------------
function intentar(codigo, fn) {
  try { fn(); print(`${codigo}: ACEPTADO (no esperado)`); }
  catch (e) { print(`${codigo}: RECHAZADO (esperado) -> código ${e.code} ${e.code === 11000 ? '(llave duplicada)' : '(DocumentValidationFailure)'}`); }
}
print('\n=== Validación de esquema ===');
intentar('NV-01 puntaje 6', () => db.vacantes.updateOne({ _id: v._id },
  { $push: { calificaciones: { de: 'x', para: 'y', puntaje: NumberInt(6), creada_en: new Date() } } }));
intentar('NV-02 estado inexistente', () => db.vacantes.updateOne({ _id: v._id }, { $set: { estado: 'Borrador' } }));
intentar('NV-03 mensaje vacío', () => db.mensajes.insertOne({ conversacion_id: conConv._id, remitente: participante, cuerpo: '', enviado_en: new Date() }));
intentar('NV-04 documento con letras', () => db.usuarios.insertOne({
  _id: 'ABC123', nombres: { primero: 'Prueba' }, apellidos: { primero: 'Prueba' }, telefono: '3001234567',
  correo: 'p@ufpso.edu.co', tipo: 'Estudiante', estado: 'A', creado_en: new Date(),
}));
intentar('NV-05 correo duplicado', () => db.usuarios.insertOne({
  _id: '1234567890', nombres: { primero: 'Prueba' }, apellidos: { primero: 'Prueba' }, telefono: '3001234567',
  correo: db.usuarios.findOne().correo, tipo: 'Estudiante', estado: 'A', creado_en: new Date(),
}));

print('\n=== Tamaño de las colecciones ===');
['usuarios', 'vacantes', 'conversaciones', 'mensajes', 'notificaciones'].forEach((c) => {
  const s = db.getCollection(c).stats();
  print(`${c}: ${s.count} documentos, promedio ${Math.round(s.avgObjSize)} bytes, índices ${s.nindexes}`);
});
