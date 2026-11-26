// ============================================================
// UniTrabajo - Modelo no relacional (MongoDB 8.x)
// Ejecutar con: mongosh "mongodb://127.0.0.1:27017/unitrabajo_nosql" 01_esquema_mongodb.js
// ------------------------------------------------------------
// Cinco colecciones. Se embebe lo que se lee junto y tiene tamaño
// acotado (postulaciones y calificaciones dentro de la vacante) y se
// separa lo que crece sin límite (mensajes, notificaciones).
// ============================================================

const ESTADOS_VACANTE = ['Pendiente', 'Activa', 'En curso', 'Cerrada', 'Finalizada'];
const ESTADOS_POSTULACION = ['Pendiente', 'Aceptada', 'Rechazada'];

db.getCollectionNames().forEach((c) => db.getCollection(c).drop());

// ---------- usuarios ----------
db.createCollection('usuarios', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['_id', 'nombres', 'apellidos', 'telefono', 'correo', 'tipo', 'estado', 'creado_en'],
      properties: {
        _id: { bsonType: 'string', pattern: '^[0-9]{6,12}$', description: 'documento de identidad' },
        nombres: {
          bsonType: 'object', required: ['primero'],
          properties: { primero: { bsonType: 'string' }, segundo: { bsonType: ['string', 'null'] } },
        },
        apellidos: {
          bsonType: 'object', required: ['primero'],
          properties: { primero: { bsonType: 'string' }, segundo: { bsonType: ['string', 'null'] } },
        },
        telefono: { bsonType: 'string', pattern: '^(3[0-9]{9}|60[0-9]{8})$' },
        correo: { bsonType: 'string', pattern: '^[^@\\s]+@[^@\\s]+$' },
        tipo: { enum: ['Estudiante', 'Externo'] },
        estado: { enum: ['A', 'I'] },
        universidad: {
          bsonType: ['object', 'null'],
          properties: { id: { bsonType: 'int' }, nombre: { bsonType: 'string' } },
        },
        descripcion: { bsonType: ['string', 'null'] },
        // Patrón computado: se recalcula al registrar cada calificación
        reputacion: {
          bsonType: 'object',
          properties: { promedio: { bsonType: 'double' }, total: { bsonType: 'int' } },
        },
        autorizacion_datos: { bsonType: ['date', 'null'] },
        creado_en: { bsonType: 'date' },
      },
    },
  },
});
db.usuarios.createIndex({ correo: 1 }, { unique: true });

// ---------- vacantes ----------
db.createCollection('vacantes', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['_id', 'tipo', 'titulo', 'categoria', 'pago', 'estado', 'empleador', 'creada_en'],
      properties: {
        _id: { bsonType: 'string', pattern: '^OFR-[0-9]{5}$' },
        tipo: { enum: ['Trabajo', 'Tutoría', 'Mensajería', 'Servicio'] },
        titulo: { bsonType: 'string', maxLength: 120 },
        descripcion: { bsonType: 'string' },
        ubicacion: { bsonType: 'string' },
        fecha_servicio: { bsonType: ['date', 'null'] },
        categoria: { bsonType: 'string' },
        pago: { bsonType: 'decimal', description: 'pesos colombianos' },
        horas: { bsonType: ['int', 'null'], minimum: 1 },
        estado: { enum: ESTADOS_VACANTE },
        // Referencia extendida: el listado muestra el nombre sin consultar usuarios
        empleador: {
          bsonType: 'object', required: ['documento', 'nombre'],
          properties: { documento: { bsonType: 'string' }, nombre: { bsonType: 'string' } },
        },
        trabajador: {
          bsonType: ['object', 'null'],
          properties: { documento: { bsonType: 'string' }, nombre: { bsonType: 'string' } },
        },
        postulaciones: {
          bsonType: 'array', maxItems: 200,
          items: {
            bsonType: 'object', required: ['documento', 'nombre', 'estado', 'postulado_en'],
            properties: {
              documento: { bsonType: 'string' },
              nombre: { bsonType: 'string' },
              estado: { enum: ESTADOS_POSTULACION },
              postulado_en: { bsonType: 'date' },
            },
          },
        },
        // Como máximo dos: empleador → trabajador y trabajador → empleador
        calificaciones: {
          bsonType: 'array', maxItems: 2,
          items: {
            bsonType: 'object', required: ['de', 'para', 'puntaje', 'creada_en'],
            properties: {
              de: { bsonType: 'string' },
              para: { bsonType: 'string' },
              puntaje: { bsonType: 'int', minimum: 1, maximum: 5 },
              comentario: { bsonType: ['string', 'null'] },
              creada_en: { bsonType: 'date' },
            },
          },
        },
        creada_en: { bsonType: 'date' },
      },
    },
  },
});
db.vacantes.createIndex({ estado: 1, creada_en: -1 });          // listado principal
db.vacantes.createIndex({ 'empleador.documento': 1, creada_en: -1 }); // Mis vacantes
db.vacantes.createIndex({ 'postulaciones.documento': 1 });       // Mis postulaciones (multikey)
db.vacantes.createIndex({ 'calificaciones.para': 1 });           // historial de calificaciones
db.vacantes.createIndex({ titulo: 'text', descripcion: 'text', categoria: 'text' }, { default_language: 'spanish' });

// ---------- conversaciones ----------
db.createCollection('conversaciones', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['_id', 'participantes', 'creada_en'],
      properties: {
        _id: { bsonType: 'string', pattern: '^CONV-[0-9]{6}$' },
        vacante: {
          bsonType: ['object', 'null'],
          properties: { id: { bsonType: 'string' }, titulo: { bsonType: 'string' } },
        },
        participantes: { bsonType: 'array', minItems: 2, maxItems: 2, uniqueItems: true, items: { bsonType: 'string' } },
        ultimo_mensaje: {
          bsonType: ['object', 'null'],
          properties: { texto: { bsonType: 'string' }, remitente: { bsonType: 'string' }, enviado_en: { bsonType: 'date' } },
        },
        leido_hasta: { bsonType: 'object', description: '{ <documento>: <fecha> }' },
        creada_en: { bsonType: 'date' },
      },
    },
  },
});
db.conversaciones.createIndex({ participantes: 1, 'ultimo_mensaje.enviado_en': -1 });
db.conversaciones.createIndex({ 'vacante.id': 1, participantes: 1 });

// ---------- mensajes (crece sin límite: colección aparte) ----------
db.createCollection('mensajes', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['conversacion_id', 'remitente', 'cuerpo', 'enviado_en'],
      properties: {
        conversacion_id: { bsonType: 'string' },
        remitente: { bsonType: 'string' },
        cuerpo: { bsonType: 'string', minLength: 1, maxLength: 2000 },
        enviado_en: { bsonType: 'date' },
      },
    },
  },
});
db.mensajes.createIndex({ conversacion_id: 1, enviado_en: 1 });

// ---------- notificaciones ----------
db.createCollection('notificaciones', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['usuario', 'tipo', 'mensaje', 'leida', 'creada_en'],
      properties: {
        usuario: { bsonType: 'string' },
        tipo: { enum: ['new_application', 'application_accepted', 'offer_closed', 'offer_finalized', 'worker_rated', 'employer_rated', 'new_message'] },
        mensaje: { bsonType: 'string' },
        leida: { bsonType: 'bool' },
        creada_en: { bsonType: 'date' },
      },
    },
  },
});
db.notificaciones.createIndex({ usuario: 1, leida: 1, creada_en: -1 });

print('Colecciones creadas: ' + db.getCollectionNames().sort().join(', '));
