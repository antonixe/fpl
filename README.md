# FPLGRID

**Data-driven Fantasy Premier League analysis.** Real-time player stats, fixture difficulty, live match tracking, and squad optimization — all in a fast, terminal-inspired UI.

![Next.js](https://img.shields.io/badge/Next.js-15.5-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)
![Tests](https://img.shields.io/badge/tests-145%20passing-brightgreen)

## Features

- **Dashboard** — Captain picks, differentials, hot form, best value, transfer activity at a glance
- **Players** — Full stats table with search, sort by points/form/xPts/value, click-through to detailed profiles
- **Player Detail** — Gameweek history, cumulative points chart, moving average, upcoming fixtures, season stats
- **Fixtures** — Fixture difficulty ratings (FDR) grid for all 20 teams
- **Live** — Real-time match scores, bonus points, and player performances
- **Optimizer** — Three modes:
  - **Transfer Advisor** — suggests optimal transfers for your team
  - **Squad Builder** — builds best XI within budget using knapsack optimization
  - **Chip Advisor** — recommends when to play Wildcard, Bench Boost, Triple Captain, Free Hit

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 15 (App Router, Turbopack) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 3.4 |
| Charts | Recharts (lazy-loaded) |
| Testing | Vitest + Testing Library (145 tests) |
| E2E | Playwright (Chromium) |
| Deploy | Vercel (London region) |
| CI/CD | GitHub Actions |

## Getting Started

```bash
# Install dependencies
npm install

# Copy env file and configure
cp .env.example .env.local

# Start dev server (Turbopack)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with Turbopack |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm test` | Run unit/component tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run lint` | ESLint check |

## Environment Variables

See [.env.example](.env.example) for all variables. Key ones:

| Variable | Description | Default |
|---|---|---|
| `NEXT_PUBLIC_FPL_API_BASE` | FPL API base URL | `https://fantasy.premierleague.com/api` |
| `NEXT_PUBLIC_SITE_URL` | Your deployed domain (for sitemap/OG) | `https://fpl.example.com` |
| `NEXT_PUBLIC_APP_VERSION` | App version shown in footer | `1.0.0` |

## Architecture

```
app/
├── page.tsx              # Dashboard (server-rendered)
├── players/              # Player list + [id] detail
├── fixtures/             # FDR grid
├── live/                 # Live match scores
├── optimizer/            # Transfer/Squad/Chip modes
├── api/                  # API routes (fpl, fixtures, player, live, health, vitals)
├── layout.tsx            # Root layout (SSR hydration, metadata)
├── sitemap.ts            # Dynamic sitemap (700+ player pages)
├── robots.ts             # Crawler rules
├── manifest.ts           # PWA manifest
└── opengraph-image.tsx   # Dynamic OG image

components/               # UI components (Navigation, Footer, MatchCard, etc.)
lib/
├── fpl-server.ts         # Server-side data fetching + in-memory cache (5 min TTL)
├── fpl-fetch.ts          # Fetch wrapper (10s timeout, 2 retries, backoff)
├── fpl-utils.ts          # 30+ pure utility functions
├── use-fpl-data.tsx      # FPLProvider (SSR hydration → memory cache → localStorage)
├── optimizer-utils.ts    # Knapsack optimizer, transfer scoring
└── logger.ts             # Structured logging (JSON prod, human dev)

workers/
└── squad-builder.worker.ts  # Web Worker for heavy optimization

__tests__/                # 145 unit + component tests
e2e/                      # Playwright smoke tests
```

### Data Flow

1. **Server** — `fpl-server.ts` fetches from FPL API with in-memory cache (5 min TTL, bypasses Next.js 2MB data cache limit)
2. **SSR Hydration** — Root layout passes `initialData` to `FPLProvider` for instant first paint
3. **Client** — 3-tier cache: SSR seed → in-memory (5 min) → localStorage (24h fallback)
4. **Player Detail** — Bootstrap + element-summary fetched in parallel server-side, passed as props

### Performance

- SSR hydration eliminates loading spinners on first visit
- Recharts lazy-loaded (~280KB deferred until player detail)
- Web Worker for squad optimization (off main thread)
- `React.memo` on high-frequency components
- Route progress bar for perceived speed
- Keyboard shortcuts for power users (`?` for help)

### Observability

- Structured logger with JSON output in production
- Web Vitals reporting (LCP, FID, CLS, FCP, TTFB, INP)
- `/api/health` endpoint with FPL API connectivity check
- `Server-Timing` + `X-Request-Id` headers on all requests
- Error boundary with error reporting

### Security

- Rate limiting: 60 req/min/IP on `/api/*`
- Security headers: HSTS, CSP, X-Frame-Options, X-Content-Type-Options
- `poweredByHeader: false`
- `/api/` blocked from search crawlers

## Deployment

### Vercel (configured)

The project is configured for Vercel deployment:

- **Region**: London (lhr1)
- **CI/CD**: Push to `main` triggers production deploy via GitHub Actions
- **Preview**: PRs get automatic preview deployments
- **Health check**: Deploy verified via `/api/health` endpoint

### Manual Deploy

```bash
npm run build
npm start
```

## License

MIT
