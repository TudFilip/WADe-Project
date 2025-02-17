import { createContext, ReactNode, useEffect, useMemo, useState } from 'react';
import { createTheme, PaletteMode, Theme } from '@mui/material';
import i18n from '../utils/i18n';
import { AuthService } from '../services';

type ContextProps = {
    theme: Theme;
    themeMode: PaletteMode;
    toggleColorScheme: () => void;
    language: string;
    changeLanguage: (lng: string) => void;
    isLoggedIn: boolean;
    setIsLoggedIn: (isLogged: boolean) => void;
    logoutUser: () => void;
};

export const AppContext = createContext<ContextProps>({
    theme: undefined,
    themeMode: 'light',
    toggleColorScheme: () => {},
    language: 'ro',
    changeLanguage: (lng: string) => {},
    isLoggedIn: false,
    setIsLoggedIn: (isLogged: boolean) => {},
    logoutUser: () => {},
});

type AppContextProviderProps = {
    children: ReactNode;
};

export default function AppContextProvider({ children }: AppContextProviderProps) {
    const [mode, setMode] = useState<PaletteMode>('light');
    const [language, setLanguage] = useState<string>('ro');
    const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

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

    const logoutUser = () => {
        AuthService.logout();
        setIsLoggedIn(false);
    };

    const value: ContextProps = {
        theme: theme,
        themeMode: mode,
        toggleColorScheme: toggleColorScheme,
        language: language,
        changeLanguage: changeLanguage,
        isLoggedIn: isLoggedIn,
        setIsLoggedIn: setIsLoggedIn,
        logoutUser: logoutUser,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
