# Deployment Guide - Order Processing Hub

## 🚀 Overview

This guide covers deploying the Order Processing Hub to production using Vercel for the application and external services for PostgreSQL and Redis.

---

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│                 │    │                 │    │                 │
│   Vercel App    │────│   PostgreSQL    │    │     Redis       │
│   (Next.js)     │    │   (Neon/Supabase)   │   (Upstash)     │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## 📋 Prerequisites

### Required Accounts

- [ ] **Vercel Account** - For hosting the Next.js application
- [ ] **PostgreSQL Provider** - Choose one:
  - Neon (Recommended for simplicity)
  - Supabase (More features)
  - Railway (Alternative)
  - AWS RDS (Enterprise)
- [ ] **Redis Provider** - Choose one:
  - Upstash (Recommended for serverless)
  - Redis Cloud
  - AWS ElastiCache (Enterprise)

### Domain & SSL

- [ ] Domain name registered
- [ ] DNS management access

---

## 🗄️ Database Setup

### Option 1: Neon (Recommended)

1. **Create Neon Account**
   - Go to [neon.tech](https://neon.tech)
   - Sign up with GitHub/Google
   - Create new project

2. **Configure Database**

   ```sql
   -- Database will be created automatically
   -- Note the connection string format:
   -- postgresql://username:password@host/database?sslmode=require
   ```

3. **Get Connection String**
   - Copy the connection string from Neon dashboard
   - Format: `postgresql://user:pass@host/dbname?sslmode=require`

### Option 2: Supabase

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create new project
   - Wait for setup completion

2. **Get Database URL**
   - Go to Settings → Database
   - Copy the connection string
   - Use the "Connection pooling" URL for production

### Database Configuration

```bash
# Add to your environment variables
DATABASE_URL="postgresql://user:pass@host/dbname?sslmode=require"
DIRECT_URL="postgresql://user:pass@host/dbname?sslmode=require"  # For migrations
```

---

## 🔴 Redis Setup

### Option 1: Upstash (Recommended)

1. **Create Upstash Account**
   - Go to [upstash.com](https://upstash.com)
   - Sign up and create Redis database
   - Choose region closest to your users

2. **Get Redis URL**
   ```bash
   REDIS_URL="rediss://default:password@host:port"
   ```

### Option 2: Redis Cloud

1. **Create Redis Cloud Account**
   - Go to [redis.com](https://redis.com)
   - Create subscription
   - Note connection details

---

## 🌐 Vercel Deployment

### 1. Prepare Repository

```bash
# Ensure your code is committed
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### 2. Connect to Vercel

1. **Import Project**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository

2. **Configure Build Settings**

   ```bash
   # Build Command (usually auto-detected)
   npm run build

   # Output Directory
   .next

   # Install Command
   npm install
   ```

### 3. Environment Variables

Add these environment variables in Vercel dashboard:

```bash
# Database
DATABASE_URL="postgresql://user:pass@host/dbname?sslmode=require"
DIRECT_URL="postgresql://user:pass@host/dbname?sslmode=require"

# NextAuth
NEXTAUTH_SECRET="your-super-secret-key-here"
NEXTAUTH_URL="https://your-domain.com"

# Redis (for future background jobs)
REDIS_URL="rediss://default:password@host:port"

# App Configuration
NODE_ENV="production"
```

### 4. Deploy

```bash
# Vercel will automatically deploy on git push
# Or manually trigger deployment
vercel --prod
```

---

## 🔧 Post-Deployment Setup

### 1. Database Migration

```bash
# Run migrations after first deployment
npx prisma migrate deploy

# Or use Vercel CLI
vercel env pull .env.local
npm run db:push
```

### 2. Seed Initial Data

```bash
# Create initial admin user and sample data
npm run db:seed
```

### 3. Domain Configuration

1. **Add Custom Domain**
   - In Vercel dashboard, go to Settings → Domains
   - Add your custom domain
   - Configure DNS records as instructed

2. **SSL Certificate**
   - Vercel automatically provisions SSL certificates
   - Verify HTTPS is working

---

## 🔒 Security Configuration

### Environment Variables Security

```bash
# Generate secure secrets
NEXTAUTH_SECRET=$(openssl rand -base64 32)

# Use different secrets for different environments
# Development: .env.local
# Production: Vercel environment variables
```

### Database Security

1. **Connection Security**
   - Always use SSL connections (`sslmode=require`)
   - Use connection pooling for better performance
   - Restrict database access by IP if possible

2. **Backup Strategy**
   - Enable automated backups on your database provider
   - Test backup restoration process
   - Document backup retention policy

### API Security

1. **Rate Limiting**
   - Configure rate limiting for webhook endpoints
   - Monitor for abuse patterns
   - Set up alerts for unusual traffic

2. **API Key Management**
   - Generate cryptographically secure API keys
   - Implement key rotation strategy
   - Log all API key usage

---

## 📊 Monitoring & Logging

### Vercel Analytics

1. **Enable Analytics**
   - Go to Vercel dashboard → Analytics
   - Enable Web Analytics
   - Monitor performance metrics

### Error Tracking

1. **Sentry Integration** (Optional)

   ```bash
   npm install @sentry/nextjs

   # Add to environment variables
   SENTRY_DSN="your-sentry-dsn"
   ```

2. **Vercel Functions Logs**
   - Monitor function execution logs
   - Set up alerts for errors
   - Track performance metrics

### Database Monitoring

1. **Connection Monitoring**
   - Monitor database connection pool
   - Track query performance
   - Set up alerts for slow queries

2. **Backup Verification**
   - Regularly test backup restoration
   - Monitor backup success/failure
   - Document recovery procedures

---

## 🔄 CI/CD Pipeline

### GitHub Actions (Optional)

```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: "18"

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Build application
        run: npm run build

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

---

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Errors**

   ```bash
   # Check connection string format
   # Ensure SSL is enabled
   # Verify network access

   # Test connection
   npx prisma db pull
   ```

2. **Build Failures**

   ```bash
   # Check Node.js version compatibility
   # Verify all environment variables are set
   # Review build logs in Vercel dashboard
   ```

3. **Runtime Errors**
   ```bash
   # Check Vercel function logs
   # Verify environment variables in production
   # Test API endpoints individually
   ```

### Performance Issues

1. **Slow Database Queries**
   - Review query performance in database dashboard
   - Add appropriate indexes
   - Consider connection pooling

2. **High Response Times**
   - Monitor Vercel function execution times
   - Optimize database queries
   - Consider caching strategies

---

## 📈 Scaling Considerations

### Database Scaling

1. **Connection Pooling**

   ```bash
   # Use connection pooling URL from Supabase
   # Or configure Prisma connection pool
   DATABASE_URL="postgresql://user:pass@host/dbname?pgbouncer=true"
   ```

2. **Read Replicas**
   - Consider read replicas for heavy read workloads
   - Separate read/write operations
   - Monitor replication lag

### Application Scaling

1. **Vercel Pro Features**
   - Upgrade to Vercel Pro for better performance
   - Enable Edge Functions for global distribution
   - Use Vercel Analytics for insights

2. **CDN Configuration**
   - Optimize static asset delivery
   - Configure appropriate cache headers
   - Use Vercel's built-in CDN

---

## 🔄 Maintenance

### Regular Tasks

1. **Weekly**
   - [ ] Review error logs
   - [ ] Check database performance
   - [ ] Monitor API usage patterns

2. **Monthly**
   - [ ] Update dependencies
   - [ ] Review security logs
   - [ ] Test backup restoration
   - [ ] Performance optimization review

3. **Quarterly**
   - [ ] Security audit
   - [ ] Capacity planning review
   - [ ] Disaster recovery testing

### Update Process

1. **Dependency Updates**

   ```bash
   # Check for updates
   npm outdated

   # Update dependencies
   npm update

   # Test thoroughly before deployment
   npm test
   npm run build
   ```

2. **Database Migrations**

   ```bash
   # Create migration
   npx prisma migrate dev --name migration_name

   # Deploy to production
   npx prisma migrate deploy
   ```

---

## 📞 Support & Monitoring

### Health Checks

1. **Application Health**
   - Set up uptime monitoring (UptimeRobot, Pingdom)
   - Monitor critical API endpoints
   - Set up alerts for downtime

2. **Database Health**
   - Monitor connection pool usage
   - Track query performance
   - Set up alerts for high CPU/memory usage

### Incident Response

1. **Escalation Process**
   - Define incident severity levels
   - Create contact list for emergencies
   - Document common resolution steps

2. **Recovery Procedures**
   - Database restoration process
   - Application rollback procedures
   - Communication templates

---

**Last Updated**: December 2024
**Deployment Version**: 1.0.0
