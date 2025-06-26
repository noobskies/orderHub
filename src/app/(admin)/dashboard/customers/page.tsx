import { Suspense } from "react";
import Link from "next/link";
import { 
  PlusIcon, 
  UsersIcon,
  EyeIcon,
  PencilIcon,
  KeyIcon
} from "@heroicons/react/24/outline";
import { api } from "@/trpc/server";

type Customer = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  currency: string;
  processingPriority: string;
  orderCount: number;
  createdAt: Date;
};

function CustomerRow({ customer }: { customer: Customer }) {
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <UsersIcon className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">
              {customer.name}
            </div>
            <div className="text-sm text-gray-500">
              {customer.email}
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          customer.isActive 
            ? "bg-green-100 text-green-800" 
            : "bg-red-100 text-red-800"
        }`}>
          {customer.isActive ? "Active" : "Inactive"}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {customer.orderCount}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
          customer.processingPriority === "URGENT" ? "bg-red-100 text-red-800" :
          customer.processingPriority === "HIGH" ? "bg-orange-100 text-orange-800" :
          customer.processingPriority === "NORMAL" ? "bg-blue-100 text-blue-800" :
          "bg-gray-100 text-gray-800"
        }`}>
          {customer.processingPriority}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {customer.currency}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {new Date(customer.createdAt).toLocaleDateString()}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex items-center justify-end space-x-2">
          <Link
            href={`/dashboard/customers/${customer.id}`}
            className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
            title="View Details"
          >
            <EyeIcon className="h-4 w-4" />
          </Link>
          <Link
            href={`/dashboard/customers/${customer.id}/edit`}
            className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-50"
            title="Edit Customer"
          >
            <PencilIcon className="h-4 w-4" />
          </Link>
        </div>
      </td>
    </tr>
  );
}

async function CustomerTable() {
  try {
    const customers = await api.customer.getAll({ includeInactive: false });
    
    if (customers.length === 0) {
      return (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="text-center py-12">
              <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No customers yet
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by adding your first customer.
              </p>
              <div className="mt-6">
                <Link
                  href="/dashboard/customers/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                  Add Customer
                </Link>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Orders
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Currency
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {customers.map((customer) => (
                <CustomerRow key={customer.id} customer={customer} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Failed to load customers:", error);
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="text-center py-12">
            <p className="text-red-600">Failed to load customers</p>
            <p className="text-sm text-gray-500 mt-2">
              Please try refreshing the page
            </p>
          </div>
        </div>
      </div>
    );
  }
}

export default function CustomersPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage your e-commerce customers and their configurations.
          </p>
        </div>
        <Link
          href="/dashboard/customers/new"
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
          Add Customer
        </Link>
      </div>

      {/* Customer Table */}
      <Suspense fallback={
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                <div className="h-4 bg-gray-200 rounded w-4/6"></div>
              </div>
            </div>
          </div>
        </div>
      }>
        <CustomerTable />
      </Suspense>
    </div>
  );
}
