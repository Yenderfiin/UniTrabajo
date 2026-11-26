# Chatbot UniTrabajo - Google AI Integration

## ¿Qué se ha creado?

Se ha integrado un **chatbot inteligente** alimentado por Google AI Studio (Gemini) a tu aplicación UniTrabajo. El chatbot aparece como un botón flotante en la esquina inferior derecha de la pantalla y puede ayudar a los usuarios con preguntas sobre:

- Publicar y buscar vacantes de trabajo
- Rutas de transporte compartido y reservas
- Crear perfiles y postularse a trabajos
- Sistema de calificaciones
- Consejos de seguridad en la plataforma
- Resolución de problemas técnicos

## Archivos Creados

### 1. **`src/services/googleAiClient.js`**
   - Servicio que gestiona la comunicación con Google AI Studio
   - Exporta la función `sendMessage()` para enviar mensajes
   - Configurable con variable de entorno `VITE_GOOGLE_AI_API_KEY`
   - Incluye sistema prompt específico para UniTrabajo

### 2. **`src/components/ChatBot.jsx`**
   - Componente React con la interfaz del chatbot
   - Botón flotante (bubble) en la esquina inferior derecha
   - Ventana expandible con historial de conversación
   - Indicador de estado en tiempo real (punto verde pulsante)
   - Animación de escritura mientras el bot responde

### 3. **`.env.local.example`**
   - Ejemplo de configuración de variables de entorno
   - Documenta cómo configurar la API key (opcional)

## Instalación

### Paso 1: Instalar la dependencia
```bash
npm install
```

Esto instalará `@google/generative-ai` que ya está agregada en `package.json`.

### Paso 2: (Opcional) Configurar variable de entorno
Si prefieres no dejar la API key en el código, crea un archivo `.env.local`:

```bash
VITE_GOOGLE_AI_API_KEY=tu_api_key_aqui
```

El código ya está configurado para usar esto automáticamente.

### Paso 3: Ejecutar el proyecto
```bash
npm run dev
```

## Características

✅ **Botón flotante** - Aparece en todas las páginas sin interferir  
✅ **Historial de chat** - Mantiene conversación durante la sesión  
✅ **Indicador de estado** - Muestra si el bot está escribiendo  
✅ **Timestamps** - Cada mensaje muestra la hora  
✅ **Responsive** - Se adapta a diferentes tamaños de pantalla  
✅ **Diseño moderno** - Coincide con el estilo de UniTrabajo  

## Personalización

### Cambiar el mensaje de bienvenida
Edita `src/components/ChatBot.jsx` en la línea donde se inicializa `messages`:

```javascript
{
  id: 1,
  type: 'bot',
  text: '¡Hola! 👋 Tu nuevo mensaje de bienvenida aquí',
  timestamp: new Date(),
}
```

### Cambiar el contexto del sistema (System Prompt)
Edita `src/services/googleAiClient.js` en la constante `SYSTEM_PROMPT`:

```javascript
const SYSTEM_PROMPT = `Eres un asistente que...`;
```

### Cambiar colores y estilos
El componente usa Tailwind CSS. Por ejemplo, para cambiar el color azul a verde:

- Busca `bg-blue-600` → `bg-green-600`
- Busca `focus:ring-blue-500` → `focus:ring-green-500`

### Cambiar posición del botón
En `ChatBot.jsx`, modifica las clases en el botón flotante:
- `bottom-6` - Distancia desde abajo
- `right-6` - Distancia desde la derecha

## Arquitectura

```
App.jsx
  ├─ BrowserRouter
  │   ├─ Routes (todas las páginas)
  │   └─ ChatBot (disponible en todas lados)
  │
  └─ ChatBot.jsx
      └─ googleAiClient.js
          └─ Google AI API (Gemini)
```

## Notas de Seguridad

⚠️ **Importante**: La API key está en el código frontend por ahora (configuración simple). En producción, se recomienda:

1. Mover la API key a variables de entorno seguras
2. Implementar un backend intermedio que maneje las llamadas a Google AI
3. Usar autenticación y rate limiting

## Próximas mejoras sugeridas

📋 Agregar base de datos para guardar historial de chats por usuario  
🎯 Agregar preguntas frecuentes predefinidas  
⚙️ Integrar datos en tiempo real de la BD (ofertas, transporte disponible)  
📊 Analytics de preguntas más comunes  
🌐 Soporte multiidioma mejorado  

## Solución de Problemas

### El chatbot no responde
- Verifica que la API key sea correcta
- Abre la consola (F12) para ver mensajes de error
- Verifica que `@google/generative-ai` esté instalado

### Los mensajes tardan mucho
- Es normal si es la primera llamada
- Google AI puede tomar 2-5 segundos en responder

### No aparece el botón flotante
- Verifica que `ChatBot` esté importado en `App.jsx`
- Asegúrate de que el z-index no esté siendo cubierto por otro elemento

## Referencias

- [Google AI Studio Docs](https://ai.google.dev/)
- [Gemini API](https://ai.google.dev/docs/gemini_api_overview)
- [React Docs](https://react.dev/)
