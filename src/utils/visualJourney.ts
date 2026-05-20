import { getSurahVisualJourneyMetadata } from '../data/surahVisualJourneyMetadata';

export const VISUAL_JOURNEY_MAX_SCENES = 16;

export const visualJourneyMotifs = [
  'shamsa',
  'roundel',
  'dawn',
  'stars',
  'rain',
  'mountain',
  'path',
  'ocean',
  'library',
  'mosque',
  'scale',
  'shield',
  'lamp',
  'moon',
  'garden',
  'geometry',
] as const;

export type VisualJourneyMotif = (typeof visualJourneyMotifs)[number];

export const visualJourneyIcons = [
  'quran',
  'book',
  'sunrise',
  'stars',
  'rain',
  'mountain',
  'path',
  'water',
  'library',
  'mosque',
  'scale',
  'shield',
  'lamp',
  'moon',
  'compass',
  'sparkles',
] as const;

export type VisualJourneyIcon = (typeof visualJourneyIcons)[number];

export interface VisualJourneyPalette {
  id: string;
  background: string;
  surface: string;
  accent: string;
  accentAlt: string;
  ink: string;
  muted: string;
}

export interface VisualJourneyScene {
  id: string;
  startAyah: number;
  endAyah: number;
  title: string;
  motif: VisualJourneyMotif;
  palette: VisualJourneyPalette;
  icon: VisualJourneyIcon;
  reflectionPrompt: string;
  backgroundAsset?: string;
}

export interface VisualJourneyManifest {
  surahId: number;
  title: string;
  subtitle?: string;
  source: 'procedural' | 'curated' | 'curated-partial';
  scenes: VisualJourneyScene[];
}

export interface BuildVisualJourneyManifestInput {
  surahId: number;
  surahName?: string;
  surahNameArabic?: string;
  translatedName?: string;
  versesCount?: number;
  startAyah?: number;
  endAyah?: number;
}

export interface PromptValidationResult {
  safe: boolean;
  blockedTerms: string[];
}

const visualJourneyPalettes: VisualJourneyPalette[] = [
  {
    id: 'celestial-emerald',
    background: '#081814',
    surface: '#102820',
    accent: '#6ee7b7',
    accentAlt: '#f8d26a',
    ink: '#f7f3e8',
    muted: '#9eb7aa',
  },
  {
    id: 'dawn-saffron',
    background: '#24130f',
    surface: '#3a2018',
    accent: '#f2b84b',
    accentAlt: '#8fd9d0',
    ink: '#fff6df',
    muted: '#d8b98d',
  },
  {
    id: 'deep-indigo',
    background: '#101426',
    surface: '#1b2440',
    accent: '#8fb5ff',
    accentAlt: '#f2cf7f',
    ink: '#f5f7ff',
    muted: '#aab4d6',
  },
  {
    id: 'rain-slate',
    background: '#0b1d24',
    surface: '#12313b',
    accent: '#79d5e8',
    accentAlt: '#b8e986',
    ink: '#edf9fb',
    muted: '#9cc5cf',
  },
  {
    id: 'olive-parchment',
    background: '#182016',
    surface: '#273320',
    accent: '#c7d36f',
    accentAlt: '#efc66c',
    ink: '#fbf5e8',
    muted: '#b8c0a2',
  },
  {
    id: 'rose-earth',
    background: '#24151a',
    surface: '#3a2329',
    accent: '#f1a0a8',
    accentAlt: '#f2cf7f',
    ink: '#fff4f5',
    muted: '#d3adb2',
  },
] as const;

const defaultReflectionPrompt = 'What meaning from this passage should stay with you after the recitation?';

const blockedPromptTerms = [
  'allah',
  'god',
  'prophet',
  'messenger',
  'angel',
  'face',
  'portrait',
  'body',
  'human',
  'person',
  'people',
  'man',
  'woman',
  'boy',
  'girl',
  'child',
  'animal',
  'camel',
  'horse',
  'bird',
  'yusuf',
  'yunus',
  'musa',
  'isa',
  'ibrahim',
  'muhammad',
  'maryam',
  'nuh',
  'lut',
  'hud',
  'salih',
  'shuaib',
  'dawud',
  'sulayman',
  'zakariya',
  'yahya',
  'ayyub',
  'harun',
] as const;

const motifPromptMap: Record<VisualJourneyMotif, string> = {
  shamsa: 'ornamental shamsa medallion, layered Islamic geometry, luminous gold and emerald, abstract editorial illustration',
  roundel: 'ornamental roundel pattern, radial geometry, soft parchment texture, abstract editorial illustration',
  dawn: 'empty desert sunrise, soft horizon, geometric light rays, cinematic editorial background',
  stars: 'deep night sky, celestial star field, subtle Islamic geometry, abstract editorial background',
  rain: 'rain over a quiet abstract landscape, reflective surfaces, teal atmospheric light, editorial background',
  mountain: 'distant mountain silhouettes, dawn haze, geometric foreground layers, editorial background',
  path: 'winding empty path through abstract dunes, warm light, geometric composition, editorial background',
  ocean: 'open ocean and sky, quiet waves, geometric moonlight bands, editorial background',
  library: 'abstract library shelves and illuminated manuscript textures, geometric composition, editorial background',
  mosque: 'empty mosque arch silhouette, quiet courtyard light, geometric ornament, editorial background',
  scale: 'abstract balance scale geometry, symmetrical light and shadow, editorial background',
  shield: 'protective shield geometry, layered ornament, emerald and gold light, editorial background',
  lamp: 'single glowing lamp motif, patterned shadows, quiet dark room abstraction, editorial background',
  moon: 'crescent moon over empty horizon, celestial geometry, quiet blue light, editorial background',
  garden: 'abstract garden geometry, water channels and green light, non-figurative editorial background',
  geometry: 'layered Islamic geometric pattern, editorial vector-like composition, rich light and shadow',
};

const curatedScenesBySurah: Record<number, Array<Omit<VisualJourneyScene, 'id' | 'palette'>>> = {
  12: [
    {
      startAyah: 1,
      endAyah: 3,
      title: 'A Story Opens',
      motif: 'stars',
      icon: 'stars',
      reflectionPrompt: 'What makes a story worth slowing down for before its lessons unfold?',
    },
    {
      startAyah: 4,
      endAyah: 6,
      title: 'A Dream With Weight',
      motif: 'moon',
      icon: 'moon',
      reflectionPrompt: 'What private hopes or fears do you carry carefully?',
    },
    {
      startAyah: 7,
      endAyah: 18,
      title: 'Jealousy And Loss',
      motif: 'path',
      icon: 'path',
      reflectionPrompt: 'Where can envy distort what should have been love?',
    },
    {
      startAyah: 19,
      endAyah: 22,
      title: 'Hidden Mercy',
      motif: 'dawn',
      icon: 'sunrise',
      reflectionPrompt: 'Where might relief be moving before it is visible?',
    },
    {
      startAyah: 23,
      endAyah: 29,
      title: 'A Door And A Test',
      motif: 'shield',
      icon: 'shield',
      reflectionPrompt: 'What does restraint look like before anyone praises it?',
    },
    {
      startAyah: 30,
      endAyah: 35,
      title: 'Public Pressure',
      motif: 'roundel',
      icon: 'scale',
      reflectionPrompt: 'How does a crowd make wrong choices feel easier?',
    },
    {
      startAyah: 36,
      endAyah: 42,
      title: 'Light In Confinement',
      motif: 'lamp',
      icon: 'lamp',
      reflectionPrompt: 'What good can still be offered from a restricted place?',
    },
    {
      startAyah: 43,
      endAyah: 57,
      title: 'Meaning Becomes A Way Out',
      motif: 'geometry',
      icon: 'compass',
      reflectionPrompt: 'What changes when insight becomes responsibility?',
    },
    {
      startAyah: 58,
      endAyah: 87,
      title: 'A Long Return',
      motif: 'mountain',
      icon: 'mountain',
      reflectionPrompt: 'What kind of patience survives when the road is long?',
    },
    {
      startAyah: 88,
      endAyah: 101,
      title: 'Recognition And Forgiveness',
      motif: 'garden',
      icon: 'sparkles',
      reflectionPrompt: 'What would it take to forgive when you finally have power?',
    },
    {
      startAyah: 102,
      endAyah: 111,
      title: 'The Lesson Remains',
      motif: 'shamsa',
      icon: 'quran',
      reflectionPrompt: 'What did this passage teach you about how endings are read?',
    },
  ],
};

const getPaletteForScene = (surahId: number, sceneIndex: number) =>
  visualJourneyPalettes[(surahId + sceneIndex) % visualJourneyPalettes.length] ?? visualJourneyPalettes[0];

const getMotifForScene = (surahId: number, sceneIndex: number) =>
  visualJourneyMotifs[(surahId * 3 + sceneIndex) % visualJourneyMotifs.length] ?? 'shamsa';

const getIconForScene = (surahId: number, sceneIndex: number) =>
  visualJourneyIcons[(surahId + sceneIndex * 2) % visualJourneyIcons.length] ?? 'quran';

const normalizePositiveInteger = (value: number | undefined, fallback: number) =>
  Number.isFinite(value) && value && value > 0 ? Math.floor(value) : fallback;

const clampRange = (startAyah: number, endAyah: number, versesCount: number) => {
  const safeStart = Math.min(Math.max(1, startAyah), Math.max(1, versesCount));
  const safeEnd = Math.min(Math.max(safeStart, endAyah), Math.max(safeStart, versesCount));

  return { startAyah: safeStart, endAyah: safeEnd };
};

const buildSceneId = (surahId: number, startAyah: number, endAyah: number) =>
  `surah-${surahId}-ayat-${startAyah}-${endAyah}`;

export const getProceduralSceneCount = (versesCount: number) => {
  if (versesCount <= 7) return 1;
  if (versesCount <= 20) return 3;
  if (versesCount <= 50) return 5;
  if (versesCount <= 100) return 8;
  if (versesCount <= 150) return 10;
  if (versesCount <= 200) return 12;
  return VISUAL_JOURNEY_MAX_SCENES;
};

export const createProceduralScenes = ({
  surahId,
  versesCount,
  startAyah = 1,
  endAyah = versesCount,
}: {
  surahId: number;
  versesCount: number;
  startAyah?: number;
  endAyah?: number;
}): VisualJourneyScene[] => {
  const range = clampRange(startAyah, endAyah, versesCount);
  const ayahCount = range.endAyah - range.startAyah + 1;
  const sceneCount = Math.min(getProceduralSceneCount(ayahCount), ayahCount);
  const chunkSize = Math.ceil(ayahCount / sceneCount);
  const scenes: VisualJourneyScene[] = [];

  for (let index = 0; index < sceneCount; index += 1) {
    const sceneStart = range.startAyah + index * chunkSize;
    if (sceneStart > range.endAyah) {
      break;
    }
    const sceneEnd = Math.min(range.endAyah, sceneStart + chunkSize - 1);
    const motif = getMotifForScene(surahId, index);

    scenes.push({
      id: buildSceneId(surahId, sceneStart, sceneEnd),
      startAyah: sceneStart,
      endAyah: sceneEnd,
      title: `Ayat ${sceneStart}-${sceneEnd}`,
      motif,
      palette: getPaletteForScene(surahId, index),
      icon: getIconForScene(surahId, index),
      reflectionPrompt: defaultReflectionPrompt,
    });
  }

  return scenes;
};

export const validateVisualJourneyPrompt = (prompt: string): PromptValidationResult => {
  const normalizedPrompt = prompt.toLowerCase();
  const blockedTerms = blockedPromptTerms.filter((term) => {
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escapedTerm}\\b`, 'i').test(normalizedPrompt);
  });

  return {
    safe: blockedTerms.length === 0,
    blockedTerms,
  };
};

export const buildVisualJourneyBackgroundPrompt = (scene: VisualJourneyScene) => {
  const prompt = motifPromptMap[scene.motif];
  const validation = validateVisualJourneyPrompt(prompt);

  if (!validation.safe) {
    throw new Error(`Unsafe visual journey prompt for ${scene.id}: ${validation.blockedTerms.join(', ')}`);
  }

  return prompt;
};

export const buildVisualJourneyBackgroundAssetPath = (surahId: number, sceneIndex: number, extension = 'png') => {
  const normalizedSurah = String(surahId).padStart(3, '0');
  const normalizedScene = String(sceneIndex).padStart(3, '0');
  const normalizedExtension = extension.replace(/^\./, '') || 'png';

  return `/generated/visual-journeys/surah-${normalizedSurah}/scene-${normalizedScene}.${normalizedExtension}`;
};

export const findSceneForAyah = (scenes: VisualJourneyScene[], ayahNumber: number) =>
  scenes.find((scene) => ayahNumber >= scene.startAyah && ayahNumber <= scene.endAyah) ?? scenes[0] ?? null;

export const buildVisualJourneyManifest = ({
  surahId,
  surahName,
  surahNameArabic,
  translatedName,
  versesCount,
  startAyah,
  endAyah,
}: BuildVisualJourneyManifestInput): VisualJourneyManifest => {
  const metadata = getSurahVisualJourneyMetadata(surahId);
  const resolvedVersesCount = normalizePositiveInteger(versesCount, metadata?.versesCount ?? 1);
  const range = clampRange(
    normalizePositiveInteger(startAyah, 1),
    normalizePositiveInteger(endAyah, resolvedVersesCount),
    resolvedVersesCount,
  );
  const title = surahName ?? metadata?.nameSimple ?? `Surah ${surahId}`;
  const subtitle = [surahNameArabic, translatedName].filter(Boolean).join(' - ') || undefined;
  const curatedScenes = curatedScenesBySurah[surahId] ?? [];
  const clippedCuratedScenes = curatedScenes
    .map((scene, index): VisualJourneyScene | null => {
      const sceneStart = Math.max(scene.startAyah, range.startAyah);
      const sceneEnd = Math.min(scene.endAyah, range.endAyah);

      if (sceneStart > sceneEnd) {
        return null;
      }

      return {
        ...scene,
        id: buildSceneId(surahId, sceneStart, sceneEnd),
        startAyah: sceneStart,
        endAyah: sceneEnd,
        palette: getPaletteForScene(surahId, index),
      };
    })
    .filter((scene): scene is VisualJourneyScene => scene !== null);

  if (clippedCuratedScenes.length > 0) {
    const coversFullRange =
      clippedCuratedScenes[0]?.startAyah === range.startAyah &&
      clippedCuratedScenes[clippedCuratedScenes.length - 1]?.endAyah === range.endAyah;

    return {
      surahId,
      title,
      subtitle,
      source: coversFullRange ? 'curated' : 'curated-partial',
      scenes: clippedCuratedScenes,
    };
  }

  return {
    surahId,
    title,
    subtitle,
    source: 'procedural',
    scenes: createProceduralScenes({
      surahId,
      versesCount: resolvedVersesCount,
      startAyah: range.startAyah,
      endAyah: range.endAyah,
    }),
  };
};
