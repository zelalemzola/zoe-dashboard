"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const SALES_ALLOWED_PATHS = ["/leads", "/tasks"];

export function AuthGuard({
  children,
  isAdmin,
}: {
  children: React.ReactNode;
  isAdmin: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isAdmin) return;

    const isAllowed = SALES_ALLOWED_PATHS.some(
      (p) => pathname === p || (p !== "/" && pathname.startsWith(p))
    );
    if (!isAllowed) {
      router.replace("/leads");
    }
  }, [pathname, isAdmin, router]);

  if (!isAdmin) {
    const isAllowed = SALES_ALLOWED_PATHS.some(
      (p) => pathname === p || (p !== "/" && pathname.startsWith(p))
    );
    if (!isAllowed) {
      return null;
    }
  }

  return <>{children}</>;
}
