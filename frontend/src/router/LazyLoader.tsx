import React, { Suspense } from 'react';
// import Spinner from '../ui-helpers/spinner/Spinner.tsx';

type LazyLoaderProps = {
    Component: React.ComponentType;
    fallback?: React.ReactNode;
};

const LazyLoader = ({ Component: Component, fallback = <></> }: LazyLoaderProps) => {
    return (
        <Suspense fallback={fallback}>
            <Component />
        </Suspense>
    );
};

export default LazyLoader;
