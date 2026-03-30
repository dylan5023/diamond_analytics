# Diamond Analytics

Baseball-focused data analytics platform built with **Next.js 16**, **Tailwind CSS v4**, and **n8n** automation.

**Live:** [diamond-analytics.vercel.app](https://diamond-analytics.vercel.app)

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| Styling | Tailwind CSS v4 |
| Charts | Recharts + D3.js |
| CMS | Notion Database (`@notionhq/client`) |
| Database | Vercel Postgres |
| Cache | Vercel KV |
| Realtime DB | Supabase |
| Data Fetching | SWR |
| Animation | Framer Motion |
| Automation | n8n |
| Deployment | Vercel |

## Features

### Blog (`/blogs`)
AI-generated baseball blog posts sourced from YouTube comment analysis. Content is stored in Notion and fetched via ISR with hourly revalidation.

### Top News (`/top-news`)
MLB headlines scraped and summarized by n8n every 6 hours. Cached in Vercel KV and auto-refreshed on the frontend via SWR polling. Supports browsing articles by date via a calendar view.

### Real-Time Dashboard (`/dashboard`)
Live win probability predictions and top player stats (AVG, HR, RBI, OPS, ERA, WHIP). Data pulled from Supabase (with Vercel Postgres as an optional fallback) and displayed with interactive leaderboard tables and chart modals.

### MLB Games (`/mlb`)
Real-time MLB game tracker showing live, scheduled, and final game cards — each with linescore, win probability bars, and play-by-play details. Auto-refreshes every 15 minutes. Supports drilling into individual player stats and a 60-day game history.

### Gear Recommendations (`/gear-recommendations`)
AI-ranked gear picks (Glove, Bat, Cleats, Helmet) organized by fielding position (Pitcher, Catcher, Infielder, Outfielder). Data sourced from Supabase with product thumbnails, ratings, key features, and direct retailer links.

### AI Chat Assistant
Floating chat button available site-wide. Powered by an n8n RAG webhook that answers baseball questions using the platform's data.

## Project Structure

```
diamond-analytics/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   ├── blogs/
│   │   ├── page.tsx
│   │   └── [slug]/page.tsx
│   ├── top-news/page.tsx
│   ├── dashboard/page.tsx
│   ├── mlb/page.tsx
│   ├── gear-recommendations/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   └── api/
│       ├── blogs/route.ts
│       ├── chat/route.ts
│       ├── topNews/route.ts
│       ├── realTimeDash/route.ts
│       ├── players/search/route.ts
│       └── gear/
│           ├── og-image/route.ts
│           └── thumb-proxy/route.ts
├── components/
│   ├── Navbar.tsx
│   ├── BlogCard.tsx
│   ├── NewsCard.tsx
│   ├── ChatButton.tsx
│   ├── PlayerStatsTable.tsx
│   ├── PlayerStatsChartModal.tsx
│   ├── PlayerSearchResults.tsx
│   ├── DashboardLeaderboardTables.tsx
│   ├── GamePredictionCard.tsx
│   ├── MotionWrapper.tsx
│   └── mlb/
│       ├── LiveGameCard.tsx
│       ├── ScheduledGameCard.tsx
│       ├── FinalGameCard.tsx
│       ├── GameDetailModal.tsx
│       ├── PlayerDetailModal.tsx
│       ├── MlbModal.tsx
│       └── WinProbabilityBar.tsx
├── lib/
│   ├── notion.ts
│   ├── supabase.ts
│   ├── dashboard-data.ts
│   ├── dashboard-supabase.ts
│   ├── mlb-game.ts
│   ├── mlb-league-avg.ts
│   ├── mlb-stats-linescore.ts
│   ├── top-news-article-date.ts
│   ├── top-news-calendar.ts
│   ├── mock-data.ts
│   └── utils.ts
└── types/
    ├── index.ts
    ├── mlb.ts
    └── supabase.ts
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm

### Installation

```bash
pnpm install
```

### Environment Variables

Create a `.env.local` file in the project root:

```env
# Notion
NOTION_API_KEY=
NOTION_BLOG_DATABASE_ID=

# Vercel Postgres (dashboard API tries this first when set)
POSTGRES_URL=
POSTGRES_PRISMA_URL=
POSTGRES_URL_NON_POOLING=

# Supabase — MLB page and Gear Recommendations use this directly (client-side).
# Dashboard /api/realTimeDash falls back to Supabase when Postgres returns no leaderboard rows.
# Set DASHBOARD_PREFER_SUPABASE=1 to always prefer Supabase for the dashboard.
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
DASHBOARD_PREFER_SUPABASE=

# Vercel KV
KV_URL=
KV_REST_API_URL=
KV_REST_API_TOKEN=
KV_REST_API_READ_ONLY_TOKEN=

# n8n — Webhook secret for data ingestion endpoints
N8N_WEBHOOK_SECRET=

# n8n — RAG chat webhook (used by the AI Chat Assistant)
NEXT_PUBLIC_N8N_WEBHOOK_URL=
N8N_WEBHOOK_CHAT_KEY=
```

### Development

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build

```bash
pnpm build
pnpm start
```

## Deployment

1. Push to GitHub (`main` branch)
2. Import repo in Vercel
3. Add environment variables in Vercel Settings
4. Provision **Vercel Postgres** and **Vercel KV** from Storage tab
5. Connect **Supabase** project and add the URL + anon key
6. Deploy

## Author

**Dylan Kang**
