import ListSurahsPage from '../../pages/surahs/ListSurahsPage';
import { PlayPleasantlyProvider } from '../../components/PleasentPlay/PlayPleasantlyProvider';

export default function ListSurahsRoute() {
  return (
    <PlayPleasantlyProvider>
      <ListSurahsPage />
    </PlayPleasantlyProvider>
  );
}
