import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import {
  BalanceScaleIcon,
  BookOpenTextIcon,
  CloudBigRainIcon,
  Compass01Icon,
  Lamp03Icon,
  LibraryIcon,
  Moon02Icon,
  Mosque03Icon,
  MountainIcon,
  PathIcon,
  Quran02Icon,
  Shield01Icon,
  SparklesIcon,
  StarsIcon,
  SunriseIcon,
  WaterfallDown01Icon,
} from '@hugeicons/core-free-icons';
import type { VisualJourneyIcon, VisualJourneyPalette, VisualJourneyScene } from '../../utils/visualJourney';

interface VisualJourneyArtworkProps {
  scene: VisualJourneyScene;
  className?: string;
}

const asHugeIcon = (icon: unknown) => icon as IconSvgElement;

const iconMap: Record<VisualJourneyIcon, IconSvgElement> = {
  quran: asHugeIcon(Quran02Icon),
  book: asHugeIcon(BookOpenTextIcon),
  sunrise: asHugeIcon(SunriseIcon),
  stars: asHugeIcon(StarsIcon),
  rain: asHugeIcon(CloudBigRainIcon),
  mountain: asHugeIcon(MountainIcon),
  path: asHugeIcon(PathIcon),
  water: asHugeIcon(WaterfallDown01Icon),
  library: asHugeIcon(LibraryIcon),
  mosque: asHugeIcon(Mosque03Icon),
  scale: asHugeIcon(BalanceScaleIcon),
  shield: asHugeIcon(Shield01Icon),
  lamp: asHugeIcon(Lamp03Icon),
  moon: asHugeIcon(Moon02Icon),
  compass: asHugeIcon(Compass01Icon),
  sparkles: asHugeIcon(SparklesIcon),
};

const Rays = ({ palette }: { palette: VisualJourneyPalette }) => (
  <g opacity="0.48">
    {Array.from({ length: 18 }, (_, index) => {
      const rotation = index * 20;
      return (
        <path
          key={rotation}
          d="M 400 130 L 426 382 L 400 405 L 374 382 Z"
          fill={index % 2 === 0 ? palette.accent : palette.accentAlt}
          opacity={index % 2 === 0 ? 0.28 : 0.18}
          transform={`rotate(${rotation} 400 400)`}
        />
      );
    })}
  </g>
);

const StarField = ({ palette }: { palette: VisualJourneyPalette }) => (
  <g opacity="0.78">
    {Array.from({ length: 44 }, (_, index) => {
      const x = 70 + ((index * 137) % 660);
      const y = 58 + ((index * 83) % 430);
      const radius = 1.4 + (index % 4) * 0.8;
      return (
        <circle
          key={`${x}-${y}`}
          cx={x}
          cy={y}
          r={radius}
          fill={index % 3 === 0 ? palette.accentAlt : palette.ink}
          opacity={0.32 + (index % 5) * 0.1}
        />
      );
    })}
  </g>
);

const GeometryBand = ({ palette }: { palette: VisualJourneyPalette }) => (
  <g opacity="0.64">
    {Array.from({ length: 9 }, (_, index) => {
      const x = 64 + index * 86;
      return (
        <path
          key={x}
          d={`M ${x} 604 L ${x + 42} 544 L ${x + 84} 604 L ${x + 42} 664 Z`}
          fill="none"
          stroke={index % 2 === 0 ? palette.accent : palette.accentAlt}
          strokeWidth="3"
          opacity="0.28"
        />
      );
    })}
  </g>
);

const renderMotif = (scene: VisualJourneyScene) => {
  const { palette } = scene;

  switch (scene.motif) {
    case 'dawn':
      return (
        <>
          <circle cx="400" cy="372" r="142" fill={palette.accentAlt} opacity="0.34" />
          <path d="M 0 448 C 150 390 245 486 400 430 C 560 372 654 456 800 398 L 800 720 L 0 720 Z" fill={palette.surface} />
          <path d="M 0 535 C 170 496 270 563 426 512 C 586 462 654 520 800 475 L 800 720 L 0 720 Z" fill={palette.background} opacity="0.62" />
          <Rays palette={palette} />
        </>
      );
    case 'rain':
      return (
        <>
          <path d="M 0 430 C 180 380 300 480 476 414 C 612 363 690 418 800 386 L 800 720 L 0 720 Z" fill={palette.surface} />
          {Array.from({ length: 36 }, (_, index) => {
            const x = 48 + ((index * 73) % 700);
            const y = 72 + ((index * 47) % 430);
            return (
              <path
                key={`${x}-${y}`}
                d={`M ${x} ${y} L ${x - 26} ${y + 64}`}
                stroke={index % 2 === 0 ? palette.accent : palette.ink}
                strokeWidth="3"
                strokeLinecap="round"
                opacity="0.24"
              />
            );
          })}
        </>
      );
    case 'mountain':
      return (
        <>
          <path d="M 46 612 L 216 306 L 352 612 Z" fill={palette.surface} />
          <path d="M 248 612 L 438 238 L 690 612 Z" fill={palette.accent} opacity="0.26" />
          <path d="M 486 612 L 634 352 L 790 612 Z" fill={palette.accentAlt} opacity="0.22" />
          <path d="M 0 612 L 800 612 L 800 720 L 0 720 Z" fill={palette.background} opacity="0.72" />
          <GeometryBand palette={palette} />
        </>
      );
    case 'path':
      return (
        <>
          <path d="M 0 438 C 160 390 272 430 400 405 C 552 374 654 412 800 365 L 800 720 L 0 720 Z" fill={palette.surface} />
          <path d="M 352 720 C 386 600 388 500 414 418 C 462 496 516 602 578 720 Z" fill={palette.accentAlt} opacity="0.36" />
          <path d="M 386 720 C 396 608 398 498 414 418 C 438 514 474 620 516 720 Z" fill={palette.background} opacity="0.62" />
          <Rays palette={palette} />
        </>
      );
    case 'ocean':
      return (
        <>
          <circle cx="604" cy="210" r="86" fill={palette.accentAlt} opacity="0.22" />
          {Array.from({ length: 7 }, (_, index) => {
            const y = 398 + index * 38;
            return (
              <path
                key={y}
                d={`M 0 ${y} C 90 ${y - 28} 160 ${y + 28} 250 ${y} C 340 ${y - 28} 420 ${y + 28} 512 ${y} C 612 ${y - 28} 704 ${y + 28} 800 ${y}`}
                fill="none"
                stroke={index % 2 === 0 ? palette.accent : palette.ink}
                strokeWidth="5"
                opacity={0.16 + index * 0.025}
              />
            );
          })}
        </>
      );
    case 'library':
      return (
        <>
          {Array.from({ length: 8 }, (_, index) => {
            const x = 108 + index * 76;
            return (
              <rect
                key={x}
                x={x}
                y={180 + (index % 3) * 18}
                width="44"
                height={320 - (index % 4) * 20}
                rx="12"
                fill={index % 2 === 0 ? palette.surface : palette.accent}
                opacity={index % 2 === 0 ? 0.72 : 0.24}
              />
            );
          })}
          <GeometryBand palette={palette} />
        </>
      );
    case 'mosque':
      return (
        <>
          <path d="M 220 610 L 220 390 C 220 292 298 226 400 226 C 502 226 580 292 580 390 L 580 610 Z" fill={palette.surface} />
          <path d="M 286 610 L 286 420 C 286 354 336 306 400 306 C 464 306 514 354 514 420 L 514 610 Z" fill={palette.background} opacity="0.84" />
          <path d="M 150 610 L 150 296 L 204 296 L 204 610 Z M 596 610 L 596 296 L 650 296 L 650 610 Z" fill={palette.accent} opacity="0.22" />
          <circle cx="400" cy="190" r="58" fill={palette.accentAlt} opacity="0.16" />
        </>
      );
    case 'scale':
    case 'shield':
    case 'lamp':
    case 'moon':
    case 'garden':
    case 'geometry':
    case 'roundel':
    case 'shamsa':
    case 'stars':
      return (
        <>
          <StarField palette={palette} />
          <Rays palette={palette} />
          <GeometryBand palette={palette} />
        </>
      );
    default:
      return (
        <>
          <Rays palette={palette} />
          <GeometryBand palette={palette} />
        </>
      );
  }
};

export default function VisualJourneyArtwork({ scene, className = '' }: VisualJourneyArtworkProps) {
  const { palette } = scene;
  const icon = iconMap[scene.icon] ?? asHugeIcon(Quran02Icon);

  return (
    <div className={`relative isolate overflow-hidden rounded-[26px] border border-white/15 ${className}`.trim()}>
      {scene.backgroundAsset ? (
        <img
          src={scene.backgroundAsset}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-70"
          aria-hidden="true"
        />
      ) : null}
      <svg
        viewBox="0 0 800 720"
        role="img"
        aria-label={`${scene.title} visual motif`}
        className="block h-full min-h-[280px] w-full"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <radialGradient id={`vj-glow-${scene.id}`} cx="50%" cy="42%" r="62%">
            <stop offset="0%" stopColor={palette.accent} stopOpacity="0.5" />
            <stop offset="46%" stopColor={palette.surface} stopOpacity="0.7" />
            <stop offset="100%" stopColor={palette.background} stopOpacity="1" />
          </radialGradient>
          <filter id={`vj-soft-${scene.id}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="18" />
          </filter>
        </defs>
        <rect width="800" height="720" fill={palette.background} />
        <circle cx="400" cy="356" r="305" fill={`url(#vj-glow-${scene.id})`} opacity="0.78" />
        <circle cx="400" cy="356" r="210" fill={palette.accent} opacity="0.08" filter={`url(#vj-soft-${scene.id})`} />
        {renderMotif(scene)}
        <circle cx="400" cy="360" r="146" fill={palette.background} opacity="0.72" />
        <circle cx="400" cy="360" r="118" fill="none" stroke={palette.accentAlt} strokeWidth="3" opacity="0.56" />
        <circle cx="400" cy="360" r="94" fill={palette.surface} opacity="0.62" />
      </svg>
      <div
        className="absolute left-1/2 top-1/2 grid h-28 w-28 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:h-32 sm:w-32"
        style={{
          borderColor: palette.accentAlt,
          color: palette.ink,
          background: `linear-gradient(145deg, ${palette.surface}, ${palette.background})`,
        }}
        aria-hidden="true"
      >
        <HugeiconsIcon icon={icon} size={54} strokeWidth={1.35} />
      </div>
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/40 to-transparent" aria-hidden="true" />
    </div>
  );
}
