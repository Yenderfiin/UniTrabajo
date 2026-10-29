import { useState, useRef, useEffect } from 'react';
import { useAccessibility } from '../contexts/AccessibilityContext';

const FONT_LABELS = ['Normal', 'Grande', 'Extra Grande'];

export default function AccessibilityWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef(null);
  const buttonRef = useRef(null);
  const { settings, toggleDarkMode, toggleHighContrast, cycleFontSize, resetAll } =
    useAccessibility();

  // Close panel when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (
        isOpen &&
        panelRef.current &&
        !panelRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <>
      {/* ── Floating button ── */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? 'Cerrar panel de accesibilidad' : 'Abrir panel de accesibilidad'}
        aria-expanded={isOpen}
        className={`
          acc-widget-btn
          fixed bottom-6 left-6 w-14 h-14 rounded-full shadow-lg
          transition-all duration-300 flex items-center justify-center z-[60]
          ${isOpen
            ? 'bg-purple-600 hover:bg-purple-700 rotate-0'
            : 'bg-gradient-to-br from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 hover:scale-110'
          }
          focus:outline-none focus:ring-4 focus:ring-purple-400/50
        `}
        title="Accesibilidad"
        id="accessibility-widget-toggle"
      >
        {isOpen ? (
          /* X icon */
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          /* Universal accessibility icon */
          <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm-1 6h2c.55 0 1 .45 1 1v3l2.4 4.8a1 1 0 0 1-1.79.9L13 14.5V17l1.5 4.5a1 1 0 1 1-1.9.64L12 19.5l-.6 2.64a1 1 0 1 1-1.9-.64L11 17v-2.5l-1.61 3.2a1 1 0 0 1-1.79-.9L10 12V9c0-.55.45-1 1-1z" />
            <circle cx="4" cy="12" r=".8" fill="currentColor" opacity=".5" />
            <circle cx="20" cy="12" r=".8" fill="currentColor" opacity=".5" />
            <circle cx="7" cy="5" r=".6" fill="currentColor" opacity=".4" />
            <circle cx="17" cy="5" r=".6" fill="currentColor" opacity=".4" />
          </svg>
        )}
      </button>

      {/* ── Accessibility Panel ── */}
      <div
        ref={panelRef}
        role="dialog"
        aria-label="Opciones de Accesibilidad"
        aria-modal="false"
        className={`
          acc-widget-panel
          fixed bottom-24 left-6 w-80 z-[60]
          rounded-2xl shadow-2xl overflow-hidden
          transition-all duration-300 origin-bottom-left
          ${isOpen
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 scale-90 translate-y-4 pointer-events-none'
          }
        `}
        id="accessibility-widget-panel"
      >
        {/* Header */}
        <div className="acc-widget-header bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm-1 6h2c.55 0 1 .45 1 1v3l2.4 4.8a1 1 0 0 1-1.79.9L13 14.5V17l1.5 4.5a1 1 0 1 1-1.9.64L12 19.5l-.6 2.64a1 1 0 1 1-1.9-.64L11 17v-2.5l-1.61 3.2a1 1 0 0 1-1.79-.9L10 12V9c0-.55.45-1 1-1z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight">Accesibilidad</h3>
                <p className="text-[11px] text-purple-200 leading-tight">Personaliza tu experiencia</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/70 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
              aria-label="Cerrar panel de accesibilidad"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Options Body */}
        <div className="acc-widget-body bg-white px-4 py-4 space-y-3">

          {/* ─ Dark Mode ─ */}
          <button
            onClick={toggleDarkMode}
            className={`
              acc-widget-option w-full flex items-center gap-3 px-4 py-3.5 rounded-xl
              border transition-all duration-200 group text-left
              ${settings.darkMode
                ? 'bg-purple-50 border-purple-300 shadow-sm shadow-purple-100'
                : 'bg-gray-50 border-gray-200 hover:border-purple-200 hover:bg-purple-50/50'
              }
            `}
            id="accessibility-dark-mode"
            aria-pressed={settings.darkMode}
          >
            {/* Icon */}
            <div className={`
              w-10 h-10 rounded-lg flex items-center justify-center shrink-0
              transition-colors duration-200
              ${settings.darkMode ? 'bg-purple-500 text-white' : 'bg-gray-200 text-gray-600 group-hover:bg-purple-100 group-hover:text-purple-500'}
            `}>
              {settings.darkMode ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
            </div>
            {/* Label & Status */}
            <div className="flex-1 min-w-0">
              <span className="acc-widget-label block font-semibold text-sm text-gray-800">Modo Oscuro</span>
              <span className="acc-widget-status block text-xs text-gray-500 mt-0.5">
                {settings.darkMode ? '🌙 Activado' : '☀️ Desactivado'}
              </span>
            </div>
            {/* Toggle indicator */}
            <div className={`
              w-11 h-6 rounded-full relative transition-colors duration-200 shrink-0
              ${settings.darkMode ? 'bg-purple-500' : 'bg-gray-300'}
            `}>
              <div className={`
                absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200
                ${settings.darkMode ? 'translate-x-5.5' : 'translate-x-0.5'}
              `}></div>
            </div>
          </button>

          {/* ─ High Contrast ─ */}
          <button
            onClick={toggleHighContrast}
            className={`
              acc-widget-option w-full flex items-center gap-3 px-4 py-3.5 rounded-xl
              border transition-all duration-200 group text-left
              ${settings.highContrast
                ? 'bg-amber-50 border-amber-300 shadow-sm shadow-amber-100'
                : 'bg-gray-50 border-gray-200 hover:border-amber-200 hover:bg-amber-50/50'
              }
            `}
            id="accessibility-high-contrast"
            aria-pressed={settings.highContrast}
          >
            <div className={`
              w-10 h-10 rounded-lg flex items-center justify-center shrink-0
              transition-colors duration-200
              ${settings.highContrast ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-600 group-hover:bg-amber-100 group-hover:text-amber-500'}
            `}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v18m0 0a9 9 0 010-18m0 18a9 9 0 000-18" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <span className="acc-widget-label block font-semibold text-sm text-gray-800">Alto Contraste</span>
              <span className="acc-widget-status block text-xs text-gray-500 mt-0.5">
                {settings.highContrast ? '◑ Activado' : '○ Desactivado'}
              </span>
            </div>
            <div className={`
              w-11 h-6 rounded-full relative transition-colors duration-200 shrink-0
              ${settings.highContrast ? 'bg-amber-500' : 'bg-gray-300'}
            `}>
              <div className={`
                absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200
                ${settings.highContrast ? 'translate-x-5.5' : 'translate-x-0.5'}
              `}></div>
            </div>
          </button>

          {/* ─ Font Size ─ */}
          <button
            onClick={cycleFontSize}
            className={`
              acc-widget-option w-full flex items-center gap-3 px-4 py-3.5 rounded-xl
              border transition-all duration-200 group text-left
              ${settings.fontSize > 0
                ? 'bg-teal-50 border-teal-300 shadow-sm shadow-teal-100'
                : 'bg-gray-50 border-gray-200 hover:border-teal-200 hover:bg-teal-50/50'
              }
            `}
            id="accessibility-font-size"
            aria-label={`Tamaño de texto: ${FONT_LABELS[settings.fontSize]}. Clic para cambiar.`}
          >
            <div className={`
              w-10 h-10 rounded-lg flex items-center justify-center shrink-0
              transition-colors duration-200
              ${settings.fontSize > 0 ? 'bg-teal-500 text-white' : 'bg-gray-200 text-gray-600 group-hover:bg-teal-100 group-hover:text-teal-500'}
            `}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <span className="acc-widget-label block font-semibold text-sm text-gray-800">Tamaño de Texto</span>
              <span className="acc-widget-status block text-xs text-gray-500 mt-0.5">
                Aa → {FONT_LABELS[settings.fontSize]}
              </span>
            </div>
            {/* Visual font-size indicator */}
            <div className="flex items-end gap-0.5 shrink-0">
              <span className={`text-xs font-bold transition-colors ${settings.fontSize >= 0 ? 'text-teal-500' : 'text-gray-300'}`}>A</span>
              <span className={`text-sm font-bold transition-colors ${settings.fontSize >= 1 ? 'text-teal-500' : 'text-gray-300'}`}>A</span>
              <span className={`text-base font-bold transition-colors ${settings.fontSize >= 2 ? 'text-teal-500' : 'text-gray-300'}`}>A</span>
            </div>
          </button>
        </div>

        {/* Footer — Reset */}
        <div className="acc-widget-footer bg-gray-50 border-t border-gray-100 px-4 py-3 flex items-center justify-between">
          <span className="text-[11px] text-gray-400">Preferencias guardadas</span>
          <button
            onClick={resetAll}
            className="text-xs font-medium text-purple-600 hover:text-purple-800 hover:underline transition-colors px-2 py-1 rounded-md hover:bg-purple-50"
            id="accessibility-reset"
          >
            Restablecer todo
          </button>
        </div>
      </div>
    </>
  );
}
