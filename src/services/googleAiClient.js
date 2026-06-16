import { GoogleGenerativeAI } from '@google/generative-ai';

// Inicializar el cliente de Google AI
// Usa variable de entorno si está disponible, sino usa la API key directa
const API_KEY = import.meta.env.VITE_GOOGLE_AI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

// Contexto del sistema para el asistente
const SYSTEM_PROMPT = `Eres un asistente inteligente de UniTrabajo, una plataforma de trabajos por encargo y transporte compartido. 

Tu rol es ayudar a los usuarios con:
- Consultas sobre cómo publicar y buscar vacantes de trabajo
- Información sobre rutas de transporte compartido y reservas
- Cómo crear perfiles, aplicar a trabajos y calificaciones
- Consejos sobre seguridad y buenas prácticas en la plataforma
- Resolución de problemas técnicos comunes
- Orientación sobre cómo funciona el sistema de calificaciones

Sé amable, profesional y conciso. Si no sabes algo sobre UniTrabajo, sugiere que contacte con soporte.
Responde siempre en el idioma en que el usuario te escribe.`;

export const sendMessage = async (userMessage, conversationHistory = []) => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

    // Construir el historial de mensajes
    const messages = [
      ...conversationHistory,
      {
        role: 'user',
        content: userMessage,
      },
    ];

    // Enviar el mensaje
    const response = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: SYSTEM_PROMPT }],
        },
        ...messages.map((msg) => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        })),
      ],
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
