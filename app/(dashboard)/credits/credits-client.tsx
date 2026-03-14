"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Users, Truck, AlertTriangle } from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";

interface ClientCredit {
  id: string;
  customer_id: string;
  total_amount: number;
  sale_date: string;
  credit_due_date: string | null;
  is_paid: boolean;
  customer?: { id: string; name: string; contact?: string } | { id: string; name: string; contact?: string }[];
}

interface ProviderCredit {
  id: string;
  provider_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  restock_date: string;
  credit_due_date: string | null;
  is_paid: boolean;
  provider?: { id: string; name: string } | { id: string; name: string }[];
  product?: { id: string; name: string } | { id: string; name: string }[];
}

export function CreditsClient({
  clientCredits,
  providerCredits,
}: {
  clientCredits: ClientCredit[];
  providerCredits: ProviderCredit[];
}) {
  const today = new Date();

  const getDaysLeft = (dueDate: string | null) => {
    if (!dueDate) return null;
    return differenceInDays(parseISO(dueDate), today);
  };

  const overdueClient = clientCredits.filter((c) => {
    const days = getDaysLeft(c.credit_due_date);
    return days !== null && days < 0;
  });
  const overdueProvider = providerCredits.filter((c) => {
    const days = getDaysLeft(c.credit_due_date);
    return days !== null && days < 0;
  });

  const totalClientDebt = clientCredits.reduce((s, c) => s + Number(c.total_amount), 0);
  const totalProviderDebt = providerCredits.reduce(
    (s, c) => s + c.quantity * Number(c.unit_price),
    0
  );

  return (
    <div className="space-y-6">
      {(overdueClient.length > 0 || overdueProvider.length > 0) && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <AlertTriangle className="h-5 w-5" />
              Overdue
            </CardTitle>
            <CardDescription>
              {overdueClient.length} client(s) overdue | {overdueProvider.length} provider(s) overdue
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {overdueClient.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Clients:</p>
                <div className="flex flex-wrap gap-2">
                  {overdueClient.map((c) => {
                    const days = getDaysLeft(c.credit_due_date)!;
                    return (
                      <Badge key={c.id} variant="destructive">
                        {(Array.isArray(c.customer) ? c.customer[0] : c.customer)?.name}: ETB {Number(c.total_amount).toFixed(0)} (
                        {Math.abs(days)} days overdue)
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
            {overdueProvider.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Providers:</p>
                <div className="flex flex-wrap gap-2">
                  {overdueProvider.map((c) => {
                    const days = getDaysLeft(c.credit_due_date)!;
                    const amount = c.quantity * Number(c.unit_price);
                    return (
                      <Badge key={c.id} variant="destructive">
                        {(Array.isArray(c.provider) ? c.provider[0] : c.provider)?.name}: ETB {amount.toFixed(0)} (
                        {Math.abs(days)} days overdue)
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      <Tabs defaultValue="clients">
        <TabsList>
          <TabsTrigger value="clients">
            <Users className="mr-2 h-4 w-4" />
            Client Credit ({clientCredits.length})
          </TabsTrigger>
          <TabsTrigger value="providers">
            <Truck className="mr-2 h-4 w-4" />
            Provider Payables ({providerCredits.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="clients" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Amount owed by clients</CardTitle>
              <CardDescription>
                Total: ETB {totalClientDebt.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Sale date</TableHead>
                    <TableHead>Due date</TableHead>
                    <TableHead>Days left</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientCredits.map((c) => {
                    const days = getDaysLeft(c.credit_due_date);
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">
                          {(Array.isArray(c.customer) ? c.customer[0] : c.customer)?.name || "—"}
                        </TableCell>
                        <TableCell>ETB {Number(c.total_amount).toFixed(2)}</TableCell>
                        <TableCell>{format(parseISO(c.sale_date), "MMM d, yyyy")}</TableCell>
                        <TableCell>
                          {c.credit_due_date
                            ? format(parseISO(c.credit_due_date), "MMM d, yyyy")
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {days !== null ? (
                            days < 0 ? (
                              <Badge variant="destructive">{Math.abs(days)} days overdue</Badge>
                            ) : (
                              <Badge variant="secondary">{days} days left</Badge>
                            )
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="providers" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Amount owed to providers</CardTitle>
              <CardDescription>
                Total: ETB {totalProviderDebt.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Restock date</TableHead>
                    <TableHead>Due date</TableHead>
                    <TableHead>Days left</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {providerCredits.map((c) => {
                    const amount = c.quantity * Number(c.unit_price);
                    const days = getDaysLeft(c.credit_due_date);
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">
                          {(Array.isArray(c.provider) ? c.provider[0] : c.provider)?.name || "—"}
                        </TableCell>
                        <TableCell>{(Array.isArray(c.product) ? c.product[0] : c.product)?.name || "—"}</TableCell>
                        <TableCell>ETB {amount.toFixed(2)}</TableCell>
                        <TableCell>{format(parseISO(c.restock_date), "MMM d, yyyy")}</TableCell>
                        <TableCell>
                          {c.credit_due_date
                            ? format(parseISO(c.credit_due_date), "MMM d, yyyy")
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {days !== null ? (
                            days < 0 ? (
                              <Badge variant="destructive">{Math.abs(days)} days overdue</Badge>
                            ) : (
                              <Badge variant="secondary">{days} days left</Badge>
                            )
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
