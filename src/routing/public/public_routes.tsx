import { Navigate, Route } from "react-router-dom";
import { AuthenticationPage, ListSurahsPage, ReadSurahPage } from "../../pages";
import PlayPleasentlyButton from "../../components/PleasentPlay/PlayPleasentlyButton";

// Export a fragment of <Route> elements (not a component) so they can be
// used directly as children of <Routes> in router.tsx: {PublicRoutes}
const PublicRoutes = (
  <>
    <Route element={<Navigate to="/surahs" />} path="/" />
    <Route element={<AuthenticationPage />} path="/login" />
    <Route element={<ListSurahsPage />} path="/surahs" />
    <Route element={<ReadSurahPage />} path="/surah/:id" />
    {/* catch-all: redirect unknown paths to /surahs (replace with NotFound later) */}
    <Route path="*" element={<Navigate to="/surahs" replace />} />
    <Route path="/development-test" element={<PlayPleasentlyButton />} />
  </>
);

export default PublicRoutes;
