import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { 
  ArrowLeftIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlayIcon,
  PauseIcon,
  UserIcon,
  MapPinIcon,
  CreditCardIcon,
  TagIcon,
  LinkIcon
} from "@heroicons/react/24/outline";
import { api } from "@/trpc/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { OrderProcessingForm } from "@/components/admin/order-processing-form";
import { ProcessingHistory } from "@/components/admin/processing-history";

interface OrderPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    action?: string;
  }>;
}

function getStatusIcon(status: string) {
  switch (status) {
    case "PENDING":
      return <ClockIcon className="h-5 w-5" />;
    case "PROCESSING":
      return <PlayIcon className="h-5 w-5" />;
    case "COMPLETED":
      return <CheckCircleIcon className="h-5 w-5" />;
    case "FAILED":
      return <XCircleIcon className="h-5 w-5" />;
    case "CANCELLED":
      return <XCircleIcon className="h-5 w-5" />;
    case "ON_HOLD":
      return <PauseIcon className="h-5 w-5" />;
    default:
      return <ClockIcon className="h-5 w-5" />;
  }
}

function getStatusVariant(status: string) {
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

function getItemStatusVariant(status: string) {
  switch (status) {
    case "PENDING":
      return "secondary" as const;
    case "VERIFIED":
      return "default" as const;
    case "PROCESSING":
      return "default" as const;
    case "COMPLETED":
      return "default" as const;
    case "FAILED":
      return "destructive" as const;
    case "OUT_OF_STOCK":
      return "destructive" as const;
    default:
      return "secondary" as const;
  }
}

async function OrderDetails({ orderId, autoStart }: { orderId: string; autoStart?: boolean }) {
  try {
    const order = await api.order.getById({ id: orderId });
    
    if (!order) {
      notFound();
    }

    const shippingAddress = order.shippingAddress as {
      name: string;
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
      phone?: string;
    };
    const billingAddress = order.billingAddress as {
      name: string;
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    } | null;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/orders">
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Back to Orders
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold">
                Order {order.orderNumber ?? order.externalOrderId}
              </h1>
              <p className="text-sm text-muted-foreground">
                External ID: {order.externalOrderId}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Badge variant={getStatusVariant(order.status)} className="flex items-center space-x-1">
              {getStatusIcon(order.status)}
              <span>{order.status.replace("_", " ")}</span>
            </Badge>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle>Order Items</CardTitle>
                <CardDescription>
                  {order.items.length} item{order.items.length !== 1 ? "s" : ""} in this order
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-start space-x-4 p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium">{item.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              Product ID: {item.productId}
                            </p>
                            {item.taobaoUrl && (
                              <div className="flex items-center mt-2">
                                <LinkIcon className="h-4 w-4 mr-1" />
                                <a 
                                  href={item.taobaoUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:underline"
                                >
                                  View on Taobao
                                </a>
                              </div>
                            )}
                            {item.options && typeof item.options === 'object' && item.options !== null && Object.keys(item.options).length > 0 && (
                              <div className="mt-2">
                                <p className="text-sm text-muted-foreground">Options:</p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {Object.entries(item.options as Record<string, unknown>).map(([key, value]) => (
                                    <Badge key={key} variant="outline" className="text-xs">
                                      {key}: {String(value)}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          <Badge variant={getItemStatusVariant(item.status)}>
                            {item.status.replace("_", " ")}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <div className="text-sm">
                            <span className="text-muted-foreground">Qty:</span> {item.quantity}
                          </div>
                          <div className="text-right">
                            <div className="font-medium">
                              {order.currency} {Number(item.originalPrice).toFixed(2)}
                            </div>
                            {item.processedPrice && (
                              <div className="text-sm text-muted-foreground">
                                Processed: {order.currency} {Number(item.processedPrice).toFixed(2)}
                              </div>
                            )}
                          </div>
                        </div>
                        {item.notes && (
                          <div className="mt-2 p-2 bg-muted rounded text-sm">
                            <strong>Notes:</strong> {item.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Order Processing Form */}
            {(order.status === "PENDING" || order.status === "PROCESSING" || order.status === "ON_HOLD") && (
              <OrderProcessingForm 
                order={{
                  ...order,
                  originalTotal: Number(order.originalTotal),
                  processedTotal: order.processedTotal ? Number(order.processedTotal) : null,
                  items: order.items.map(item => ({
                    ...item,
                    originalPrice: Number(item.originalPrice),
                    processedPrice: item.processedPrice ? Number(item.processedPrice) : null,
                  }))
                }} 
                autoStart={autoStart} 
              />
            )}

            {/* Processing History */}
            <ProcessingHistory orderId={order.id} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TagIcon className="h-5 w-5 mr-2" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Original Total:</span>
                  <span className="font-medium">
                    {order.currency} {Number(order.originalTotal).toFixed(2)}
                  </span>
                </div>
                {order.processedTotal && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Processed Total:</span>
                    <span className="font-medium">
                      {order.currency} {Number(order.processedTotal).toFixed(2)}
                    </span>
                  </div>
                )}
                {order.discountAmount && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount ({order.promoCode}):</span>
                    <span>-{order.currency} {Number(order.discountAmount).toFixed(2)}</span>
                  </div>
                )}
                <Separator />
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created:</span>
                    <span>{new Date(order.createdAt).toLocaleString()}</span>
                  </div>
                  {order.processedAt && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Processed:</span>
                      <span>{new Date(order.processedAt).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Priority:</span>
                    <Badge variant="outline">{order.priority}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <UserIcon className="h-5 w-5 mr-2" />
                  Customer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarFallback>
                      {order.customer.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{order.customer.name}</p>
                    <p className="text-sm text-muted-foreground">{order.customer.email}</p>
                  </div>
                </div>
                <Button asChild variant="outline" size="sm" className="w-full mt-4">
                  <Link href={`/dashboard/customers/${order.customer.id}`}>
                    View Customer Details
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Shipping Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPinIcon className="h-5 w-5 mr-2" />
                  Shipping Address
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  <p className="font-medium">{shippingAddress?.name}</p>
                  <p>{shippingAddress?.line1}</p>
                  {shippingAddress?.line2 && <p>{shippingAddress.line2}</p>}
                  <p>
                    {shippingAddress?.city}, {shippingAddress?.state} {shippingAddress?.postalCode}
                  </p>
                  <p>{shippingAddress?.country}</p>
                  {shippingAddress?.phone && (
                    <p className="text-muted-foreground">Phone: {shippingAddress.phone}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Billing Address */}
            {billingAddress && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CreditCardIcon className="h-5 w-5 mr-2" />
                    Billing Address
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 text-sm">
                    <p className="font-medium">{billingAddress?.name}</p>
                    <p>{billingAddress?.line1}</p>
                    {billingAddress?.line2 && <p>{billingAddress.line2}</p>}
                    <p>
                      {billingAddress?.city}, {billingAddress?.state} {billingAddress?.postalCode}
                    </p>
                    <p>{billingAddress?.country}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  } catch {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Failed to load order</p>
        <p className="text-sm text-muted-foreground mt-2">
          Please try refreshing the page
        </p>
      </div>
    );
  }
}

export default async function OrderPage({ params, searchParams }: OrderPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const autoStart = resolvedSearchParams.action === "start";

  return (
    <Suspense fallback={
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-8 w-24" />
            <div>
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32 mt-2" />
            </div>
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="p-4 border rounded-lg">
                      <Skeleton className="h-5 w-48 mb-2" />
                      <Skeleton className="h-4 w-32 mb-4" />
                      <div className="flex justify-between">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    }>
      <OrderDetails orderId={resolvedParams.id} autoStart={autoStart} />
    </Suspense>
  );
}
