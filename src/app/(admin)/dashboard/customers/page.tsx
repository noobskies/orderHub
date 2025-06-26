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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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
    <TableRow>
      <TableCell>
        <div className="flex items-center">
          <Avatar className="h-9 w-9">
            <AvatarFallback>
              {customer.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="ml-4">
            <div className="text-sm font-medium">
              {customer.name}
            </div>
            <div className="text-sm text-muted-foreground">
              {customer.email}
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={customer.isActive ? "default" : "secondary"}>
          {customer.isActive ? "Active" : "Inactive"}
        </Badge>
      </TableCell>
      <TableCell>
        {customer.orderCount}
      </TableCell>
      <TableCell>
        <Badge 
          variant={
            customer.processingPriority === "URGENT" ? "destructive" :
            customer.processingPriority === "HIGH" ? "default" :
            customer.processingPriority === "NORMAL" ? "secondary" :
            "outline"
          }
        >
          {customer.processingPriority}
        </Badge>
      </TableCell>
      <TableCell>
        {customer.currency}
      </TableCell>
      <TableCell>
        {new Date(customer.createdAt).toLocaleDateString()}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end space-x-2">
          <Button asChild variant="ghost" size="icon">
            <Link href={`/dashboard/customers/${customer.id}`}>
              <EyeIcon className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon">
            <Link href={`/dashboard/customers/${customer.id}/edit`}>
              <PencilIcon className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

async function CustomerTable() {
  try {
    const customers = await api.customer.getAll({ includeInactive: false });
    
    if (customers.length === 0) {
      return (
        <Card>
          <CardContent>
            <div className="text-center py-12">
              <UsersIcon className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium">
                No customers yet
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Get started by adding your first customer.
              </p>
              <div className="mt-6">
                <Button asChild>
                  <Link href="/dashboard/customers/new">
                    <PlusIcon className="-ml-1 mr-2 h-4 w-4" />
                    Add Customer
                  </Link>
                </Button>
              </div>
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
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Orders</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => (
              <CustomerRow key={customer.id} customer={customer} />
            ))}
          </TableBody>
        </Table>
      </Card>
    );
  } catch (error) {
    console.error("Failed to load customers:", error);
    return (
      <Card>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-destructive">Failed to load customers</p>
            <p className="text-sm text-muted-foreground mt-2">
              Please try refreshing the page
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
}

export default function CustomersPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage your e-commerce customers and their configurations.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/customers/new">
            <PlusIcon className="-ml-1 mr-2 h-4 w-4" />
            Add Customer
          </Link>
        </Button>
      </div>

      {/* Customer Table */}
      <Suspense fallback={
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="flex items-center">
                      <Skeleton className="h-9 w-9 rounded-full" />
                      <div className="ml-4 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Skeleton className="h-8 w-8" />
                      <Skeleton className="h-8 w-8" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      }>
        <CustomerTable />
      </Suspense>
    </div>
  );
}
