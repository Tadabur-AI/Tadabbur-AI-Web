import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildVisualJourneyBackgroundAssetPath,
  buildVisualJourneyBackgroundPrompt,
  buildVisualJourneyManifest,
  getProceduralSceneCount,
  validateVisualJourneyPrompt,
} from '../src/utils/visualJourney';

test('procedural scene count is capped for long surahs', () => {
  assert.equal(getProceduralSceneCount(286), 16);
  assert.equal(getProceduralSceneCount(7), 1);
});

test('procedural manifests cover the requested ayah range without gaps', () => {
  const manifest = buildVisualJourneyManifest({
    surahId: 2,
    surahName: 'Al-Baqarah',
    versesCount: 286,
  });

  assert.equal(manifest.source, 'procedural');
  assert.equal(manifest.scenes.length, 16);
  assert.equal(manifest.scenes[0]?.startAyah, 1);
  assert.equal(manifest.scenes.at(-1)?.endAyah, 286);

  for (let index = 1; index < manifest.scenes.length; index += 1) {
    const previous = manifest.scenes[index - 1];
    const current = manifest.scenes[index];
    assert.equal(current?.startAyah, (previous?.endAyah ?? 0) + 1);
  }
});

test('curated Surah Yusuf manifest overrides neutral procedural labels', () => {
  const manifest = buildVisualJourneyManifest({
    surahId: 12,
    surahName: 'Yusuf',
    versesCount: 111,
  });

  assert.equal(manifest.source, 'curated');
  assert.equal(manifest.scenes[0]?.title, 'A Story Opens');
  assert.equal(manifest.scenes.at(-1)?.endAyah, 111);
  assert.ok(manifest.scenes.every((scene) => !scene.title.startsWith('Ayat ')));
});

test('unsafe visual prompts are blocked', () => {
  const validation = validateVisualJourneyPrompt('portrait of a man standing in a desert');

  assert.equal(validation.safe, false);
  assert.ok(validation.blockedTerms.includes('portrait'));
  assert.ok(validation.blockedTerms.includes('man'));
});

test('generated motif prompts pass the same safety validator', () => {
  const manifest = buildVisualJourneyManifest({ surahId: 1, versesCount: 7 });
  const scene = manifest.scenes[0];

  assert.ok(scene);
  const prompt = buildVisualJourneyBackgroundPrompt(scene);
  const validation = validateVisualJourneyPrompt(prompt);

  assert.equal(validation.safe, true);
});

test('background asset paths are stable and public-root relative', () => {
  assert.equal(
    buildVisualJourneyBackgroundAssetPath(12, 1),
    '/generated/visual-journeys/surah-012/scene-001.png',
  );
  assert.equal(
    buildVisualJourneyBackgroundAssetPath(114, 16, '.webp'),
    '/generated/visual-journeys/surah-114/scene-016.webp',
  );
});
