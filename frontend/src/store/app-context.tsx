import { createContext, ReactNode, useEffect, useMemo, useState } from 'react';
import { createTheme, PaletteMode, Theme } from '@mui/material';
import i18n from '../utils/i18n';
import { AppService, AuthService } from '../services';
import { HistoryPromptItem } from '../constants';

type ContextProps = {
    theme: Theme;
    themeMode: PaletteMode;
    toggleColorScheme: () => void;
    language: string;
    changeLanguage: (lng: string) => void;
    isLoggedIn: boolean;
    setIsLoggedIn: (isLogged: boolean) => void;
    logoutUser: () => void;
    promptHistory: HistoryPromptItem[];
    addPromptIntoHistory: (data: HistoryPromptItem) => void;
    checkIfIsLoggedIn: () => boolean;
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
    promptHistory: [],
    addPromptIntoHistory: (data: HistoryPromptItem) => {},
    checkIfIsLoggedIn: () => false,
});

type AppContextProviderProps = {
    children: ReactNode;
};

export default function AppContextProvider({ children }: AppContextProviderProps) {
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const [mode, setMode] = useState<PaletteMode>('light');
    const [language, setLanguage] = useState<string>('ro');
    const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

    const [promptHistory, setPromptHistory] = useState<HistoryPromptItem[]>([]);

    const checkIfIsLoggedIn = () => {
        const authTokenIsValid = AuthService.authTokenIsValid();
        return authTokenIsValid;
    };

    useEffect(() => {
        const savedTheme = localStorage.getItem('themeMode') as PaletteMode | null;
        if (savedTheme) {
            setMode(savedTheme);
        }

        const savedLang = localStorage.getItem('language');
        if (savedLang) {
            setLanguage(savedLang);
            i18n.changeLanguage(savedLang);
        }

        setIsLoading(false);
    }, []);

    useEffect(() => {
        const tokenIsValid = checkIfIsLoggedIn();
        if (tokenIsValid) {
            AppService.getPromptHistory().then((data) => {
                if (!data.error) {
                    // const history = data.promptHistory;
                    // history.forEach((item) => {
                    //     const response = JSON.parse(item.grapqlResponse);
                    //     console.log(response);
                    // });
                    setPromptHistory(data.promptHistory);
                }
            });
        }
    }, [isLoggedIn]);

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

    const addPromptIntoHistory = (data: HistoryPromptItem) => {
        setPromptHistory((prev) => {
            return [data, ...prev];
        });
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
        promptHistory: promptHistory,
        addPromptIntoHistory: addPromptIntoHistory,
        checkIfIsLoggedIn: checkIfIsLoggedIn,
    };

    if (isLoading) {
        return null;
    }

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
