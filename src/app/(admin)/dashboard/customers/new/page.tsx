"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeftIcon,
  EyeIcon,
  EyeSlashIcon,
  ClipboardDocumentIcon
} from "@heroicons/react/24/outline";
import { api } from "@/trpc/react";

type FormData = {
  name: string;
  email: string;
  webhookUrl: string;
  currency: string;
  timezone: string;
  processingPriority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  emailNotifications: boolean;
  webhookNotifications: boolean;
};

const initialFormData: FormData = {
  name: "",
  email: "",
  webhookUrl: "",
  currency: "USD",
  timezone: "UTC",
  processingPriority: "NORMAL",
  emailNotifications: true,
  webhookNotifications: true,
};

const currencies = [
  { value: "USD", label: "US Dollar (USD)" },
  { value: "EUR", label: "Euro (EUR)" },
  { value: "GBP", label: "British Pound (GBP)" },
  { value: "CAD", label: "Canadian Dollar (CAD)" },
  { value: "AUD", label: "Australian Dollar (AUD)" },
  { value: "CNY", label: "Chinese Yuan (CNY)" },
];

const timezones = [
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)" },
];

const priorities = [
  { value: "LOW", label: "Low", description: "Standard processing queue" },
  { value: "NORMAL", label: "Normal", description: "Default priority level" },
  { value: "HIGH", label: "High", description: "Expedited processing" },
  { value: "URGENT", label: "Urgent", description: "Highest priority processing" },
];

export default function NewCustomerPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [createdCustomer, setCreatedCustomer] = useState<{ id: string; apiKey: string; apiSecret: string } | null>(null);

  const createCustomer = api.customer.create.useMutation({
    onSuccess: (data) => {
      setCreatedCustomer({
        id: data.id,
        apiKey: data.apiKey,
        apiSecret: data.apiSecret || "",
      });
    },
    onError: (error) => {
      console.error("Failed to create customer:", error);
      // Handle validation errors
      if (error.message.includes("email")) {
        setErrors({ email: "Email already exists or is invalid" });
      } else {
        setErrors({ name: error.message });
      }
    },
  });

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Customer name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.webhookUrl.trim()) {
      newErrors.webhookUrl = "Webhook URL is required";
    } else {
      try {
        new URL(formData.webhookUrl);
      } catch {
        newErrors.webhookUrl = "Please enter a valid URL";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    createCustomer.mutate(formData);
  };

  const copyToClipboard = (text: string) => {
    void navigator.clipboard.writeText(text);
  };

  // Success state - show API credentials
  if (createdCustomer) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Link
            href="/dashboard/customers"
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Customer Created Successfully!</h1>
            <p className="text-sm text-gray-500">
              Save these API credentials - they won't be shown again
            </p>
          </div>
        </div>

        {/* API Credentials */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-green-800">
                Customer "{formData.name}" has been created
              </h3>
              <p className="text-sm text-green-700">
                Please save these API credentials securely
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-green-800 mb-2">
                API Key (for Authorization header)
              </label>
              <div className="flex items-center space-x-2">
                <code className="flex-1 bg-white px-3 py-2 rounded border text-sm font-mono text-gray-900">
                  {createdCustomer.apiKey}
                </code>
                <button
                  onClick={() => copyToClipboard(createdCustomer.apiKey)}
                  className="p-2 text-green-600 hover:text-green-800 rounded hover:bg-green-100"
                  title="Copy API Key"
                >
                  <ClipboardDocumentIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            {createdCustomer.apiSecret && (
              <div>
                <label className="block text-sm font-medium text-green-800 mb-2">
                  API Secret (store securely)
                </label>
                <div className="flex items-center space-x-2">
                  <code className="flex-1 bg-white px-3 py-2 rounded border text-sm font-mono text-gray-900">
                    {createdCustomer.apiSecret}
                  </code>
                  <button
                    onClick={() => copyToClipboard(createdCustomer.apiSecret)}
                    className="p-2 text-green-600 hover:text-green-800 rounded hover:bg-green-100"
                    title="Copy API Secret"
                  >
                    <ClipboardDocumentIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 bg-green-100 rounded-lg p-4">
            <h4 className="text-sm font-medium text-green-800 mb-2">Integration Instructions:</h4>
            <div className="text-sm text-green-700 space-y-1">
              <p>• Use the API Key in the Authorization header: <code className="bg-white px-1 rounded">Bearer {createdCustomer.apiKey}</code></p>
              <p>• Send orders to: <code className="bg-white px-1 rounded">POST /api/webhook/{createdCustomer.id}/order</code></p>
              <p>• Check status at: <code className="bg-white px-1 rounded">GET /api/webhook/{createdCustomer.id}/status</code></p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-4">
          <Link
            href={`/dashboard/customers/${createdCustomer.id}`}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            View Customer Details
          </Link>
          <Link
            href="/dashboard/customers"
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Back to Customers
          </Link>
        </div>
      </div>
    );
  }

  // Form state
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link
          href="/dashboard/customers"
          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add New Customer</h1>
          <p className="text-sm text-gray-500">
            Create a new customer account with API access
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Basic Information
            </h3>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Customer Name *
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                    errors.name ? "border-red-300" : ""
                  }`}
                  placeholder="e.g., Acme E-commerce"
                />
                {errors.name && (
                  <p className="mt-2 text-sm text-red-600">{errors.name}</p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                    errors.email ? "border-red-300" : ""
                  }`}
                  placeholder="contact@acme.com"
                />
                {errors.email && (
                  <p className="mt-2 text-sm text-red-600">{errors.email}</p>
                )}
              </div>
            </div>

            <div className="mt-6">
              <label htmlFor="webhookUrl" className="block text-sm font-medium text-gray-700">
                Webhook URL *
              </label>
              <input
                type="url"
                id="webhookUrl"
                value={formData.webhookUrl}
                onChange={(e) => handleInputChange("webhookUrl", e.target.value)}
                className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                  errors.webhookUrl ? "border-red-300" : ""
                }`}
                placeholder="https://api.acme.com/webhooks/order-processed"
              />
              <p className="mt-2 text-sm text-gray-500">
                We'll send processed order results to this URL
              </p>
              {errors.webhookUrl && (
                <p className="mt-2 text-sm text-red-600">{errors.webhookUrl}</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Configuration
            </h3>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="currency" className="block text-sm font-medium text-gray-700">
                  Currency
                </label>
                <select
                  id="currency"
                  value={formData.currency}
                  onChange={(e) => handleInputChange("currency", e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  {currencies.map((currency) => (
                    <option key={currency.value} value={currency.value}>
                      {currency.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="timezone" className="block text-sm font-medium text-gray-700">
                  Timezone
                </label>
                <select
                  id="timezone"
                  value={formData.timezone}
                  onChange={(e) => handleInputChange("timezone", e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  {timezones.map((timezone) => (
                    <option key={timezone.value} value={timezone.value}>
                      {timezone.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Processing Priority
              </label>
              <div className="space-y-3">
                {priorities.map((priority) => (
                  <div key={priority.value} className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id={`priority-${priority.value}`}
                        name="processingPriority"
                        type="radio"
                        checked={formData.processingPriority === priority.value}
                        onChange={() => handleInputChange("processingPriority", priority.value)}
                        className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor={`priority-${priority.value}`} className="font-medium text-gray-700">
                        {priority.label}
                      </label>
                      <p className="text-gray-500">{priority.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Notification Preferences
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="emailNotifications"
                    type="checkbox"
                    checked={formData.emailNotifications}
                    onChange={(e) => handleInputChange("emailNotifications", e.target.checked)}
                    className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="emailNotifications" className="font-medium text-gray-700">
                    Email Notifications
                  </label>
                  <p className="text-gray-500">Receive email updates about order processing</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="webhookNotifications"
                    type="checkbox"
                    checked={formData.webhookNotifications}
                    onChange={(e) => handleInputChange("webhookNotifications", e.target.checked)}
                    className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="webhookNotifications" className="font-medium text-gray-700">
                    Webhook Notifications
                  </label>
                  <p className="text-gray-500">Send processed results to webhook URL</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-4">
          <Link
            href="/dashboard/customers"
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={createCustomer.isPending}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createCustomer.isPending ? "Creating..." : "Create Customer"}
          </button>
        </div>
      </form>
    </div>
  );
}
