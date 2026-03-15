"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { NotificationCenter } from "@/components/notification-center";
import { toast } from "sonner";
import type { NotificationSummary, NotificationItem } from "@/lib/notifications";

interface LiveNotificationCenterProps {
  initialNotifications: NotificationSummary;
}

function requestNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function showBrowserNotification(item: NotificationItem) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  // Only show native notification when tab is in background (toast already shows when focused)
  if (document.visibilityState === "visible") return;
  try {
    const n = new Notification(item.title, {
      body: item.message,
      icon: "/favicon.ico",
      tag: item.id,
    });
    n.onclick = () => {
      window.focus();
      window.location.href = item.href;
      n.close();
    };
  } catch {
    // ignore
  }
}

export function LiveNotificationCenter({ initialNotifications }: LiveNotificationCenterProps) {
  const [notifications, setNotifications] = useState<NotificationSummary>(initialNotifications);
  const previousIdsRef = useRef<Set<string>>(new Set(initialNotifications.items.map((i) => i.id)));
  const mountedRef = useRef(true);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { credentials: "include" });
      if (!res.ok || !mountedRef.current) return;
      const data: NotificationSummary = await res.json();
      setNotifications(data);
      const prev = previousIdsRef.current;
      data.items.forEach((item) => {
        if (!prev.has(item.id)) {
          toast.info(item.title, { description: item.message });
          showBrowserNotification(item);
        }
      });
      previousIdsRef.current = new Set(data.items.map((i) => i.id));
    } catch {
      // ignore fetch errors
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    requestNotificationPermission();

    const supabase = createClient();
    const channel = supabase
      .channel("notifications-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        () => refetch()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_assignees" },
        () => refetch()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads" },
        () => refetch()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => refetch()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sales" },
        () => refetch()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => refetch()
      )
      .subscribe();

    return () => {
      mountedRef.current = false;
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  return <NotificationCenter notifications={notifications} />;
}
