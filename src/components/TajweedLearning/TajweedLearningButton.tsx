import { FiBookOpen } from 'react-icons/fi';
import { useTajweedLearning, type TajweedLearningRequest } from './TajweedLearningProvider';
import { ActionButton } from '../ui/primitives';

interface TajweedLearningButtonProps {
  surahId: number;
  surahName: string;
  surahNameArabic: string;
  startAyah?: number;
  endAyah?: number;
  className?: string;
}

export default function TajweedLearningButton({
  surahId,
  surahName,
  surahNameArabic,
  startAyah,
  endAyah,
  className = '',
}: TajweedLearningButtonProps) {
  const { startLearning, isLoading } = useTajweedLearning();

  const handleClick = () => {
    const request: TajweedLearningRequest = {
      surahId,
      surahName,
      surahNameArabic,
      startAyah,
      endAyah,
    };
    startLearning(request);
  };

  return (
    <ActionButton
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      variant="secondary"
      className={className}
      aria-label="Start Tajweed Learning Mode"
    >
      <FiBookOpen size={16} aria-hidden="true" />
      <span>Tajweed</span>
    </ActionButton>
  );
}
