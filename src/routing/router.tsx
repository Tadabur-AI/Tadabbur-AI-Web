import {BrowserRouter, Routes} from 'react-router-dom'
import PublicRoutes from './public/public_routes'
import PrivateRoutes from './private/private_routes'


export const Router = () => {
    return (
        <BrowserRouter >
            <Routes>
                {PublicRoutes}
                {PrivateRoutes}
            </Routes>
        </BrowserRouter>
    )
}
