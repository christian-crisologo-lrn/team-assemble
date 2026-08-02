# Team Assemble

A modern web application for managing team members, roles, and sprint planning with interactive role rotation. Built with React, TypeScript, Vite, and Supabase.

## Features

- **Team Management**: Create and manage team accounts with secure authentication
- **Member Management**: Add, update, and manage team members with avatars
- **Role Management**: Define and assign roles to team members
- **Sprint Planning**: Plan and organize sprints with role rotation capabilities
- **Interactive Dashboard**: View team metrics and sprint overview at a glance
- **Role Rotation**: Automatically rotate roles among team members with a roulette-style picker
- **Social Sharing**: Share sprint presentations with rich previews on social media (Twitter, Slack, Discord)
- **Screenshot Capture**: Download or copy presentation results as images
- **Public Presentations**: Share presentation URLs that anyone can view
- **Offline Support**: Seamlessly switch between online and offline modes with sample data
- **Responsive Design**: Works great on desktop, tablet, and mobile devices
- **Real-time Sync**: Data syncs with Supabase backend in real-time

## Tech Stack

- **Frontend Framework**: React 19
- **Language**: TypeScript
- **Build Tool**: Vite
- **State Management**: Zustand
- **Styling**: Tailwind CSS + PostCSS
- **Backend**: Supabase (PostgreSQL)
- **Drag & Drop**: @hello-pangea/dnd
- **UI Components**: Lucide React Icons
- **Animation**: Framer Motion
- **Screenshot**: html2canvas
- **Meta Tags**: react-helmet-async
- **Utilities**: date-fns, clsx, tailwind-merge

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (for backend)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd team-assemble
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file in the root directory with your Supabase credentials:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Usage

### Login / Create Account

1. On first load, you'll be presented with the login screen
2. Enter a team name and password
3. Create a new team or login with existing credentials

### Dashboard

View team overview including:
- Total team members
- Active roles
- Sprint statistics
- Quick navigation to other sections

### Squad Management

- Add new team members
- Edit member information
- Assign avatars to members
- Remove members from the team

### Roles

- Create and manage team roles
- Assign members to roles
- Track role assignments across sprints

### Sprint Planning

- Create sprints with specific dates
- Plan and rotate roles within sprints
- Use the interactive roulette to randomly assign roles
- View sprint details and team assignments

### Presentation Mode

- Access the presentation page at `/presentation` without authentication
- Useful for displaying team info on large screens or during meetings

## Development

### Available Scripts

- `npm run dev` - Start development server with HMR
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build locally

### Project Structure

```
src/
├── components/          # Reusable React components
│   ├── features/       # Feature-specific components
│   ├── layout/         # Layout components
│   └── ui/             # UI primitive components
├── pages/              # Page components
├── store/              # Zustand state management
├── lib/                # External library configurations
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
└── App.tsx             # Main app component
```

## Database Schema

The app uses PostgreSQL with Supabase. Key tables include:

- **teams**: Team accounts with authentication
- **members**: Team members with profile information
- **roles**: Role definitions for team assignments
- **sprints**: Sprint planning and tracking
- **assignments**: Member-to-role assignments within sprints

See `supabase/schema.sql` for the complete database schema.

## Features in Detail

### Role Roulette

The sprint planning page features an interactive role selection roulette that:
- Displays all available roles
- Spins and selects a random role
- Animates with confetti on selection
- Can be used repeatedly for different member assignments

### Social Sharing & Previews

Share your team presentations with beautiful previews:
- **Screenshot Capture**: Download presentation results as images
- **Copy to Clipboard**: Quickly copy images for sharing
- **Public URLs**: Share presentation links with `?replay=<sprint-id>` parameter
- **Rich Previews**: Automatic Open Graph previews on Twitter, Slack, Discord, etc.
- **No Login Required**: Public presentation links work without authentication

For detailed setup and usage, see [SHARING.md](./SHARING.md).

### Offline Mode

When the Supabase connection is unavailable, the app:
- Automatically switches to offline mode
- Uses sample data for demonstration
- Shows an offline banner notification
- Syncs data once connection is restored

### Authentication

The app uses simple username/password authentication:
- Teams are identified by unique names
- Passwords are securely stored in Supabase
- Sessions persist across browser refreshes

## Documentation

- [SHARING.md](./SHARING.md) - Social sharing setup and usage guide
- [IMPLEMENTATION.md](./IMPLEMENTATION.md) - Technical implementation details
- [supabase/schema.sql](./supabase/schema.sql) - Database schema

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

MIT

## Support

For issues, questions, or contributions, please reach out to the development team.
