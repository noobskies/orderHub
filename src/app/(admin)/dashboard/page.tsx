import { Suspense } from "react";
import { 
  ShoppingBagIcon, 
  UsersIcon, 
  ClockIcon,
  CheckCircleIcon 
} from "@heroicons/react/24/outline";
import { api } from "@/trpc/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

type StatCardProps = {
  name: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  change: string;
  changeType: "increase" | "decrease" | "neutral";
};

function StatCard({ stat }: { stat: StatCardProps }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {stat.name}
        </CardTitle>
        <stat.icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{stat.value}</div>
        <p className="text-xs text-muted-foreground">
          <span
            className={`font-medium ${
              stat.changeType === "increase"
                ? "text-green-600"
                : stat.changeType === "decrease"
                ? "text-red-600"
                : "text-muted-foreground"
            }`}
          >
            {stat.change}
          </span>
          {" from last month"}
        </p>
      </CardContent>
    </Card>
  );
}

async function DashboardStats() {
  try {
    const metrics = await api.analytics.getDashboardMetrics({});
    
    const stats: StatCardProps[] = [
      {
        name: "Total Orders",
        value: metrics.totalOrders.toString(),
        icon: ShoppingBagIcon,
        change: "+0%",
        changeType: "neutral",
      },
      {
        name: "Active Customers",
        value: metrics.activeCustomers.toString(),
        icon: UsersIcon,
        change: "+0%",
        changeType: "neutral",
      },
      {
        name: "Pending Orders",
        value: metrics.pendingOrders.toString(),
        icon: ClockIcon,
        change: "0",
        changeType: "neutral",
      },
      {
        name: "Completed Orders",
        value: metrics.completedOrders.toString(),
        icon: CheckCircleIcon,
        change: "+0%",
        changeType: "neutral",
      },
    ];

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
  } catch (error) {
    console.error("Failed to load dashboard metrics:", error);
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Failed to load dashboard metrics</p>
      </div>
    );
  }
}

async function RecentActivity() {
  try {
    const metrics = await api.analytics.getDashboardMetrics({});
    
    if (metrics.recentOrders.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <ShoppingBagIcon className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium">
                No orders yet
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Orders will appear here once customers start sending them via webhooks.
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm font-medium">
                    {order.externalOrderId}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {order.customerName} • ${order.originalTotal.toString()}
                  </p>
                </div>
                <div className="text-right">
                  <Badge 
                    variant={
                      order.status === "COMPLETED" ? "default" :
                      order.status === "PROCESSING" ? "secondary" :
                      order.status === "PENDING" ? "outline" :
                      "secondary"
                    }
                  >
                    {order.status}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  } catch (error) {
    console.error("Failed to load recent activity:", error);
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-destructive">Failed to load recent activity</p>
          </div>
        </CardContent>
      </Card>
    );
  }
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

      <Suspense fallback={
        <div>
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Overview
          </h3>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      }>
        <DashboardStats />
      </Suspense>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Suspense fallback={
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <div className="text-right space-y-2">
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        }>
          <RecentActivity />
        </Suspense>
        
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks and shortcuts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button asChild className="w-full">
                <Link href="/dashboard/customers/new">
                  Add New Customer
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/dashboard/orders">
                  View All Orders
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/dashboard/users/new">
                  Add Admin User
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
