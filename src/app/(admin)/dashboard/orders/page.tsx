import { Suspense } from "react";
import Link from "next/link";
import { 
  ClipboardDocumentListIcon,
  EyeIcon,
  PlayIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  PauseIcon
} from "@heroicons/react/24/outline";
import { api } from "@/trpc/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type Order = {
  id: string;
  externalOrderId: string;
  orderNumber: string | null;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED" | "ON_HOLD";
  originalTotal: number;
  processedTotal?: number | null;
  currency: string;
  itemCount: number;
  customer: {
    id: string;
    name: string;
    email: string;
  };
  endConsumer?: {
    id: string;
    email: string;
    name: string | null;
    phone: string | null;
  } | null;
  createdAt: Date;
  processedAt?: Date | null;
};

function getStatusIcon(status: Order["status"]) {
  switch (status) {
    case "PENDING":
      return <ClockIcon className="h-4 w-4" />;
    case "PROCESSING":
      return <PlayIcon className="h-4 w-4" />;
    case "COMPLETED":
      return <CheckCircleIcon className="h-4 w-4" />;
    case "FAILED":
      return <XCircleIcon className="h-4 w-4" />;
    case "CANCELLED":
      return <XCircleIcon className="h-4 w-4" />;
    case "ON_HOLD":
      return <PauseIcon className="h-4 w-4" />;
    default:
      return <ClockIcon className="h-4 w-4" />;
  }
}

function getStatusVariant(status: Order["status"]) {
  switch (status) {
    case "PENDING":
      return "secondary" as const;
    case "PROCESSING":
      return "default" as const;
    case "COMPLETED":
      return "default" as const;
    case "FAILED":
      return "destructive" as const;
    case "CANCELLED":
      return "outline" as const;
    case "ON_HOLD":
      return "secondary" as const;
    default:
      return "secondary" as const;
  }
}

function OrderRow({ order }: { order: Order }) {
  const canStartProcessing = order.status === "PENDING";
  
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center">
          <div className="flex-shrink-0">
            {getStatusIcon(order.status)}
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium">
              {order.orderNumber ?? order.externalOrderId}
            </div>
            <div className="text-sm text-muted-foreground">
              ID: {order.externalOrderId}
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">
              {order.customer.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="ml-3">
            <div className="text-sm font-medium">
              {order.customer.name}
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        {order.endConsumer ? (
          <div className="flex items-center">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">
                {order.endConsumer.name ? order.endConsumer.name.charAt(0).toUpperCase() : order.endConsumer.email.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="ml-3">
              <div className="text-sm font-medium">
                {order.endConsumer.name ?? "Anonymous"}
              </div>
              <div className="text-xs text-muted-foreground">
                {order.endConsumer.email}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            No end consumer data
          </div>
        )}
      </TableCell>
      <TableCell>
        <Badge variant={getStatusVariant(order.status)}>
          {order.status.replace("_", " ")}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="text-sm">
          {order.itemCount} item{order.itemCount !== 1 ? "s" : ""}
        </div>
      </TableCell>
      <TableCell>
        <div className="text-sm font-medium">
          {order.currency} {Number(order.originalTotal).toFixed(2)}
        </div>
        {order.processedTotal && (
          <div className="text-xs text-muted-foreground">
            Processed: {order.currency} {Number(order.processedTotal).toFixed(2)}
          </div>
        )}
      </TableCell>
      <TableCell>
        <div className="text-sm">
          {new Date(order.createdAt).toLocaleDateString()}
        </div>
        <div className="text-xs text-muted-foreground">
          {new Date(order.createdAt).toLocaleTimeString()}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end space-x-2">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/dashboard/orders/${order.id}`}>
              <EyeIcon className="h-4 w-4 mr-1" />
              View
            </Link>
          </Button>
          {canStartProcessing && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/dashboard/orders/${order.id}?action=start`}>
                <PlayIcon className="h-4 w-4 mr-1" />
                Process
              </Link>
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

async function OrderStats() {
  try {
    const stats = await api.order.getStats({});
    
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Orders
            </CardTitle>
            <ClockIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingOrders}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting processing
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              In Progress
            </CardTitle>
            <PlayIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.processingOrders}</div>
            <p className="text-xs text-muted-foreground">
              Currently processing
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Completed Today
            </CardTitle>
            <CheckCircleIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedOrders}</div>
            <p className="text-xs text-muted-foreground">
              {stats.successRate.toFixed(1)}% success rate
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Revenue
            </CardTitle>
            <div className="h-4 w-4 text-muted-foreground">$</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats.totalRevenue.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Avg: ${stats.averageOrderValue.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  } catch {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
}

async function OrderTable() {
  try {
    const result = await api.order.getAll({ 
      limit: 50,
      offset: 0 
    });
    
    if (result.orders.length === 0) {
      return (
        <Card>
          <CardContent>
            <div className="text-center py-12">
              <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium">
                No orders yet
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Orders will appear here when customers submit them via webhooks.
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>B2B Customer</TableHead>
              <TableHead>End Consumer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.orders.map((order) => (
              <OrderRow 
                key={order.id} 
                order={{
                  ...order,
                  originalTotal: Number(order.originalTotal),
                  processedTotal: order.processedTotal ? Number(order.processedTotal) : null,
                }} 
              />
            ))}
          </TableBody>
        </Table>
      </Card>
    );
  } catch {
    return (
      <Card>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-destructive">Failed to load orders</p>
            <p className="text-sm text-muted-foreground mt-2">
              Please try refreshing the page
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
}

export default function OrdersPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Process and manage incoming customer orders.
          </p>
        </div>
      </div>

      {/* Order Statistics */}
      <Suspense fallback={
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      }>
        <OrderStats />
      </Suspense>

      {/* Order Table */}
      <Suspense fallback={
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="flex items-center">
                      <Skeleton className="h-4 w-4" />
                      <div className="ml-4 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="ml-3">
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Skeleton className="h-8 w-16" />
                      <Skeleton className="h-8 w-20" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      }>
        <OrderTable />
      </Suspense>
    </div>
  );
}
