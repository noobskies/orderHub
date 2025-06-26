import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { 
  ArrowLeftIcon,
  PencilIcon,
  KeyIcon,
  EyeIcon,
  CheckIcon
} from "@heroicons/react/24/outline";
import { api } from "@/trpc/server";
import { CopyButton } from "@/components/admin/copy-button";
import type { Decimal } from "@prisma/client/runtime/library";

type CustomerDetailProps = {
  params: Promise<{ id: string }>;
};

type Order = {
  id: string;
  externalOrderId: string;
  status: string;
  originalTotal: Decimal;
  currency: string;
  createdAt: Date;
};

function ApiKeyDisplay({ apiKey }: { apiKey: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            API Key
          </label>
          <div className="flex items-center space-x-2">
            <code className="bg-white px-3 py-2 rounded border text-sm font-mono text-gray-900 flex-1">
              {apiKey}
            </code>
            <CopyButton text={apiKey} title="Copy API Key" />
          </div>
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-2">
        Use this API key in the Authorization header: Bearer {apiKey}
      </p>
    </div>
  );
}

function CustomerStats({ customerId }: { customerId: string }) {
  return (
    <Suspense fallback={
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    }>
      <CustomerStatsContent customerId={customerId} />
    </Suspense>
  );
}

async function CustomerStatsContent({ customerId }: { customerId: string }) {
  try {
    const stats = await api.customer.getStats({ id: customerId });
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500">Total Orders</div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalOrders}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500">Pending</div>
          <div className="text-2xl font-bold text-blue-600">{stats.pendingOrders}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500">Completed</div>
          <div className="text-2xl font-bold text-green-600">{stats.completedOrders}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500">Success Rate</div>
          <div className="text-2xl font-bold text-gray-900">{stats.successRate.toFixed(1)}%</div>
        </div>
      </div>
    );
  } catch {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600 text-sm">Failed to load customer statistics</p>
      </div>
    );
  }
}

function RecentOrders({ orders }: { orders: Order[] }) {
  if (orders.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Recent Orders
          </h3>
          <div className="text-center py-8">
            <p className="text-gray-500">No orders yet from this customer</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Recent Orders
          </h3>
          <Link
            href="/dashboard/orders"
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            View all orders →
          </Link>
        </div>
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {order.externalOrderId}
                </p>
                <p className="text-sm text-gray-500">
                  ${order.originalTotal.toString()} • {new Date(order.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  order.status === "COMPLETED" ? "bg-green-100 text-green-800" :
                  order.status === "PROCESSING" ? "bg-yellow-100 text-yellow-800" :
                  order.status === "PENDING" ? "bg-blue-100 text-blue-800" :
                  order.status === "FAILED" ? "bg-red-100 text-red-800" :
                  "bg-gray-100 text-gray-800"
                }`}>
                  {order.status}
                </span>
                <Link
                  href={`/dashboard/orders/${order.id}`}
                  className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                  title="View Order"
                >
                  <EyeIcon className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

async function CustomerDetailContent({ id }: { id: string }) {
  try {
    const customer = await api.customer.getById({ id });
    
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/dashboard/customers"
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
              <p className="text-sm text-gray-500">{customer.email}</p>
            </div>
            <div className="flex items-center">
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                customer.isActive 
                  ? "bg-green-100 text-green-800" 
                  : "bg-red-100 text-red-800"
              }`}>
                {customer.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              href={`/dashboard/customers/${customer.id}/edit`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PencilIcon className="-ml-1 mr-2 h-4 w-4" />
              Edit
            </Link>
          </div>
        </div>

        {/* Statistics */}
        <CustomerStats customerId={customer.id} />

        {/* Customer Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Customer Information
              </h3>
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Name</dt>
                  <dd className="text-sm text-gray-900">{customer.name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Email</dt>
                  <dd className="text-sm text-gray-900">{customer.email}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Webhook URL</dt>
                  <dd className="text-sm text-gray-900 break-all">{customer.webhookUrl}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Created</dt>
                  <dd className="text-sm text-gray-900">
                    {new Date(customer.createdAt).toLocaleDateString()} at{" "}
                    {new Date(customer.createdAt).toLocaleTimeString()}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Settings */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Settings
              </h3>
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Currency</dt>
                  <dd className="text-sm text-gray-900">{customer.currency}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Timezone</dt>
                  <dd className="text-sm text-gray-900">{customer.timezone}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Processing Priority</dt>
                  <dd>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                      customer.processingPriority === "URGENT" ? "bg-red-100 text-red-800" :
                      customer.processingPriority === "HIGH" ? "bg-orange-100 text-orange-800" :
                      customer.processingPriority === "NORMAL" ? "bg-blue-100 text-blue-800" :
                      "bg-gray-100 text-gray-800"
                    }`}>
                      {customer.processingPriority}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Notifications</dt>
                  <dd className="text-sm text-gray-900">
                    <div className="flex items-center space-x-4">
                      <span className={`flex items-center ${
                        customer.emailNotifications ? "text-green-600" : "text-gray-400"
                      }`}>
                        {customer.emailNotifications ? <CheckIcon className="h-4 w-4 mr-1" /> : "✕"}
                        Email
                      </span>
                      <span className={`flex items-center ${
                        customer.webhookNotifications ? "text-green-600" : "text-gray-400"
                      }`}>
                        {customer.webhookNotifications ? <CheckIcon className="h-4 w-4 mr-1" /> : "✕"}
                        Webhook
                      </span>
                    </div>
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        {/* API Key */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                API Configuration
              </h3>
              <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                <KeyIcon className="-ml-0.5 mr-2 h-4 w-4" />
                Regenerate Key
              </button>
            </div>
            <ApiKeyDisplay apiKey={customer.apiKey} />
          </div>
        </div>

        {/* Recent Orders */}
        <RecentOrders orders={customer.orders} />
      </div>
    );
  } catch {
    notFound();
  }
}

export default async function CustomerDetailPage({ params }: CustomerDetailProps) {
  const { id } = await params;
  
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    }>
      <CustomerDetailContent id={id} />
    </Suspense>
  );
}
