# Ocean Stride - Seafarer Management System

A comprehensive web-based application for managing seafarer personnel, vessel operations, and maritime company administration. Built for shipping companies to efficiently manage their crew, vessels, payroll, and compliance requirements.

## Features

### 🏢 Multi-Company Support
- Create and manage multiple shipping companies
- Company-specific vessel and personnel management
- Isolated data per company for security and organization

### 👥 Personnel Management
- Complete seafarer profiles with personal, employment, and certification details
- Rank-based hierarchy management
- Document and certificate tracking with expiry alerts
- Medical record management
- Skills and language proficiency tracking

### 🚢 Vessel Management
- Vessel registration with detailed specifications
- Company assignment and status tracking
- Crew assignment and rotation management
- Vessel-specific payroll calculations

### 💰 Payroll System
- Comprehensive payroll calculations
- Rank-based salary structures
- Overtime and bonus calculations
- Deductions management (taxes, pensions, company deductions)
- Multi-currency support
- Payroll history and reporting

### 📋 Crew Assignments
- Flexible crew assignment scheduling (daily/weekly/monthly)
- Vessel-specific crew requirements
- Assignment tracking and history
- Automated crew rotation management

### 📊 Analytics & Reporting
- Dashboard with key metrics
- Personnel analytics
- Payroll reports
- Compliance tracking
- Certificate expiry monitoring

### 🔐 Security & Compliance
- Role-based access control
- Data encryption for sensitive information
- Audit logging
- GDPR-compliant data handling
- Secure offline-capable PWA

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite (deployed on Vercel)
- **UI Framework**: ShadCN/UI, Tailwind CSS
- **State Management**: Zustand, React Query
- **Backend**: Cloudflare Workers + D1 + R2 + KV + Cron
- **Data layer**: Canonical IndexedDB/Worker transport (`src/lib/database-service.ts`)
- **Forms**: React Hook Form, Zod validation
- **Internationalization**: i18next
- **Charts**: Recharts
- **Build Tool**: Vite
- **Deployment**: Vercel (frontend) + Cloudflare (backend)

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Modern web browser with IndexedDB support

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd ocean-stride

# Install dependencies
npm install

# Start development server
npm run dev
```

### Build for Production

```bash
# Build the application
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Core ShadCN/UI components
│   ├── forms/          # Form components
│   └── ...
├── pages/              # Page components
├── lib/                # Utilities and services
│   ├── database/       # Database operations
│   ├── security/       # Security utilities
│   ├── validation/     # Data validation
│   └── ...
├── hooks/              # Custom React hooks
├── contexts/           # React contexts
├── types/              # TypeScript type definitions
└── schemas/            # Data schemas
```

## Environment Configuration

Copy `.env.example` to `.env` and set:

- `VITE_API_BASE_URL`: absolute URL of the deployed Cloudflare Worker (e.g. `https://ocean-stride-api.your-subdomain.workers.dev`). During local development it can remain unset and the Vite dev server proxies `/api` to the local Worker.
- `VITE_REMOTE_DB`: set to `true` in production so all reads/writes use the Worker.
- `VITE_ENABLE_DEMO_MODE`: keep `false` in production. The app does not ship mock/demo accounts.

## Deployment

### Backend (Cloudflare)

```bash
cd worker
npm install
npx wrangler d1 create ocean-stride
npx wrangler kv namespace create KV
npx wrangler r2 bucket create ocean-stride-assets
npx wrangler secret put AUTH_SECRET
npx wrangler secret put RESET_SECRET   # optional
```

Update `worker/wrangler.toml` with the D1 database id and KV namespace id, then:

```bash
npm run worker:migrate:remote   # or: cd worker && npx wrangler d1 migrations apply DB --remote
npm run worker:deploy
```

### Frontend (Vercel)

1. Import the repository into Vercel.
2. Set `VITE_API_BASE_URL` to the deployed Worker URL.
3. Add `VITE_REMOTE_DB=true`.
4. Build command: `npm run build`; output directory: `dist`.

See `docs/DEPLOYMENT.md` for the full production checklist.

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking
- `npm run format` - Format code with Prettier
- `npm run test` - Run tests
- `npm run test:coverage` - Run tests with coverage

### Code Quality

- **Linting**: ESLint with TypeScript support
- **Formatting**: Prettier
- **Type Checking**: TypeScript strict mode
- **Testing**: Vitest with React Testing Library

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -am 'Add your feature'`
4. Push to branch: `git push origin feature/your-feature`
5. Submit a pull request

## License

This project is proprietary software. All rights reserved.

## Support

For support and questions, please contact the development team or create an issue in the repository.
