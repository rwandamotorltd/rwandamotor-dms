"use client";

import { usePathname } from "next/navigation";
import { Moon, Sun, Bell, Search, Menu } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const BREADCRUMBS: Record<string, string> = {
  "/dashboard":         "Executive Dashboard",
  "/vehicles":          "Vehicle Registry",
  "/customers":         "Customer Registry",
  "/service-records":   "Service Records",
  "/retention":         "Retention Analytics",
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
  const { theme, setTheme } = useTheme();

  const pageTitle = BREADCRUMBS[pathname] ?? BREADCRUMBS[Object.keys(BREADCRUMBS).find(k => pathname.startsWith(k)) ?? ""] ?? "Dashboard";

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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="w-56 pl-9 h-8 text-sm bg-muted/50" placeholder="Search vehicles, customers..." />
        </div>

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-4 h-4" />
          <Badge className="absolute -top-1 -right-1 w-4 h-4 p-0 text-[9px] flex items-center justify-center bg-primary">3</Badge>
        </Button>

        <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
      </div>
    </header>
  );
}
