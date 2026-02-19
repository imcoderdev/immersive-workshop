# SmartWorkshop 360

An immersive 360° digital-twin platform for college workshops. Students, faculty and administrators can explore panoramic workshop environments, view machine details through interactive hotspots, complete safety protocols, and book equipment — all from a browser.

## Features

- **360° Panorama Viewer** — Pannellum-powered equirectangular scenes with interactive hotspots (info, warning, machine)
- **Role-Based Auth** — Student (auto-approved), Faculty & Admin (require admin approval) via Supabase Auth
- **Machine Booking** — Students book time-slots; faculty approve / reject
- **Faculty Dashboard** — Manage bookings, add / edit / delete machines
- **Admin Dashboard** — Approve teachers, view analytics (weekly usage, machine utilisation), CSV export
- **Safety Acknowledgements** — Students must acknowledge safety info before booking

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI | React 18 · TypeScript · Tailwind CSS · ShadCN UI |
| Build | Vite + SWC |
| State | Zustand · TanStack React Query |
| Forms | React Hook Form · Zod |
| 360° | Pannellum 2.5 |
| Backend | Supabase (Postgres, Auth, RLS, Edge Functions) |

## Getting Started

```bash
# 1. Clone
git clone https://github.com/imcoderdev/immersive-workshop.git
cd immersive-workshop

# 2. Install
npm install   # or bun install

# 3. Configure
cp .env.example .env   # fill in Supabase URL & anon key

# 4. Run
npm run dev             # opens on http://localhost:8080
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (port 8080) |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint check |
| `npm run test` | Run tests (Vitest) |

## Project Structure

```
src/
├── components/       # UI components (layout, viewer, ui)
├── hooks/            # Custom React hooks
├── lib/              # Utilities, Supabase client
├── pages/            # Route pages
├── services/         # Supabase service layer
├── stores/           # Zustand stores
└── types/            # TypeScript interfaces
```

## License

MIT
