"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Car, Users, Wrench, TrendingUp,
  Upload, Settings, LogOut, Shield, ChevronLeft, ChevronRight,
  Activity, X, ClipboardList, History
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  permission: string | null;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard",         label: "Dashboard",      icon: LayoutDashboard, permission: "nav.dashboard" },
  { href: "/vehicles",          label: "Vehicles",        icon: Car,             permission: "nav.vehicles" },
  { href: "/customers",         label: "Customers",       icon: Users,           permission: "nav.customers" },
  { href: "/service-records",   label: "Service Records", icon: Wrench,          permission: "nav.serviceRecords" },
  { href: "/job-cards",         label: "Job Cards",       icon: ClipboardList,   permission: "nav.jobCards" },
  { href: "/retention",         label: "Retention",       icon: TrendingUp,      permission: "nav.retention" },
  { href: "/import",            label: "Import Center",   icon: Upload,          permission: "nav.import" },
  { href: "/activity",          label: "Activity Log",    icon: History,         permission: "nav.activity" },
  { href: "/admin/technicians", label: "Technicians",     icon: Activity,        permission: null, adminOnly: true },
];

const BOTTOM_NAV: NavItem[] = [
  { href: "/settings", label: "Settings", icon: Settings, permission: "nav.settings" },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ collapsed, onToggle, mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout, hasPermission } = useAuth();

  const initials = user?.fullName
    ? user.fullName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const isAdmin = user?.role === "Admin";

  const visibleNavItems = NAV_ITEMS.filter(item => {
    if (item.adminOnly) return isAdmin;
    if (!item.permission) return true;
    return hasPermission(item.permission);
  });

  const visibleBottomItems = BOTTOM_NAV.filter(item =>
    !item.permission || hasPermission(item.permission)
  );

  function NavLink({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) {
    const isActive = pathname === href || pathname.startsWith(href + "/");
    const link = (
      <Link
        href={href}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
          collapsed ? "justify-center" : "",
          isActive
            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        <Icon className="w-5 h-5 shrink-0" />
        {!collapsed && <span className="truncate">{label}</span>}
      </Link>
    );
    if (collapsed) {
      return (
        <Tooltip>
          <TooltipTrigger className="w-full">{link}</TooltipTrigger>
          <TooltipContent side="right">{label}</TooltipContent>
        </Tooltip>
      );
    }
    return link;
  }

  return (
    <TooltipProvider delay={0}>
      <motion.aside
        animate={{ width: collapsed ? 72 : 256 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className={cn(
          "relative flex flex-col h-screen bg-sidebar border-r border-sidebar-border shrink-0 overflow-hidden",
          "hidden md:flex",
          mobileOpen && "!flex fixed inset-y-0 left-0 z-30"
        )}
      >
        {/* Logo */}
        <div className={cn(
          "flex items-center h-16 px-4 border-b border-sidebar-border shrink-0",
          collapsed ? "justify-center" : "gap-3"
        )}>
          <div className="flex items-center justify-center w-9 h-9 rounded-lg gradient-primary shrink-0">
            <Shield className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="flex-1">
              <p className="text-sm font-semibold text-sidebar-foreground leading-none">Rwandamotor</p>
              <p className="text-xs text-sidebar-foreground/50 leading-none mt-0.5">CSSR Platform</p>
            </motion.div>
          )}
          {mobileOpen && !collapsed && (
            <button
              onClick={onMobileClose}
              className="md:hidden ml-auto p-1 rounded-md text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {visibleNavItems.map((item) => (
            <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} />
          ))}
        </nav>

        {/* Bottom section */}
        <div className="border-t border-sidebar-border p-2 space-y-1">
          {visibleBottomItems.map((item) => (
            <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} />
          ))}

          {/* User profile */}
          <div className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 mt-2",
            collapsed ? "justify-center" : ""
          )}>
            <Avatar className="w-8 h-8 shrink-0">
              <AvatarFallback className="text-xs gradient-primary text-white">{initials}</AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-sidebar-foreground truncate">{user?.fullName}</p>
                <p className="text-[11px] text-sidebar-foreground/50 truncate">{user?.role}</p>
              </div>
            )}
            {!collapsed && (
              <Tooltip>
                <TooltipTrigger
                  onClick={logout}
                  className="w-7 h-7 flex items-center justify-center rounded-md text-sidebar-foreground/50 hover:text-red-400 hover:bg-sidebar-accent transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </TooltipTrigger>
                <TooltipContent>Sign out</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={onToggle}
          className="absolute -right-3.5 top-20 z-10 flex items-center justify-center w-7 h-7 rounded-full bg-sidebar-border border border-sidebar-border text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all shadow-sm"
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </motion.aside>
    </TooltipProvider>
  );
}
