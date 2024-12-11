import React, { createContext, useContext } from 'react';
import { useUser } from './use-user';
import { useMutation } from '@tanstack/react-query';

type Language = 'es' | 'en';

type TranslationKeys = 
  | 'nav.forum'
  | 'nav.events'
  | 'nav.resources'
  | 'nav.businesses'
  | 'nav.login'
  | 'nav.register'
  | 'hero.title'
  | 'hero.subtitle'
  | 'hero.join'
  | 'carousel.title'
  | 'carousel.error'
  | 'carousel.empty'
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
  | 'footer.connect'
  | 'forum.title'
  | 'forum.new_post'
  | 'forum.login_to_post'
  | 'forum.create_post'
  | 'forum.categories'
  | 'forum.category.general'
  | 'forum.category.technical'
  | 'forum.category.trading'
  | 'forum.category.mining'
  | 'forum.category.lightning'
  | 'events.title'
  | 'events.subtitle'
  | 'events.create_event'
  | 'events.login_to_create'
  | 'events.upcoming'
  | 'resources.title'
  | 'resources.subtitle'
  | 'resources.submit'
  | 'resources.login_to_submit'
  | 'resources.approved'
  | 'account.preferences'
  | 'account.language_preference'
  | 'admin.posts.delete_success'
  | 'admin.posts.delete_error';

type Translations = {
  [K in Language]: {
    [T in TranslationKeys]: string;
  };
};

const translations: Translations = {
  en: {
    'nav.forum': 'Forum',
    'nav.events': 'Events',
    'nav.resources': 'Resources',
    'nav.businesses': 'Businesses',
    'nav.login': 'Login',
    'nav.register': 'Register',
    'hero.title': 'Orange Pill Peru',
    'hero.subtitle': 'Join us in the financial revolution',
    'hero.join': 'Join the Community',
    'carousel.title': 'Bitcoiners Making an Impact in Peru',
    'carousel.error': 'Failed to load carousel items',
    'carousel.empty': 'No items to display',
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
    'footer.connect': 'Connect',
    'forum.title': 'Forum',
    'forum.new_post': 'New Post',
    'forum.login_to_post': 'Login to Post',
    'forum.create_post': 'Create New Post',
    'forum.categories': 'Categories',
    'forum.category.general': 'General Discussion',
    'forum.category.technical': 'Technical Analysis',
    'forum.category.trading': 'Trading',
    'forum.category.mining': 'Mining',
    'forum.category.lightning': 'Lightning Network',
    'events.title': 'Bitcoin Events in Peru',
    'events.subtitle': 'Join the Bitcoin community in Peru',
    'events.create_event': 'Create Event',
    'events.login_to_create': 'Login to Create Event',
    'events.upcoming': 'Upcoming Events',
    'resources.title': 'Bitcoin Educational Resources',
    'resources.subtitle': 'Learn about Bitcoin and cryptocurrency',
    'resources.submit': 'Submit Resource',
    'resources.login_to_submit': 'Login to Submit Resource',
    'resources.approved': 'Approved Resources',
    'account.preferences': 'Preferences',
    'account.language_preference': 'Language Preference',
    'admin.posts.delete_success': 'Post deleted successfully',
    'admin.posts.delete_error': 'Failed to delete post'
  },
  es: {
    'nav.forum': 'Foro',
    'nav.events': 'Eventos',
    'nav.resources': 'Recursos',
    'nav.businesses': 'Negocios',
    'nav.login': 'Iniciar Sesión',
    'nav.register': 'Registrarse',
    'hero.title': 'Orange Pill Perú',
    'hero.subtitle': 'Únete a la revolución financiera',
    'hero.join': 'Únete a la Comunidad',
    'carousel.title': 'Bitcoiners Dejando Huella en Perú',
    'carousel.error': 'Error al cargar elementos del carrusel',
    'carousel.empty': 'No hay elementos para mostrar',
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
    'footer.connect': 'Conectar',
    'forum.title': 'Foro',
    'forum.new_post': 'Nueva Publicación',
    'forum.login_to_post': 'Inicia Sesión para Publicar',
    'forum.create_post': 'Crear Nueva Publicación',
    'forum.categories': 'Categorías',
    'forum.category.general': 'Discusión General',
    'forum.category.technical': 'Análisis Técnico',
    'forum.category.trading': 'Trading',
    'forum.category.mining': 'Minería',
    'forum.category.lightning': 'Red Lightning',
    'events.title': 'Eventos Bitcoin en Perú',
    'events.subtitle': 'Únete a la comunidad Bitcoin en Perú',
    'events.create_event': 'Crear Evento',
    'events.login_to_create': 'Inicia Sesión para Crear Evento',
    'events.upcoming': 'Próximos Eventos',
    'resources.title': 'Recursos Educativos Bitcoin',
    'resources.subtitle': 'Aprende sobre Bitcoin y criptomonedas',
    'resources.submit': 'Enviar Recurso',
    'resources.login_to_submit': 'Inicia Sesión para Enviar Recurso',
    'resources.approved': 'Recursos Aprobados',
    'account.preferences': 'Preferencias',
    'account.language_preference': 'Preferencia de Idioma',
    'admin.posts.delete_success': 'Publicación eliminada exitosamente',
    'admin.posts.delete_error': 'Error al eliminar la publicación'
  }
};

export const LanguageContext = createContext<{
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: TranslationKeys | `forum.category.${string}`) => string;
}>({
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
      // Always update localStorage first
      localStorage.setItem('language_preference', lang);
      
      // Only try to update server if user is logged in
      if (!user) return;
      
      try {
        const response = await fetch('/api/user/language', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ language: lang }),
          credentials: 'include'
        });
        
        if (!response.ok) {
          console.warn('Failed to update language preference on server, falling back to local storage');
        }
      } catch (error) {
        console.warn('Error updating language preference:', error);
        // Don't throw - we already updated localStorage
      }
    }
  });

  // Initialize language from user preference, localStorage, or default to 'es'
  const [language, setLanguageState] = React.useState<Language>(() => {
    if (user?.language) return user.language as Language;
    const storedLang = localStorage.getItem('language_preference') as Language;
    return storedLang && (storedLang === 'es' || storedLang === 'en') ? storedLang : 'es';
  });

  // Effect to sync language when user logs in/out
  React.useEffect(() => {
    if (user?.language && user.language !== language) {
      setLanguageState(user.language as Language);
    }
  }, [user?.language]);

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    await updateLanguage.mutateAsync(lang);
  };

  const t = (key: TranslationKeys | `forum.category.${string}`): string => {
    return translations[language][key as TranslationKeys] || key;
  };

  const contextValue = {
    language,
    setLanguage,
    t
  };

  return React.createElement(LanguageContext.Provider, { value: contextValue }, children);
}
