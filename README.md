# UniTrabajo

UniTrabajo es una plataforma web desarrollada con React, Vite y Supabase que conecta estudiantes universitarios con oportunidades de micro-trabajos y servicios de transporte compartido dentro de la comunidad universitaria.

## Descripción del proyecto

La plataforma busca solucionar dos problemáticas frecuentes entre los estudiantes universitarios:

* La dificultad para acceder a oportunidades laborales debido a la falta de experiencia previa.
* Los altos costos de transporte para desplazarse hacia la universidad.

Para ello, UniTrabajo integra un módulo de publicación y búsqueda de micro-trabajos, así como un sistema de transporte compartido entre estudiantes.

---

## Requisitos previos

Antes de ejecutar el proyecto, asegúrate de contar con lo siguiente:

### Software requerido

* Node.js versión 20 o superior.
* npm versión 10 o superior.
* Git.
* Visual Studio Code o cualquier editor de código compatible.

### Acceso al proyecto

Para utilizar la aplicación es necesario contar con las credenciales del proyecto de Supabase proporcionadas por el responsable del sistema.

Las credenciales deben ser solicitadas a:

Yenderson Enrique Martínez Méndez

Estas credenciales incluyen:

* URL del proyecto Supabase.
* Clave pública (Anon Key).

---

## Clonar el repositorio

Clonar el repositorio en el equipo local:

```bash
git clone https://github.com/usuario/unitrabajo.git
```

Ingresar al directorio del proyecto:

```bash
cd unitrabajo
```

---

## Instalación de dependencias

Instalar todas las dependencias necesarias para ejecutar el proyecto:

```bash
npm install
```

Este comando descargará e instalará automáticamente los paquetes definidos en el archivo package.json.

---

## Configuración de variables de entorno

Crear un archivo llamado:

```text
.env
```

en la raíz del proyecto.

Agregar las siguientes variables utilizando las credenciales proporcionadas por el administrador del proyecto:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_clave_publica
```

Importante:

* No compartir estas credenciales con personas ajenas al proyecto.
* No subir el archivo .env al repositorio.
* Verificar que el archivo se encuentre en la raíz del proyecto.

---

## Ejecución del proyecto

Para iniciar el servidor de desarrollo ejecutar:

```bash
npm run dev
```

Una vez iniciado, la aplicación estará disponible en:

```text
http://localhost:5173
```

---

## Scripts disponibles

### Ejecutar entorno de desarrollo

```bash
npm run dev
```

### Generar versión de producción

```bash
npm run build
```

### Visualizar versión de producción

```bash
npm run preview
```

### Ejecutar análisis de código

```bash
npm run lint
```

---

## Estructura del proyecto

```text
src/
│
├── assets/
├── components/
├── pages/
├── services/
├── hooks/
├── context/
├── App.jsx
└── main.jsx

public/

.env
package.json
vite.config.js
```

---

## Tecnologías utilizadas

* React
* Vite
* JavaScript
* Supabase
* Tailwind CSS
* ESLint

---

## Solución de problemas comunes

### Error: node o npm no reconocido

Verificar la instalación ejecutando:

```bash
node -v
npm -v
```

Si alguno de los comandos no funciona, reinstalar Node.js.

### Error al instalar dependencias

Eliminar la carpeta node_modules y el archivo package-lock.json:

```bash
rm -rf node_modules
rm package-lock.json
```

Luego ejecutar nuevamente:

```bash
npm install
```

### Error de conexión con Supabase

Verificar que:

* El archivo .env existe.
* Las variables están correctamente escritas.
* Las credenciales fueron copiadas correctamente.
* El servidor fue reiniciado después de modificar el archivo .env.

Reiniciar la aplicación:

```bash
npm run dev
```

---

## Validación de la configuración

Para verificar que la configuración fue realizada correctamente, cualquier integrante del equipo debe seguir los siguientes pasos sin asistencia:

1. Clonar el repositorio.
2. Instalar las dependencias.
3. Solicitar las credenciales de Supabase al responsable del proyecto.
4. Configurar el archivo .env.
5. Ejecutar el proyecto mediante npm run dev.
6. Verificar que la aplicación carga correctamente en el navegador y que puede conectarse a Supabase.

La validación será exitosa cuando el sistema funcione sin errores de configuración ni problemas de conexión.

---

## Equipo de desarrollo

Yenderson Enrique Martínez Méndez

Danuil Alejandro Neira Navarro

Universidad Francisco de Paula Santander Ocaña

Programa de Ingeniería de Sistemas
