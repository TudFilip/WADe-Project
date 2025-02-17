import { createContext, ReactNode, useEffect, useMemo, useState } from 'react';
import { createTheme, PaletteMode, Theme } from '@mui/material';
import i18n from '../utils/i18n';

type ContextProps = {
    theme: Theme;
    themeMode: PaletteMode;
    toggleColorScheme: () => void;
    language: string;
    changeLanguage: (lng: string) => void;
};

export const AppContext = createContext<ContextProps>({
    theme: undefined,
    themeMode: 'light',
    toggleColorScheme: () => {},
    language: 'ro',
    changeLanguage: (lng: string) => {},
});

type AppContextProviderProps = {
    children: ReactNode;
};

export default function AppContextProvider({ children }: AppContextProviderProps) {
    const [mode, setMode] = useState<PaletteMode>('light');
    const [language, setLanguage] = useState<string>('ro');

    useEffect(() => {
        const savedTheme = localStorage.getItem('themeMode') as PaletteMode | null;
        if (savedTheme) {
            setMode(savedTheme);
        }
    }, []);

    useEffect(() => {
        const savedLang = localStorage.getItem('language');
        if (savedLang) {
            setLanguage(savedLang);
            i18n.changeLanguage(savedLang);
        }
    }, []);

    const toggleColorScheme = () => {
        setMode((prev) => {
            const newTheme = prev === 'light' ? 'dark' : 'light';
            localStorage.setItem('themeMode', newTheme);
            return newTheme;
        });
    };

    const theme = useMemo(
        () =>
            createTheme({
                palette: {
                    mode: mode,
                },
            }),
        [mode],
    );

    const changeLanguage = (lng: string) => {
        setLanguage(lng);
        localStorage.setItem('language', lng);
        i18n.changeLanguage(lng);
    };

    const value: ContextProps = {
        theme: theme,
        themeMode: mode,
        toggleColorScheme: toggleColorScheme,
        language: language,
        changeLanguage: changeLanguage,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
