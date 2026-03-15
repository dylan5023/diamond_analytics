import type { BlogPost, NewsArticle, GameSnapshot, PlayerStats, WordFrequency } from '@/types'

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
    title: 'MLB Announces New Rule Changes for 2026 Season',
    url: 'https://mlb.com/news/rule-changes-2026',
    summary: 'Major League Baseball has unveiled a new set of rule modifications aimed at increasing pace of play and offensive action. The changes include adjustments to the pitch clock and modifications to the designated hitter rules.',
    imageUrl: 'https://img.mlbstatic.com/mlb-images/image/upload/t_16x9/t_w1536/mlb/placeholder.jpg',
    publishedAt: '2026-03-14T08:00:00Z',
  },
  {
    title: 'Spring Training Update: Top Prospects to Watch',
    url: 'https://espn.com/mlb/spring-training-prospects',
    summary: 'As spring training heats up, several top prospects are making strong cases for Opening Day roster spots. From power hitters to flame-throwing pitchers, the next generation of stars is ready.',
    imageUrl: 'https://img.mlbstatic.com/mlb-images/image/upload/t_16x9/t_w1536/mlb/placeholder2.jpg',
    publishedAt: '2026-03-13T14:30:00Z',
  },
  {
    title: 'Historic Free Agent Signing Shakes Up AL East',
    url: 'https://mlb.com/news/free-agent-signing',
    summary: 'A blockbuster free agent signing has dramatically altered the American League East landscape. The deal, worth over $300 million, signals a new era of competitive spending.',
    imageUrl: 'https://img.mlbstatic.com/mlb-images/image/upload/t_16x9/t_w1536/mlb/placeholder3.jpg',
    publishedAt: '2026-03-12T11:00:00Z',
  },
  {
    title: 'Injury Report: Key Players Face Extended Absences',
    url: 'https://espn.com/mlb/injury-report',
    summary: 'Several star players are dealing with significant injuries heading into the regular season. Teams are scrambling to adjust their rosters and strategies accordingly.',
    imageUrl: 'https://img.mlbstatic.com/mlb-images/image/upload/t_16x9/t_w1536/mlb/placeholder4.jpg',
    publishedAt: '2026-03-11T16:45:00Z',
  },
  {
    title: 'Analytics Revolution: How AI Is Changing Scouting',
    url: 'https://mlb.com/news/ai-scouting',
    summary: 'Artificial intelligence is transforming the way teams evaluate talent. From computer vision analysis of swing mechanics to predictive models for player development trajectories.',
    imageUrl: 'https://img.mlbstatic.com/mlb-images/image/upload/t_16x9/t_w1536/mlb/placeholder5.jpg',
    publishedAt: '2026-03-10T09:15:00Z',
  },
  {
    title: 'Stadium Renovations: Ballpark Upgrades Across the League',
    url: 'https://espn.com/mlb/stadium-renovations',
    summary: 'Multiple teams are investing heavily in stadium improvements for the 2026 season. From retractable roofs to enhanced fan experiences, the ballpark of the future is taking shape.',
    imageUrl: 'https://img.mlbstatic.com/mlb-images/image/upload/t_16x9/t_w1536/mlb/placeholder6.jpg',
    publishedAt: '2026-03-09T12:00:00Z',
  },
]

export const mockGameSnapshots: GameSnapshot[] = [
  {
    id: 1,
    game_pk: 745001,
    home_team: 'LAD',
    away_team: 'SFG',
    home_score: 5,
    away_score: 3,
    inning: 7,
    inning_half: 'Top',
    status: 'Live',
    win_probability: 0.78,
    updated_at: new Date().toISOString(),
  },
  {
    id: 2,
    game_pk: 745002,
    home_team: 'NYY',
    away_team: 'BOS',
    home_score: 2,
    away_score: 2,
    inning: 5,
    inning_half: 'Bottom',
    status: 'Live',
    win_probability: 0.52,
    updated_at: new Date().toISOString(),
  },
  {
    id: 3,
    game_pk: 745003,
    home_team: 'HOU',
    away_team: 'TEX',
    home_score: 0,
    away_score: 0,
    inning: 1,
    inning_half: 'Top',
    status: 'Live',
    win_probability: 0.55,
    updated_at: new Date().toISOString(),
  },
  {
    id: 4,
    game_pk: 745004,
    home_team: 'ATL',
    away_team: 'NYM',
    home_score: 7,
    away_score: 4,
    inning: 9,
    inning_half: 'Bottom',
    status: 'Live',
    win_probability: 0.92,
    updated_at: new Date().toISOString(),
  },
  {
    id: 5,
    game_pk: 745005,
    home_team: 'CHC',
    away_team: 'STL',
    home_score: 0,
    away_score: 0,
    inning: 0,
    inning_half: '',
    status: 'Scheduled',
    win_probability: 0.50,
    updated_at: new Date().toISOString(),
  },
]

export const mockPlayerStats: PlayerStats[] = [
  { id: 1, player_id: 660271, full_name: 'Shohei Ohtani', team: 'LAD', position: 'DH', avg: 0.312, home_runs: 4, rbi: 12, ops: 1.045, era: null, whip: null, updated_at: new Date().toISOString() },
  { id: 2, player_id: 665489, full_name: 'Juan Soto', team: 'NYM', position: 'RF', avg: 0.298, home_runs: 3, rbi: 10, ops: 0.998, era: null, whip: null, updated_at: new Date().toISOString() },
  { id: 3, player_id: 592450, full_name: 'Aaron Judge', team: 'NYY', position: 'CF', avg: 0.285, home_runs: 5, rbi: 14, ops: 0.987, era: null, whip: null, updated_at: new Date().toISOString() },
  { id: 4, player_id: 668939, full_name: 'Ronald Acuña Jr.', team: 'ATL', position: 'RF', avg: 0.301, home_runs: 3, rbi: 9, ops: 0.965, era: null, whip: null, updated_at: new Date().toISOString() },
  { id: 5, player_id: 665742, full_name: 'Mookie Betts', team: 'LAD', position: 'SS', avg: 0.278, home_runs: 2, rbi: 8, ops: 0.912, era: null, whip: null, updated_at: new Date().toISOString() },
  { id: 6, player_id: 666969, full_name: 'Freddie Freeman', team: 'LAD', position: '1B', avg: 0.305, home_runs: 3, rbi: 11, ops: 0.908, era: null, whip: null, updated_at: new Date().toISOString() },
  { id: 7, player_id: 514888, full_name: 'José Ramírez', team: 'CLE', position: '3B', avg: 0.289, home_runs: 4, rbi: 13, ops: 0.895, era: null, whip: null, updated_at: new Date().toISOString() },
  { id: 8, player_id: 677951, full_name: 'Corbin Carroll', team: 'ARI', position: 'CF', avg: 0.275, home_runs: 2, rbi: 7, ops: 0.878, era: null, whip: null, updated_at: new Date().toISOString() },
  { id: 9, player_id: 543037, full_name: 'Gerrit Cole', team: 'NYY', position: 'P', avg: 0.000, home_runs: 0, rbi: 0, ops: 0.000, era: 2.45, whip: 0.98, updated_at: new Date().toISOString() },
  { id: 10, player_id: 477132, full_name: 'Clayton Kershaw', team: 'LAD', position: 'P', avg: 0.000, home_runs: 0, rbi: 0, ops: 0.000, era: 2.89, whip: 1.05, updated_at: new Date().toISOString() },
  { id: 11, player_id: 608566, full_name: 'Spencer Strider', team: 'ATL', position: 'P', avg: 0.000, home_runs: 0, rbi: 0, ops: 0.000, era: 2.12, whip: 0.88, updated_at: new Date().toISOString() },
  { id: 12, player_id: 669203, full_name: 'Zack Wheeler', team: 'PHI', position: 'P', avg: 0.000, home_runs: 0, rbi: 0, ops: 0.000, era: 2.67, whip: 0.95, updated_at: new Date().toISOString() },
]

export const mockWordFrequencies: WordFrequency[] = [
  { text: 'bat', value: 245 },
  { text: 'glove', value: 198 },
  { text: 'comfortable', value: 176 },
  { text: 'grip', value: 165 },
  { text: 'durable', value: 152 },
  { text: 'leather', value: 148 },
  { text: 'swing', value: 140 },
  { text: 'weight', value: 135 },
  { text: 'balanced', value: 128 },
  { text: 'quality', value: 125 },
  { text: 'performance', value: 118 },
  { text: 'cleats', value: 112 },
  { text: 'helmet', value: 105 },
  { text: 'pitcher', value: 98 },
  { text: 'hitter', value: 95 },
  { text: 'barrel', value: 92 },
  { text: 'velocity', value: 88 },
  { text: 'training', value: 85 },
  { text: 'breaking', value: 82 },
  { text: 'protection', value: 78 },
  { text: 'speed', value: 75 },
  { text: 'pocket', value: 72 },
  { text: 'webbing', value: 68 },
  { text: 'infield', value: 65 },
  { text: 'outfield', value: 62 },
  { text: 'catcher', value: 58 },
  { text: 'padding', value: 55 },
  { text: 'stitching', value: 52 },
  { text: 'maple', value: 48 },
  { text: 'ash', value: 45 },
  { text: 'composite', value: 42 },
  { text: 'aluminum', value: 39 },
  { text: 'rawlings', value: 95 },
  { text: 'wilson', value: 88 },
  { text: 'easton', value: 72 },
  { text: 'louisville', value: 65 },
  { text: 'mizuno', value: 58 },
  { text: 'nike', value: 85 },
  { text: 'under armour', value: 62 },
  { text: 'new balance', value: 55 },
  { text: 'marucci', value: 78 },
  { text: 'demarini', value: 52 },
  { text: 'practice', value: 48 },
  { text: 'tournament', value: 42 },
  { text: 'little league', value: 38 },
  { text: 'fastpitch', value: 35 },
  { text: 'slowpitch', value: 32 },
  { text: 'tee ball', value: 28 },
  { text: 'travel ball', value: 45 },
  { text: 'showcase', value: 38 },
]
