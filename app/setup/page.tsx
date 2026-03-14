"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Shield, CheckCircle2 } from "lucide-react";

export default function SetupPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    credentials?: { email: string; password: string; message: string };
    error?: string;
  } | null>(null);
  const [hasAdmin, setHasAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/check-admin")
      .then((r) => r.json())
      .then((d) => setHasAdmin(d.hasAdmin ?? false))
      .catch(() => setHasAdmin(false));
  }, []);

  const handleCreateAdmin = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/create-initial-admin", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setResult({ success: true, credentials: data.credentials });
      setHasAdmin(true);
    } catch (err: unknown) {
      setResult({
        error: err instanceof Error ? err.message : "Failed to create admin",
      });
    } finally {
      setLoading(false);
    }
  };

  if (hasAdmin === null) return <div className="p-8">Loading...</div>;

  if (hasAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span>Admin user already exists. Go to the dashboard.</span>
            </div>
            <Button className="mt-4 w-full" asChild>
              <a href="/">Go to Dashboard</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Initial Setup
          </CardTitle>
          <CardDescription>
            Create the first admin user. You need SUPABASE_SERVICE_ROLE_KEY in .env.local.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {result?.success && result.credentials && (
            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/30">
              <p className="font-medium text-green-800 dark:text-green-200">
                Admin created! Use these credentials:
              </p>
              <p className="mt-2 font-mono text-sm">
                Email: {result.credentials.email}
                <br />
                Password: {result.credentials.password}
              </p>
              <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                {result.credentials.message}
              </p>
            </div>
          )}
          {result?.error && (
            <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
              {result.error}
            </div>
          )}
          <Button
            onClick={handleCreateAdmin}
            disabled={loading}
            className="w-full"
          >
            {loading ? "Creating..." : "Create Admin (admin@zoecoffee.com / Admin123!)"}
          </Button>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            <a href="/login" className="underline">Back to login</a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
