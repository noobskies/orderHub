# White-Label Order Processing Hub

A centralized order processing platform that serves multiple e-commerce customers with manual order processing capabilities, specifically focused on Taobao items.

## 🎯 Project Overview

This platform allows a single admin team to manage multiple e-commerce customers, each with their own unique configurations. Orders are received via webhooks, processed manually (Phase 1), and results are sent back to customer systems.

### Key Features

- **Multi-Admin Management**: Multiple admin users can manage the system
- **Customer Management**: Add and configure multiple e-commerce customers
- **Manual Order Processing**: Human-reviewed processing for quality control
- **Taobao Integration**: Specialized handling for Taobao marketplace items
- **Webhook System**: Receive orders and send processed results back

## 🏗️ Architecture

### Tech Stack

- **Framework**: Next.js 15 with App Router
- **Database**: PostgreSQL with Prisma ORM
- **API**: tRPC for type-safe internal APIs + REST for webhooks
- **Authentication**: NextAuth.js for admin users
- **Styling**: Tailwind CSS + shadcn/ui
- **Deployment**: Vercel + Neon/Supabase PostgreSQL

### System Flow

1. Customer's e-commerce site places order
2. Webhook sent to processing hub with customer's API key
3. Order queued for manual processing by admin team
4. Admin processes order with Taobao-specific logic
5. Processed results sent back to customer via webhook callback

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database
- npm or yarn

### Installation

1. **Clone and install dependencies**:

```bash
git clone <repository-url>
cd orderHub
npm install
```

2. **Set up database**:

```bash
# Start local PostgreSQL (if using Docker)
./start-database.sh

# Push database schema
npm run db:push

# Seed initial data
npm run db:seed
```

3. **Start development server**:

```bash
npm run dev
```

4. **Access the application**:

- Application: http://localhost:3000
- Admin Dashboard: http://localhost:3000/dashboard
- Login: http://localhost:3000/login

### Default Admin Credentials

- **Email**: admin@orderhub.com
- **Password**: admin123

### ✅ Verified Working Features

- ✅ **Database Setup**: PostgreSQL with all tables created
- ✅ **Authentication**: Admin login with credentials
- ✅ **Dashboard**: Responsive admin interface with real data
- ✅ **Navigation**: Sidebar with all major sections
- ✅ **Sample Data**: Test customer and order data loaded
- ✅ **Development Environment**: Hot reload and error handling
- ✅ **tRPC APIs**: Complete backend API system
  - ✅ Customer management (CRUD + statistics)
  - ✅ Order management (processing + filtering)
  - ✅ User management (admin user CRUD + statistics)
  - ✅ Analytics (dashboard metrics + trends)
  - ✅ Webhook management (testing, delivery tracking, retry)
- ✅ **Webhook System**: Complete bidirectional webhook integration
  - ✅ **Incoming Webhooks**: Order intake system
    - ✅ POST /api/webhook/{customerId}/order
    - ✅ GET /api/webhook/{customerId}/status
    - ✅ API key authentication
    - ✅ Order validation and processing
  - ✅ **Outgoing Webhooks**: Automated result delivery
    - ✅ Webhook service with HMAC signature generation
    - ✅ Automatic delivery on order completion/status changes
    - ✅ Exponential backoff retry mechanism (max 20 retries)
    - ✅ Webhook delivery tracking and monitoring
    - ✅ Failed webhook retry capabilities
  - ✅ **Webhook Management**: Admin tools for webhook operations
    - ✅ Webhook endpoint testing functionality
    - ✅ Delivery statistics and analytics
    - ✅ Webhook secret management and regeneration
    - ✅ Manual webhook retry and queue processing
- ✅ **Real-time Dashboard**: Live metrics from database
- ✅ **Customer Management UI**: Complete customer interface
  - ✅ Customer list page with status indicators
  - ✅ Customer detail page with statistics and API keys
  - ✅ Customer creation form with validation
  - ✅ Customer edit form with full field updates
  - ✅ API credential display and copy functionality
  - ✅ Recent orders display per customer
- ✅ **Admin User Management UI**: Complete user management system
  - ✅ Admin user list page with role and status indicators
  - ✅ User detail page with processing statistics and permissions
  - ✅ User creation form with role selection and validation
  - ✅ Password management and security features
  - ✅ Processing activity timeline per user
- ✅ **Order Processing System**: Complete manual processing workflow
  - ✅ Order list/queue with filtering and search
  - ✅ Individual order detail pages with comprehensive view
  - ✅ Order processing form with item-level editing
  - ✅ Status update workflow with webhook triggers
  - ✅ Processing history timeline with audit trail
  - ✅ Automatic webhook delivery on order completion
  - ✅ Order hold and resume functionality
- ✅ **Taobao Integration**: Specialized Taobao product processing
  - ✅ Taobao URL validation and parsing
  - ✅ Product verification and availability checking
  - ✅ Automated price calculation with exchange rates
  - ✅ Processing fee calculation and markup application
  - ✅ Taobao-specific order processing interface
  - ✅ Product metadata storage and management
- ✅ **shadcn/ui Design System**: Professional UI components
  - ✅ Modern card-based dashboard layout
  - ✅ Professional data tables with proper styling
  - ✅ Enhanced navigation with avatars and tooltips
  - ✅ Toast notifications for user feedback
  - ✅ Loading skeletons for better UX
  - ✅ Consistent button and badge styling
  - ✅ Improved copy functionality with visual feedback

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
│   ├── lib/                     # Utilities and configurations
│   ├── server/                  # Server-side logic (tRPC, services)
│   ├── types/                   # TypeScript definitions
│   └── hooks/                   # Custom React hooks
└── public/                      # Static assets
```

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:push` - Push schema changes to database
- `npm run db:studio` - Open Prisma Studio
- `npm run db:seed` - Seed database with initial data
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript checks

### Development Workflow

1. Create feature branch from `main`
2. Make changes following the established patterns
3. Test locally with `npm run dev`
4. Run linting and type checks
5. Create pull request for review

## 📊 Database Schema

### Core Entities

- **AdminUser**: System administrators who manage customers and orders
- **Customer**: E-commerce businesses using the processing service (B2B clients)
- **EndConsumer**: End consumers who place orders through B2B customers
- **Order**: Individual orders received from customers
- **OrderItem**: Items within each order
- **ProcessingLog**: Audit trail of order processing actions

## 🔐 Authentication & Security

- **Admin Authentication**: NextAuth.js with email/password
- **API Security**: Customer API keys for webhook authentication
- **Role-Based Access**: Different permission levels for admin users
- **Audit Logging**: Complete trail of all system actions

## 🌐 API Documentation

### Webhook Endpoints

- `POST /api/webhook/{customerId}/order` - Receive new orders
- `GET /api/webhook/{customerId}/status` - Health check

### Admin API (tRPC)

- Customer management (CRUD operations)
- Order processing and status updates
- User management for admin accounts
- System analytics and reporting

## 🚀 Deployment

### Environment Setup

1. Set up PostgreSQL database (Neon, Supabase, or self-hosted)
2. Configure environment variables
3. Deploy to Vercel or similar platform
4. Set up domain and SSL certificates

### Production Checklist

- [ ] Database migrations applied
- [ ] Environment variables configured
- [ ] Admin users created
- [ ] Webhook endpoints tested
- [ ] Monitoring and logging configured

## 📈 Roadmap

### Phase 1: Manual Processing (Current)

- ✅ Basic admin authentication
- ✅ Customer management
- ✅ Order intake via webhooks
- 🔄 Manual order processing interface
- 🔄 Taobao-specific processing logic

### Phase 2: Enhanced Manual Processing

- ⏳ Advanced order filtering and search
- ⏳ Bulk order operations
- ⏳ Comprehensive reporting dashboard
- ⏳ Order status tracking

### Phase 3: Automation Foundation

- ⏳ Background job processing system
- ⏳ Automated pricing calculations
- ⏳ Webhook callback automation
- ⏳ Error handling and retry logic

## 🤝 Contributing

1. Follow the established code patterns
2. Write tests for new functionality
3. Update documentation as needed
4. Follow the Git workflow described above

## 📞 Support

For questions or issues:

1. Check the documentation in `/docs`
2. Review the TODO list for known limitations
3. Create an issue with detailed information

---

**Status**: Phase 1 Development
**Last Updated**: December 2024
