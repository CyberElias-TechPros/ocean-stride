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

- **Frontend**: React 18, TypeScript, Vite
- **UI Framework**: ShadCN/UI, Tailwind CSS
- **State Management**: Zustand, React Query
- **Database**: IndexedDB (client-side)
- **Forms**: React Hook Form, Zod validation
- **Internationalization**: i18next
- **Charts**: Recharts
- **Build Tool**: Vite
- **Deployment**: Docker, Nginx

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

The application uses the following environment variables:

- `VITE_API_BASE_URL`: API base URL (defaults to '/api' for client-side operation)

## Deployment

### Docker Deployment

```bash
# Build Docker image
docker build -t ocean-stride .

# Run with Docker Compose
docker-compose up -d
```

### Manual Deployment

1. Build the application: `npm run build`
2. Serve the `dist/` folder with a static server
3. Configure your web server (Nginx/Apache) to serve the static files

### Nginx Configuration Example

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/ocean-stride/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

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
