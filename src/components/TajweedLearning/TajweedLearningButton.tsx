import { FiBookOpen } from 'react-icons/fi';
import { useTajweedLearning, type TajweedLearningRequest } from './TajweedLearningProvider';

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
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      className={`btn-secondary ${className}`}
      aria-label="Start Tajweed Learning Mode"
    >
      <FiBookOpen size={16} />
      <span>Tajweed</span>
    </button>
  );
}
