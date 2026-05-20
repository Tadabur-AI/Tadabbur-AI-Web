import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SURAH_VISUAL_JOURNEY_METADATA, type SurahVisualJourneyMetadata } from '../src/data/surahVisualJourneyMetadata';
import {
  buildVisualJourneyBackgroundAssetPath,
  buildVisualJourneyBackgroundPrompt,
  buildVisualJourneyManifest,
  validateVisualJourneyPrompt,
} from '../src/utils/visualJourney';

const MODEL_PATH = '@cf/stabilityai/stable-diffusion-xl-base-1.0';
const REQUEST_TIMEOUT_MS = 120_000;
const MAX_RETRIES = 2;

interface ScriptOptions {
  surah: 'all' | number;
  force: boolean;
  dryRun: boolean;
  concurrency: number;
  width: number | null;
  height: number | null;
}

interface GenerationJob {
  surah: SurahVisualJourneyMetadata;
  sceneIndex: number;
  prompt: string;
  assetPath: string;
  outputPath: string;
}

interface GenerationResult {
  job: GenerationJob;
  status: 'saved' | 'skipped' | 'failed' | 'dry-run';
  details?: string;
}

const currentFile = fileURLToPath(import.meta.url);
const projectRoot = join(dirname(currentFile), '..');

const parsePositiveInteger = (name: string, value: string) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
};

const loadDotEnvFile = (path: string) => {
  if (!existsSync(path)) {
    return;
  }

  const content = readFileSync(path, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      continue;
    }

    const [rawKey, ...valueParts] = trimmed.split('=');
    const key = rawKey?.trim();
    if (!key || process.env[key]) {
      continue;
    }

    const rawValue = valueParts.join('=').trim();
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, '');
  }
};

const parseOptions = (argv: string[]): ScriptOptions => {
  const options: ScriptOptions = {
    surah: 'all',
    force: false,
    dryRun: false,
    concurrency: 4,
    width: null,
    height: null,
  };

  for (const arg of argv) {
    if (arg === '--force') {
      options.force = true;
      continue;
    }
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    if (!arg.includes('=')) {
      throw new Error(`Unknown argument: ${arg}`);
    }

    const [rawKey, rawValue] = arg.split('=', 2);
    const key = rawKey?.trim().toLowerCase();
    const value = rawValue?.trim() ?? '';

    if (key === 'surah') {
      options.surah = value === 'all' ? 'all' : parsePositiveInteger('surah', value);
    } else if (key === 'concurrency' || key === 'max-workers' || key === 'workers') {
      options.concurrency = parsePositiveInteger('concurrency', value);
    } else if (key === 'width') {
      options.width = parsePositiveInteger('width', value);
    } else if (key === 'height') {
      options.height = parsePositiveInteger('height', value);
    } else {
      throw new Error(`Unknown option: ${key}`);
    }
  }

  if ((options.width === null) !== (options.height === null)) {
    throw new Error('width and height must be provided together');
  }

  return options;
};

const selectSurahs = (surah: ScriptOptions['surah']) => {
  if (surah === 'all') {
    return SURAH_VISUAL_JOURNEY_METADATA;
  }

  const selected = SURAH_VISUAL_JOURNEY_METADATA.find((item) => item.id === surah);
  if (!selected) {
    throw new Error(`Unknown surah: ${surah}`);
  }
  return [selected];
};

const extensionFromContentType = (contentType: string) => {
  const baseType = contentType.split(';', 1)[0]?.trim().toLowerCase() ?? '';
  if (baseType === 'image/jpeg') return 'jpg';
  if (baseType === 'image/webp') return 'webp';
  return 'png';
};

const shouldRetry = (statusCode: number) => [429, 500, 502, 503, 504].includes(statusCode);

const buildJobs = (surahs: SurahVisualJourneyMetadata[]) =>
  surahs.flatMap((surah) => {
    const manifest = buildVisualJourneyManifest({
      surahId: surah.id,
      surahName: surah.nameSimple,
      versesCount: surah.versesCount,
    });

    return manifest.scenes.map((scene, sceneIndex) => {
      const prompt = buildVisualJourneyBackgroundPrompt(scene);
      const validation = validateVisualJourneyPrompt(prompt);
      if (!validation.safe) {
        throw new Error(`Unsafe prompt for ${surah.nameSimple} scene ${sceneIndex + 1}: ${validation.blockedTerms.join(', ')}`);
      }

      const assetPath = buildVisualJourneyBackgroundAssetPath(surah.id, sceneIndex + 1);
      return {
        surah,
        sceneIndex: sceneIndex + 1,
        prompt,
        assetPath,
        outputPath: join(projectRoot, 'public', assetPath.replace(/^\//, '')),
      };
    });
  });

const getApiContext = () => {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId) {
    throw new Error('CLOUDFLARE_ACCOUNT_ID is missing');
  }
  if (!apiToken) {
    throw new Error('CLOUDFLARE_API_TOKEN is missing');
  }

  return {
    url: `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${MODEL_PATH}`,
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
  };
};

const requestImage = async (job: GenerationJob, options: ScriptOptions, api: ReturnType<typeof getApiContext>) => {
  if (existsSync(job.outputPath) && !options.force) {
    return {
      job,
      status: 'skipped',
      details: 'already exists',
    } satisfies GenerationResult;
  }

  const payload: Record<string, string | number> = { prompt: job.prompt };
  if (options.width && options.height) {
    payload.width = options.width;
    payload.height = options.height;
  }

  let lastError = 'unknown error';

  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt += 1) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      const response = await fetch(api.url, {
        method: 'POST',
        headers: api.headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const contentType = response.headers.get('content-type') ?? '';
      if (response.ok && contentType.toLowerCase().startsWith('image/')) {
        const extension = extensionFromContentType(contentType);
        const outputPath = job.outputPath.replace(/\.png$/, `.${extension}`);
        mkdirSync(dirname(outputPath), { recursive: true });
        if (options.force && existsSync(outputPath)) {
          rmSync(outputPath);
        }
        const image = Buffer.from(await response.arrayBuffer());
        writeFileSync(outputPath, image);
        return { job: { ...job, outputPath }, status: 'saved' } satisfies GenerationResult;
      }

      const body = (await response.text()).replace(/\s+/g, ' ').slice(0, 240);
      lastError = `status=${response.status} content-type=${contentType || 'unknown'} body=${body || '<empty>'}`;
      if (attempt <= MAX_RETRIES && shouldRetry(response.status)) {
        continue;
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'request failed';
      if (attempt <= MAX_RETRIES) {
        continue;
      }
    }
  }

  return { job, status: 'failed', details: lastError } satisfies GenerationResult;
};

const runWithConcurrency = async <T,>(items: T[], concurrency: number, worker: (item: T) => Promise<GenerationResult>) => {
  const results: GenerationResult[] = [];
  let nextIndex = 0;

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const item = items[nextIndex];
      nextIndex += 1;
      if (!item) {
        continue;
      }
      results.push(await worker(item));
    }
  });

  await Promise.all(workers);
  return results;
};

const main = async () => {
  loadDotEnvFile(join(projectRoot, '.env'));
  loadDotEnvFile(join(projectRoot, '..', 'backend', 'tadabbur-be', '.env'));

  const options = parseOptions(process.argv.slice(2));
  const selectedSurahs = selectSurahs(options.surah);
  const jobs = buildJobs(selectedSurahs);

  console.log(`Visual Journey background jobs: ${jobs.length}`);
  console.log(`Surah scope: ${options.surah}`);
  console.log(`Concurrency: ${options.concurrency}`);

  if (options.dryRun) {
    for (const job of jobs) {
      console.log(`[dry-run] ${job.surah.id}:${job.sceneIndex} -> ${job.assetPath} :: ${job.prompt}`);
    }
    return;
  }

  const api = getApiContext();
  const results = await runWithConcurrency(jobs, options.concurrency, (job) => requestImage(job, options, api));

  for (const result of results.sort((a, b) => a.job.surah.id - b.job.surah.id || a.job.sceneIndex - b.job.sceneIndex)) {
    const prefix = `[${String(result.job.surah.id).padStart(3, '0')} scene ${String(result.job.sceneIndex).padStart(3, '0')}]`;
    console.log(`${prefix} ${result.status}${result.details ? ` - ${result.details}` : ''}`);
  }

  const saved = results.filter((result) => result.status === 'saved').length;
  const skipped = results.filter((result) => result.status === 'skipped').length;
  const failed = results.filter((result) => result.status === 'failed').length;
  console.log(`Done. saved=${saved}, skipped=${skipped}, failed=${failed}`);

  if (failed > 0) {
    process.exitCode = 1;
  }
};

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
