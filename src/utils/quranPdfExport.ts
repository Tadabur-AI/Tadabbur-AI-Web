import {
  buildQuranPages,
  DEFAULT_TRANSLATION_ID,
  mapRetrieveSurahVerse,
  type QuranPage,
  type QuranReaderVerse,
} from './quranPages';
import { retrieveSurah, type SurahSummary } from '../services/apis';

interface ExportSurahWordByWordPdfParams {
  chapter: SurahSummary;
  translationId?: number;
}

interface BuildWordByWordHtmlParams {
  chapter: SurahSummary;
  pages: QuranPage[];
}

const escapeHtml = (value: string | number | null | undefined) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const renderWord = (word: NonNullable<QuranReaderVerse['word_translations']>[number]) => `
  <span class="mushaf-word">
    <span class="mushaf-word__arabic">${escapeHtml(word.text)}</span>
    <span class="mushaf-word__translation">${escapeHtml(word.translation)}</span>
  </span>
`;

const renderVerse = (verse: QuranReaderVerse) => `
  <span class="mushaf-verse">
    ${(verse.word_translations ?? []).map(renderWord).join('')}
    <span class="mushaf-ayah-marker">${escapeHtml(verse.id)}</span>
  </span>
`;

const renderPage = (chapter: SurahSummary, page: QuranPage) => `
  <section class="mushaf-page">
    <header class="mushaf-page__header">
      <div class="mushaf-page__chapter">
        <p class="mushaf-page__arabic-title">${escapeHtml(chapter.nameArabic)}</p>
        <div>
          <p class="mushaf-page__latin-title">${escapeHtml(chapter.id)}. ${escapeHtml(chapter.nameSimple)}</p>
          <p class="mushaf-page__translation-title">${escapeHtml(chapter.translatedName.name)}</p>
        </div>
      </div>
      ${chapter.bismillahPre ? `
        <p class="mushaf-page__bismillah">بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ</p>
        <p class="mushaf-page__bismillah-translation">In the Name of Allah, the Most Compassionate, Most Merciful</p>
      ` : ''}
    </header>
    <div class="mushaf-page__flow" dir="rtl">
      ${page.verses.map(renderVerse).join('')}
    </div>
    <footer class="mushaf-page__footer">${escapeHtml(page.pageNumber)}</footer>
  </section>
`;

const buildWordByWordHtml = ({ chapter, pages }: BuildWordByWordHtmlParams) => `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(chapter.nameSimple)} Word-by-Word</title>
    <style>
      @font-face {
        font-family: Quran;
        src: url('/fonts/me_quran_volt_newmet.woff2') format('woff2');
        font-display: swap;
      }

      @page {
        size: A4 portrait;
        margin: 12mm;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        background: #fbf4e6;
        color: #15130f;
        font-family: Inter, ui-sans-serif, system-ui, sans-serif;
      }

      .mushaf-page {
        min-height: calc(297mm - 24mm);
        page-break-after: always;
        padding: 10mm 8mm 7mm;
        background:
          linear-gradient(180deg, rgba(255, 249, 238, 0.95), rgba(253, 244, 229, 0.98));
        border: 1px solid #eadfca;
      }

      .mushaf-page:last-child {
        page-break-after: auto;
      }

      .mushaf-page__header {
        margin-bottom: 7mm;
        text-align: center;
      }

      .mushaf-page__chapter {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6mm;
      }

      .mushaf-page__arabic-title,
      .mushaf-page__bismillah,
      .mushaf-word__arabic {
        font-family: Quran, serif;
      }

      .mushaf-page__arabic-title {
        margin: 0;
        font-size: 24pt;
        line-height: 1.25;
      }

      .mushaf-page__latin-title {
        margin: 0;
        font-size: 12pt;
        font-weight: 700;
        text-align: left;
      }

      .mushaf-page__translation-title {
        margin: 1mm 0 0;
        color: #66625a;
        font-size: 12pt;
        text-align: left;
      }

      .mushaf-page__bismillah {
        margin: 4mm 0 1mm;
        font-size: 17pt;
      }

      .mushaf-page__bismillah-translation {
        margin: 0;
        color: #66625a;
        font-size: 8.5pt;
      }

      .mushaf-page__flow {
        font-size: 0;
        line-height: 2.05;
        text-align: justify;
        text-align-last: center;
      }

      .mushaf-verse {
        display: inline;
      }

      .mushaf-word {
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        gap: 1.8mm;
        min-width: 15mm;
        margin: 0 1.8mm 3.4mm;
        vertical-align: top;
        break-inside: avoid;
      }

      .mushaf-word__arabic {
        display: block;
        font-size: 23pt;
        line-height: 1.35;
        white-space: nowrap;
      }

      .mushaf-word__translation {
        display: block;
        max-width: 24mm;
        border-bottom: 0.35mm solid #0b7b59;
        color: #075f46;
        direction: ltr;
        font-size: 7.4pt;
        font-weight: 650;
        line-height: 1.25;
        overflow-wrap: anywhere;
        padding-bottom: 0.7mm;
        text-align: center;
      }

      .mushaf-ayah-marker {
        display: inline-grid;
        place-items: center;
        width: 9mm;
        height: 9mm;
        margin: 0 1.8mm 2.4mm;
        border: 0.35mm solid #8c8067;
        border-radius: 999px;
        color: #514936;
        direction: ltr;
        font-size: 9pt;
        font-weight: 700;
        vertical-align: middle;
      }

      .mushaf-page__footer {
        margin-top: 5mm;
        color: #77716a;
        direction: ltr;
        font-size: 13pt;
        text-align: center;
      }
    </style>
  </head>
  <body>
    ${pages.map((page) => renderPage(chapter, page)).join('')}
    <script>
      window.addEventListener('load', () => {
        window.setTimeout(() => window.print(), 250);
      });
    </script>
  </body>
</html>
`;

export async function exportSurahWordByWordPdf({
  chapter,
  translationId = DEFAULT_TRANSLATION_ID,
}: ExportSurahWordByWordPdfParams) {
  const preview = window.open('', '_blank', 'width=960,height=1100');

  if (!preview) {
    throw new Error('The PDF preview window was blocked. Allow popups and try again.');
  }

  preview.document.open();
  preview.document.write(`
    <!doctype html>
    <html>
      <head><title>Preparing ${escapeHtml(chapter.nameSimple)} PDF</title></head>
      <body style="font-family: ui-sans-serif, system-ui, sans-serif; padding: 24px;">
        Preparing ${escapeHtml(chapter.nameSimple)} word-by-word PDF...
      </body>
    </html>
  `);
  preview.document.close();

  try {
    const response = await retrieveSurah({ surahNumber: chapter.id, translationId });
    const verses = response.map(mapRetrieveSurahVerse).sort((a, b) => a.id - b.id);
    const pages = buildQuranPages(verses, chapter.pages);
    const html = buildWordByWordHtml({ chapter, pages });

    preview.document.open();
    preview.document.write(html);
    preview.document.close();
  } catch (error) {
    preview.document.open();
    preview.document.write(`
      <!doctype html>
      <html>
        <head><title>PDF export failed</title></head>
        <body style="font-family: ui-sans-serif, system-ui, sans-serif; padding: 24px;">
          <h1 style="font-size: 18px;">PDF export failed</h1>
          <p>${escapeHtml(error instanceof Error ? error.message : 'Unable to prepare the PDF.')}</p>
        </body>
      </html>
    `);
    preview.document.close();
    throw error;
  }
}
