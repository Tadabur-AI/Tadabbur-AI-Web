import { createContext } from 'react';
import type { VisualJourneyRequest } from './VisualJourneyProvider';

export interface VisualJourneyContextValue {
  startJourney: (request: VisualJourneyRequest) => void;
  closeJourney: () => void;
  isActive: boolean;
  isLoading: boolean;
}

export const VisualJourneyContext = createContext<VisualJourneyContextValue | undefined>(undefined);
