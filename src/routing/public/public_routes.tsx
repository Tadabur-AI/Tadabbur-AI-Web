import { lazy } from "react";
import { Navigate, Route } from "react-router-dom";
import PlayPleasentlyButton from "../../components/PleasentPlay/PlayPleasentlyButton";

const AuthenticationPage = lazy(() => import("../../pages/authentication/authentication"));
const NotesPage = lazy(() => import("../../pages/notes/NotesPage"));
const ListSurahsRoute = lazy(() => import("../routes/ListSurahsRoute"));
const ReadSurahRoute = lazy(() => import("../routes/ReadSurahRoute"));

// Export a fragment of <Route> elements (not a component) so they can be
// used directly as children of <Routes> in router.tsx: {PublicRoutes}
const PublicRoutes = (
  <>
    <Route element={<Navigate to="/surahs" />} path="/" />
    <Route element={<AuthenticationPage />} path="/login" />
    <Route element={<ListSurahsRoute />} path="/surahs" />
    <Route element={<ReadSurahRoute />} path="/surah/:id" />
    <Route element={<NotesPage />} path="/notes" />
    {/* catch-all: redirect unknown paths to /surahs (replace with NotFound later) */}
    <Route path="*" element={<Navigate to="/surahs" replace />} />
    <Route path="/development-test" element={<PlayPleasentlyButton />} />
  </>
);

export default PublicRoutes;
