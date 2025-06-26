// Re-export Prisma types for convenience
export type {
  AdminUser,
  Customer,
  Order,
  OrderItem,
  ProcessingLog,
  TaobaoProduct,
  UserRole,
  ProcessingPriority,
  OrderStatus,
  ItemStatus,
  ProcessingAction,
} from "@prisma/client";

// Extended types for API responses
export interface CustomerWithStats extends Customer {
  _count: {
    orders: number;
  };
  totalRevenue?: number;
  lastOrderDate?: Date;
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
  customer: Customer;
  processingLog: ProcessingLog[];
}

export interface OrderItemWithTaobao extends OrderItem {
  taobaoProduct?: TaobaoProduct;
}

// API Request/Response types
export interface CreateCustomerRequest {
  name: string;
  email: string;
  webhookUrl: string;
  currency?: string;
  timezone?: string;
  processingPriority?: ProcessingPriority;
  emailNotifications?: boolean;
  webhookNotifications?: boolean;
}

export interface UpdateCustomerRequest {
  name?: string;
  email?: string;
  webhookUrl?: string;
  currency?: string;
  timezone?: string;
  processingPriority?: ProcessingPriority;
  emailNotifications?: boolean;
  webhookNotifications?: boolean;
  isActive?: boolean;
}

export interface CreateOrderRequest {
  orderId: string;
  orderNumber?: string;
  customerId: string;
  customerEmail?: string;
  items: CreateOrderItemRequest[];
  originalTotal: number;
  currency?: string;
  shippingAddress: Address;
  billingAddress?: Address;
  promoCode?: string;
  discountAmount?: number;
}

export interface CreateOrderItemRequest {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  options?: Record<string, string>;
  sellerId?: string;
  sellerName?: string;
  taobaoUrl?: string;
}

export interface ProcessOrderRequest {
  orderId: string;
  processedTotal?: number;
  items: ProcessOrderItemRequest[];
  processingNotes?: string;
  status: OrderStatus;
}

export interface ProcessOrderItemRequest {
  id: string;
  processedPrice?: number;
  status: ItemStatus;
  notes?: string;
  taobaoData?: Record<string, unknown>;
}

// Address type for shipping/billing
export interface Address {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

// Webhook payload types
export interface WebhookOrderPayload {
  orderId: string;
  orderNumber?: string;
  customerId: string;
  customerEmail?: string;
  items: WebhookOrderItem[];
  originalTotal: number;
  currency: string;
  shippingAddress: Address;
  billingAddress?: Address;
  promoCode?: {
    code: string;
    discountAmount: number;
  };
}

export interface WebhookOrderItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  options?: Record<string, string>;
  sellerId?: string;
  sellerName?: string;
  taobaoUrl?: string;
}

export interface WebhookResponse {
  success: boolean;
  orderId?: string;
  externalOrderId?: string;
  status?: string;
  message?: string;
  estimatedProcessingTime?: string;
  error?: string;
  details?: Array<{
    field: string;
    message: string;
  }>;
}

// Callback webhook payload (sent to customers)
export interface CallbackWebhookPayload {
  orderId: string;
  internalOrderId: string;
  status: OrderStatus;
  processedAt: string;
  pricing: {
    originalTotal: number;
    processedTotal?: number;
    processingFee?: number;
    shippingCost?: number;
    notes?: string;
  };
  items: Array<{
    id: string;
    originalPrice: number;
    processedPrice?: number;
    quantity: number;
    status: ItemStatus;
    taobaoData?: {
      verified: boolean;
      actualPrice?: number;
      availability?: string;
    };
  }>;
  processingNotes?: string;
}

// Dashboard analytics types
export interface DashboardMetrics {
  totalOrders: number;
  activeCustomers: number;
  pendingOrders: number;
  completedToday: number;
  totalRevenue: number;
  averageProcessingTime: number;
}

export interface CustomerMetrics {
  customerId: string;
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  successRate: number;
  lastOrderDate?: Date;
}

export interface ProcessingMetrics {
  totalProcessed: number;
  averageProcessingTime: number;
  successRate: number;
  failureRate: number;
  byStatus: Record<OrderStatus, number>;
  byPriority: Record<ProcessingPriority, number>;
}

// Taobao-specific types
export interface TaobaoProductData {
  itemId: string;
  title: string;
  price?: number;
  currency: string;
  availability: string;
  verified: boolean;
  lastChecked: string;
  images?: string[];
  specifications?: Record<string, unknown>;
  variations?: Record<string, unknown>;
}

export interface TaobaoVerificationResult {
  verified: boolean;
  available: boolean;
  currentPrice?: number;
  priceChanged: boolean;
  lastChecked: string;
  error?: string;
}

// Filter and pagination types
export interface OrderFilters {
  customerId?: string;
  status?: OrderStatus;
  priority?: ProcessingPriority;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Form validation types
export interface FormErrors {
  [key: string]: string | undefined;
}

export interface FormState<T> {
  data: T;
  errors: FormErrors;
  isSubmitting: boolean;
  isValid: boolean;
}

// API Error types
export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
  timestamp: string;
}

// Notification types
export interface Notification {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

// User session types (extending NextAuth)
export interface SessionUser {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  isActive: boolean;
}

// Component prop types
export interface TableColumn<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
}

export interface ActionButton {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  loading?: boolean;
}
