"use client";

import Link from "next/link";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export type AlertBannerVariant = "warning" | "danger" | "info";

interface AlertBannerProps {
  message: string;
  href: string;
  variant?: AlertBannerVariant;
}

export function AlertBanner({ message, href, variant = "warning" }: AlertBannerProps) {
  const variantStyles = {
    warning:
      "border-primary/20 bg-primary/5",
    danger:
      "border-destructive/20 bg-destructive/5",
    info:
      "border-blue-500/20 bg-blue-500/5",
  };

  const buttonStyles = {
    warning: "border-primary/50 text-primary hover:bg-primary/10",
    danger: "border-destructive/50 text-destructive hover:bg-destructive/10",
    info: "border-blue-500/50 text-blue-600 hover:bg-blue-500/10 dark:text-blue-400",
  };

  return (
    <Card className={variantStyles[variant]}>
      <CardContent className="py-3">
        <div className="flex flex-wrap items-center gap-3">
          <AlertTriangle
            className={`h-5 w-5 shrink-0 ${
              variant === "danger"
                ? "text-destructive"
                : variant === "warning"
                ? "text-primary"
                : "text-blue-600 dark:text-blue-400"
            }`}
          />
          <span className="text-sm font-medium flex-1">{message}</span>
          <Link href={href}>
            <Button
              variant="outline"
              size="sm"
              className={`h-auto gap-2 py-1.5 ${buttonStyles[variant]}`}
            >
              View
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
