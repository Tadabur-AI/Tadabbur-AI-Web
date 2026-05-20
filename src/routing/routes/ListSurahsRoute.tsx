import ListSurahsPage from '../../pages/surahs/ListSurahsPage';
import { PlayPleasantlyProvider } from '../../components/PleasentPlay/PlayPleasantlyProvider';
import { VisualJourneyProvider } from '../../components/VisualJourney/VisualJourneyProvider';

export default function ListSurahsRoute() {
  return (
    <PlayPleasantlyProvider>
      <VisualJourneyProvider>
        <ListSurahsPage />
      </VisualJourneyProvider>
    </PlayPleasantlyProvider>
  );
}
