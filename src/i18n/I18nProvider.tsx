import React, { ReactNode, useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n, { getCurrentLanguage } from './index';
import { useTheme } from '@/components/theme-provider';

interface I18nProviderProps {
  children: ReactNode;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  const { theme } = useTheme();

  // Update document direction based on language (RTL/LTR)
  useEffect(() => {
    const currentLang = getCurrentLanguage();
    const isRTL = ['ar', 'he', 'fa', 'ur'].includes(currentLang);
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLang;
  }, []);

  // Update theme class on html element
  useEffect(() => {
    const html = document.documentElement;
    if (theme === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }, [theme]);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
};

export default I18nProvider;
