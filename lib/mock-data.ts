import type { BlogPost, NewsArticle } from '@/types'

export const mockBlogPosts: BlogPost[] = [
  {
    id: '1',
    title: 'Dodgers Fan Sentiment Analysis: Why the Blue Crew Is More Optimistic Than Ever',
    slug: 'dodgers-fan-sentiment-june',
    summary: 'Deep dive into Dodgers fan sentiment based on YouTube comment analysis from top baseball channels.',
    contents: `
## The Blue Crew's Unstoppable Energy

The Los Angeles Dodgers fanbase has always been passionate, but our latest sentiment analysis reveals an unprecedented level of optimism heading into the summer stretch.

### Key Findings

After analyzing over 2,000 YouTube comments across 15 major baseball channels, we found that **87% of Dodgers-related comments** carried a positive sentiment — the highest among all MLB teams this month.

#### What Fans Are Saying

The most frequently mentioned topics include:
- **Ohtani's historic performance** — mentioned in 62% of positive comments
- **Pitching depth** — fans are confident in the rotation's ability to carry through October
- **Farm system development** — growing excitement about top prospects

### Sentiment Breakdown

The overall sentiment score stands at **0.84 out of 1.0**, a significant jump from last month's 0.71. This correlates strongly with the team's 12-game winning streak.

> "This team is different. You can feel it in every at-bat, every pitch. October is going to be special." — Top comment, 2.4K likes

### Looking Ahead

As we approach the All-Star break, Dodgers fans have every reason to remain optimistic. The combination of elite talent, strategic acquisitions, and a passionate fanbase creates a perfect storm of positive energy.
    `.trim(),
    category: 'MLB',
    imageUrl: '',
    publishedAt: '2026-03-10T12:00:00Z',
    published: true,
  },
  {
    id: '2',
    title: 'Yankees vs Red Sox: A Rivalry Renewed Through the Lens of Data',
    slug: 'yankees-redsox-rivalry-data',
    summary: 'Statistical analysis of the Yankees-Red Sox rivalry and what modern analytics tell us about this classic matchup.',
    contents: `
## By the Numbers: Baseball's Greatest Rivalry

The Yankees-Red Sox rivalry transcends statistics, but the numbers tell a fascinating story of two franchises constantly pushing each other to new heights.

### Historical Context

Since 2000, these two teams have met **456 times** in regular season play, with the Yankees holding a slim 234-222 edge. But the story is far more nuanced than a simple win-loss record.

### Modern Analytics Perspective

Using advanced metrics, we can see that games between these two teams produce:
- **12% more high-leverage situations** than the league average
- **Average game duration of 3 hours 22 minutes** — 18 minutes longer than typical games
- **23% increase in viewership** compared to other divisional matchups

### Fan Engagement

YouTube comment analysis shows that rivalry games generate **3x more comments** than regular games, with significantly higher emotional intensity scores.
    `.trim(),
    category: 'Analytics',
    imageUrl: '',
    publishedAt: '2026-03-08T15:30:00Z',
    published: true,
  },
  {
    id: '3',
    title: 'The Rise of Analytics in Modern Baseball: How Data Changed the Game',
    slug: 'analytics-changed-baseball',
    summary: 'Exploring how data analytics transformed baseball strategy from Moneyball to modern machine learning.',
    contents: `
## From Moneyball to Machine Learning

Baseball has always been a sport of numbers. But in the last two decades, the sophistication of analytical approaches has fundamentally altered how the game is played, managed, and experienced.

### The Evolution

**2002-2010**: The Moneyball era — OBP revolution, undervalued metrics
**2011-2018**: The Statcast era — exit velocity, launch angle, spin rate
**2019-Present**: The AI era — real-time decision modeling, predictive analytics

### Impact on Strategy

Modern analytics have led to significant strategic shifts:
- **Defensive shifting** peaked and was subsequently regulated
- **Bullpen usage** has been completely reimagined
- **Player development** now starts with biomechanical data

### What's Next

The frontier of baseball analytics lies in real-time prediction models that can estimate win probability with unprecedented accuracy, factoring in everything from pitch sequencing to weather patterns.
    `.trim(),
    category: 'Analytics',
    imageUrl: '',
    publishedAt: '2026-03-05T10:00:00Z',
    published: true,
  },
]

export const mockNewsArticles: NewsArticle[] = [
  {
    title: 'Betting: USA is favorite to win WBC',
    html: '<p>World Baseball Classic semifinal betting odds show Team USA as -140 favorites over the Dominican Republic (+115).</p><p>USA started as -110 favorite to win WBC, now at +145, while DR moved from +400 to +155 to win.</p>',
    date: '2026-03-15 21:39',
    category: 'MLB',
    rank: 1,
    image_thumbnail: 'https://a.espncdn.com/combiner/i?img=%2Fphoto%2F2026%2F0312%2Fr1627246_1296x729_16%2D9.jpg&w=920&h=518&scale=crop&cquality=80&location=origin&format=jpg',
    url: 'https://www.espn.com/espn/betting/story/_/id/47900058/world-baseball-classic-odds',
    information_density: 3,
    information_density_reasoning: 'Provides specific betting odds with source.',
    trend_score: 3,
    trend_reasoning: 'Market shifts indicate upset patterns.',
    utility_score: 3,
    utility_reasoning: 'Useful for wagering models.',
    total_score: 9,
  },
  {
    title: 'Langeliers homers 3 times in spring training game',
    html: '<p>Shea Langeliers homered three times in a spring training game vs. the Royals.</p><p>He hit a career-high 31 home runs in 123 games last regular season.</p>',
    date: '2026-03-15 3:14',
    category: 'MLB',
    rank: 2,
    image_thumbnail: 'https://a.espncdn.com/combiner/i?img=%2Fmedia%2Fmotion%2Fwsc%2F2026%2F0314%2Fbe6ed808%2D014e%2D4a41%2Da6e2%2Dc1206bbb3a10%2Fbe6ed808%2D014e%2D4a41%2Da6e2%2Dc1206bbb3a10.jpg&w=943&h=530&cquality=80&format=jpg',
    url: 'https://www.espn.com/mlb/story/_/id/48208128/a-shea-langeliers-homers-3-s-spring-training-game',
    information_density: 4,
    information_density_reasoning: 'Specific data points with career stats.',
    trend_score: 3,
    trend_reasoning: 'Connects to established power-hitting trend.',
    utility_score: 3,
    utility_reasoning: 'Useful for early spring projections.',
    total_score: 10,
  },
  {
    title: 'U.S. tops Canada, advances to showdown vs. D.R.',
    html: '<p>Team USA beats Canada 5-3 to advance to the WBC semifinals vs. Dominican Republic.</p><p>Starter Logan Webb threw 4⅔ shutout innings.</p>',
    date: '2026-03-15 3:14',
    category: 'MLB',
    rank: 3,
    image_thumbnail: 'https://a.espncdn.com/combiner/i?img=%2Fmedia%2Fmotion%2F2026%2F0313%2F65c76aa69e9f4ff8b26bffc39d8d54801423%2F65c76aa69e9f4ff8b26bffc39d8d54801423.jpg&w=943&h=530&cquality=80&format=jpg',
    url: 'https://www.espn.com/mlb/story/_/id/48201228/team-usa-beats-canada-set-world-baseball-classic-semifinal-showdown-vs-dominican-republic',
    information_density: 4,
    information_density_reasoning: 'Detailed stats and player data.',
    trend_score: 4,
    trend_reasoning: 'Multi-event WBC perspective.',
    utility_score: 4,
    utility_reasoning: 'Useful for matchup projections.',
    total_score: 12,
  },
]
