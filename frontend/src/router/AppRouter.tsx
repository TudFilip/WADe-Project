import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router-dom';
import { lazy } from 'react';
import LazyLoader from './LazyLoader';

// Pages Components
const Layout = lazy(() => import('./Layout'));
const MainPage = lazy(() => import('../components/main-page/MainPage'));

const router = createBrowserRouter([
    {
        element: <Layout />,
        children: [
            {
                path: '/',
                element: <LazyLoader Component={MainPage} />,
            },
        ],
    },
]);

const AppRouter = () => {
    return <RouterProvider router={router} />;
};

export default AppRouter;
