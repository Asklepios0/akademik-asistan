import React, { createContext, useContext, useMemo, useEffect } from 'react';
import { Platform } from 'react-native';
import { Language, TranslationKey, translate, getTranslations } from '../utils/i18n';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'tr',
  setLanguage: () => {},
  t: (key: TranslationKey) => key,
});

export const LanguageProvider: React.FC<{
  language: Language;
  onLanguageChange: (lang: Language) => void;
  children: React.ReactNode;
}> = ({ language, onLanguageChange, children }) => {
  // Sync HTML lang attribute dynamically for screen readers (iOS VoiceOver / Android TalkBack)
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const langCode = language === 'en' ? 'en' : 'tr';
      document.documentElement.lang = langCode;
      document.documentElement.setAttribute('lang', langCode);
      document.documentElement.setAttribute('xml:lang', langCode);
      const root = document.getElementById('root');
      if (root) {
        root.setAttribute('lang', langCode);
      }
    }
  }, [language]);

  const t = useMemo(() => {
    return (key: TranslationKey, params?: Record<string, string | number>): string => {
      return translate(language, key, params);
    };
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage: onLanguageChange,
      t,
    }),
    [language, onLanguageChange, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => useContext(LanguageContext);
