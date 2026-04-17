# Cognitive Athlete

A mobile-first brain training web app that feels like a fitness app for your mind. Track measurable cognitive performance with daily workouts, progression systems, and performance analytics.

## Features

- **Daily Brain Workouts** — 3-module sessions (~10 min) targeting different cognitive skills
- **Processing Speed** — Flash-recognition with adaptive timing
- **Attention Control** — Multiple Object Tracking (MOT) with animated dots
- **Working Memory** — Sequence recall with optional dual-task challenge
- **Scoring & Progression** — XP, levels, streaks, and adaptive difficulty
- **Performance Dashboard** — Stats, charts, and session history
- **Offline-first** — All data stored in localStorage, works without a server

## Tech Stack

- **Next.js 16** (App Router, fully static)
- **Tailwind CSS v4** (dark mode)
- **Recharts** for progress visualization
- **TypeScript** throughout
- **localStorage** for persistence

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/czamat/cognitive-athlete)

Or connect your GitHub repo to Vercel — zero config needed.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx            # Dashboard
│   └── workout/page.tsx    # Workout session
├── components/
│   ├── ui/                 # Button, Card, StatCard, ProgressBar
│   ├── dashboard/          # StreakCounter, StatsOverview, ProgressChart
│   └── modules/            # ProcessingSpeed, AttentionControl, WorkingMemory
├── hooks/                  # useTimer, useWorkout
└── lib/                    # storage, scoring, difficulty
```

## How It Works

1. Click **Start Brain Workout** on the dashboard
2. Complete 3 modules in sequence (Processing Speed -> Attention -> Memory)
3. Each module scores you on reaction time and accuracy
4. Results are combined into a **Cognitive Score**
5. Difficulty adapts automatically based on your performance
6. Track your progress over time on the dashboard
