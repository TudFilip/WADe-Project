import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router-dom';
import { lazy } from 'react';
import LazyLoader from './LazyLoader';

// Pages Components
const Layout = lazy(() => import('./Layout'));
const LoginPage = lazy(() => import('../components/login-page/LoginPage'));
const RegisterPage = lazy(() => import('../components/register-page/RegisterPage'));
const HomePage = lazy(() => import('../components/home-page/HomePage'));

const router = createBrowserRouter([
    {
        element: <Layout />,
        children: [
            {
                path: '/',
                element: <LazyLoader Component={LoginPage} />,
            },
            {
                path: '/login',
                element: <LazyLoader Component={LoginPage} />,
            },
            {
                path: '/register',
                element: <LazyLoader Component={RegisterPage} />,
            },
            {
                path: '/home',
                element: <LazyLoader Component={HomePage} />,
            },
        ],
    },
]);

const AppRouter = () => {
    return <RouterProvider router={router} />;
};

export default AppRouter;
