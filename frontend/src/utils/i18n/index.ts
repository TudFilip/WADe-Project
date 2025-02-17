import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import roTranslation from './locales/ro/ro.json';
import enTranslation from './locales/en/en.json';

const resources = {
    ro: {
        translation: { ...roTranslation },
    },
    en: {
        translation: { ...enTranslation },
    },
};

i18n.use(initReactI18next).init({
    resources,
    lng: 'ro',
    fallbackLng: 'en',
    interpolation: {
        escapeValue: false,
    },
});

export default i18n;
