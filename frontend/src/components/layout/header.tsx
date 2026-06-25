"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Moon, Sun, Search, Menu, Car, User, X, Bell, LogOut, ChevronDown } from "lucide-react";
import { useTheme } from "next-themes";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { vehiclesApi, customersApi, notificationsApi, type NotificationItem } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";

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

interface VehicleHit {
  id: string;
  plateNumber?: string | null;
  vin: string;
  brandName?: string | null;
  modelName?: string | null;
  year?: number | null;
  customerName?: string | null;
}
interface CustomerHit {
  id: string;
  fullName: string;
  phone?: string | null;
  city?: string | null;
}

interface SearchDropdownProps {
  inputEl: React.ReactNode;
  showDropdown: boolean;
  isSearching: boolean;
  debouncedSearch: string;
  vehicles: VehicleHit[];
  customers: CustomerHit[];
  onNavigate: (url: string) => void;
}

function SearchDropdown({ inputEl, showDropdown, isSearching, debouncedSearch, vehicles, customers, onNavigate }: SearchDropdownProps) {
  const hasResults = vehicles.length > 0 || customers.length > 0;
  return (
    <div className="relative">
      {inputEl}
      {showDropdown && (
        <div className="absolute top-full mt-1 left-0 w-full min-w-[280px] bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden">
          {isSearching ? (
            <div className="py-6 text-center text-sm text-muted-foreground">Searching…</div>
          ) : !hasResults ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {debouncedSearch.length >= 2 ? `No results for "${debouncedSearch}"` : "Keep typing…"}
            </div>
          ) : (
            <ScrollArea className="max-h-72">
              {vehicles.length > 0 && (
                <>
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide bg-muted/40 border-b border-border">Vehicles</div>
                  {vehicles.map(v => (
                    <button
                      key={v.id}
                      className="w-full text-left px-3 py-2.5 hover:bg-accent transition-colors flex items-center gap-3"
                      onClick={() => onNavigate(`/vehicles/${v.id}`)}
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
                      onClick={() => onNavigate(`/customers/${c.id}`)}
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
  );
}

// ── Notification helpers ──────────────────────────────────────
function timeAgo(dateStr: string): string {
  const norm = (s: string) => /Z|[+-]\d{2}:?\d{2}$/.test(s) ? s : s + "Z";
  const diff = Date.now() - new Date(norm(dateStr)).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function notificationLink(n: NotificationItem): string {
  if (n.link) return n.link;
  if (n.followUpId) return `/follow-ups/${n.followUpId}`;
  if (n.appointmentId) return `/appointments`;
  return "/follow-ups";
}

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const router   = useRouter();
  const { theme, setTheme } = useTheme();
  const { user, logout }    = useAuth();
  const queryClient         = useQueryClient();

  const pageTitle = BREADCRUMBS[pathname] ?? BREADCRUMBS[Object.keys(BREADCRUMBS).find(k => pathname.startsWith(k)) ?? ""] ?? "Dashboard";

  // ── Global search ────────────────────────────────────────────
  const [searchText, setSearchText]         = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchOpen, setSearchOpen]         = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchText), 300);
    return () => clearTimeout(t);
  }, [searchText]);

  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mobileSearchOpen) {
      setTimeout(() => mobileInputRef.current?.focus(), 50);
    }
  }, [mobileSearchOpen]);

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

  const handleNavigate = (url: string) => {
    router.push(url);
    setSearchText("");
    setSearchOpen(false);
    setMobileSearchOpen(false);
  };

  // ── Notifications ────────────────────────────────────────────
  const [notifOpen, setNotifOpen] = useState(false);
  const { data: notifData } = useQuery({
    queryKey: ["notifications"],
    queryFn:  notificationsApi.get,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const unreadCount  = notifData?.unreadCount ?? 0;
  const notifications = notifData?.items ?? [];

  const markReadMutation = useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const handleBellClick = () => {
    setNotifOpen(prev => !prev);
    const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
    if (unreadIds.length > 0) markReadMutation.mutate(unreadIds);
  };

  const handleNotifNavigate = (n: NotificationItem) => {
    setNotifOpen(false);
    router.push(notificationLink(n));
  };

  return (
    <>
      <header className="h-16 border-b border-border bg-background/80 backdrop-blur-sm flex items-center gap-3 px-4 md:px-6 shrink-0">
        {/* Mobile hamburger */}
        <Button variant="ghost" size="icon" className="md:hidden shrink-0" onClick={onMenuClick}>
          <Menu className="w-5 h-5" />
        </Button>

        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold text-foreground truncate">{pageTitle}</h1>
          <p className="text-xs text-muted-foreground hidden sm:block">Rwandamotor - CSSR</p>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {/* Desktop search */}
          <div className="hidden md:block">
            <SearchDropdown
              showDropdown={showDropdown}
              isSearching={isSearching}
              debouncedSearch={debouncedSearch}
              vehicles={vehicles}
              customers={customers}
              onNavigate={handleNavigate}
              inputEl={
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                  <Input
                    className="w-44 lg:w-56 pl-9 h-8 text-sm bg-muted/50"
                    placeholder="Search…"
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                    onFocus={() => setSearchOpen(true)}
                    onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
                  />
                </div>
              }
            />
          </div>

          {/* Mobile search icon */}
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileSearchOpen(true)}>
            <Search className="w-4 h-4" />
          </Button>

          {/* Theme toggle */}
          <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>

          {/* Notification bell */}
          <div className="relative">
            <Button variant="ghost" size="icon" onClick={handleBellClick} aria-label="Notifications">
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center px-0.5 leading-none pointer-events-none">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Button>

            {notifOpen && (
              <div className="absolute right-0 top-full mt-1 w-80 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
                  <span className="text-sm font-semibold">Notifications</span>
                  <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setNotifOpen(false)}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <ScrollArea className="max-h-80">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">No notifications</div>
                  ) : (
                    notifications.map(n => (
                      <button
                        key={n.id}
                        className={`w-full text-left px-4 py-3 border-b border-border last:border-0 hover:bg-accent transition-colors flex gap-3 ${!n.isRead ? "bg-blue-50/40 dark:bg-blue-900/10" : ""}`}
                        onClick={() => handleNotifNavigate(n)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-tight truncate">{n.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-[10px] text-muted-foreground/70 mt-1">{timeAgo(n.createdAt)}</p>
                        </div>
                        {!n.isRead && <span className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 shrink-0" />}
                      </button>
                    ))
                  )}
                </ScrollArea>
              </div>
            )}
          </div>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-primary" />
              </div>
              <span className="hidden sm:block max-w-[100px] truncate">{user?.fullName ?? "User"}</span>
              <ChevronDown className="w-3 h-3 text-muted-foreground hidden sm:block" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuGroup>
                <DropdownMenuLabel>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-foreground truncate">{user?.fullName}</span>
                    <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
                    <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wide mt-0.5">{user?.role}</span>
                  </div>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={logout}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Mobile search overlay */}
      {mobileSearchOpen && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col md:hidden">
          <div className="flex items-center gap-2 px-4 h-16 border-b border-border shrink-0">
            <SearchDropdown
              showDropdown={showDropdown}
              isSearching={isSearching}
              debouncedSearch={debouncedSearch}
              vehicles={vehicles}
              customers={customers}
              onNavigate={handleNavigate}
              inputEl={
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                  <Input
                    ref={mobileInputRef}
                    className="w-full pl-9 h-9 text-sm bg-muted/50"
                    placeholder="Search vehicles, customers…"
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                    onFocus={() => setSearchOpen(true)}
                    onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
                  />
                </div>
              }
            />
            <Button variant="ghost" size="icon" onClick={() => { setMobileSearchOpen(false); setSearchText(""); }}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          {!showDropdown && (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              Type 2+ characters to search
            </div>
          )}
        </div>
      )}
    </>
  );
}
