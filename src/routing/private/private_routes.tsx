import { Navigate, Outlet, Route, useLocation } from 'react-router-dom'
import { ChatPage, Homepage, NotesPage } from '../../pages'

const ProtectedRoutes = () => {
  // Replace with your real auth hook/context, e.g.:
  // const { user, loading } = useAuth();
  const user = null // TODO: wire up real auth
  const loading = false
  const location = useLocation()

  if (loading) return null // or a loading spinner

  return user ? <Outlet /> : <Navigate to="/login" state={{ from: location }} replace />
}

// Export a fragment of <Route> elements guarded by an outlet-based wrapper.
const PrivateRoutes = (
  <Route element={<ProtectedRoutes />}>
    <Route element={<Homepage />} path="/home" />
    <Route element={<NotesPage />} path="/notes" />
    <Route element={<ChatPage />} path="/chat" />
  </Route>
)

export default PrivateRoutes
