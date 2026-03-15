# Diamond Analytics

Baseball-focused data analytics platform built with **Next.js 16**, **Tailwind CSS v4**, and **n8n** automation.

**Live:** [diamond-analytics.vercel.app](https://diamond-analytics.vercel.app)

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| Styling | Tailwind CSS v4 |
| Charts | Recharts + D3.js |
| Word Cloud | d3-cloud |
| CMS | Notion Database (`@notionhq/client`) |
| Database | Vercel Postgres |
| Cache | Vercel KV |
| Data Fetching | SWR |
| Animation | Framer Motion |
| Automation | n8n |
| Deployment | Vercel |

## Features

### Blog (`/blogs`)
AI-generated baseball blog posts sourced from YouTube comment analysis. Content is stored in Notion and fetched via ISR with hourly revalidation.

### Top News (`/top-news`)
MLB headlines scraped and summarized by n8n every 6 hours. Cached in Vercel KV and auto-refreshed on the frontend via SWR polling.

### Real-Time Dashboard (`/dashboard`)
Live game scores, win probability predictions, and top player stats (AVG, HR, RBI, OPS, ERA, WHIP). Data pulled from the MLB Stats API and stored in Vercel Postgres.

### Word Cloud (`/word-cloud`)
Visual word frequency map from baseball gear reviews. Generated weekly by n8n and rendered with d3-cloud.

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
│   ├── word-cloud/page.tsx
│   └── api/
│       ├── blogs/route.ts
│       ├── topNews/route.ts
│       ├── realTimeDash/route.ts
│       └── wordcloud/route.ts
├── components/
│   ├── Navbar.tsx
│   ├── BlogCard.tsx
│   ├── NewsCard.tsx
│   ├── PlayerStatsTable.tsx
│   ├── GamePredictionCard.tsx
│   ├── WordCloudChart.tsx
│   └── MotionWrapper.tsx
├── lib/
│   ├── notion.ts
│   ├── mock-data.ts
│   └── utils.ts
└── types/
    └── index.ts
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

# Vercel Postgres
POSTGRES_URL=
POSTGRES_PRISMA_URL=
POSTGRES_URL_NON_POOLING=

# Vercel KV
KV_URL=
KV_REST_API_URL=
KV_REST_API_TOKEN=
KV_REST_API_READ_ONLY_TOKEN=

# n8n Webhook Secret
N8N_WEBHOOK_SECRET=
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
5. Deploy

## Author

**Dylan Kang**
