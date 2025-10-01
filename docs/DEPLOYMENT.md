# Ocean Stride Deployment Guide

This guide provides comprehensive instructions for deploying the Ocean Stride Seafarer Management System to production environments.

## Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose (recommended)
- Nginx or Apache web server
- SSL certificate (recommended for production)

## Quick Deployment Options

### Option 1: Docker Compose (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ocean-stride
   ```

2. **Build and run with Docker Compose**
   ```bash
   docker-compose up -d --build
   ```

3. **Access the application**
   - Open http://localhost:8080 in your browser
   - The application will be available at your configured domain

### Option 2: Manual Deployment

1. **Build the application**
   ```bash
   npm install
   npm run build
   ```

2. **Serve static files**
   ```bash
   # Using a simple HTTP server
   npx serve -s dist -l 3000

   # Or using nginx (recommended for production)
   ```

## Production Configuration

### Environment Variables

Create a `.env.production` file in the root directory:

```env
# API Configuration
VITE_API_BASE_URL=/api

# Application Settings
VITE_APP_NAME=Ocean Stride
VITE_APP_VERSION=1.0.0

# Feature Flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_ERROR_REPORTING=true
```

### Nginx Configuration

Create `/etc/nginx/sites-available/ocean-stride`:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL Configuration
    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; media-src 'none'; object-src 'none'; frame-src 'none'; base-uri 'self'; form-action 'self';";

    # Root directory
    root /var/www/ocean-stride/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Handle client-side routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy (if you have a backend)
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Service worker
    location /sw.js {
        add_header Cache-Control "no-cache";
        expires off;
    }

    # Security: Don't serve dotfiles
    location ~ /\. {
        deny all;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/ocean-stride /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Apache Configuration

Create `/etc/apache2/sites-available/ocean-stride.conf`:

```apache
<VirtualHost *:80>
    ServerName your-domain.com
    Redirect permanent / https://your-domain.com/
</VirtualHost>

<VirtualHost *:443>
    ServerName your-domain.com

    # SSL Configuration
    SSLEngine on
    SSLCertificateFile /path/to/ssl/cert.pem
    SSLCertificateKeyFile /path/to/ssl/private.key

    # Security headers
    Header always set X-Frame-Options DENY
    Header always set X-Content-Type-Options nosniff
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    Header always set Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; media-src 'none'; object-src 'none'; frame-src 'none'; base-uri 'self'; form-action 'self';"

    DocumentRoot /var/www/ocean-stride/dist

    # Enable rewrite engine for SPA routing
    RewriteEngine On
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /index.html [L]

    # Cache static assets
    <LocationMatch "\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$">
        ExpiresActive On
        ExpiresDefault "access plus 1 year"
        Header append Cache-Control "public, immutable"
    </LocationMatch>

    # API proxy (if you have a backend)
    ProxyPass /api http://localhost:3001
    ProxyPassReverse /api http://localhost:3001

    # Security: Don't serve dotfiles
    RedirectMatch 404 /\..*$
</VirtualHost>
```

Enable the site and required modules:
```bash
sudo a2ensite ocean-stride
sudo a2enmod rewrite proxy proxy_http ssl headers
sudo systemctl reload apache2
```

## Docker Configuration

### Dockerfile

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  ocean-stride:
    build: .
    ports:
      - "8080:80"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Optional: Backend API service
  # api:
  #   image: your-api-image
  #   ports:
  #     - "3001:3001"
  #   environment:
  #     - NODE_ENV=production
  #   restart: unless-stopped
```

## Performance Optimization

### Build Optimization

The application is already optimized with:
- Code splitting and lazy loading
- Minification and compression
- Tree shaking
- Asset optimization

### Runtime Optimization

1. **Service Worker**: Enables offline functionality and caching
2. **Memory Management**: Automatic cleanup of unused resources
3. **Image Optimization**: Lazy loading and responsive images
4. **Database Optimization**: IndexedDB with efficient queries

## Monitoring and Maintenance

### Health Checks

The application includes built-in health monitoring:
- Network connectivity checks
- Storage availability
- Memory usage monitoring
- Performance metrics

### Logs

Monitor application logs:
```bash
# Docker logs
docker-compose logs -f ocean-stride

# Nginx access logs
tail -f /var/log/nginx/access.log

# Nginx error logs
tail -f /var/log/nginx/error.log
```

### Backups

Regular backups of user data:
```bash
# The application stores data locally in IndexedDB
# Implement automated export/import features for data backup
```

## Security Considerations

1. **HTTPS Only**: Always use SSL/TLS in production
2. **Content Security Policy**: Configured to prevent XSS attacks
3. **Data Encryption**: Sensitive data is encrypted at rest
4. **Access Control**: Implement proper authentication and authorization
5. **Regular Updates**: Keep dependencies updated for security patches

## Troubleshooting

### Common Issues

1. **Blank page after deployment**
   - Check that all assets are served correctly
   - Verify that client-side routing is configured properly
   - Check browser console for JavaScript errors

2. **Service worker issues**
   - Clear browser cache and service worker
   - Check that service worker is registered correctly

3. **Database issues**
   - Clear IndexedDB data if corrupted
   - Check for migration errors in console

### Performance Issues

1. **Slow loading**
   - Enable gzip compression
   - Configure proper caching headers
   - Optimize bundle size

2. **Memory issues**
   - Monitor memory usage
   - Implement proper cleanup routines
   - Consider data pagination for large datasets

## Support

For deployment issues or questions:
1. Check the application logs
2. Review nginx/apache error logs
3. Verify configuration files
4. Contact the development team

## Version History

- v1.0.0: Initial production release
  - Multi-company support
  - Complete personnel management
  - Payroll system
  - Vessel management
  - Certificate tracking
  - PWA capabilities