import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { translations, type Language, type TranslationKey } from '@/lib/i18n';

interface LanguageContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    const stored = localStorage.getItem('lang') as Language | null;
    return stored ?? 'en';
  });

  useEffect(() => {
    localStorage.setItem('lang', lang);
  }, [lang]);

  const setLang = (l: Language) => setLangState(l);
  const toggleLang = () => setLangState(prev => (prev === 'en' ? 'so' : 'en'));
  const t = (key: TranslationKey) => translations[lang][key] ?? translations.en[key] ?? key;

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
