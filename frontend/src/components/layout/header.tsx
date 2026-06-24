"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Moon, Sun, Search, Menu, Car, User } from "lucide-react";
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

        <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
      </div>
    </header>
  );
}
