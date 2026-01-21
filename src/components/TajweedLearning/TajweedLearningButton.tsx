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
      className={`
        inline-flex items-center gap-2 px-4 py-2 
        bg-primary text-white rounded-lg 
        hover:bg-secondary/80 
        disabled:opacity-50 disabled:cursor-not-allowed 
        transition-colors
        ${className}
      `}
      aria-label="Start Tajweed Learning Mode"
    >
      <FiBookOpen className="w-4 h-4" />
      <span className="text-sm font-medium">Tajweed Learning</span>
    </button>
  );
}
