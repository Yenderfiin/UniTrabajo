import { createContext, useContext, useState, useEffect } from 'react';

const AccessibilityContext = createContext();

const STORAGE_KEY = 'unitrabajo-accessibility';

const defaultSettings = {
  darkMode: false,
  highContrast: false,
  fontSize: 0, // 0 = normal, 1 = grande, 2 = extra grande
};

export function AccessibilityProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });

  // Persist settings to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  // Apply CSS classes to <html> element
  useEffect(() => {
    const html = document.documentElement;

    // Dark mode
    if (settings.darkMode) {
      html.classList.add('acc-dark');
    } else {
      html.classList.remove('acc-dark');
    }

    // High contrast
    if (settings.highContrast) {
      html.classList.add('acc-high-contrast');
    } else {
      html.classList.remove('acc-high-contrast');
    }

    // Font size
    html.classList.remove('acc-font-lg', 'acc-font-xl');
    if (settings.fontSize === 1) {
      html.classList.add('acc-font-lg');
    } else if (settings.fontSize === 2) {
      html.classList.add('acc-font-xl');
    }
  }, [settings]);

  const toggleDarkMode = () => {
    setSettings((prev) => ({ ...prev, darkMode: !prev.darkMode }));
  };

  const toggleHighContrast = () => {
    setSettings((prev) => ({ ...prev, highContrast: !prev.highContrast }));
  };

  const cycleFontSize = () => {
    setSettings((prev) => ({ ...prev, fontSize: (prev.fontSize + 1) % 3 }));
  };

  const resetAll = () => {
    setSettings(defaultSettings);
  };

  return (
    <AccessibilityContext.Provider
      value={{ settings, toggleDarkMode, toggleHighContrast, cycleFontSize, resetAll }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility debe usarse dentro de un AccessibilityProvider');
  }
  return context;
}
