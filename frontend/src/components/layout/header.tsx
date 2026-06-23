"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Moon, Sun, Bell, Search, Menu, CheckCheck, Car, User } from "lucide-react";
import { useTheme } from "next-themes";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { notificationsApi, vehiclesApi, customersApi, type NotificationItem } from "@/lib/api";
import { cn } from "@/lib/utils";

const BREADCRUMBS: Record<string, string> = {
  "/dashboard":         "Executive Dashboard",
  "/vehicles":          "Vehicle Registry",
  "/customers":         "Customer Registry",
  "/service-records":   "Service Records",
  "/retention":         "Retention Analytics",
  "/follow-ups":        "Follow-ups",
  "/appointments":      "Appointments",
  "/reports":           "Reports",
  "/import":            "Import Center",
  "/admin/users":       "User Management",
  "/admin/technicians": "Technicians",
  "/settings":          "Settings",
};

const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  WelcomeCall:          "Welcome Call",
  ServiceDueSoon:       "Service Due Soon",
  ServiceDue15Days:     "Service Due in 15 Days",
  CustomerLost:         "Customer Lost",
  FollowUpDue:          "Follow-up Due",
  AppointmentReminder:  "Appointment Reminder",
  AppointmentConfirmed: "Appointment Confirmed",
};

function timeAgo(dateStr: string): string {
  // Backend returns UTC without Z — append Z so browsers don't interpret as local time
  const utc = /Z|[+-]\d{2}:?\d{2}$/.test(dateStr) ? dateStr : dateStr + "Z";
  const diff = Date.now() - new Date(utc).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const router   = useRouter();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();

  const pageTitle = BREADCRUMBS[pathname] ?? BREADCRUMBS[Object.keys(BREADCRUMBS).find(k => pathname.startsWith(k)) ?? ""] ?? "Dashboard";

  const { data: notifData } = useQuery({
    queryKey: ["notifications"],
    queryFn: notificationsApi.get,
    refetchInterval: 30_000,
    staleTime: 20_000,
  });

  const unreadCount = notifData?.unreadCount ?? 0;
  const notifications = notifData?.items ?? [];

  // ── Global search ────────────────────────────────────────────
  const [searchText, setSearchText]         = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchOpen, setSearchOpen]         = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchText), 300);
    return () => clearTimeout(t);
  }, [searchText]);

  const { data: vResult, isFetching: vFetching } = useQuery({
    queryKey: ["search", "vehicles", debouncedSearch],
    queryFn:  () => vehiclesApi.list({ search: debouncedSearch, pageSize: 5 }),
    enabled:  debouncedSearch.length >= 2,
    staleTime: 10_000,
  });
  const { data: cResult, isFetching: cFetching } = useQuery({
    queryKey: ["search", "customers", debouncedSearch],
    queryFn:  () => customersApi.list({ search: debouncedSearch, pageSize: 5 }),
    enabled:  debouncedSearch.length >= 2,
    staleTime: 10_000,
  });

  const vehicles    = vResult?.items ?? [];
  const customers   = cResult?.items ?? [];
  const showDropdown = searchOpen && searchText.length >= 2;
  const isSearching  = (vFetching || cFetching) && debouncedSearch.length >= 2;
  const hasResults   = vehicles.length > 0 || customers.length > 0;

  function handleOpenChange(open: boolean) {
    if (open && unreadCount > 0) {
      const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
      if (unreadIds.length > 0) {
        notificationsApi.markRead(unreadIds).then(() => {
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
        });
      }
    }
  }

  function handleNotificationClick(n: NotificationItem) {
    if (n.link) router.push(n.link);
    else if (n.followUpId) router.push("/follow-ups/" + n.followUpId);
    else if (n.appointmentId) router.push("/appointments");
    else router.push("/follow-ups");
  }

  return (
    <header className="h-16 border-b border-border bg-background/80 backdrop-blur-sm flex items-center gap-3 px-4 md:px-6 shrink-0">
      {/* Mobile hamburger */}
      <Button variant="ghost" size="icon" className="md:hidden shrink-0" onClick={onMenuClick}>
        <Menu className="w-5 h-5" />
      </Button>

      <div className="flex-1 min-w-0">
        <h1 className="text-base font-semibold text-foreground truncate">{pageTitle}</h1>
        <p className="text-xs text-muted-foreground hidden sm:block">Rwandamotor - CSSR</p>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
          <Input
            className="w-56 pl-9 h-8 text-sm bg-muted/50"
            placeholder="Search vehicles, customers..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
          />
          {showDropdown && (
            <div className="absolute top-full mt-1 left-0 w-80 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden">
              {isSearching ? (
                <div className="py-6 text-center text-sm text-muted-foreground">Searching…</div>
              ) : !hasResults ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {debouncedSearch.length >= 2 ? `No results for "${debouncedSearch}"` : "Keep typing…"}
                </div>
              ) : (
                <ScrollArea className="max-h-80">
                  {vehicles.length > 0 && (
                    <>
                      <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide bg-muted/40 border-b border-border">Vehicles</div>
                      {vehicles.map(v => (
                        <button
                          key={v.id}
                          className="w-full text-left px-3 py-2.5 hover:bg-accent transition-colors flex items-center gap-3"
                          onClick={() => { router.push(`/vehicles/${v.id}`); setSearchText(""); setSearchOpen(false); }}
                        >
                          <Car className="w-4 h-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{v.plateNumber ?? v.vin}</p>
                            <p className="text-xs text-muted-foreground truncate">{v.brandName} {v.modelName} {v.year}{v.customerName ? ` · ${v.customerName}` : ""}</p>
                          </div>
                        </button>
                      ))}
                    </>
                  )}
                  {customers.length > 0 && (
                    <>
                      <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide bg-muted/40 border-b border-border">Customers</div>
                      {customers.map(c => (
                        <button
                          key={c.id}
                          className="w-full text-left px-3 py-2.5 hover:bg-accent transition-colors flex items-center gap-3"
                          onClick={() => { router.push(`/customers/${c.id}`); setSearchText(""); setSearchOpen(false); }}
                        >
                          <User className="w-4 h-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{c.fullName}</p>
                            <p className="text-xs text-muted-foreground truncate">{[c.phone, c.city].filter(Boolean).join(" · ")}</p>
                          </div>
                        </button>
                      ))}
                    </>
                  )}
                </ScrollArea>
              )}
            </div>
          )}
        </div>

        {/* Notification Bell */}
        <DropdownMenu onOpenChange={handleOpenChange}>
          <DropdownMenuTrigger className="relative inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <Badge className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 text-[9px] flex items-center justify-center bg-primary">
                {unreadCount > 99 ? "99+" : unreadCount}
              </Badge>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notifications</span>
              {unreadCount > 0 && (
                <span className="text-xs font-normal text-muted-foreground flex items-center gap-1">
                  <CheckCheck className="w-3 h-3" />
                  {unreadCount} unread
                </span>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No notifications</div>
            ) : (
              <ScrollArea className="max-h-[360px]">
                {notifications.map((n, i) => (
                  <div key={n.id}>
                    <DropdownMenuItem
                      className={cn(
                        "flex flex-col items-start gap-0.5 py-3 px-3 cursor-pointer",
                        !n.isRead && "bg-primary/5"
                      )}
                      onClick={() => handleNotificationClick(n)}
                    >
                      <div className="flex items-start justify-between w-full gap-2">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          {!n.isRead && (
                            <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className={cn("text-sm font-medium leading-tight", !n.isRead && "text-foreground")}>
                              {n.title}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                          </div>
                        </div>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap mt-0.5 shrink-0">
                          {timeAgo(n.createdAt)}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground ml-4 mt-0.5">
                        {NOTIFICATION_TYPE_LABELS[n.type] ?? "System"}
                      </span>
                    </DropdownMenuItem>
                    {i < notifications.length - 1 && <DropdownMenuSeparator className="my-0" />}
                  </div>
                ))}
              </ScrollArea>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
      </div>
    </header>
  );
}
