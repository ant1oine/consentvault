# ConsentVault Admin Dashboard

A modern, production-ready Next.js 15 admin dashboard for ConsentVault consent management system.

## Features

- 🎨 **Modern UI**: Beautiful, modern UI with glass-morphism effects
- 📊 **Dashboard**: Overview with animated counters and summary cards
- 🔒 **Read-only Sections**: Consents, Data Rights, and Audit Logs with immutable indicators
- ⚙️ **Admin Sections**: Purposes, Retention Policies, and Webhooks management
- 🔑 **API Key Management**: Secure API key storage in localStorage
- 🚀 **React Query**: Efficient data fetching and caching with TanStack Query v5
- ✨ **Animations**: Smooth Framer Motion animations throughout
- 🎯 **TypeScript**: Fully typed for better developer experience

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm (or npm/yarn)
- ConsentVault API running at `http://localhost:8000`

### Installation

```bash
cd apps/web
pnpm install
```

### Development

```bash
pnpm dev
```

The dashboard will open at `http://localhost:3000`.

### First Time Setup

1. When you first open the dashboard, you'll see a lock screen
2. Enter your ConsentVault API key (format: `cv_...`)
3. The API key will be stored in localStorage and used for all API requests
4. You can change the API key anytime from the Settings icon in the top bar

## Project Structure

```
apps/web/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Dashboard
│   ├── consents/          # Consents page
│   ├── rights/             # Data Rights page
│   ├── audit/             # Audit Logs page
│   ├── purposes/          # Purposes admin page
│   ├── policies/           # Retention Policies admin page
│   └── webhooks/           # Webhooks admin page
├── components/
│   ├── ui/                # shadcn/ui components
│   └── layout/            # Layout components (Sidebar, TopBar)
├── lib/
│   ├── api.ts             # API client with typed functions
│   └── utils.ts           # Utility functions
└── package.json
```

## API Endpoints

The dashboard connects to the following backend endpoints:

- `GET /v1/consents` - List all consent aggregates
- `GET /v1/consents/latest` - Get latest consent for user/purpose
- `GET /v1/consents/events` - List consent events
- `GET /v1/rights` - List data rights requests
- `POST /v1/rights/{id}/complete` - Complete a rights request
- `GET /v1/audit` - List audit logs
- `GET /v1/admin/purposes` - List purposes
- `POST /v1/admin/purposes` - Create purpose
- `GET /v1/admin/policies` - List retention policies
- `POST /v1/admin/policies` - Create/update policy
- `GET /v1/admin/webhooks` - List webhooks
- `POST /v1/admin/webhooks` - Create webhook
- `DELETE /v1/admin/webhooks/{id}` - Delete webhook

## Environment Variables

Create a `.env.local` file (optional):

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

If not set, defaults to `http://localhost:8000`.

## Features in Detail

### Read-only Sections

- **Consents**: View all consent records with user ID, purpose, status, last event, and evidence
- **Data Rights**: Manage data rights requests with "Mark Complete" functionality
- **Audit Logs**: Infinite scroll list of all audit events with cryptographic hashes

All read-only sections display a lock icon (🔒) and tooltip indicating "Immutable ledger entry".

### Admin Sections

- **Purposes**: Create and manage consent purposes
- **Retention Policies**: Set retention periods for purposes
- **Webhooks**: Configure webhook endpoints for event notifications

All admin sections display an "⚙️ Administrative Area" badge.

## Styling

The dashboard uses:

- **Tailwind CSS** for styling
- **shadcn/ui** components for UI elements
- **Framer Motion** for animations
- **Inter** and **SF Pro Display** fonts
- Glass-morphism design with `glass-card` utility class

## Production Build

```bash
pnpm build
pnpm start
```

## License

Part of the ConsentVault project.

