"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

type OrientationApi = {
  lock: (type: string) => Promise<void>;
  unlock: () => void;
};

async function fetchPwaOrientation(): Promise<string> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";
  const res = await fetch(`${base}/pwa/orientation`);
  if (!res.ok) return "portrait";
  const json = await res.json();
  return (json?.data as string) ?? "portrait";
}

/**
 * Applies the admin-configured screen orientation lock at runtime.
 * Uses the anonymous /api/pwa/orientation endpoint so it works on the
 * login page without triggering a 401 redirect loop.
 * Works in PWA standalone mode on Android; no-op on iOS/desktop browsers.
 */
export function OrientationLock() {
  const { data: orientation } = useQuery({
    queryKey: ["pwa-orientation"],
    queryFn: fetchPwaOrientation,
    staleTime: 10 * 60 * 1000,
    retry: false,
  });

  useEffect(() => {
    if (!orientation) return;
    const api = (screen as unknown as { orientation?: OrientationApi }).orientation;
    if (!api?.lock) return;

    if (orientation === "any") {
      api.unlock();
    } else {
      api.lock(orientation).catch(() => {
        // Not in PWA standalone mode or browser doesn't support lock — silently ignored
      });
    }
  }, [orientation]);

  return null;
}
