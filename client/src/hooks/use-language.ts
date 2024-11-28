import { createContext, useContext, useState, ReactNode } from 'react';
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
  | 'footer.description'
  | 'footer.quick_links'
  | 'footer.connect'
  | 'home.why_bitcoin'
  | 'home.sound_money.title'
  | 'home.sound_money.desc'
  | 'home.financial_freedom.title'
  | 'home.financial_freedom.desc'
  | 'home.community.title'
  | 'home.community.desc'
  | 'home.mining.title'
  | 'home.mining.desc'
  | 'forum.title'
  | 'forum.new_post'
  | 'forum.login_to_post'
  | 'events.title'
  | 'events.subtitle'
  | 'events.upcoming'
  | 'events.create_event'
  | 'events.login_to_create'
  | 'resources.title'
  | 'resources.submit'
  | 'resources.approved'
  | 'resources.login_to_submit';

const translations: Record<Language, Record<TranslationKeys, string>> = {
  en: {
    'nav.forum': 'Forum',
    'nav.events': 'Events',
    'nav.resources': 'Resources',
    'nav.login': 'Login',
    'nav.register': 'Register',
    'hero.title': 'Orange Pill Peru',
    'hero.subtitle': 'Join us in the financial revolution',
    'hero.join': 'Join the Community',
    'footer.description': 'Building a stronger Bitcoin community in Peru',
    'footer.quick_links': 'Quick Links',
    'footer.connect': 'Connect',
    'home.why_bitcoin': 'Why Bitcoin?',
    'home.sound_money.title': 'Sound Money',
    'home.sound_money.desc': 'Bitcoin is the hardest form of money ever created',
    'home.financial_freedom.title': 'Financial Freedom',
    'home.financial_freedom.desc': 'Take control of your financial future',
    'home.community.title': 'Community',
    'home.community.desc': 'Join a growing community of Bitcoiners',
    'home.mining.title': 'Mining in Peru',
    'home.mining.desc': 'Learn about Bitcoin mining opportunities in Peru',
    'forum.title': 'Community Forum',
    'forum.new_post': 'New Post',
    'forum.login_to_post': 'Login to Post',
    'events.title': 'Bitcoin Events',
    'events.subtitle': 'Join our upcoming events and meetups',
    'events.upcoming': 'Upcoming Events',
    'events.create_event': 'Create Event',
    'events.login_to_create': 'Login to Create Event',
    'resources.title': 'Bitcoin Resources',
    'resources.submit': 'Submit Resource',
    'resources.approved': 'Approved Resources',
    'resources.login_to_submit': 'Login to Submit'
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
    'footer.description': 'Construyendo una comunidad Bitcoin más fuerte en Perú',
    'footer.quick_links': 'Enlaces Rápidos',
    'footer.connect': 'Conectar',
    'home.why_bitcoin': '¿Por qué Bitcoin?',
    'home.sound_money.title': 'Dinero Sólido',
    'home.sound_money.desc': 'Bitcoin es la forma más dura de dinero jamás creada',
    'home.financial_freedom.title': 'Libertad Financiera',
    'home.financial_freedom.desc': 'Toma el control de tu futuro financiero',
    'home.community.title': 'Comunidad',
    'home.community.desc': 'Únete a una comunidad creciente de Bitcoiners',
    'home.mining.title': 'Minería en Perú',
    'home.mining.desc': 'Aprende sobre las oportunidades de minería Bitcoin en Perú',
    'forum.title': 'Foro Comunitario',
    'forum.new_post': 'Nueva Publicación',
    'forum.login_to_post': 'Inicia Sesión para Publicar',
    'events.title': 'Eventos Bitcoin',
    'events.subtitle': 'Únete a nuestros próximos eventos y encuentros',
    'events.upcoming': 'Próximos Eventos',
    'events.create_event': 'Crear Evento',
    'events.login_to_create': 'Inicia Sesión para Crear Evento',
    'resources.title': 'Recursos Bitcoin',
    'resources.submit': 'Enviar Recurso',
    'resources.approved': 'Recursos Aprobados',
    'resources.login_to_submit': 'Inicia Sesión para Enviar'
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: TranslationKeys) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'es',
  setLanguage: async () => {},
  t: (key: TranslationKeys) => key
});

export function useLanguage() {
  const context = useContext(LanguageContext);
  return context;
}

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const { user } = useUser();
  const [language, setLanguageState] = useState<Language>((user?.language as Language) || 'es');
  
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

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    if (user) {
      await updateLanguage.mutateAsync(lang);
    }
  };

  const t = (key: TranslationKeys): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}
