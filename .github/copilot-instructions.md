# Tadabbur AI Frontend - Copilot Instructions

## Project Overview
Quran study app built with **React 19 + TypeScript + Vite + Tailwind CSS v4**. Users read surahs, get AI-powered tafsir explanations, take notes, and chat with an Islamic AI assistant.

## Architecture

### Service Layer (`src/services/`)
- **apis.ts**: Primary Quran API (Cloudflare Workers backend at `tadabbur-be.eng-sharjeel-baig.workers.dev`)
- **quranResourcesService.ts**: Alternative API with Vercel backend (`VITE_API_BASE_URL`)
- **tafsirExplainerService.ts**: AI explanation generation for tafsir text

Both API services exist for resilience—check `quranLocalStorage.ts` for fallback patterns.

### Routing Pattern
Routes are defined as JSX fragments (not components) in `src/routing/`:
```tsx
// public/public_routes.tsx - returns <> <Route>... </>
// private/private_routes.tsx - uses outlet-based auth guard
```
Add new pages: create in `src/pages/`, export from `src/pages/index.ts`, add Route to appropriate file.

### Layout System
- **DashboardLayout**: Main app shell with sidebar, used by authenticated pages
- **ReadSurahLayout**: Specialized reader view for Quran reading
- **AuthLayout**: Split-screen for login/signup

### Feature Providers (`src/components/`)
Global providers wrap the app in `main.tsx` for overlay-based features:
- **PlayPleasantlyProvider**: Immersive verse playback with rain ambiance
- **TajweedLearningProvider**: Word-by-word slideshow for learning pronunciation

Pattern: Each provider exposes a hook (`usePlayPleasantly`, `useTajweedLearning`) and renders an overlay when active.

### State & Caching
- User preferences stored in `localStorage` with `tadabbur_` prefix (see `quranLocalStorage.ts`)
- API responses cached in `useRef<Map>()` within components (e.g., `tafseerCache`, `recitationCache`)
- Theme managed via React Context (`ThemeProvider` in `hooks/useTheme.tsx`)

## Key Conventions

### Component Patterns
- Use functional components with hooks
- Icons from `react-icons/fi` (Feather Icons)
- Default exports for pages and layouts
- Props interfaces defined above component

### Styling
- Tailwind v4 with CSS variables in `src/css/tailwind.css`
- Dark mode: use `dark:` prefix classes, respects `.dark` class on root
- Custom colors: `--color-primary`, `--color-secondary`, `--color-accent`
- Arabic text: `font-amiri` class (Amiri Quran font)

### TypeScript
- Strict null checks—use helper functions like `hasTextContent()`, `parseAyahParam()`
- API response types defined in service files (e.g., `SurahSummary`, `RetrieveSurahVerse`)
- Use type guards for runtime validation of API responses

### Error Handling
- API calls wrapped in try/catch with console.error logging
- Retry logic with exponential backoff (see `AudioPlayer.tsx` pattern)
- Loading states tracked with `useState<boolean>` (`isLoading`, `isTafsirLoading`)

## Environment Variables
```
VITE_SUPABASE_URL          # Supabase project URL
VITE_SUPABASE_ANON_KEY     # Supabase anonymous key
VITE_API_BASE_URL          # Alternative API base (defaults to localhost:8000)
VITE_VERCEL_ACCESS_TOKEN   # For authenticated API calls
```

## Commands
```bash
npm run dev      # Start dev server (http://localhost:5173)
npm run build    # TypeScript check + production build
npm run lint     # ESLint
npm run test     # Run test.ts via tsx
```

## Common Tasks

### Adding a New Page
1. Create `src/pages/feature/FeaturePage.tsx`
2. Export from `src/pages/index.ts`
3. Add Route in `public_routes.tsx` or `private_routes.tsx`
4. Use `DashboardLayout` wrapper with `sidebarItems` prop

### Adding API Calls
Follow existing pattern in `src/services/apis.ts`:
- Define request/response interfaces
- Use `fetch` with proper error handling
- Return typed data, throw on non-OK responses

### Working with Quran Data
- Verse keys are formatted as `"surahNumber:ayahNumber"` (e.g., `"2:255"`)
- Use `mapToVerse()` helper for transforming API responses
- Strip HTML from translations with `stripHtml()` utility
- Word audio URLs come from `WordTranslation.audio` property
- Filter words by `charType === 'word'` to exclude end markers

### Adding Overlay Features
Follow the Provider pattern in `src/components/TajweedLearning/`:
1. Create `FeatureProvider.tsx` with context, state, and overlay render
2. Create `FeatureOverlay.tsx` for the full-screen UI
3. Create `FeatureButton.tsx` as the trigger component
4. Wrap in `main.tsx` and use the hook where needed
