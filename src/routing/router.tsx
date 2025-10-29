import { useEffect } from 'react'
import {BrowserRouter, Routes} from 'react-router-dom'
import PublicRoutes from './public/public_routes'
import PrivateRoutes from './private/private_routes'
import { initializeQuranLocalStorage } from '../utils/quranLocalStorage'


export const Router = () => {
    useEffect(() => {
        void initializeQuranLocalStorage();
    }, []);

    return (
        <BrowserRouter >
            <Routes>
                {PublicRoutes}
                {PrivateRoutes}
            </Routes>
        </BrowserRouter>
    )
}
