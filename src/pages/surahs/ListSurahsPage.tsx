import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import { BiBook, BiSearch } from "react-icons/bi";
import LogoLandscape from "../../components/common/LogoLandscape";
import { listSurahs, type SurahSummary } from "../../services/apis";
import { JUZ_METADATA } from "../../data/juz";
import PlayPleasentlyButton from "../../components/PleasentPlay/PlayPleasentlyButton";
import ReadWithTafsserButton from "../../components/PleasentPlay/ReadWithTafsserButton";
import { useNavigate } from 'react-router-dom';
import { usePlayPleasantly } from "../../components/PleasentPlay/PlayPleasantlyProvider";

export default function ListSurahsPage() {
  const [chapters, setChapters] = useState<SurahSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [revelationFilter, setRevelationFilter] = useState<
    "all" | "makkah" | "madinah"
  >("all");
  const [activeTab, setActiveTab] = useState<"surahs" | "juz">("surahs");
  const {
    startExperience,
    isLoading: isPleasantlyLoading,
    isActive: isPleasantlyActive,
  } = usePlayPleasantly();
  const navigate = useNavigate();

  useEffect(() => {
    async function loadChapters() {
      try {
        setLoading(true);
        setError(null);
        const data = await listSurahs();
        setChapters(data);
      } catch (err) {
        console.error("Failed to load chapters:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load chapters"
        );
      } finally {
        setLoading(false);
      }
    }

    loadChapters();
  }, []);

  const chaptersById = useMemo(() => {
    const lookup = new Map<number, SurahSummary>();
    chapters.forEach((chapter) => lookup.set(chapter.id, chapter));
    return lookup;
  }, [chapters]);

  const filteredChapters = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return chapters.filter((chapter) => {
      const matchesSearch =
        !query ||
        chapter.nameSimple.toLowerCase().includes(query) ||
        chapter.nameArabic.includes(query) ||
        chapter.translatedName.name.toLowerCase().includes(query) ||
        chapter.id.toString() === query;
      const matchesRevelation =
        revelationFilter === "all" ||
        chapter.revelationPlace === revelationFilter;
      return matchesSearch && matchesRevelation;
    });
  }, [chapters, revelationFilter, searchQuery]);

  const filteredJuz = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) {
      return JUZ_METADATA;
    }

    return JUZ_METADATA.filter((juz) => {
      const normalizedNumber = `juz ${juz.number}`;
      const numberMatch =
        juz.number.toString() === query ||
        normalizedNumber === query ||
        normalizedNumber.replace(" ", "") === query ||
        normalizedNumber.includes(query);
      const nameMatch =
        juz.name.toLowerCase().includes(query) ||
        juz.arabicName.toLowerCase().includes(query);
      const summaryMatch = juz.summary.toLowerCase().includes(query);
      const sectionMatch = juz.sections.some((section) => {
        const chapter = chaptersById.get(section.surahId);
        const englishName = chapter?.nameSimple?.toLowerCase();
        const arabicName = chapter?.nameArabic;
        const translated = chapter?.translatedName.name?.toLowerCase();
        const surahIdMatch = section.surahId.toString() === query;
        const rangeStrings = [
          `${section.surahId}:${section.startAyah}`,
          `${section.surahId}:${section.endAyah}`,
          `${section.surahId}:${section.startAyah}-${section.endAyah}`,
        ];
        const rangeMatch = rangeStrings.some(
          (value) =>
            value.toLowerCase() === query || value.toLowerCase().includes(query)
        );
        return (
          surahIdMatch ||
          (englishName && englishName.includes(query)) ||
          (arabicName && arabicName.includes(query)) ||
          (translated && translated.includes(query)) ||
          rangeMatch
        );
      });

      return numberMatch || nameMatch || summaryMatch || sectionMatch;
    });
  }, [chaptersById, searchQuery]);

  const searchPlaceholder =
    activeTab === "surahs"
      ? "Search by surah name or number..."
      : "Search by Juz number, surah, or ayah reference (e.g. 2:142)";

  return (
    <DashboardLayout
      sidebarItems={[
        {
          label: "Surahs",
          path: "/surahs",
          icon: <BiBook />,
        },
      ]}
      screenTitle={<LogoLandscape />}
      userProfile={null}
    >
      <div className="p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-6 text-primary">List of Surahs</h1>

          <div className="mb-6 flex gap-2">
            <button
              onClick={() => setActiveTab("surahs")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === "surahs"
                  ? "bg-primary text-on-primary"
                  : "border border-border bg-surface text-text hover:border-primary"
              }`}
            >
              Surahs
            </button>
            <button
              onClick={() => setActiveTab("juz")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === "juz"
                  ? "bg-primary text-on-primary"
                  : "border border-border bg-surface text-text hover:border-primary"
              }`}
            >
              Juz
            </button>
          </div>

          <div className="mb-6">
            <div className="relative">
              <BiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-border py-2.5 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface text-text"
              />
            </div>
            {searchQuery && (
              <p className="mt-2 text-sm text-text-muted">
                {activeTab === "surahs"
                  ? `Found ${filteredChapters.length} surah${
                      filteredChapters.length !== 1 ? "s" : ""
                    }`
                  : `Found ${filteredJuz.length} juz`}
              </p>
            )}
          </div>

          {activeTab === "surahs" && (
            <div className="mb-6 flex gap-2 flex-wrap">
              <button
                onClick={() => setRevelationFilter("all")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  revelationFilter === "all"
                    ? "bg-primary text-on-primary"
                    : "border border-border bg-surface text-text hover:border-primary"
                }`}
              >
                All Surahs
              </button>
              <button
                onClick={() => setRevelationFilter("makkah")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  revelationFilter === "makkah"
                    ? "bg-primary text-on-primary"
                    : "border border-border bg-surface text-text hover:border-primary"
                }`}
              >
                Meccan (مكي)
              </button>
              <button
                onClick={() => setRevelationFilter("madinah")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  revelationFilter === "madinah"
                    ? "bg-primary text-on-primary"
                    : "border border-border bg-surface text-text hover:border-primary"
                }`}
              >
                Medinan (مدني)
              </button>
            </div>
          )}

          {loading && (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
              <p className="mt-2 text-text-muted">Loading surahs...</p>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 p-4 text-center">
              <p className="text-danger">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 text-sm text-danger hover:underline"
              >
                Try again
              </button>
            </div>
          )}

          {!loading && !error && (
            <>
              {activeTab === "surahs" ? (
                <ul className="space-y-2">
                  {filteredChapters.length > 0 ? (
                    filteredChapters.map((chapter) => (
                      <li
                        key={chapter.id}
                        className="border border-border rounded-lg p-4 hover:border-primary hover:bg-surface-2 transition-colors bg-surface"
                      >
                        <div className="flex flex-col gap-4">
                          <Link
                            to={`/surah/${chapter.id}`}
                            className="flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3">
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                                {chapter.id}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-text">
                                  {chapter.nameSimple}
                                </p>
                                <p className="text-sm text-text-muted">
                                  {chapter.versesCount} verses -{" "}
                                  {chapter.revelationPlace === "makkah"
                                    ? "Meccan"
                                    : "Medinan"}
                                </p>
                              </div>
                            </div>
                            <p className="text-xl text-primary font-arabic shrink-0">
                              {chapter.nameArabic}
                            </p>
                          </Link>
                          <div className="w-full flex justify-end items-center gap-3">
                            
                            <PlayPleasentlyButton
                              disabled={
                                isPleasantlyLoading || isPleasantlyActive
                              }
                              onClick={() => {
                                startExperience({
                                  title: `Surah ${chapter.nameSimple}`,
                                  subtitle: `${chapter.nameArabic} - ${
                                    chapter.translatedName?.name ??
                                    "Translation unavailable"
                                  }`,
                                  segments: [
                                    {
                                      surahId: chapter.id,
                                      label: `Surah ${chapter.nameSimple}`,
                                    },
                                  ],
                                });
                              }}
                            />
                            <ReadWithTafsserButton
                              onClick={() => navigate(`/surah/${chapter.id}?tafsir=ai`)}
                            />
                          </div>
                        </div>
                      </li>
                    ))
                  ) : (
                    <li className="text-center py-8 text-text-muted">
                      No surahs found matching "{searchQuery}"
                    </li>
                  )}
                </ul>
              ) : (
                <ul className="space-y-3">
                  {filteredJuz.length > 0 ? (
                    filteredJuz.map((juz) => (
                      <li
                        key={juz.number}
                        className="border border-border rounded-lg p-4 bg-surface"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-lg font-semibold text-text">
                              {juz.name}
                            </p>
                            <p className="text-sm text-text-muted">
                              {juz.summary}
                            </p>
                          </div>
                          <span className="text-xl text-primary font-arabic">
                            {juz.arabicName}
                          </span>
                        </div>
                        <div className="mt-4 space-y-2">
                          {juz.sections.map((section) => {
                            const chapter = chaptersById.get(section.surahId);
                            const englishName =
                              chapter?.nameSimple ?? `Surah ${section.surahId}`;
                            const arabicName = chapter?.nameArabic;
                            const query = new URLSearchParams({
                              start: String(section.startAyah),
                              end: String(section.endAyah),
                              juz: String(juz.number),
                            }).toString();

                            return (
                              <Link
                                key={`${juz.number}-${section.surahId}-${section.startAyah}`}
                                to={`/surah/${section.surahId}?${query}`}
                                className="flex flex-col gap-1 rounded-md border border-border px-3 py-2 transition-colors hover:border-primary hover:bg-surface-2 sm:flex-row sm:items-center sm:justify-between bg-surface-2"
                              >
                                <div>
                                  <p className="font-medium text-text">
                                    {englishName}
                                  </p>
                                  {arabicName && (
                                    <p className="text-primary font-arabic text-lg">
                                      {arabicName}
                                    </p>
                                  )}
                                </div>
                                <p className="text-sm text-text-muted">
                                  Ayat {section.startAyah} - {section.endAyah}
                                </p>
                              </Link>
                            );
                          })}
                        </div>
                        <div className="mt-4 w-full flex justify-end items-center gap-3">
                          
                          <PlayPleasentlyButton
                            disabled={isPleasantlyLoading || isPleasantlyActive}
                            onClick={() => {
                              const segments = juz.sections.map((section) => {
                                const chapter = chaptersById.get(
                                  section.surahId
                                );
                                return {
                                  surahId: section.surahId,
                                  startAyah: section.startAyah,
                                  endAyah: section.endAyah,
                                  label: `${
                                    chapter?.nameSimple ??
                                    `Surah ${section.surahId}`
                                  } - Ayat ${section.startAyah}-${
                                    section.endAyah
                                  }`,
                                };
                              });

                              startExperience({
                                title: `Juz ${juz.number} - ${juz.name}`,
                                subtitle: juz.summary,
                                segments,
                              });
                            }}
                          />
                          <ReadWithTafsserButton
                            onClick={() => navigate(`/surah/${juz.sections[0].surahId}?tafsir=ai`)}
                          />
                        </div>
                      </li>
                    ))
                  ) : (
                    <li className="text-center py-8 text-text-muted">
                      No juz found matching "{searchQuery}"
                    </li>
                  )}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
