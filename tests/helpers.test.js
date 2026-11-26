// Pruebas unitarias de src/utils/helpers.js
// Ejecutar con: npm test   (usa el runner nativo node:test, Node 20+)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getLocalDateString,
  isPastDate,
  normalizeEmail,
  isInstitutionalEmail,
  isAppAccepted,
  isAppRejected,
  isOfferOpen,
  parseDescription,
  buildDescription,
  formatPayment,
  getInitials,
} from '../src/utils/helpers.js';

test('PU-01 getLocalDateString usa la fecha local y no la UTC', () => {
  // 29 oct. 2026 a las 20:30 en Colombia ya es 30 oct. en UTC
  const nocheEnOcana = new Date(2026, 9, 29, 20, 30);
  assert.equal(getLocalDateString(nocheEnOcana), '2026-10-29');
});

test('PU-02 isPastDate acepta el día de hoy', () => {
  assert.equal(isPastDate(getLocalDateString()), false);
});

test('PU-03 isPastDate rechaza el día de ayer', () => {
  const ayer = new Date();
  ayer.setDate(ayer.getDate() - 1);
  assert.equal(isPastDate(getLocalDateString(ayer)), true);
});

test('PU-04 isPastDate con fecha vacía no bloquea', () => {
  assert.equal(isPastDate(''), false);
});

test('PU-05 normalizeEmail quita espacios y mayúsculas', () => {
  assert.equal(normalizeEmail('  Camilo.Quintero@UFPSO.edu.co '), 'camilo.quintero@ufpso.edu.co');
});

test('PU-06 isInstitutionalEmail acepta dominios .edu.co', () => {
  assert.equal(isInstitutionalEmail('lsanjuan@ufpso.edu.co'), true);
  assert.equal(isInstitutionalEmail('dpacheco@unal.edu.co'), true);
  assert.equal(isInstitutionalEmail('YCarrascal@UFPSO.EDU.CO'), true);
});

test('PU-07 isInstitutionalEmail rechaza dominios que solo terminan en "edu.co"', () => {
  // La validación anterior (endsWith("edu.co")) dejaba pasar estos casos
  assert.equal(isInstitutionalEmail('aropero@hotmailedu.co'), false);
  assert.equal(isInstitutionalEmail('usuarioedu.co'), false);
  assert.equal(isInstitutionalEmail('nascanio@gmail.com'), false);
});

test('PU-08 estados de postulación en masculino y femenino', () => {
  assert.equal(isAppAccepted('Aceptada'), true);
  assert.equal(isAppAccepted('Aceptado'), true);
  assert.equal(isAppRejected('Rechazado'), true);
  assert.equal(isAppRejected('Rechazada'), true);
  assert.equal(isAppAccepted('Pendiente'), false);
  assert.equal(isAppAccepted(null), false);
});

test('PU-09 vacantes abiertas: Pendiente y Activa', () => {
  assert.equal(isOfferOpen('Pendiente'), true);
  assert.equal(isOfferOpen('Activa'), true);
  assert.equal(isOfferOpen('En curso'), false);
  assert.equal(isOfferOpen('Finalizada'), false);
});

test('PU-10 buildDescription y parseDescription son inversas', () => {
  const texto = buildDescription('Pintar un salón', 'Dos manos de vinilo blanco.', 'Barrio La Primavera', '2026-11-05');
  assert.deepEqual(parseDescription(texto), {
    title: 'Pintar un salón',
    description: 'Dos manos de vinilo blanco.',
    location: 'Barrio La Primavera',
    date: '2026-11-05',
  });
});

test('PU-11 parseDescription con texto libre (datos de carga masiva)', () => {
  const r = parseDescription('Se necesita apoyo en inventario');
  assert.equal(r.title, '');
  assert.equal(r.description, 'Se necesita apoyo en inventario');
});

test('PU-12 formatPayment en pesos colombianos', () => {
  assert.match(formatPayment(50000), /50\.000/);
  assert.equal(formatPayment(null), 'A convenir');
});

test('PU-13 getInitials toma dos letras', () => {
  assert.equal(getInitials('Natalia Ascanio'), 'NA');
});
