import { Suspense } from "react";
import { 
  ShoppingBagIcon, 
  UsersIcon, 
  ClockIcon,
  CheckCircleIcon 
} from "@heroicons/react/24/outline";

// TODO: Replace with actual data from tRPC
const stats = [
  {
    name: "Total Orders",
    value: "0",
    icon: ShoppingBagIcon,
    change: "+0%",
    changeType: "increase" as const,
  },
  {
    name: "Active Customers",
    value: "0",
    icon: UsersIcon,
    change: "+0%",
    changeType: "increase" as const,
  },
  {
    name: "Pending Orders",
    value: "0",
    icon: ClockIcon,
    change: "0",
    changeType: "neutral" as const,
  },
  {
    name: "Completed Today",
    value: "0",
    icon: CheckCircleIcon,
    change: "+0%",
    changeType: "increase" as const,
  },
];

function StatCard({ stat }: { stat: typeof stats[0] }) {
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <stat.icon className="h-6 w-6 text-gray-400" aria-hidden="true" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                {stat.name}
              </dt>
              <dd>
                <div className="text-lg font-medium text-gray-900">
                  {stat.value}
                </div>
              </dd>
            </dl>
          </div>
        </div>
      </div>
      <div className="bg-gray-50 px-5 py-3">
        <div className="text-sm">
          <span
            className={`font-medium ${
              stat.changeType === "increase"
                ? "text-green-600"
                : stat.changeType === "decrease"
                ? "text-red-600"
                : "text-gray-600"
            }`}
          >
            {stat.change}
          </span>
          <span className="text-gray-500"> from last month</span>
        </div>
      </div>
    </div>
  );
}

function DashboardStats() {
  return (
    <div>
      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
        Overview
      </h3>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.name} stat={stat} />
        ))}
      </div>
    </div>
  );
}

function RecentActivity() {
  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
          Recent Activity
        </h3>
        <div className="text-center py-12">
          <ShoppingBagIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No orders yet
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Orders will appear here once customers start sending them via webhooks.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">
          Welcome to the Order Processing Hub. Monitor your orders and customers from here.
        </p>
      </div>

      <Suspense fallback={<div>Loading stats...</div>}>
        <DashboardStats />
      </Suspense>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Suspense fallback={<div>Loading activity...</div>}>
          <RecentActivity />
        </Suspense>
        
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Quick Actions
            </h3>
            <div className="space-y-3">
              <a
                href="/dashboard/customers/new"
                className="block w-full bg-blue-600 text-white text-center px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Add New Customer
              </a>
              <a
                href="/dashboard/orders"
                className="block w-full bg-gray-100 text-gray-900 text-center px-4 py-2 rounded-md hover:bg-gray-200 transition-colors"
              >
                View All Orders
              </a>
              <a
                href="/dashboard/users/new"
                className="block w-full bg-gray-100 text-gray-900 text-center px-4 py-2 rounded-md hover:bg-gray-200 transition-colors"
              >
                Add Admin User
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
