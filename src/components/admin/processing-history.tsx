"use client";

import { useEffect, useState } from "react";
import { 
  ClockIcon,
  DocumentTextIcon
} from "@heroicons/react/24/outline";
import { api } from "@/trpc/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface ProcessingHistoryProps {
  orderId: string;
}

type ProcessingLogEntry = {
  id: string;
  action: string;
  status: string | null;
  notes: string | null;
  metadata: unknown;
  createdAt: Date;
  adminUser: {
    id: string;
    name: string | null;
    email: string;
  } | null;
};

function getActionIcon(action: string) {
  switch (action) {
    case "ORDER_RECEIVED":
      return <DocumentTextIcon className="h-4 w-4" />;
    case "PROCESSING_STARTED":
      return <ClockIcon className="h-4 w-4" />;
    case "STATUS_CHANGED":
      return <ClockIcon className="h-4 w-4" />;
    case "ORDER_COMPLETED":
      return <ClockIcon className="h-4 w-4" />;
    case "ORDER_FAILED":
      return <ClockIcon className="h-4 w-4" />;
    default:
      return <ClockIcon className="h-4 w-4" />;
  }
}

function getActionVariant(action: string) {
  switch (action) {
    case "ORDER_RECEIVED":
      return "secondary" as const;
    case "PROCESSING_STARTED":
      return "default" as const;
    case "ORDER_COMPLETED":
      return "default" as const;
    case "ORDER_FAILED":
      return "destructive" as const;
    case "STATUS_CHANGED":
      return "outline" as const;
    default:
      return "secondary" as const;
  }
}

function formatActionText(action: string) {
  switch (action) {
    case "ORDER_RECEIVED":
      return "Order Received";
    case "PROCESSING_STARTED":
      return "Processing Started";
    case "STATUS_CHANGED":
      return "Status Changed";
    case "ORDER_COMPLETED":
      return "Order Completed";
    case "ORDER_FAILED":
      return "Order Failed";
    case "ORDER_CANCELLED":
      return "Order Cancelled";
    case "ITEM_VERIFIED":
      return "Item Verified";
    case "PRICE_UPDATED":
      return "Price Updated";
    case "NOTES_ADDED":
      return "Notes Added";
    default:
      return action.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  }
}

export function ProcessingHistory({ orderId }: ProcessingHistoryProps) {
  const [history, setHistory] = useState<ProcessingLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading: queryLoading, error: queryError } = api.order.getHistory.useQuery(
    { id: orderId },
    {
      refetchOnWindowFocus: false,
      retry: 1,
    }
  );

  useEffect(() => {
    if (data) {
      setHistory(data as ProcessingLogEntry[]);
      setIsLoading(false);
    }
  }, [data]);

  useEffect(() => {
    if (queryError) {
      setError(queryError.message);
      setIsLoading(false);
    }
  }, [queryError]);

  if (isLoading || queryLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Processing History</CardTitle>
          <CardDescription>
            Timeline of all actions performed on this order
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start space-x-4 p-4 border rounded-lg">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                  <Skeleton className="h-3 w-48" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Processing History</CardTitle>
          <CardDescription>
            Timeline of all actions performed on this order
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-destructive">Failed to load processing history</p>
            <p className="text-sm text-muted-foreground mt-2">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Processing History</CardTitle>
          <CardDescription>
            Timeline of all actions performed on this order
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <ClockIcon className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-medium">No history yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Processing history will appear here as actions are performed.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Processing History</CardTitle>
        <CardDescription>
          Timeline of all actions performed on this order ({history.length} entries)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {history.map((entry) => (
            <div key={entry.id} className="flex items-start space-x-4 p-4 border rounded-lg">
              <div className="flex-shrink-0">
                {entry.adminUser ? (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {entry.adminUser.name?.charAt(0).toUpperCase() ?? 
                       entry.adminUser.email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                    {getActionIcon(entry.action)}
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-sm font-medium">
                      {formatActionText(entry.action)}
                    </h4>
                    {entry.status && (
                      <Badge variant={getActionVariant(entry.action)} className="text-xs">
                        {entry.status.replace("_", " ")}
                      </Badge>
                    )}
                  </div>
                  <time className="text-xs text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleString()}
                  </time>
                </div>
                
                {entry.adminUser && (
                  <p className="text-xs text-muted-foreground mt-1">
                    by {entry.adminUser.name ?? entry.adminUser.email}
                  </p>
                )}
                
                {entry.notes && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {entry.notes}
                  </p>
                )}
                
                {entry.metadata && typeof entry.metadata === 'object' && entry.metadata !== null && Object.keys(entry.metadata).length > 0 ? (
                  <div className="mt-2 p-2 bg-muted rounded text-xs">
                    <details>
                      <summary className="cursor-pointer text-muted-foreground">
                        View details
                      </summary>
                      <pre className="mt-2 whitespace-pre-wrap">
                        {JSON.stringify(entry.metadata, null, 2)}
                      </pre>
                    </details>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
