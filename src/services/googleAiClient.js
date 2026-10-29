import { GoogleGenerativeAI } from '@google/generative-ai';

// La clave se lee solo del entorno (.env). No se deja ninguna clave en el código.
const API_KEY = import.meta.env.VITE_GOOGLE_AI_API_KEY;
const MODEL = 'gemini-3-flash-preview';
const MAX_HISTORY = 20;

const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

// Contexto del sistema para el asistente
const SYSTEM_PROMPT = `Eres un asistente inteligente de UniTrabajo, una plataforma de micro-trabajos universitarios.

Tu rol es ayudar a los usuarios con:
- Consultas sobre cómo publicar y buscar vacantes de micro-trabajos
- Cómo crear perfiles, aplicar a trabajos y calificaciones
- Consejos sobre seguridad y buenas prácticas en la plataforma
- Resolución de problemas técnicos comunes
- Orientación sobre cómo funciona el sistema de calificaciones y mensajería

Sé amable, profesional y conciso. Si no sabes algo sobre UniTrabajo, sugiere que contacte con soporte.
Responde siempre en el idioma en que el usuario te escribe.`;

export const sendMessage = async (userMessage, conversationHistory = []) => {
  if (!genAI) {
    return {
      success: false,
      error: 'el asistente no está configurado (falta VITE_GOOGLE_AI_API_KEY)',
    };
  }

  try {
    // systemInstruction separa el contexto del diálogo. Antes el prompt se enviaba
    // como un turno de usuario y quedaban dos turnos 'user' seguidos.
    const model = genAI.getGenerativeModel({ model: MODEL, systemInstruction: SYSTEM_PROMPT });

    const messages = [
      ...conversationHistory.slice(-MAX_HISTORY),
      { role: 'user', content: userMessage },
    ];

    const response = await model.generateContent({
      contents: messages.map((msg) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      })),
    });

    const result = await response.response;
    const aiMessage = result.text();

    return {
      success: true,
      message: aiMessage,
    };
  } catch (error) {
    console.error('Error al comunicarse con Google AI:', error);
    return {
      success: false,
      error: error.message || 'Error al conectar con el asistente',
    };
  }
};
