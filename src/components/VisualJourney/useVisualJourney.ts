import { useContext } from 'react';
import { VisualJourneyContext } from './VisualJourneyContext';

export const useVisualJourney = () => {
  const context = useContext(VisualJourneyContext);
  if (!context) {
    throw new Error('useVisualJourney must be used within VisualJourneyProvider');
  }
  return context;
};
