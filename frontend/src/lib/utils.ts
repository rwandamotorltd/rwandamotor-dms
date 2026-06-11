import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, parseISO, isValid } from "date-fns";
import type { RetentionStatus, ServiceType, CustomerCategory } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | null | undefined, fmt = "dd MMM yyyy"): string {
  if (!date) return "—";
  try {
    const parsed = parseISO(date);
    return isValid(parsed) ? format(parsed, fmt) : "—";
  } catch { return "—"; }
}

export function formatDateDistance(date: string | null | undefined): string {
  if (!date) return "—";
  try {
    const parsed = parseISO(date);
    return isValid(parsed) ? formatDistanceToNow(parsed, { addSuffix: true }) : "—";
  } catch { return "—"; }
}

export function formatCurrency(amount: number | null | undefined, currency = "RWF"): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-RW", { style: "decimal", maximumFractionDigits: 0 }).format(amount) + " " + currency;
}

export function formatMileage(km: number | null | undefined): string {
  if (km == null) return "—";
  return new Intl.NumberFormat("en").format(km) + " km";
}

export function formatPercentage(value: number | null | undefined, decimals = 1): string {
  if (value == null) return "—";
  return `${value.toFixed(decimals)}%`;
}

export const RETENTION_STATUS_CONFIG: Record<RetentionStatus, { label: string; color: string; bg: string }> = {
  Active:    { label: "Active",    color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/50" },
  DueSoon:   { label: "Due Soon",  color: "text-amber-700 dark:text-amber-400",    bg: "bg-amber-50 dark:bg-amber-950/50" },
  Overdue:   { label: "Overdue",   color: "text-orange-700 dark:text-orange-400",  bg: "bg-orange-50 dark:bg-orange-950/50" },
  Lost:      { label: "Lost",      color: "text-red-700 dark:text-red-400",        bg: "bg-red-50 dark:bg-red-950/50" },
  Recovered: { label: "Recovered", color: "text-blue-700 dark:text-blue-400",      bg: "bg-blue-50 dark:bg-blue-950/50" },
  External:  { label: "External",  color: "text-slate-600 dark:text-slate-400",    bg: "bg-slate-50 dark:bg-slate-900/50" },
};

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  RoutineMaintenance:    "Routine Maintenance",
  OilChange:             "Oil Change",
  MajorService:          "Major Service",
  TyreRotation:          "Tyre Rotation",
  BrakeService:          "Brake Service",
  TransmissionService:   "Transmission Service",
  AirConditioningService:"A/C Service",
  ElectricalDiagnostics: "Electrical Diagnostics",
  BodyRepair:            "Body Repair",
  WarrantyRepair:        "Warranty Repair",
  RecallRepair:          "Recall Repair",
  PDI:                   "PDI",
  EmergencyRepair:       "Emergency Repair",
  Inspection:            "Inspection",
  Other:                 "Other",
};

export const CUSTOMER_CATEGORY_LABELS: Record<CustomerCategory, string> = {
  Retail:     "Retail",
  Corporate:  "Corporate",
  Government: "Government",
  NGO:        "NGO",
  Fleet:      "Fleet",
  VIP:        "VIP",
  External:   "External",
};
