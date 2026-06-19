"use client";

import { useEffect, useState } from "react";
import { X, Download, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type PromptState = "idle" | "android" | "ios";

export function PwaInstallPrompt() {
  const [state, setState]       = useState<PromptState>("idle");
  const [deferredEvt, setEvt]   = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible]   = useState(false);

  useEffect(() => {
    // Already installed — don't show prompt
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true
    ) return;

    // Already dismissed this session
    if (sessionStorage.getItem("pwa-dismissed")) return;

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    const handler = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
      setState("android");
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Show iOS prompt only in Safari (where A2HS is supported)
    if (isIos && isSafari) {
      const timer = setTimeout(() => { setState("ios"); setVisible(true); }, 3000);
      return () => { window.removeEventListener("beforeinstallprompt", handler); clearTimeout(timer); };
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Register service worker
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    sessionStorage.setItem("pwa-dismissed", "1");
  };

  const install = async () => {
    if (!deferredEvt) return;
    await deferredEvt.prompt();
    const { outcome } = await deferredEvt.userChoice;
    if (outcome === "accepted") setEvt(null);
    dismiss();
  };

  if (!visible || state === "idle") return null;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur",
        "transition-transform duration-300",
        visible ? "translate-y-0" : "translate-y-full"
      )}
    >
      <div className="flex items-center gap-3 px-4 py-3 max-w-2xl mx-auto">
        {/* App icon */}
        <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center shrink-0 shadow-sm">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5L12 1z" />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Install Rwandamotor CSSR</p>
          {state === "android" ? (
            <p className="text-xs text-muted-foreground">Add to your device for quick offline access</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Tap <Share className="inline w-3 h-3 mx-0.5 align-text-bottom" /> <strong>Share</strong> → <strong>Add to Home Screen</strong>
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {state === "android" && (
            <Button size="sm" onClick={install} className="gap-1.5 gradient-primary text-white h-8">
              <Download className="w-3.5 h-3.5" /> Install
            </Button>
          )}
          <button
            onClick={dismiss}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
