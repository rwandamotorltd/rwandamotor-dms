"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";

// ─── Idle auto-logout ─────────────────────────────────────────────────────────

const IDLE_MS  = 10 * 60 * 1000; // 10 minutes
const WARN_MS  = 60 * 1000;      // warn 1 minute before logout

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"] as const;

function useIdleLogout() {
  const { logout } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const logoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearAll = () => {
    if (logoutTimer.current)      clearTimeout(logoutTimer.current);
    if (warnTimer.current)        clearTimeout(warnTimer.current);
    if (countdownInterval.current) clearInterval(countdownInterval.current);
  };

  const reset = useCallback(() => {
    clearAll();
    setShowWarning(false);
    setSecondsLeft(60);

    warnTimer.current = setTimeout(() => {
      setShowWarning(true);
      setSecondsLeft(60);
      countdownInterval.current = setInterval(() => {
        setSecondsLeft(s => {
          if (s <= 1) { clearInterval(countdownInterval.current!); return 0; }
          return s - 1;
        });
      }, 1000);
    }, IDLE_MS - WARN_MS);

    logoutTimer.current = setTimeout(() => logout(), IDLE_MS);
  }, [logout]);

  useEffect(() => {
    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearAll();
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, reset));
    };
  }, [reset]);

  return { showWarning, secondsLeft, stayLoggedIn: reset, logout };
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [user, isLoading, router]);

  const { showWarning, secondsLeft, stayLoggedIn, logout } = useIdleLogout();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(c => !c)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onMenuClick={() => setMobileOpen(o => !o)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>

      {/* Idle-timeout warning overlay */}
      {showWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-background border border-border rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-base">Session expiring</h3>
                <p className="text-xs text-muted-foreground">No activity detected</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              You will be logged out automatically in{" "}
              <span className="font-semibold text-foreground tabular-nums">{secondsLeft}s</span>{" "}
              due to inactivity.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={logout}>
                Log out
              </Button>
              <Button className="flex-1" onClick={stayLoggedIn}>
                Stay logged in
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
