"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeftIcon,
  CheckIcon
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
  isActive: boolean;
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

type EditCustomerPageProps = {
  params: Promise<{ id: string }>;
};

export default function EditCustomerPage({ params }: EditCustomerPageProps) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState<string>("");
  const [formData, setFormData] = useState<FormData | null>(null);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Resolve params
  useEffect(() => {
    void params.then(({ id }) => {
      setCustomerId(id);
    });
  }, [params]);

  // Fetch customer data
  const { data: customer, isLoading, error } = api.customer.getById.useQuery(
    { id: customerId },
    { enabled: !!customerId }
  );

  // Update customer mutation
  const updateCustomer = api.customer.update.useMutation({
    onSuccess: () => {
      router.push(`/dashboard/customers/${customerId}`);
    },
    onError: (error) => {
      console.error("Failed to update customer:", error);
      // Handle validation errors
      if (error.message.includes("email")) {
        setErrors({ email: "Email already exists or is invalid" });
      } else {
        setErrors({ name: error.message });
      }
    },
  });

  // Initialize form data when customer is loaded
  useEffect(() => {
    if (customer && !formData) {
      setFormData({
        name: customer.name,
        email: customer.email,
        webhookUrl: customer.webhookUrl,
        currency: customer.currency,
        timezone: customer.timezone,
        processingPriority: customer.processingPriority,
        emailNotifications: customer.emailNotifications,
        webhookNotifications: customer.webhookNotifications,
        isActive: customer.isActive,
      });
    }
  }, [customer, formData]);

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    if (!formData) return;
    
    setFormData(prev => prev ? { ...prev, [field]: value } : null);
    setHasChanges(true);
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    if (!formData) return false;
    
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
    
    if (!formData || !validateForm()) {
      return;
    }

    updateCustomer.mutate({
      id: customerId,
      ...formData,
    });
  };

  const handleCancel = () => {
    if (hasChanges) {
      if (confirm("You have unsaved changes. Are you sure you want to leave?")) {
        router.push(`/dashboard/customers/${customerId}`);
      }
    } else {
      router.push(`/dashboard/customers/${customerId}`);
    }
  };

  // Loading state
  if (isLoading || !formData) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Link
            href="/dashboard/customers"
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Customer Not Found</h1>
            <p className="text-sm text-gray-500">The customer you&apos;re looking for doesn&apos;t exist.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link
          href={`/dashboard/customers/${customerId}`}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Customer</h1>
          <p className="text-sm text-gray-500">
            Update customer information and settings
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
                We&apos;ll send processed order results to this URL
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

        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Account Status
            </h3>
            
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="isActive"
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => handleInputChange("isActive", e.target.checked)}
                  className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="isActive" className="font-medium text-gray-700">
                  Active Customer
                </label>
                <p className="text-gray-500">
                  Inactive customers cannot submit new orders or receive webhooks
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-4">
          <button
            type="button"
            onClick={handleCancel}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={updateCustomer.isPending || !hasChanges}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updateCustomer.isPending ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              <>
                <CheckIcon className="-ml-1 mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
