import React, { createContext, useContext } from 'react';
import { useUser } from './use-user';
import { useMutation } from '@tanstack/react-query';

type Language = 'es' | 'en';

type TranslationKeys = 
  | 'nav.forum'
  | 'nav.events'
  | 'nav.resources'
  | 'nav.login'
  | 'nav.register'
  | 'hero.title'
  | 'hero.subtitle'
  | 'hero.join'
  | 'auth.login'
  | 'auth.register'
  | 'auth.welcome'
  | 'auth.join';

type Translations = {
  [K in Language]: {
    [T in TranslationKeys]: string;
  };
};

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: TranslationKeys) => string;
};

const translations: Translations = {
  en: {
    'nav.forum': 'Forum',
    'nav.events': 'Events',
    'nav.resources': 'Resources',
    'nav.login': 'Login',
    'nav.register': 'Register',
    'hero.title': 'Orange Pill Peru',
    'hero.subtitle': 'Join us in the financial revolution',
    'hero.join': 'Join the Community',
    'auth.login': 'Login',
    'auth.register': 'Register',
    'auth.welcome': 'Welcome back to Orange Pill Peru',
    'auth.join': 'Join the Bitcoin maximalist community',
  },
  es: {
    'nav.forum': 'Foro',
    'nav.events': 'Eventos',
    'nav.resources': 'Recursos',
    'nav.login': 'Iniciar Sesión',
    'nav.register': 'Registrarse',
    'hero.title': 'Orange Pill Perú',
    'hero.subtitle': 'Únete a la revolución financiera',
    'hero.join': 'Únete a la Comunidad',
    'auth.login': 'Iniciar Sesión',
    'auth.register': 'Registrarse',
    'auth.welcome': 'Bienvenido de nuevo a Orange Pill Perú',
    'auth.join': 'Únete a la comunidad Bitcoin maximalista',
  }
};

export const LanguageContext = createContext<LanguageContextType>({
  language: 'es',
  setLanguage: async () => {},
  t: (key) => key
});

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  
  const updateLanguage = useMutation({
    mutationFn: async (lang: Language) => {
      if (!user) return;
      
      const response = await fetch('/api/user/language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: lang }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to update language preference');
      }
    }
  });

  const language = (user?.language as Language) || 'es';

  const setLanguage = async (lang: Language) => {
    await updateLanguage.mutateAsync(lang);
  };

  const t = (key: TranslationKeys): string => {
    return translations[language][key];
  };

  const contextValue = {
    language,
    setLanguage,
    t
  };

  return React.createElement(LanguageContext.Provider, { value: contextValue }, children);
}
