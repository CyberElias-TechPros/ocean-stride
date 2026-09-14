import React, { ReactNode, useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import { i18n } from './index';
import { useTheme } from '@/components/theme-provider';

interface I18nProviderProps {
  children: ReactNode;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
};

export default I18nProvider;
