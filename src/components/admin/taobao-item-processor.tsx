"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  CheckCircleIcon,
  LinkIcon,
  CurrencyDollarIcon,
  ClockIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { api } from "@/trpc/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

// Form validation schema
const taobaoItemSchema = z.object({
  taobaoUrl: z.string().url("Please enter a valid Taobao URL"),
  processedPrice: z.number().positive("Price must be positive"),
});

type TaobaoItemFormData = z.infer<typeof taobaoItemSchema>;

interface TaobaoItemProcessorProps {
  item: {
    id: string;
    name: string;
    originalPrice: number;
    processedPrice?: number | null;
    quantity: number;
    taobaoUrl?: string | null;
    taobaoData?: {
      verified?: boolean;
      availability?: string;
      currentPrice?: number;
      lastChecked?: string;
      title?: string;
      currency?: string;
    };
    status: string;
  };
  currency: string;
  onUpdate: (itemId: string, data: { processedPrice: number; status: string; taobaoData?: unknown }) => void;
}

export function TaobaoItemProcessor({ item, currency, onUpdate }: TaobaoItemProcessorProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  // tRPC mutations
  const verifyItemMutation = api.taobao.verifyOrderItem.useMutation({
    onSuccess: (data) => {
      if (data.suggestedPrice) {
        form.setValue("processedPrice", data.suggestedPrice);
      }
      toast.success("Taobao product verified successfully");
      onUpdate(item.id, {
        processedPrice: data.suggestedPrice ?? item.processedPrice ?? Number(item.originalPrice),
        status: data.verification.verified ? "VERIFIED" : "FAILED",
        taobaoData: data.verification,
      });
    },
    onError: (error) => {
      toast.error(`Verification failed: ${error.message}`);
    },
    onSettled: () => {
      setIsVerifying(false);
    },
  });

  // Initialize form
  const form = useForm<TaobaoItemFormData>({
    resolver: zodResolver(taobaoItemSchema),
    defaultValues: {
      taobaoUrl: item.taobaoUrl ?? "",
      processedPrice: item.processedPrice ? Number(item.processedPrice) : Number(item.originalPrice),
    },
  });

  const handleVerifyProduct = async () => {
    const taobaoUrl = form.getValues("taobaoUrl");
    if (!taobaoUrl) {
      toast.error("Please enter a Taobao URL first");
      return;
    }

    setIsVerifying(true);
    try {
      await verifyItemMutation.mutateAsync({
        itemId: item.id,
        taobaoUrl,
      });
    } catch {
      // Error handled in mutation
    }
  };

  const handleCalculatePrice = async () => {
    const currentPrice = item.taobaoData?.currentPrice ?? Number(item.originalPrice);
    
    setIsCalculating(true);
    try {
      const utils = api.useUtils();
      const result = await utils.taobao.calculatePrice.fetch({
        originalPrice: currentPrice,
      });
      form.setValue("processedPrice", result.suggestedPrice);
      toast.success("Price calculated successfully");
    } catch (error) {
      toast.error(`Price calculation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleValidateUrl = async () => {
    const taobaoUrl = form.getValues("taobaoUrl");
    if (!taobaoUrl) {
      toast.error("Please enter a Taobao URL first");
      return;
    }

    setIsValidating(true);
    try {
      const utils = api.useUtils();
      const result = await utils.taobao.validateUrl.fetch({ url: taobaoUrl });
      if (result.isValid) {
        toast.success("Valid Taobao URL");
      } else {
        toast.error("Invalid Taobao URL");
      }
    } catch (error) {
      toast.error(`URL validation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsValidating(false);
    }
  };

  const taobaoData = item.taobaoData;

  return (
    <Card className="border-l-4 border-l-orange-500">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <LinkIcon className="h-5 w-5 mr-2 text-orange-600" />
            Taobao Product Processing
          </div>
          <Badge variant={item.status === "VERIFIED" ? "default" : "secondary"}>
            {item.status.replace("_", " ")}
          </Badge>
        </CardTitle>
        <CardDescription>
          Verify and process Taobao product: {item.name}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Taobao URL Input */}
        <div className="space-y-2">
          <Label htmlFor={`taobao-url-${item.id}`}>Taobao Product URL</Label>
          <div className="flex space-x-2">
            <Input
              id={`taobao-url-${item.id}`}
              placeholder="https://item.taobao.com/item.htm?id=..."
              {...form.register("taobaoUrl")}
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleValidateUrl}
              disabled={isValidating}
            >
              {isValidating ? "Validating..." : "Validate"}
            </Button>
          </div>
          {form.formState.errors.taobaoUrl && (
            <p className="text-sm text-destructive">
              {form.formState.errors.taobaoUrl.message}
            </p>
          )}
        </div>

        {/* Verification Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Product Verification</h4>
            <Button
              type="button"
              onClick={handleVerifyProduct}
              disabled={isVerifying || !form.getValues("taobaoUrl")}
              size="sm"
            >
              {isVerifying ? (
                <>
                  <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                  Verify Product
                </>
              )}
            </Button>
          </div>

          {taobaoData && (
            <Alert>
              <CheckCircleIcon className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Verification Status:</span>
                    <Badge variant={taobaoData.verified ? "default" : "destructive"}>
                      {taobaoData.verified ? "Verified" : "Failed"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Availability:</span>
                    <Badge variant={taobaoData.availability === "IN_STOCK" ? "default" : "secondary"}>
                      {taobaoData.availability?.replace("_", " ") ?? "Unknown"}
                    </Badge>
                  </div>
                  {taobaoData.currentPrice && (
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Current Price:</span>
                      <span className="font-mono">¥{taobaoData.currentPrice}</span>
                    </div>
                  )}
                  {taobaoData.lastChecked && (
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Last Checked:</span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(taobaoData.lastChecked).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <Separator />

        {/* Price Calculation Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Price Calculation</h4>
            <Button
              type="button"
              variant="outline"
              onClick={handleCalculatePrice}
              disabled={isCalculating || !taobaoData?.currentPrice}
              size="sm"
            >
              {isCalculating ? (
                <>
                  <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                  Calculating...
                </>
              ) : (
                <>
                  <CurrencyDollarIcon className="h-4 w-4 mr-2" />
                  Calculate Price
                </>
              )}
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`processed-price-${item.id}`}>
              Processed Price ({currency})
            </Label>
            <Input
              id={`processed-price-${item.id}`}
              type="number"
              step="0.01"
              {...form.register("processedPrice", { valueAsNumber: true })}
            />
            {form.formState.errors.processedPrice && (
              <p className="text-sm text-destructive">
                {form.formState.errors.processedPrice.message}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Item Total:</span>
            <span className="font-mono">
              {currency} {((form.watch("processedPrice") || 0) * item.quantity).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 pt-2">
          {item.taobaoUrl && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.open(item.taobaoUrl!, "_blank")}
            >
              <LinkIcon className="h-4 w-4 mr-1" />
              View on Taobao
            </Button>
          )}
          {taobaoData?.verified && (
            <Badge variant="outline" className="flex items-center">
              <ClockIcon className="h-3 w-3 mr-1" />
              Verified Product
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
