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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type UserDetailProps = {
  params: Promise<{ id: string }>;
};

function UserStats({ userId }: { userId: string }) {
  return (
    <Suspense fallback={
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    }>
      <UserStatsContent userId={userId} />
    </Suspense>
  );
}

async function UserStatsContent({ userId }: { userId: string }) {
  try {
    const stats = await api.user.getStats({ id: userId });
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground">Total Actions</div>
            <div className="text-2xl font-bold">{stats.totalProcessingLogs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground">Orders Started</div>
            <div className="text-2xl font-bold text-blue-600">{stats.ordersStarted}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground">Orders Completed</div>
            <div className="text-2xl font-bold text-green-600">{stats.ordersCompleted}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground">Success Rate</div>
            <div className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>
    );
  } catch {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600 text-sm">Failed to load user statistics</p>
      </div>
    );
  }
}

type ProcessedOrder = {
  id: string;
  action: string;
  status: string | null;
  notes: string | null;
  createdAt: Date;
  order: {
    id: string;
    externalOrderId: string;
    customer: {
      name: string;
    };
  };
};

function RecentActivity({ processedOrders }: { processedOrders: ProcessedOrder[] }) {
  if (processedOrders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">No recent processing activity</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Recent Activity</CardTitle>
          <Link
            href="/dashboard/orders"
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            View all orders →
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {processedOrders.map((log) => (
            <div key={log.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm font-medium">
                  {log.action.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase())}
                </p>
                <p className="text-sm text-muted-foreground">
                  {log.order.customer.name} • Order {log.order.externalOrderId}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(log.createdAt).toLocaleDateString()} at {new Date(log.createdAt).toLocaleTimeString()}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {log.status && (
                  <Badge 
                    variant={
                      log.status === "COMPLETED" ? "default" :
                      log.status === "PROCESSING" ? "secondary" :
                      log.status === "PENDING" ? "outline" :
                      log.status === "FAILED" ? "destructive" :
                      "secondary"
                    }
                  >
                    {log.status}
                  </Badge>
                )}
                <Link
                  href={`/dashboard/orders/${log.order.id}`}
                  className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                  title="View Order"
                >
                  <EyeIcon className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

async function UserDetailContent({ id }: { id: string }) {
  try {
    const user = await api.user.getById({ id });
    
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/dashboard/users"
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{user.name ?? "Admin User"}</h1>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge 
                variant={user.role === "SUPER_ADMIN" ? "default" : "secondary"}
              >
                {user.role === "SUPER_ADMIN" ? "Super Admin" : "Admin"}
              </Badge>
              <Badge 
                variant={user.isActive ? "default" : "secondary"}
              >
                {user.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button asChild variant="outline">
              <Link href={`/dashboard/users/${user.id}/edit`}>
                <PencilIcon className="-ml-1 mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
          </div>
        </div>

        {/* Statistics */}
        <UserStats userId={user.id} />

        {/* User Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>User Information</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Full Name</dt>
                  <dd className="text-sm">{user.name ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Email</dt>
                  <dd className="text-sm">{user.email}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Role</dt>
                  <dd className="text-sm">
                    <Badge 
                      variant={user.role === "SUPER_ADMIN" ? "default" : "secondary"}
                    >
                      {user.role === "SUPER_ADMIN" ? "Super Admin" : "Admin"}
                    </Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Status</dt>
                  <dd className="text-sm">
                    <Badge 
                      variant={user.isActive ? "default" : "secondary"}
                    >
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Created</dt>
                  <dd className="text-sm">
                    {new Date(user.createdAt).toLocaleDateString()} at{" "}
                    {new Date(user.createdAt).toLocaleTimeString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Last Updated</dt>
                  <dd className="text-sm">
                    {new Date(user.updatedAt).toLocaleDateString()} at{" "}
                    {new Date(user.updatedAt).toLocaleTimeString()}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Permissions & Access */}
          <Card>
            <CardHeader>
              <CardTitle>Permissions & Access</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Role Permissions</dt>
                  <dd className="text-sm">
                    <div className="space-y-2 mt-2">
                      <div className="flex items-center space-x-2">
                        <CheckIcon className="h-4 w-4 text-green-600" />
                        <span>View dashboard and analytics</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckIcon className="h-4 w-4 text-green-600" />
                        <span>Manage customers</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckIcon className="h-4 w-4 text-green-600" />
                        <span>Process orders</span>
                      </div>
                      {user.role === "SUPER_ADMIN" && (
                        <>
                          <div className="flex items-center space-x-2">
                            <CheckIcon className="h-4 w-4 text-green-600" />
                            <span>Manage admin users</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <CheckIcon className="h-4 w-4 text-green-600" />
                            <span>System settings</span>
                          </div>
                        </>
                      )}
                    </div>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Processing Activity</dt>
                  <dd className="text-sm">
                    {user.processedOrderCount} orders processed
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>

        {/* Password Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Security</CardTitle>
                <CardDescription>
                  Manage password and security settings
                </CardDescription>
              </div>
              <Button variant="outline">
                <KeyIcon className="-ml-0.5 mr-2 h-4 w-4" />
                Reset Password
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">
                Password was last updated on {new Date(user.updatedAt).toLocaleDateString()}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <RecentActivity processedOrders={user.processedOrders} />
      </div>
    );
  } catch {
    notFound();
  }
}

export default async function UserDetailPage({ params }: UserDetailProps) {
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
      <UserDetailContent id={id} />
    </Suspense>
  );
}
