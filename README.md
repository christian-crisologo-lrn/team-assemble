# Team Assemble

A modern web app for managing team members, roles, and sprint planning with interactive role rotation and animated presentation mode. Built with React 19, TypeScript, Vite, and Supabase.

## Features

- **Team Authentication** — Create or log in to a team with a name and password; sessions persist across refreshes
- **Squad Management** — Add, update, and remove team members; assign avatars
- **Role Management** — Define roles with icons and colors; assign members per sprint
- **Sprint Planner** — Bulk-create or individually add sprints with:
  - Custom sprint name prefix (e.g. `PI Sprint`) with automatic sequential numbering
  - Seeded numbering — if your prefix already ends in a number (e.g. `PI Sprint 5`), new sprints continue from that number
  - Configurable duration in business days or calendar days
  - **Exclude Weekends** toggle — checked by default (weekday-only counting); uncheck to count every calendar day
  - Sequential or random role rotation strategies
  - Drag-and-drop sprint reordering
  - Bulk delete with confirmation
- **Animated Presentation Mode** — Role-reveal animation with confetti; supports manual, sequential, and random assignment strategies
- **Screenshot & Sharing** — Capture the finished presentation as a PNG with avatars reliably rendered; copy to clipboard or download; share via the Web Share API
- **Public Presentations** — Share a `?replay=<sprint-id>` link that anyone can view without logging in
- **UX-Friendly Error Messages** — All API and Supabase errors are mapped to plain-language messages via a shared constant library
- **Offline Support** — Falls back to locally cached data when the Supabase connection is unavailable; shows an offline banner
- **Responsive Design** — Works on desktop, tablet, and mobile

## Tech Stack

| Layer | Library / Tool |
|---|---|
| Framework | React 19 |
| Language | TypeScript |
| Build | Vite |
| State | Zustand |
| Styling | Tailwind CSS + PostCSS |
| Backend | Supabase (PostgreSQL + Storage) |
| Routing | React Router v7 |
| Animation | Framer Motion |
| Drag & Drop | @hello-pangea/dnd |
| Screenshot | html2canvas |
| Icons | Lucide React |
| Date math | date-fns |
| Utilities | clsx, tailwind-merge |
| Confetti | canvas-confetti |

## Getting Started

### Prerequisites

- Node.js 18+
- yarn (or npm)
- A [Supabase](https://supabase.com) project

### Installation

```bash
git clone https://github.com/christian-crisologo-lrn/team-assemble.git
cd team-assemble
yarn install
```

### Environment Variables

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```bash
cp .env.example .env
```

```env
VITE_SUPABASE_URL=your-project-url-here
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Database Setup

Run `supabase/schema.sql` in your Supabase SQL editor to create the required tables, then run `supabase/storage-policy.sql` to configure storage policies for the `squad-previews` bucket.

### Development

```bash
yarn dev        # start dev server at http://localhost:5173
yarn build      # production build (tsc + vite)
yarn preview    # preview production build locally
yarn lint       # run ESLint
```

## Server Deployment

All server-side endpoints are centralized in [server](server) and should be deployed as one Vercel project with Root Directory set to `server`.

Available server endpoints:

- `/share` and `/og` for social link previews
- `/planner-csv` for server-side CSV export

Client app environment variable:

```env
VITE_SERVER_BASE_URL=https://your-server-service.vercel.app
```

## Project Structure

```
src/
├── components/
│   ├── features/squad/   # MemberCard
│   ├── layout/           # Layout, OfflineBanner
│   └── ui/               # Button, Card, Dialog, Input, IconPicker, Preloader, …
├── pages/
│   ├── Dashboard.tsx
│   ├── Login.tsx
│   ├── Presentation.tsx  # Animated role-reveal + share/copy
│   ├── Roles.tsx
│   ├── SprintPlanner.tsx # Bulk sprint creation with rotation
│   └── Squad.tsx
├── store/
│   ├── useSprintStore.ts # Zustand store — teams, members, roles, sprints
│   └── useUIStore.ts
├── lib/
│   └── supabase.ts
├── types/
│   └── index.ts
└── utils/
    ├── errors.ts         # ERROR_MESSAGES constants + getFriendlyErrorMessage
    ├── rotation.ts       # Sequential and random role rotation algorithms
    ├── string.ts
    └── weekday.ts        # addWeekdays / countWeekdays (start-date inclusive)
```

## Sprint Planner — Key Behaviours

### Day Counting

`addWeekdays(startDate, n)` counts the start date as day 1, so 10 business days from **Aug 2** ends on **Aug 13** (not Aug 14).

With **Exclude Weekends** unchecked, calendar days are used: 10 days from Aug 2 ends on Aug 11.

### Sprint Naming

Enter a prefix such as `Sprint` → sprints are named `Sprint 1`, `Sprint 2`, …

Enter a seeded name such as `PI Sprint 5` → new sprints continue as `PI Sprint 6`, `PI Sprint 7`, … Existing sprint names in the same series are respected; numbering always continues from the highest existing number or the seed, whichever is greater.

## Presentation Mode — Screenshot & Copy

Avatar images are pre-fetched and converted to base64 data URLs so `html2canvas` can render them reliably regardless of CORS restrictions. A `data-member-id` attribute on each `<img>` element is used to patch the cloned DOM via the `onclone` callback before the canvas is rendered. Animations are suspended during capture so no fade or scale transition partially hides a card in the exported image.

## Error Handling

All user-facing error strings live in `src/utils/errors.ts`:

```ts
ERROR_MESSAGES.invalidCredentials   // "Invalid team name or password"
ERROR_MESSAGES.loginFailed          // "We could not log you in right now…"
ERROR_MESSAGES.createTeamFailed     // "We could not create your team…"
ERROR_MESSAGES.presentationLoadFailed
ERROR_MESSAGES.duplicateName
ERROR_MESSAGES.notFound
ERROR_MESSAGES.generic
```

`getFriendlyErrorMessage(error, { action, fallback })` maps raw Supabase / network errors to the appropriate constant based on the error message content (network failure, duplicate key, permission denied, etc.).

## Database Schema

Key tables (all prefixed `lrn_`):

| Table | Purpose |
|---|---|
| `lrn_teams` | Team accounts |
| `lrn_members` | Member profiles |
| `lrn_team_members` | Many-to-many: team ↔ member |
| `lrn_roles` | Role definitions per team |
| `lrn_sprints` | Sprint records with assignments JSON |

See [`supabase/schema.sql`](./supabase/schema.sql) for the full schema and [`supabase/storage-policy.sql`](./supabase/storage-policy.sql) for storage policies.

## Browser Support

Chrome, Firefox, Safari, and Edge (latest stable versions).

## License

MIT

## Support

For issues, questions, or contributions, please reach out to the development team.
