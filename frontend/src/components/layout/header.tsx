"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Moon, Sun, Search, Menu, Car, User, X } from "lucide-react";
import { useTheme } from "next-themes";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { vehiclesApi, customersApi } from "@/lib/api";

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

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const router   = useRouter();
  const { theme, setTheme } = useTheme();

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

          <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
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
