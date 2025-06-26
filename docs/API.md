# API Documentation - Order Processing Hub

## Overview

The Order Processing Hub provides two types of APIs:

1. **Webhook APIs** - REST endpoints for customer integrations
2. **Admin APIs** - tRPC endpoints for the admin dashboard

---

## 🔗 Webhook APIs (REST)

### Base URL

```
Production: https://your-domain.com/api/webhook
Development: http://localhost:3000/api/webhook
```

### Authentication

All webhook endpoints require customer API key authentication via header:

```
Authorization: Bearer {customer_api_key}
```

### Endpoints

#### 1. Receive Order

**POST** `/api/webhook/{customerId}/order`

Receives new orders from customer systems for processing.

**Headers:**

```
Content-Type: application/json
Authorization: Bearer {customer_api_key}
```

**Request Body:**

```json
{
  "orderId": "ext_order_123",
  "orderNumber": "ORD-001",
  "customerId": "cust_456",
  "customerEmail": "customer@example.com",
  "items": [
    {
      "id": "item_1",
      "productId": "prod_abc",
      "name": "Wireless Headphones",
      "price": 29.99,
      "quantity": 2,
      "options": {
        "size": "Large",
        "color": "Black"
      },
      "sellerId": "seller_123",
      "sellerName": "TechStore Inc",
      "taobaoUrl": "https://item.taobao.com/item.htm?id=123456789"
    }
  ],
  "originalTotal": 59.98,
  "currency": "USD",
  "shippingAddress": {
    "name": "John Doe",
    "line1": "123 Main Street",
    "city": "New York",
    "state": "NY",
    "postalCode": "10001",
    "country": "USA",
    "phone": "+1234567890"
  },
  "billingAddress": {
    "name": "John Doe",
    "line1": "123 Main Street",
    "city": "New York",
    "state": "NY",
    "postalCode": "10001",
    "country": "USA"
  },
  "promoCode": {
    "code": "SAVE10",
    "discountAmount": 5.99
  }
}
```

**Response (Success - 200):**

```json
{
  "success": true,
  "orderId": "ord_internal_456",
  "externalOrderId": "ext_order_123",
  "status": "PENDING",
  "message": "Order received and queued for processing",
  "estimatedProcessingTime": "2-4 hours"
}
```

**Response (Error - 400):**

```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Invalid order data",
  "details": [
    {
      "field": "items[0].price",
      "message": "Price must be a positive number"
    }
  ]
}
```

#### 2. Health Check

**GET** `/api/webhook/{customerId}/status`

Check the health status of webhook endpoints for a specific customer.

**Headers:**

```
Authorization: Bearer {customer_api_key}
```

**Response (200):**

```json
{
  "status": "healthy",
  "customerId": "cust_456",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0"
}
```

### Webhook Callbacks (Outgoing)

When orders are processed, results are sent back to customer webhook URLs.

**POST** `{customer_webhook_url}`

**Headers:**

```
Content-Type: application/json
X-Webhook-Signature: {hmac_signature}
```

**Payload:**

```json
{
  "orderId": "ext_order_123",
  "internalOrderId": "ord_internal_456",
  "status": "COMPLETED",
  "processedAt": "2024-01-15T12:30:00Z",
  "pricing": {
    "originalTotal": 59.98,
    "processedTotal": 75.5,
    "processingFee": 5.0,
    "shippingCost": 10.52,
    "notes": "Manual processing completed"
  },
  "items": [
    {
      "id": "item_1",
      "originalPrice": 29.99,
      "processedPrice": 32.5,
      "quantity": 2,
      "status": "VERIFIED",
      "taobaoData": {
        "verified": true,
        "actualPrice": 28.5,
        "availability": "IN_STOCK"
      }
    }
  ],
  "processingNotes": "All items verified on Taobao. Prices updated based on current rates."
}
```

### Error Codes

| Code                  | Description                                |
| --------------------- | ------------------------------------------ |
| `INVALID_API_KEY`     | API key is missing or invalid              |
| `CUSTOMER_NOT_FOUND`  | Customer ID not found                      |
| `CUSTOMER_INACTIVE`   | Customer account is deactivated            |
| `VALIDATION_ERROR`    | Request data validation failed             |
| `DUPLICATE_ORDER`     | Order with same external ID already exists |
| `RATE_LIMIT_EXCEEDED` | Too many requests from customer            |
| `INTERNAL_ERROR`      | Server error occurred                      |

---

## 🔧 Admin APIs (tRPC)

### Base URL

```
/api/trpc
```

### Authentication

Admin APIs require NextAuth.js session authentication.

### Routers

#### Customer Router

```typescript
// Get all customers
customers.getAll()

// Get customer by ID
customers.getById({ id: string })

// Create new customer
customers.create({
  name: string
  email: string
  webhookUrl: string
  settings: CustomerSettings
})

// Update customer
customers.update({
  id: string
  data: Partial<CustomerUpdateData>
})

// Delete customer
customers.delete({ id: string })

// Generate new API key
customers.regenerateApiKey({ id: string })
```

#### Order Router

```typescript
// Get all orders with filters
orders.getAll({
  customerId?: string
  status?: OrderStatus
  dateFrom?: Date
  dateTo?: Date
  limit?: number
  offset?: number
})

// Get order by ID
orders.getById({ id: string })

// Update order status
orders.updateStatus({
  id: string
  status: OrderStatus
  notes?: string
})

// Process order manually
orders.process({
  id: string
  processedData: ProcessedOrderData
})

// Get order processing history
orders.getHistory({ id: string })
```

#### User Router (Admin Users)

```typescript
// Get all admin users
users.getAll()

// Create new admin user
users.create({
  email: string
  name: string
  role: UserRole
})

// Update admin user
users.update({
  id: string
  data: Partial<UserUpdateData>
})

// Deactivate admin user
users.deactivate({ id: string })
```

#### Analytics Router

```typescript
// Get dashboard metrics
analytics.getDashboardMetrics({
  dateFrom: Date
  dateTo: Date
})

// Get customer analytics
analytics.getCustomerMetrics({
  customerId: string
  dateFrom: Date
  dateTo: Date
})

// Get order processing metrics
analytics.getProcessingMetrics({
  dateFrom: Date
  dateTo: Date
})
```

### Type Definitions

#### Customer Types

```typescript
type Customer = {
  id: string;
  name: string;
  email: string;
  apiKey: string;
  webhookUrl: string;
  isActive: boolean;
  settings: CustomerSettings;
  createdAt: Date;
  updatedAt: Date;
};

type CustomerSettings = {
  currency: string;
  timezone: string;
  processingPriority: "LOW" | "NORMAL" | "HIGH";
  notifications: {
    email: boolean;
    webhook: boolean;
  };
};
```

#### Order Types

```typescript
type Order = {
  id: string;
  externalOrderId: string;
  customerId: string;
  status: OrderStatus;
  originalTotal: number;
  processedTotal?: number;
  currency: string;
  items: OrderItem[];
  shippingAddress: Address;
  billingAddress: Address;
  processingNotes?: string;
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
};

type OrderStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

type OrderItem = {
  id: string;
  productId: string;
  name: string;
  originalPrice: number;
  processedPrice?: number;
  quantity: number;
  options: Record<string, string>;
  taobaoUrl?: string;
  taobaoData?: TaobaoProductData;
};
```

---

## 🔒 Security

### API Key Management

- Customer API keys are generated using cryptographically secure random strings
- Keys are hashed before storage in database
- Keys can be regenerated by admin users
- Failed authentication attempts are logged and rate limited

### Webhook Security

- HMAC signatures for outgoing webhooks
- Request validation and sanitization
- Rate limiting per customer
- IP whitelisting (optional)

### Admin API Security

- Session-based authentication via NextAuth.js
- Role-based access control
- CSRF protection
- Request validation with Zod schemas

---

## 📊 Rate Limits

### Webhook Endpoints

- **Order submission**: 100 requests per minute per customer
- **Health checks**: 1000 requests per minute per customer

### Admin APIs

- **General operations**: 1000 requests per minute per admin user
- **Bulk operations**: 100 requests per minute per admin user

---

## 🧪 Testing

### Webhook Testing

Use the following test endpoints in development:

```bash
# Test order submission
curl -X POST http://localhost:3000/api/webhook/test_customer/order \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test_api_key" \
  -d @test_order.json

# Test health check
curl -X GET http://localhost:3000/api/webhook/test_customer/status \
  -H "Authorization: Bearer test_api_key"
```

### Sample Test Data

See `/docs/sample-data/` for example payloads and test scenarios.

---

## 📝 Changelog

### v1.0.0 (Current)

- Initial webhook API implementation
- Basic admin tRPC APIs
- Customer and order management
- Manual processing workflow

### Planned Features

- Automated processing APIs
- Advanced analytics endpoints
- Bulk operation APIs
- Real-time status updates via WebSocket

---

**Last Updated**: December 2024
**API Version**: 1.0.0
