"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { 
  PlayIcon, 
  CheckCircleIcon,
  XCircleIcon,
  PauseIcon
} from "@heroicons/react/24/outline";
import { api } from "@/trpc/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

// Form validation schema
const orderProcessingSchema = z.object({
  processedTotal: z.number().positive("Processed total must be positive"),
  processingNotes: z.string().optional(),
  items: z.array(
    z.object({
      id: z.string(),
      processedPrice: z.number().positive("Price must be positive"),
      status: z.enum([
        "PENDING",
        "VERIFIED", 
        "PROCESSING",
        "COMPLETED",
        "FAILED",
        "OUT_OF_STOCK"
      ]),
      notes: z.string().optional(),
    })
  ).optional(),
});

type OrderProcessingFormData = z.infer<typeof orderProcessingSchema>;

interface OrderProcessingFormProps {
  order: {
    id: string;
    status: string;
    originalTotal: number;
    processedTotal?: number | null;
    processingNotes?: string | null;
    currency: string;
    items: Array<{
      id: string;
      name: string;
      originalPrice: number;
      processedPrice?: number | null;
      quantity: number;
      status: string;
      notes?: string | null;
    }>;
  };
  autoStart?: boolean;
}

export function OrderProcessingForm({ order, autoStart }: OrderProcessingFormProps) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasStarted, setHasStarted] = useState(order.status === "PROCESSING");

  // tRPC mutations
  const startProcessingMutation = api.order.startProcessing.useMutation({
    onSuccess: () => {
      setHasStarted(true);
      toast.success("Order processing started");
      router.refresh();
    },
    onError: (error) => {
      toast.error(`Failed to start processing: ${error.message}`);
    },
  });

  const updateStatusMutation = api.order.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Order status updated");
      router.refresh();
    },
    onError: (error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });

  const processOrderMutation = api.order.process.useMutation({
    onSuccess: () => {
      toast.success("Order completed successfully");
      router.refresh();
    },
    onError: (error) => {
      toast.error(`Failed to complete order: ${error.message}`);
    },
  });

  // Initialize form with current order data
  const form = useForm<OrderProcessingFormData>({
    resolver: zodResolver(orderProcessingSchema),
    defaultValues: {
      processedTotal: order.processedTotal ? Number(order.processedTotal) : Number(order.originalTotal),
      processingNotes: order.processingNotes ?? "",
      items: order.items.map(item => ({
        id: item.id,
        processedPrice: item.processedPrice ? Number(item.processedPrice) : Number(item.originalPrice),
        status: item.status as "PENDING" | "VERIFIED" | "PROCESSING" | "COMPLETED" | "FAILED" | "OUT_OF_STOCK",
        notes: item.notes ?? "",
      })),
    },
  });

  // Auto-start processing if requested
  if (autoStart && !hasStarted && order.status === "PENDING") {
    void handleStartProcessing();
  }

  async function handleStartProcessing() {
    if (startProcessingMutation.isPending) return;
    
    try {
      await startProcessingMutation.mutateAsync({ id: order.id });
    } catch (error) {
      // Error handled in mutation
    }
  }

  async function handleStatusUpdate(status: string, notes?: string) {
    if (updateStatusMutation.isPending) return;

    try {
      await updateStatusMutation.mutateAsync({
        id: order.id,
        status: status as "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED" | "ON_HOLD",
        notes,
      });
    } catch (error) {
      // Error handled in mutation
    }
  }

  async function onSubmit(data: OrderProcessingFormData) {
    if (processOrderMutation.isPending) return;
    
    setIsProcessing(true);
    try {
      await processOrderMutation.mutateAsync({
        id: order.id,
        processedTotal: data.processedTotal,
        processingNotes: data.processingNotes,
        items: data.items,
      });
    } catch (error) {
      // Error handled in mutation
    } finally {
      setIsProcessing(false);
    }
  }

  // Calculate total from individual items
  const itemsTotal = form.watch("items")?.reduce((sum, item) => {
    const orderItem = order.items.find(orderItem => orderItem.id === item.id);
    const quantity = orderItem?.quantity ?? 0;
    return sum + (item.processedPrice * quantity);
  }, 0) ?? 0;

  if (!hasStarted && order.status === "PENDING") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <PlayIcon className="h-5 w-5 mr-2" />
            Start Processing
          </CardTitle>
          <CardDescription>
            This order is ready to be processed. Click the button below to begin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleStartProcessing}
            disabled={startProcessingMutation.isPending}
            className="w-full"
          >
            {startProcessingMutation.isPending ? (
              "Starting..."
            ) : (
              <>
                <PlayIcon className="h-4 w-4 mr-2" />
                Start Processing Order
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Processing</CardTitle>
        <CardDescription>
          Update item prices, add processing notes, and complete the order.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Item Processing */}
          <div className="space-y-4">
            <h4 className="font-medium">Item Processing</h4>
            {order.items.map((item, index) => (
              <div key={item.id} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-medium">{item.name}</h5>
                    <p className="text-sm text-muted-foreground">
                      Qty: {item.quantity} × Original: {order.currency} {Number(item.originalPrice).toFixed(2)}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {form.watch(`items.${index}.status`)?.replace("_", " ") || item.status.replace("_", " ")}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor={`items.${index}.processedPrice`}>
                      Processed Price ({order.currency})
                    </Label>
                    <Input
                      id={`items.${index}.processedPrice`}
                      type="number"
                      step="0.01"
                      {...form.register(`items.${index}.processedPrice`, { valueAsNumber: true })}
                    />
                    {form.formState.errors.items?.[index]?.processedPrice && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.items[index]?.processedPrice?.message}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor={`items.${index}.status`}>Status</Label>
                    <Select
                      value={form.watch(`items.${index}.status`)}
                      onValueChange={(value) => form.setValue(`items.${index}.status`, value as "PENDING" | "VERIFIED" | "PROCESSING" | "COMPLETED" | "FAILED" | "OUT_OF_STOCK")}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="VERIFIED">Verified</SelectItem>
                        <SelectItem value="PROCESSING">Processing</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                        <SelectItem value="FAILED">Failed</SelectItem>
                        <SelectItem value="OUT_OF_STOCK">Out of Stock</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Item Total</Label>
                    <div className="h-10 px-3 py-2 border rounded-md bg-muted text-sm">
                      {order.currency} {((form.watch(`items.${index}.processedPrice`) || 0) * item.quantity).toFixed(2)}
                    </div>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor={`items.${index}.notes`}>Processing Notes</Label>
                  <Textarea
                    id={`items.${index}.notes`}
                    placeholder="Add any notes about this item..."
                    {...form.register(`items.${index}.notes`)}
                  />
                </div>
              </div>
            ))}
          </div>

          <Separator />

          {/* Order Totals */}
          <div className="space-y-4">
            <h4 className="font-medium">Order Totals</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Calculated Total (from items)</Label>
                <div className="h-10 px-3 py-2 border rounded-md bg-muted text-sm font-medium">
                  {order.currency} {itemsTotal.toFixed(2)}
                </div>
              </div>
              <div>
                <Label htmlFor="processedTotal">Final Processed Total</Label>
                <Input
                  id="processedTotal"
                  type="number"
                  step="0.01"
                  {...form.register("processedTotal", { valueAsNumber: true })}
                />
                {form.formState.errors.processedTotal && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.processedTotal.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Processing Notes */}
          <div>
            <Label htmlFor="processingNotes">Processing Notes</Label>
            <Textarea
              id="processingNotes"
              placeholder="Add overall processing notes..."
              {...form.register("processingNotes")}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              type="submit"
              disabled={isProcessing || processOrderMutation.isPending}
              className="flex-1"
            >
              {isProcessing ? (
                "Completing..."
              ) : (
                <>
                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                  Complete Order
                </>
              )}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={() => handleStatusUpdate("ON_HOLD", "Order placed on hold")}
              disabled={updateStatusMutation.isPending}
            >
              <PauseIcon className="h-4 w-4 mr-2" />
              Put on Hold
            </Button>
            
            <Button
              type="button"
              variant="destructive"
              onClick={() => handleStatusUpdate("FAILED", "Order processing failed")}
              disabled={updateStatusMutation.isPending}
            >
              <XCircleIcon className="h-4 w-4 mr-2" />
              Mark as Failed
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
