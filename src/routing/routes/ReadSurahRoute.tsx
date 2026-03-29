import ReadSurahPage from '../../pages/surahs/ReadSurahPage';
import { TajweedLearningProvider } from '../../components/TajweedLearning/TajweedLearningProvider';

export default function ReadSurahRoute() {
  return (
    <TajweedLearningProvider>
      <ReadSurahPage />
    </TajweedLearningProvider>
  );
}
