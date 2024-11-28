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
  | 'auth.join'
  | 'home.why_bitcoin'
  | 'home.sound_money.title'
  | 'home.sound_money.desc'
  | 'home.financial_freedom.title'
  | 'home.financial_freedom.desc'
  | 'home.community.title'
  | 'home.community.desc'
  | 'home.mining.title'
  | 'home.mining.desc'
  | 'footer.description'
  | 'footer.quick_links'
  | 'footer.connect';

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
    'home.why_bitcoin': 'Why Bitcoin Maximalism?',
    'home.sound_money.title': 'Sound Money',
    'home.sound_money.desc': 'Bitcoin is the hardest form of money ever created, immune to inflation and government control.',
    'home.financial_freedom.title': 'Financial Freedom',
    'home.financial_freedom.desc': 'Take control of your financial future with true peer-to-peer digital cash.',
    'home.community.title': 'Community',
    'home.community.desc': 'Join a growing community of Bitcoiners in Peru and around the world.',
    'home.mining.title': 'Bitcoin Mining in Peru',
    'home.mining.desc': 'Learn about Bitcoin mining opportunities in Peru and how you can participate in securing the network.',
    'footer.description': 'Building the Bitcoin community in Peru, one satoshi at a time.',
    'footer.quick_links': 'Quick Links',
    'footer.connect': 'Connect'
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
    'home.why_bitcoin': '¿Por qué Bitcoin Maximalismo?',
    'home.sound_money.title': 'Dinero Sólido',
    'home.sound_money.desc': 'Bitcoin es la forma de dinero más sólida jamás creada, inmune a la inflación y al control gubernamental.',
    'home.financial_freedom.title': 'Libertad Financiera',
    'home.financial_freedom.desc': 'Toma el control de tu futuro financiero con dinero digital verdaderamente entre pares.',
    'home.community.title': 'Comunidad',
    'home.community.desc': 'Únete a una comunidad creciente de Bitcoiners en Perú y alrededor del mundo.',
    'home.mining.title': 'Minería de Bitcoin en Perú',
    'home.mining.desc': 'Aprende sobre las oportunidades de minería de Bitcoin en Perú y cómo puedes participar en asegurar la red.',
    'footer.description': 'Construyendo la comunidad Bitcoin en Perú, un satoshi a la vez.',
    'footer.quick_links': 'Enlaces Rápidos',
    'footer.connect': 'Conectar'
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

  const [language, setLanguageState] = React.useState<Language>((user?.language as Language) || 'es');

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    if (user) {
      await updateLanguage.mutateAsync(lang);
    }
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
