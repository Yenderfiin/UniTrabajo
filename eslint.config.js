import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // scratch*.js y check_tables.js son scripts sueltos de depuración, fuera de la app.
  globalIgnores(['dist', 'scratch*.js', 'check_tables.js']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      // Las páginas cargan sus datos desde useEffect (fetch + setState). La regla
      // marca ese patrón aunque el setState ocurra tras la respuesta del servidor.
      'react-hooks/set-state-in-effect': 'off',
      // Los contextos exportan el proveedor junto a su hook (useAuth, useAccessibility).
      'react-refresh/only-export-components': [
        'error',
        { allowConstantExport: true, allowExportNames: ['useAuth', 'useAccessibility'] },
      ],
    },
  },
  {
    // Pruebas y archivos de configuración corren en Node, no en el navegador.
    files: ['tests/**/*.js', '*.config.js'],
    languageOptions: { globals: globals.node },
  },
  {
    // Scripts del modelo alterno: se ejecutan dentro de mongosh.
    files: ['nosql/**/*.js'],
    languageOptions: {
      globals: {
        db: 'readonly',
        print: 'readonly',
        printjson: 'readonly',
        ObjectId: 'readonly',
        ISODate: 'readonly',
        NumberInt: 'readonly',
        NumberLong: 'readonly',
        NumberDecimal: 'readonly',
        Double: 'readonly',
      },
    },
  },
])
