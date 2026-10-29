import { supabase } from './supabaseClient';

export function newConversationId() {
  return `CONV-${Math.floor(100_000 + Math.random() * 900_000)}`;
}

/**
 * Busca la conversación entre dos usuarios sobre una oferta y la crea si no existe.
 * Devuelve { id } o { error } con un mensaje listo para mostrar.
 */
export async function findOrCreateConversation({ offerId, myDoc, otherDoc, subject = null }) {
  if (!myDoc || !otherDoc) {
    return { error: 'Completa tu perfil antes de iniciar una conversación.' };
  }
  if (myDoc === otherDoc) {
    return { error: 'No puedes iniciar una conversación contigo mismo.' };
  }

  // PostgREST exige and(...) para agrupar condiciones dentro de or().
  let query = supabase
    .from('conversations')
    .select('id')
    .or(
      `and(participant_a.eq.${myDoc},participant_b.eq.${otherDoc}),` +
      `and(participant_a.eq.${otherDoc},participant_b.eq.${myDoc})`,
    )
    .limit(1);
  query = offerId ? query.eq('id_offer', offerId) : query.is('id_offer', null);

  const { data: existing, error: findErr } = await query;
  if (findErr) return { error: 'No fue posible consultar tus conversaciones.' };
  if (existing?.[0]) return { id: existing[0].id };

  const id = newConversationId();
  const { error: insertErr } = await supabase.from('conversations').insert({
    id,
    id_offer: offerId,
    participant_a: myDoc,
    participant_b: otherDoc,
    subject,
    created_at: new Date().toISOString(),
  });
  if (insertErr) return { error: 'No fue posible crear la conversación.' };

  return { id };
}
