"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { companySettingsApi } from "@/lib/api";

type OrientationApi = {
  lock: (type: string) => Promise<void>;
  unlock: () => void;
};

/**
 * Applies the admin-configured screen orientation lock at runtime.
 * Works in PWA standalone mode on Android; no-op on iOS/desktop browsers.
 */
export function OrientationLock() {
  const { data } = useQuery({
    queryKey: ["company-settings"],
    queryFn: () => companySettingsApi.get(),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const orientation = data?.pwaOrientation ?? "portrait";
    const api = (screen as unknown as { orientation?: OrientationApi }).orientation;
    if (!api?.lock) return;

    if (orientation === "any") {
      api.unlock();
    } else {
      api.lock(orientation).catch(() => {
        // Not in PWA standalone mode or browser doesn't support lock — silently ignored
      });
    }
  }, [data?.pwaOrientation]);

  return null;
}
