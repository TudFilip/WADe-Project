import { createRoot } from 'react-dom/client';
import App from './App.tsx';

import AppContextProvider from './store/app-context.tsx';

import './index.css';

createRoot(document.getElementById('root')!).render(
    <AppContextProvider>
        <App />
    </AppContextProvider>,
);
