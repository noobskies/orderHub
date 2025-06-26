# Order Processing Hub

A white-label order processing platform that serves multiple e-commerce customers with manual order processing capabilities, specifically focused on Taobao items.

## 🎯 Overview

This platform allows a single admin team to manage multiple e-commerce customers, each with their own unique configurations. Orders are received via webhooks, processed manually (Phase 1), and results are sent back to customer systems.

### Key Features

- **Multi-Admin Management**: Multiple admin users can manage the system
- **Customer Management**: Add and configure multiple e-commerce customers
- **Manual Order Processing**: Human-reviewed processing for quality control
- **Taobao Integration**: Specialized handling for Taobao marketplace items
- **Webhook System**: Bidirectional webhook integration with automatic delivery and retry

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database
- npm or yarn

### Installation

```bash
# Clone and install dependencies
git clone <repository-url>
cd orderHub
npm install

# Set up database
./start-database.sh
npm run db:push
npm run db:seed

# Start development server
npm run dev
```

### Access the Application

- **Application**: http://localhost:3000
- **Admin Dashboard**: http://localhost:3000/dashboard
- **Login**: http://localhost:3000/login

**Default Admin Credentials:**

- Email: `admin@orderhub.com`
- Password: `admin123`

## 🏗️ Tech Stack

- **Framework**: Next.js 15 with App Router
- **Database**: PostgreSQL with Prisma ORM
- **API**: tRPC for type-safe internal APIs + REST for webhooks
- **Authentication**: NextAuth.js for admin users
- **Styling**: Tailwind CSS + shadcn/ui

## ✅ Current Status - Phase 1

**Verified Working Features:**

- ✅ Complete database setup with all tables
- ✅ Admin authentication and user management
- ✅ Customer management with API key generation
- ✅ Bidirectional webhook system with retry logic
- ✅ Order processing interface with manual workflow
- ✅ Real-time dashboard with live metrics
- ✅ Professional UI with shadcn/ui components

## 🔧 Development Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run db:push      # Push schema changes to database
npm run db:studio    # Open Prisma Studio
npm run db:seed      # Seed database with initial data
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks
```

## 📁 Project Structure

```
orderHub/
├── docs/                         # Documentation
├── prisma/                       # Database schema & migrations
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (admin)/             # Admin dashboard routes
│   │   ├── api/                 # API routes (webhooks, tRPC)
│   │   └── login/               # Authentication
│   ├── components/              # Reusable UI components
│   ├── server/                  # Server-side logic (tRPC, services)
│   └── lib/                     # Utilities and configurations
└── public/                      # Static assets
```

## 📚 Documentation

- **[Project Overview & Architecture](docs/README.md)** - Comprehensive project details, system flow, and verified features
- **[Development Roadmap](docs/TODO.md)** - Current progress, priorities, and future phases
- **[API Documentation](docs/API.md)** - Webhook endpoints, tRPC APIs, and integration guides

## 🔐 Security Features

- **Admin Authentication**: NextAuth.js with email/password
- **API Security**: Customer API keys for webhook authentication
- **Webhook Security**: HMAC signatures and automatic retry with exponential backoff
- **Audit Logging**: Complete trail of all system actions

## 🎯 Roadmap

### Phase 1: Manual Processing Foundation ✅

Core infrastructure with manual order processing capabilities

### Phase 2: Enhanced Manual Processing ⏳

Advanced filtering, bulk operations, and comprehensive reporting

### Phase 3: Automation Foundation 🔮

Background job system and automated processing capabilities

## 🤝 Contributing

1. Follow the established code patterns in the codebase
2. Update documentation as needed
3. Test locally with `npm run dev`
4. Run linting and type checks before committing

## 📞 Support

For questions or issues:

1. Check the [documentation](docs/) directory
2. Review the [TODO list](docs/TODO.md) for known limitations
3. Create an issue with detailed information

---

**Current Phase**: Phase 1 Development  
**Last Updated**: December 2024
