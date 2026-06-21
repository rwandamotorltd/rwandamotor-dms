// ============================================================
// Core Domain Types — mirrors backend DTOs
// ============================================================

export type RetentionStatus = 'Active' | 'DueSoon' | 'Overdue' | 'Lost' | 'Recovered' | 'External';
export type JobCardStatus = 'Open' | 'Closed';
export type FuelLevel = 'Empty' | 'Quarter' | 'Half' | 'ThreeQuarter' | 'Full';
export type ServiceType = 'RoutineMaintenance' | 'OilChange' | 'MajorService' | 'TyreRotation' |
  'BrakeService' | 'TransmissionService' | 'AirConditioningService' | 'ElectricalDiagnostics' |
  'BodyRepair' | 'WarrantyRepair' | 'RecallRepair' | 'PDI' | 'EmergencyRepair' | 'Inspection' | 'Other';
export type CustomerCategory = 'Retail' | 'Corporate' | 'Government' | 'NGO' | 'Fleet' | 'VIP' | 'External';
export type ContactMethod = 'Phone' | 'SMS' | 'Email' | 'WhatsApp' | 'InPerson';
export type FollowUpStatus = 'Pending' | 'Contacted' | 'AppointmentBooked' | 'Recovered' | 'Unreachable' | 'Declined' | 'Closed';
export type FollowUpPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type ImportType = 'Vehicles' | 'Customers' | 'ServiceRecords' | 'JobCards';
export type ImportStatus = 'Pending' | 'Validating' | 'Valid' | 'Invalid' | 'Importing' | 'Completed' | 'CompletedWithErrors' | 'RolledBack' | 'Failed';

// ============================================================
// Auth
// ============================================================
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  userId: string;
  fullName: string;
  email: string;
  role: string;
  expiresAt: string;
  permissions: string[];
}

export interface AuthUser {
  userId: string;
  fullName: string;
  email: string;
  role: string;
  permissions: string[];
}

// ============================================================
// Dashboard
// ============================================================
export interface DashboardKpis {
  totalVehicles: number;
  dealershipVehicles: number;
  activeVehicles: number;
  dueSoonVehicles: number;
  overdueVehicles: number;
  lostVehicles: number;
  recoveredVehicles: number;
  totalCustomers: number;
  activeFollowUps: number;
  monthlyServiceCount: number;
  monthlyRetentionRate: number;
  quarterlyRetentionRate: number;
  sixMonthRetentionRate: number;
  yearlyRetentionRate: number;
  retentionTrend: RetentionTrendPoint[];
  brandRetention: BrandRetention[];
  openJobCards: number;
  todayJobCards: number;
  monthlyJobCards: number;
  monthlySalesHistory: number;
}

export interface RetentionTrendPoint {
  label: string;
  retentionRate: number;
  returned: number;
  eligible: number;
  lost: number;
}

export interface BrandRetention {
  brandName: string;
  brandCode: string;
  retentionRate: number;
  eligible: number;
  returned: number;
  lost: number;
}

export interface RetentionSummary {
  retentionRate: number;
  eligibleVehicles: number;
  returnedVehicles: number;
  lostVehicles: number;
  dueSoonVehicles: number;
  overdueVehicles: number;
  recoveredVehicles: number;
  calculatedAt: string;
}

export interface CohortRetention {
  cohortLabel: string;
  totalVehicles: number;
  month3Rate: number;
  month6Rate: number;
  month12Rate: number;
  month24Rate: number;
}

export interface RetentionAnalytics {
  monthly: RetentionSummary;
  quarterly: RetentionSummary;
  yearly: RetentionSummary;
  trend: RetentionTrendPoint[];
  byBrand: BrandRetention[];
  cohorts: CohortRetention[];
}

export interface YearWiseCohortRow {
  saleYear: number;
  totalSold: number;
  zeroVisits: number;
  oneVisit: number;
  twoVisits: number;
  moreThanTwo: number;
  retentionRate: number;
}

export interface ModelWiseCohortRow {
  modelName: string;
  brandName: string;
  totalSold: number;
  zeroVisits: number;
  oneVisit: number;
  twoVisits: number;
  moreThanTwo: number;
  retentionRate: number;
}

export interface VisitFrequencyCohort {
  yearWise: YearWiseCohortRow[];
  modelWise: ModelWiseCohortRow[];
  currentYear: number;
  todayYear: number;
}

export interface CohortVehicle {
  id: string;
  vin: string;
  plateNumber: string | null;
  brandName: string;
  modelName: string;
  year: number;
  customerName: string | null;
  customerPhone: string | null;
  visitsInYear: number;
}

// ============================================================
// Vehicles
// ============================================================
export interface VehicleListItem {
  id: string;
  vin: string;
  plateNumber: string | null;
  brandName: string;
  brandCode: string;
  modelName: string;
  year: number;
  customerId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  saleDate: string | null;
  lastServiceDate: string | null;
  nextServiceDate: string | null;
  nextServiceMileage: number | null;
  currentMileage: number | null;
  retentionStatus: RetentionStatus;
  warrantyEndDate: string | null;
  isSoldByDealership: boolean;
}

export interface ServicePart {
  partNumber: string;
  partName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface ServiceTimelineItem {
  id: string;
  serviceDate: string;
  serviceType: ServiceType;
  mileage: number;
  technicianName: string | null;
  invoiceNumber: string | null;
  totalCost: number | null;
  isWarrantyJob: boolean;
  notes: string | null;
  serviceDescription: string | null;
  parts: ServicePart[];
}

export interface FollowUpHistory {
  id: string;
  status: FollowUpStatus;
  priority: FollowUpPriority;
  contactMethod: ContactMethod;
  reason: string;
  dueDate: string;
  contactedAt: string | null;
  notes: string | null;
  recoveryAchieved: boolean;
}

export interface TechnicianHistory {
  technicianId: string;
  technicianName: string;
  visitCount: number;
}

export interface Vehicle360Kpis {
  totalServices: number;
  totalRevenue: number;
  averageServiceIntervalDays: number | null;
  warrantyJobCount: number;
  lastServiceDaysAgo: number | null;
}

export interface JobCard360Item {
  id: string;
  jobCardNumber: string;
  vin: string | null;
  plateNumber: string | null;
  serviceType: ServiceType;
  status: JobCardStatus;
  mileage: number;
  technicianId: string | null;
  technicianName: string | null;
  createdAt: string;
  closedAt: string | null;
  deliveryNoteNumber: string | null;
  notes: string | null;
}

export interface Vehicle360 {
  id: string;
  vin: string;
  plateNumber: string | null;
  brandName: string;
  modelName: string;
  year: number;
  color: string | null;
  fuelType: string | null;
  engineNumber: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  customerCategory: CustomerCategory | null;
  saleDate: string | null;
  salePrice: number | null;
  isSoldByDealership: boolean;
  currentMileage: number | null;
  lastServiceDate: string | null;
  lastServiceMileage: number | null;
  nextServiceDate: string | null;
  nextServiceMileage: number | null;
  warrantyStartDate: string | null;
  warrantyEndDate: string | null;
  warrantyKmLimit: number | null;
  retentionStatus: RetentionStatus;
  servicePolicyId: string | null;
  servicePolicyName: string | null;
  transmission: string | null;
  engineCapacityCC: number | null;
  serviceTimeline: ServiceTimelineItem[];
  followUpHistory: FollowUpHistory[];
  technicianHistory: TechnicianHistory[];
  kpis: Vehicle360Kpis;
  jobCards: JobCard360Item[];
}

// ============================================================
// Customers
// ============================================================
export interface CustomerVehicleSummary {
  id: string;
  vin: string;
  plateNumber: string | null;
  brandName: string;
  modelName: string;
  year: number;
  retentionStatus: RetentionStatus;
  currentMileage: number | null;
  lastServiceDate: string | null;
}

export interface CustomerServiceHistoryItem {
  id: string;
  serviceDate: string;
  mileageAtService: number;
  serviceType: ServiceType;
  vehicleLabel: string;
  plateNumber: string | null;
  technicianName: string | null;
  invoiceNumber: string | null;
  totalCost: number | null;
  isWarrantyJob: boolean;
}

export interface Customer360 {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  city: string | null;
  country: string | null;
  address: string | null;
  category: CustomerCategory;
  companyName: string | null;
  taxId: string | null;
  preferredContactMethod: string;
  isActive: boolean;
  createdAt: string;
  vehicles: CustomerVehicleSummary[];
  serviceHistory: CustomerServiceHistoryItem[];
  jobCards: JobCard360Item[];
}

export interface CustomerListItem {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  category: CustomerCategory;
  companyName: string | null;
  city: string | null;
  address: string | null;
  vehicleCount: number;
  lastServiceDate: string | null;
  isActive: boolean;
}

// ============================================================
// Service Records
// ============================================================
export interface ServiceRecordListItem {
  id: string;
  vin: string;
  plateNumber: string | null;
  brandName: string;
  modelName: string;
  customerName: string | null;
  serviceDate: string;
  mileageAtService: number;
  serviceType: ServiceType | null;
  technicianId: string | null;
  technicianName: string | null;
  bayName: string | null;
  invoiceNumber: string | null;
  serviceDescription: string | null;
  notes: string | null;
  totalCost: number | null;
  isWarrantyJob: boolean;
  nextServiceDate: string | null;
  nextServiceMileage: number | null;
}

// ============================================================
// Shared
// ============================================================
export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  message: string | null;
  errors?: string[];
}

export interface ServicePolicy {
  id: string;
  name: string;
  description: string | null;
  brandName: string | null;
  modelName: string | null;
  intervalKm: number;
  intervalMonths: number;
  dueSoonLeadDays: number;
  dueSoonLeadKm: number;
  lostThresholdMonths: number;
  isDefault: boolean;
}

// ============================================================
// Company Settings
// ============================================================
export interface CompanySettings {
  companyName: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  tinNumber: string | null;
  website: string | null;
  jobCardShowHeader: boolean;
  jobCardShowFooter: boolean;
  deliveryNoteShowHeader: boolean;
  deliveryNoteShowFooter: boolean;
  footerDisclaimer: string | null;
  emailJobCardMessage: string | null;
  emailDeliveryNoteMessage: string | null;
  serviceTypesConfig: string | null;
}

export interface ServiceTypeItem {
  value: string;
  label: string;
  isActive: boolean;
  isBuiltIn: boolean;
}

// ============================================================
// Job Cards
// ============================================================
export interface JobCardListItem {
  id: string;
  jobCardNumber: string;
  vin: string;
  plateNumber: string | null;
  year: number;
  customerName: string | null;
  customerPhone: string | null;
  serviceType: ServiceType;
  status: JobCardStatus;
  fuelLevel: FuelLevel;
  mileage: number;
  receivedByName: string;
  technicianName: string | null;
  createdAt: string;
  closedAt: string | null;
  deliveryNoteNumber: string | null;
}

export interface JobCardDetail {
  id: string;
  jobCardNumber: string;
  vehicleId: string;
  vin: string;
  plateNumber: string | null;
  year: number;
  color: string | null;
  transmission: string | null;
  fuelType: string | null;
  fuelLevel: FuelLevel;
  mileage: number;
  brandName: string;
  modelName: string;
  customerId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  customerAddress: string | null;
  technicianId: string | null;
  technicianName: string | null;
  serviceType: ServiceType;
  status: JobCardStatus;
  notes: string | null;
  additionalInfo: string | null;
  accessoriesPresent: string[];
  receivedByName: string;
  receivedByUserId: string;
  createdAt: string;
  updatedAt: string | null;
  closedAt: string | null;
  closedByName: string | null;
  closedByUserId: string | null;
  deliveryNoteNumber: string | null;
  deliveryNoteGeneratedAt: string | null;
}

export interface SalesHistoryItem {
  id: string;
  saleDate: string;
  saleType: string;
  vin: string;
  plateNumber: string | null;
  brandName: string;
  modelName: string;
  year: number;
  customerName: string | null;
  customerPhone: string | null;
  jobCardNumber: string | null;
  deliveryNoteNumber: string | null;
  jobCardId: string | null;
  customerId: string | null;
  vehicleId: string;
  notes: string | null;
  createdAt: string;
}
