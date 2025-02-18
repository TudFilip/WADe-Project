import { useContext } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { AppContext } from './store/app-context';
import AppRouter from './router/AppRouter';

function App() {
    const { theme } = useContext(AppContext);

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <AppRouter />
        </ThemeProvider>
    );
}

export default App;
