import { useEffect } from 'react';
import ReadSurahPage from '../../pages/surahs/ReadSurahPage';
import { PlayPleasantlyProvider } from '../../components/PleasentPlay/PlayPleasantlyProvider';
import { TajweedLearningProvider } from '../../components/TajweedLearning/TajweedLearningProvider';

export default function ReadSurahRoute() {
  useEffect(() => {
    const href = '/fonts/me_quran_volt_newmet.woff2';
    const existingLink = document.querySelector<HTMLLinkElement>('link[data-reader-font="quran"]');
    if (existingLink) {
      return;
    }

    const preloadLink = document.createElement('link');
    preloadLink.rel = 'preload';
    preloadLink.as = 'font';
    preloadLink.href = href;
    preloadLink.type = 'font/woff2';
    preloadLink.crossOrigin = 'anonymous';
    preloadLink.dataset.readerFont = 'quran';
    document.head.appendChild(preloadLink);
  }, []);

  return (
    <PlayPleasantlyProvider>
      <TajweedLearningProvider>
        <ReadSurahPage />
      </TajweedLearningProvider>
    </PlayPleasantlyProvider>
  );
}
