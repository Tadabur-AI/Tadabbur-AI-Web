import { Suspense, useEffect } from 'react'
import {BrowserRouter, Routes} from 'react-router-dom'
import PublicRoutes from './public/public_routes'
import PrivateRoutes from './private/private_routes'
import { initializeQuranLocalStorage } from '../utils/quranLocalStorage'

const RouterFallback = () => (
    <div className="flex h-screen items-center justify-center bg-background">
        <div className="skeleton h-8 w-40" />
    </div>
)

export const Router = () => {
    useEffect(() => {
        void initializeQuranLocalStorage();
    }, []);

    return (
        <BrowserRouter >
            <Suspense fallback={<RouterFallback />}>
                <Routes>
                    {PublicRoutes}
                    {PrivateRoutes}
                </Routes>
            </Suspense>
        </BrowserRouter>
    )
}
