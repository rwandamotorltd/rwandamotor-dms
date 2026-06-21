import { useQuery } from "@tanstack/react-query";
import { companySettingsApi } from "@/lib/api";
import type { ServiceTypeItem } from "@/types";

export const DEFAULT_SERVICE_TYPES: ServiceTypeItem[] = [
  { value: "RoutineMaintenance",      label: "Routine Maintenance",        isActive: true, isBuiltIn: true },
  { value: "OilChange",               label: "Oil Change",                 isActive: true, isBuiltIn: true },
  { value: "MajorService",            label: "Major Service",              isActive: true, isBuiltIn: true },
  { value: "TyreRotation",            label: "Tyre Rotation",              isActive: true, isBuiltIn: true },
  { value: "BrakeService",            label: "Brake Service",              isActive: true, isBuiltIn: true },
  { value: "TransmissionService",     label: "Transmission Service",       isActive: true, isBuiltIn: true },
  { value: "AirConditioningService",  label: "Air Conditioning Service",   isActive: true, isBuiltIn: true },
  { value: "ElectricalDiagnostics",   label: "Electrical Diagnostics",     isActive: true, isBuiltIn: true },
  { value: "BodyRepair",              label: "Body Repair",                isActive: true, isBuiltIn: true },
  { value: "WarrantyRepair",          label: "Warranty Repair",            isActive: true, isBuiltIn: true },
  { value: "RecallRepair",            label: "Recall Repair",              isActive: true, isBuiltIn: true },
  { value: "PDI",                     label: "PDI (Pre-Delivery Insp.)",   isActive: true, isBuiltIn: true },
  { value: "EmergencyRepair",         label: "Emergency Repair",           isActive: true, isBuiltIn: true },
  { value: "Inspection",              label: "Inspection",                 isActive: true, isBuiltIn: true },
  { value: "Other",                   label: "Other",                      isActive: true, isBuiltIn: true },
];

export function parseServiceTypesConfig(config: string | null | undefined): ServiceTypeItem[] {
  if (!config) return DEFAULT_SERVICE_TYPES;
  try {
    const parsed: ServiceTypeItem[] = JSON.parse(config);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_SERVICE_TYPES;
  } catch {
    return DEFAULT_SERVICE_TYPES;
  }
}

/** Returns only active service types (from company settings or system defaults). */
export function useServiceTypes(): ServiceTypeItem[] {
  const { data: settings } = useQuery({
    queryKey: ["company-settings"],
    queryFn: companySettingsApi.get,
    staleTime: 10 * 60_000,
  });

  const all = parseServiceTypesConfig(settings?.serviceTypesConfig);
  return all.filter(t => t.isActive);
}
