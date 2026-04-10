import { Suspense, useEffect } from 'react'
import {BrowserRouter, Routes, useLocation} from 'react-router-dom'
import PublicRoutes from './public/public_routes'
import PrivateRoutes from './private/private_routes'
import { initializeQuranLocalStorage } from '../utils/quranLocalStorage'

const RouterFallback = () => (
    <div className="flex h-screen items-center justify-center bg-background">
        <div className="skeleton h-8 w-40" />
    </div>
)

const ScrollToTop = () => {
    const { pathname } = useLocation()

    useEffect(() => {
        if (pathname.startsWith('/surah/')) {
            window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
        }
    }, [pathname])

    return null
}

export const Router = () => {
    useEffect(() => {
        void initializeQuranLocalStorage();
    }, []);

    return (
        <BrowserRouter >
            <ScrollToTop />
            <Suspense fallback={<RouterFallback />}>
                <Routes>
                    {PublicRoutes}
                    {PrivateRoutes}
                </Routes>
            </Suspense>
        </BrowserRouter>
    )
}
