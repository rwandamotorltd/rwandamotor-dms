import axios, { AxiosInstance } from 'axios';
import type { ApiResponse, AuthResponse, DashboardKpis, PaginatedResult, RetentionAnalytics, VisitFrequencyCohort, CohortVehicle, RetentionStatus, Vehicle360, Customer360, VehicleListItem, CustomerListItem, ServiceRecordListItem, ServicePolicy, JobCardListItem, JobCardDetail, JobCardStatus, ServiceType, FuelLevel, CompanySettings, BrandColor, VehicleColor } from '@/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api';

function createApiClient(): AxiosInstance {
  const client = axios.create({ baseURL: BASE_URL, timeout: 30000 });

  client.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) config.headers.Authorization = 'Bearer ' + token;
    }
    return config;
  });

  client.interceptors.response.use(
    (res) => res,
    (error) => {
      if (error.response?.status === 401 && typeof window !== 'undefined' && window.location.pathname !== '/login') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('auth_user');
        window.location.replace('/login');
      }
      return Promise.reject(error);
    }
  );

  return client;
}

const api = createApiClient();

// ============================================================
// Auth
// ============================================================
export const authApi = {
  login: (email: string, password: string) =>
    api.post<ApiResponse<AuthResponse>>('/auth/login', { email, password }).then(r => r.data),

  me: () =>
    api.get<ApiResponse<AuthResponse>>('/auth/me').then(r => r.data),
};

// ============================================================
// Dashboard
// ============================================================
export const dashboardApi = {
  getKpis: () =>
    api.get<ApiResponse<DashboardKpis>>('/dashboard/kpis').then(r => r.data.data!),
};

// ============================================================
// Vehicles
// ============================================================
export interface UpdateVehiclePayload {
  id: string;
  plateNumber?: string | null;
  currentMileage?: number | null;
  color?: string | null;
  fuelType?: string | null;
  transmission?: string | null;
  engineNumber?: string | null;
  engineCapacityCC?: number | null;
  warrantyStartDate?: string | null;
  warrantyEndDate?: string | null;
  warrantyKmLimit?: number | null;
  servicePolicyId?: string | null;
  retentionStatus?: RetentionStatus | null;
  notes?: string | null;
  brandId?: string | null;
  modelId?: string | null;
  year?: number | null;
  customerId?: string | null;
  clearCustomer?: boolean;
}

export interface BulkUpdatePayload {
  vehicleIds: string[];
  retentionStatus?: RetentionStatus | null;
  servicePolicyId?: string | null;
  notes?: string | null;
  notesAppend?: string | null;
}

// ============================================================
// Brands
// ============================================================
export interface BrandDto {
  id: string;
  name: string;
  models: { id: string; name: string }[];
}

export const brandsApi = {
  list: () => api.get<ApiResponse<BrandDto[]>>('/vehicles/brands').then(r => r.data.data!),
};

export const vehiclesApi = {
  list: (params: {
    search?: string; brandId?: string; modelId?: string;
    retentionStatus?: RetentionStatus; isSoldByDealership?: boolean;
    warrantyActive?: boolean; pageNumber?: number; pageSize?: number;
  }) => api.get<ApiResponse<PaginatedResult<VehicleListItem>>>('/vehicles', { params }).then(r => r.data.data!),

  get360: (id: string) =>
    api.get<ApiResponse<Vehicle360>>('/vehicles/' + id + '/360').then(r => r.data.data!),

  create: (payload: Record<string, unknown>) =>
    api.post<ApiResponse<string>>('/vehicles', payload).then(r => r.data),

  update: (payload: UpdateVehiclePayload) =>
    api.put<ApiResponse<boolean>>('/vehicles/' + payload.id, payload).then(r => r.data),

  bulkUpdate: (payload: BulkUpdatePayload) =>
    api.put<ApiResponse<number>>('/vehicles/bulk', payload).then(r => r.data),

  deleteMany: (ids: string[]) =>
    api.delete<ApiResponse<number>>('/vehicles', { data: ids }).then(r => r.data),

  deleteAll: (params?: { search?: string; retentionStatus?: RetentionStatus; isSoldByDealership?: boolean }) =>
    api.delete<ApiResponse<number>>('/vehicles/all', { params }).then(r => r.data),
};

// ============================================================
// Customers
// ============================================================
export interface UpdateCustomerPayload {
  id: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  preferredContactMethod: string;
  category: string;
  companyName?: string | null;
  taxId?: string | null;
  notes?: string | null;
  isActive: boolean;
}

export const customersApi = {
  list: (params: { search?: string; category?: string; pageNumber?: number; pageSize?: number }) =>
    api.get<ApiResponse<PaginatedResult<CustomerListItem>>>('/customers', { params }).then(r => r.data.data!),

  get360: (id: string) =>
    api.get<ApiResponse<Customer360>>('/customers/' + id + '/360').then(r => r.data.data!),

  create: (payload: Record<string, unknown>) =>
    api.post<ApiResponse<string>>('/customers', payload).then(r => r.data),

  update: (payload: UpdateCustomerPayload) =>
    api.put<ApiResponse<boolean>>('/customers/' + payload.id, payload).then(r => r.data),

  deleteMany: (ids: string[]) =>
    api.delete<ApiResponse<number>>('/customers', { data: ids }).then(r => r.data),

  deleteAll: (params?: { search?: string; category?: string }) =>
    api.delete<ApiResponse<number>>('/customers/all', { params }).then(r => r.data),
};

// ============================================================
// Service Records
// ============================================================
export interface UpdateServiceRecordPayload {
  id: string;
  mileageAtService?: number | null;
  serviceType?: string | null;
  technicianId?: string | null;
  invoiceNumber?: string | null;
  serviceDescription?: string | null;
  notes?: string | null;
  isWarrantyJob?: boolean | null;
  totalCost?: number | null;
}

export const serviceRecordsApi = {
  list: (params: {
    vehicleId?: string; technicianId?: string; bayId?: string;
    serviceType?: string; dateFrom?: string; dateTo?: string;
    search?: string; pageNumber?: number; pageSize?: number;
  }) => api.get<ApiResponse<PaginatedResult<ServiceRecordListItem>>>('/servicerecords', { params }).then(r => r.data.data!),

  create: (payload: Record<string, unknown>) =>
    api.post<ApiResponse<string>>('/servicerecords', payload).then(r => r.data),

  update: (payload: UpdateServiceRecordPayload) =>
    api.put<ApiResponse<boolean>>('/servicerecords/' + payload.id, payload).then(r => r.data),

  deleteMany: (ids: string[]) =>
    api.delete<ApiResponse<number>>('/servicerecords', { data: ids }).then(r => r.data),

  deleteAll: (params?: { search?: string; serviceType?: string; dateFrom?: string; dateTo?: string }) =>
    api.delete<ApiResponse<number>>('/servicerecords/all', { params }).then(r => r.data),
};

// ============================================================
// Technicians
// ============================================================
export interface TechnicianItem {
  id: string;
  fullName: string;
  employeeCode: string;
  specialization: string | null;
  phone: string | null;
  email: string | null;
  certificationLevel: string | null;
  isActive: boolean;
}

export const techniciansApi = {
  list: (activeOnly = true) =>
    api.get<ApiResponse<TechnicianItem[]>>('/technicians', { params: { activeOnly } }).then(r => r.data.data!),

  create: (payload: CreateTechnicianPayload) =>
    api.post<ApiResponse<string>>('/technicians', payload).then(r => r.data),

  update: (payload: UpdateTechnicianPayload) =>
    api.put<ApiResponse<boolean>>('/technicians/' + payload.id, payload).then(r => r.data),

  delete: (id: string) =>
    api.delete<ApiResponse<boolean>>('/technicians/' + id).then(r => r.data),
};

// ============================================================
// Retention
// ============================================================
export const retentionApi = {
  getAnalytics: (params?: { trendMonths?: number; cohortYear?: number }) =>
    api.get<ApiResponse<RetentionAnalytics>>('/retention/analytics', { params }).then(r => r.data.data!),

  getVisitCohorts: (year?: number) =>
    api.get<ApiResponse<VisitFrequencyCohort>>('/retention/visit-cohorts', { params: year ? { year } : undefined }).then(r => r.data.data!),

  getCohortVehicles: (params: {
    serviceYear: number;
    saleYear?: number;
    modelName?: string;
    brandName?: string;
    visitBucket: string;
  }) =>
    api.get<ApiResponse<CohortVehicle[]>>('/retention/cohort-vehicles', { params }).then(r => r.data.data!),

  evaluate: () =>
    api.post<ApiResponse<boolean>>('/retention/evaluate').then(r => r.data),
};

// ============================================================
// Service Policies
// ============================================================
export const servicePoliciesApi = {
  list: (brandId?: string) =>
    api.get<ApiResponse<ServicePolicy[]>>('/servicepolicies', { params: { brandId } }).then(r => r.data.data!),
};

// ============================================================
// Import
// ============================================================
export interface ImportRowPreview {
  rowNumber: number;
  isValid: boolean;
  isDuplicate: boolean;
  data: Record<string, string>;
  error?: string | null;
}

export interface ImportRowError {
  rowNumber: number;
  field: string;
  error: string;
}

export interface ValidateImportResult {
  importLogId: string;
  totalRows: number;
  validRows: number;
  errorRows: number;
  duplicateRows: number;
  preview: ImportRowPreview[];
  errors: ImportRowError[];
}

export interface ProcessImportResult {
  importLogId: string;
  finalStatus: string;
  totalRows: number;
  importedRows: number;
  errorRows: number;
  duplicateRows: number;
  errors: ImportRowError[];
}

// Separate client with a 5-minute timeout for bulk import operations
const importClient = axios.create({ baseURL: BASE_URL, timeout: 300000 });
importClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = 'Bearer ' + token;
  }
  return config;
});

export const importApi = {
  validate: (fileName: string, fileContentBase64: string, importType: string) =>
    importClient.post<ApiResponse<ValidateImportResult>>('/import/validate', {
      fileName,
      fileContentBase64,
      importType,
    }).then(r => r.data.data!),

  process: (importLogId: string) =>
    importClient.post<ApiResponse<ProcessImportResult>>('/import/process/' + importLogId).then(r => r.data.data!),
};

// ============================================================
// Admin — Users
// ============================================================
export interface UserItem {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  permissionGroupId: string | null;
  permissionGroupName: string | null;
  customPermissions: string[];
}

export interface CreateUserPayload {
  fullName: string;
  email: string;
  password: string;
  role: string;
  permissionGroupId?: string | null;
  customPermissions?: string[] | null;
}

export interface UpdateUserPayload {
  userId: string;
  fullName: string;
  role: string;
  isActive: boolean;
  permissionGroupId?: string | null;
  customPermissions?: string[] | null;
}

// ============================================================
// Admin — Catalogue (Brands & Models)
// ============================================================
export interface CatalogueModelDto {
  id: string;
  name: string;
  code: string;
  segment: string | null;
  isActive: boolean;
}

export interface CatalogueBrandDto {
  id: string;
  name: string;
  code: string;
  country: string | null;
  isActive: boolean;
  models: CatalogueModelDto[];
}

export const catalogueApi = {
  getBrands: () =>
    api.get<ApiResponse<CatalogueBrandDto[]>>('/admin/catalogue/brands').then(r => r.data.data!),

  createBrand: (payload: { name: string; code: string; country?: string }) =>
    api.post<ApiResponse<string>>('/admin/catalogue/brands', payload).then(r => r.data),

  updateBrand: (id: string, payload: { name: string; code: string; country?: string; isActive: boolean }) =>
    api.put<ApiResponse<boolean>>(`/admin/catalogue/brands/${id}`, payload).then(r => r.data),

  deleteBrand: (id: string) =>
    api.delete<ApiResponse<boolean>>(`/admin/catalogue/brands/${id}`).then(r => r.data),

  createModel: (brandId: string, payload: { name: string; code: string; segment?: string }) =>
    api.post<ApiResponse<string>>(`/admin/catalogue/brands/${brandId}/models`, payload).then(r => r.data),

  updateModel: (id: string, payload: { name: string; code: string; segment?: string; isActive: boolean }) =>
    api.put<ApiResponse<boolean>>(`/admin/catalogue/models/${id}`, payload).then(r => r.data),

  deleteModel: (id: string) =>
    api.delete<ApiResponse<boolean>>(`/admin/catalogue/models/${id}`).then(r => r.data),

  preview: (file: File): Promise<CataloguePreviewResult> => {
    const form = new FormData();
    form.append('file', file);
    return api.post<ApiResponse<CataloguePreviewResult>>('/admin/catalogue/preview', form).then(r => r.data.data!);
  },

  bulkImport: (file: File): Promise<BulkImportCatalogueResult> => {
    const form = new FormData();
    form.append('file', file);
    return api.post<ApiResponse<BulkImportCatalogueResult>>('/admin/catalogue/import', form).then(r => r.data.data!);
  },
};

export interface BulkImportCatalogueResult {
  brandsCreated: number;
  brandsSkipped: number;
  modelsCreated: number;
  modelsSkipped: number;
}

export interface CataloguePreviewRow {
  rowNumber: number;
  brandName: string;
  modelName: string;
  brandCode: string | null;
  modelCode: string | null;
  segment: string | null;
  isNewBrand: boolean;
  isNewModel: boolean;
  hasError: boolean;
  error: string | null;
}

export interface CataloguePreviewResult {
  totalRows: number;
  newBrands: number;
  newModels: number;
  existingBrands: number;
  existingModels: number;
  errorRows: number;
  rows: CataloguePreviewRow[];
}

export const adminApi = {
  getUsers: () =>
    api.get<ApiResponse<UserItem[]>>('/admin/users').then(r => r.data.data!),

  createUser: (payload: CreateUserPayload) =>
    api.post<ApiResponse<boolean>>('/admin/users', payload).then(r => r.data),

  updateUser: (payload: UpdateUserPayload) =>
    api.put<ApiResponse<boolean>>('/admin/users/' + payload.userId, payload).then(r => r.data),

  resetPassword: (userId: string, newPassword: string) =>
    api.post<ApiResponse<boolean>>('/admin/users/' + userId + '/reset-password', { newPassword }).then(r => r.data),

  deleteUser: (userId: string) =>
    api.delete<ApiResponse<boolean>>('/admin/users/' + userId).then(r => r.data),

  purgeData: () =>
    api.post<ApiResponse<boolean>>('/admin/purge-data').then(r => r.data),
};

// ============================================================
// Admin — Brand Colors
// ============================================================
export interface CreateBrandColorPayload { name: string; hexValue: string; sortOrder?: number; }
export interface UpdateBrandColorPayload { id: string; name: string; hexValue: string; sortOrder: number; }

export const brandColorsApi = {
  list: () =>
    api.get<ApiResponse<BrandColor[]>>('/admin/brand-colors').then(r => r.data.data!),

  create: (payload: CreateBrandColorPayload) =>
    api.post<ApiResponse<BrandColor>>('/admin/brand-colors', payload).then(r => r.data),

  update: (payload: UpdateBrandColorPayload) =>
    api.put<ApiResponse<boolean>>('/admin/brand-colors/' + payload.id, payload).then(r => r.data),

  delete: (id: string) =>
    api.delete<ApiResponse<boolean>>('/admin/brand-colors/' + id).then(r => r.data),
};

// ============================================================
// Admin — Vehicle Colors
// ============================================================
export interface CreateVehicleColorPayload { name: string; sortOrder?: number; }
export interface UpdateVehicleColorPayload { id: string; name: string; sortOrder: number; }

export const vehicleColorsApi = {
  list: () =>
    api.get<ApiResponse<VehicleColor[]>>('/admin/vehicle-colors').then(r => r.data.data!),

  create: (payload: CreateVehicleColorPayload) =>
    api.post<ApiResponse<VehicleColor>>('/admin/vehicle-colors', payload).then(r => r.data),

  update: (payload: UpdateVehicleColorPayload) =>
    api.put<ApiResponse<boolean>>('/admin/vehicle-colors/' + payload.id, payload).then(r => r.data),

  delete: (id: string) =>
    api.delete<ApiResponse<boolean>>('/admin/vehicle-colors/' + id).then(r => r.data),
};

// ============================================================
// Admin — Permission Groups
// ============================================================
export interface PermissionGroupItem {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  createdAt: string;
}

export interface CreatePermissionGroupPayload {
  name: string;
  description?: string | null;
  permissions: string[];
}

export interface UpdatePermissionGroupPayload {
  name: string;
  description?: string | null;
  permissions: string[];
}

export const permissionGroupsApi = {
  list: () =>
    api.get<ApiResponse<PermissionGroupItem[]>>('/admin/permission-groups').then(r => r.data.data!),

  create: (payload: CreatePermissionGroupPayload) =>
    api.post<ApiResponse<string>>('/admin/permission-groups', payload).then(r => r.data),

  update: (id: string, payload: UpdatePermissionGroupPayload) =>
    api.put<ApiResponse<boolean>>('/admin/permission-groups/' + id, payload).then(r => r.data),

  delete: (id: string) =>
    api.delete<ApiResponse<boolean>>('/admin/permission-groups/' + id).then(r => r.data),
};

// ============================================================
// Admin — Roles
// ============================================================
export interface RoleItem {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  isBuiltIn: boolean;
  userCount: number;
}

export const rolesApi = {
  list: () =>
    api.get<ApiResponse<RoleItem[]>>('/admin/roles').then(r => r.data.data!),
  create: (name: string, displayName: string, description?: string) =>
    api.post<ApiResponse<RoleItem>>('/admin/roles', { name, displayName, description }).then(r => r.data),
  update: (id: string, displayName: string, description?: string) =>
    api.put<ApiResponse<boolean>>('/admin/roles/' + id, { displayName, description }).then(r => r.data),
  delete: (id: string) =>
    api.delete<ApiResponse<boolean>>('/admin/roles/' + id).then(r => r.data),
};

// ============================================================
// Admin — Company Settings
// ============================================================
export const companySettingsApi = {
  // GET is on its own route accessible to all authenticated users (needed for job card print)
  get: () =>
    api.get<ApiResponse<CompanySettings>>('/company-settings').then(r => r.data.data!),

  // PUT remains admin-only
  update: (payload: CompanySettings) =>
    api.put<ApiResponse<boolean>>('/admin/company-settings', payload).then(r => r.data),
};

// ============================================================
// Job Cards
// ============================================================
export interface CreateJobCardPayload {
  vehicleId: string;
  customerId?: string | null;
  technicianId?: string | null;
  serviceType: ServiceType;
  fuelLevel: FuelLevel;
  mileage: number;
  notes?: string | null;
  additionalInfo?: string | null;
  accessoriesPresent?: string[];
}

export interface UpdateJobCardPayload {
  id: string;
  serviceType: ServiceType;
  technicianId?: string | null;
  fuelLevel: FuelLevel;
  mileage: number;
  notes?: string | null;
  additionalInfo?: string | null;
  accessoriesPresent: string[];
}

export interface ShareJobCardPayload {
  recipientEmail: string;
  customMessage?: string | null;
}

export const jobCardsApi = {
  list: (params: {
    search?: string;
    status?: JobCardStatus;
    serviceType?: ServiceType;
    dateFrom?: string;
    dateTo?: string;
    pageNumber?: number;
    pageSize?: number;
  }) => api.get<ApiResponse<PaginatedResult<JobCardListItem>>>('/jobcards', { params }).then(r => r.data.data!),

  get: (id: string) =>
    api.get<ApiResponse<JobCardDetail>>(`/jobcards/${id}`).then(r => r.data.data!),

  create: (payload: CreateJobCardPayload) =>
    api.post<ApiResponse<{ id: string; jobCardNumber: string }>>('/jobcards', payload).then(r => r.data),

  update: (payload: UpdateJobCardPayload) =>
    api.put<ApiResponse<boolean>>(`/jobcards/${payload.id}`, payload).then(r => r.data),

  convertToDeliveryNote: (id: string) =>
    api.post<ApiResponse<string>>(`/jobcards/${id}/convert`).then(r => r.data),

  updateSequence: (year: number, startingSequence: number) =>
    api.put<ApiResponse<boolean>>('/jobcards/sequence', { year, startingSequence }).then(r => r.data),

  share: (id: string, payload: ShareJobCardPayload) =>
    api.post<ApiResponse<object>>(`/jobcards/${id}/share`, payload).then(r => r.data),

  deleteMany: (ids: string[]) =>
    api.delete<ApiResponse<number>>('/jobcards', { data: ids }).then(r => r.data),

  deleteAll: (params?: { search?: string; status?: JobCardStatus; serviceType?: ServiceType }) =>
    api.delete<ApiResponse<number>>('/jobcards/all', { params }).then(r => r.data),
};

// ============================================================
// Admin — Technicians (full CRUD via techniciansApi)
// ============================================================
export interface CreateTechnicianPayload {
  fullName: string;
  employeeCode: string;
  phone?: string | null;
  email?: string | null;
  specialization?: string | null;
  certificationLevel?: string | null;
}

export interface UpdateTechnicianPayload {
  id: string;
  fullName: string;
  employeeCode: string;
  phone?: string | null;
  email?: string | null;
  specialization?: string | null;
  certificationLevel?: string | null;
  isActive: boolean;
}

// ============================================================
// Activity Log
// ============================================================
export interface ActivityLogEntry {
  id: number;
  userId: string;
  userEmail: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string | null;
  entityLabel: string | null;
  occurredAt: string;
}

// ============================================================
// Sales History
// ============================================================
export const salesApi = {
  list: (params: {
    search?: string;
    saleType?: string;
    dateFrom?: string;
    dateTo?: string;
    pageNumber?: number;
    pageSize?: number;
  }) => api.get<ApiResponse<PaginatedResult<import('@/types').SalesHistoryItem>>>('/sales', { params }).then(r => r.data.data!),
};

export const activityApi = {
  list: (params: {
    userId?: string;
    entityType?: string;
    action?: string;
    dateFrom?: string;
    dateTo?: string;
    pageNumber?: number;
    pageSize?: number;
  }) => api.get<ApiResponse<PaginatedResult<ActivityLogEntry>>>('/activity', { params }).then(r => r.data.data!),
};

// ============================================================
// Notifications
// ============================================================
export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  link: string | null;
  vehicleId: string | null;
  customerId: string | null;
  followUpId: string | null;
  appointmentId: string | null;
}

export interface NotificationsResult {
  unreadCount: number;
  items: NotificationItem[];
}

export const notificationsApi = {
  get: () =>
    api.get<ApiResponse<NotificationsResult>>('/notifications').then(r => r.data.data!),
  markRead: (ids: string[]) =>
    api.post<ApiResponse<boolean>>('/notifications/mark-read', { notificationIds: ids }).then(r => r.data),
};

// ============================================================
// Follow-ups
// ============================================================
export interface FollowUpListItem {
  id: string;
  vehiclePlate: string;
  vehicleBrand: string;
  vehicleModel: string;
  vehicleYear: number;
  customerName: string;
  customerPhone: string | null;
  reason: string;
  status: string;
  priority: string;
  dueDate: string;
  createdAt: string;
  interactionCount: number;
  lastContactDate: string | null;
}

export interface FollowUpInteractionDto {
  id: string;
  outcome: string;
  notes: string | null;
  nextContactDate: string | null;
  emailType: string | null;
  createdAt: string;
  createdBy: string | null;
}

export interface FollowUpAppointmentDto {
  id: string;
  appointmentDate: string;
  durationMinutes: number;
  status: string;
  serviceType: string;
  notes: string | null;
}

export interface FollowUpVehicleDto {
  id: string;
  vin: string;
  plateNumber: string | null;
  brand: string;
  model: string;
  year: number;
  lastServiceDate: string | null;
  nextServiceDate: string | null;
  retentionStatus: string;
}

export interface FollowUpCustomerDto {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
}

export interface FollowUpDetailDto {
  id: string;
  reason: string;
  status: string;
  priority: string;
  contactMethod: string;
  dueDate: string;
  notes: string | null;
  createdAt: string;
  vehicle: FollowUpVehicleDto;
  customer: FollowUpCustomerDto;
  interactions: FollowUpInteractionDto[];
  appointments: FollowUpAppointmentDto[];
}

export interface LogInteractionPayload {
  outcome: string;
  notes?: string | null;
  nextContactDate?: string | null;
  emailType?: string | null;
}

export const followUpsApi = {
  list: (params?: { reason?: string; status?: number; pageNumber?: number; pageSize?: number }) =>
    api.get<ApiResponse<FollowUpListItem[]>>('/follow-ups', { params }).then(r => r.data.data!),
  get: (id: string) =>
    api.get<ApiResponse<FollowUpDetailDto>>('/follow-ups/' + id).then(r => r.data.data!),
  logInteraction: (id: string, payload: LogInteractionPayload) =>
    api.post<ApiResponse<boolean>>('/follow-ups/' + id + '/interactions', payload).then(r => r.data),
  sendEmail: (id: string, emailType: string) =>
    api.post<ApiResponse<boolean>>('/follow-ups/' + id + '/send-email', { emailType }).then(r => r.data),
  close: (id: string, notes?: string) =>
    api.post<ApiResponse<boolean>>('/follow-ups/' + id + '/close', { notes }).then(r => r.data),
  generate: () =>
    api.post<ApiResponse<{ serviceDueReminders: number; serviceDue15Days: number; lostRecovery: number; total: number }>>('/follow-ups/generate').then(r => r.data.data!),
};

// ============================================================
// Appointments
// ============================================================
export interface AppointmentDto {
  id: string;
  vehicleId: string;
  customerId: string;
  followUpId: string | null;
  technicianId: string | null;
  appointmentDate: string;
  durationMinutes: number;
  serviceType: string;
  status: string;
  notes: string | null;
  vehiclePlate: string;
  vehicleLabel: string;
  customerName: string;
  customerPhone: string | null;
  technicianName: string | null;
  confirmedAt: string | null;
  completedAt: string | null;
}

export interface BookAppointmentPayload {
  vehicleId: string;
  customerId: string;
  followUpId?: string | null;
  technicianId?: string | null;
  appointmentDate: string;
  durationMinutes?: number;
  serviceType: string;
  notes?: string | null;
}

export const appointmentsApi = {
  list: (params: { from: string; to: string }) =>
    api.get<ApiResponse<AppointmentDto[]>>('/appointments', { params }).then(r => r.data.data!),
  book: (payload: BookAppointmentPayload) =>
    api.post<ApiResponse<string>>('/appointments', payload).then(r => r.data),
  confirm: (id: string) =>
    api.post<ApiResponse<boolean>>('/appointments/' + id + '/confirm').then(r => r.data),
  complete: (id: string) =>
    api.post<ApiResponse<boolean>>('/appointments/' + id + '/complete').then(r => r.data),
  cancel: (id: string) =>
    api.post<ApiResponse<boolean>>('/appointments/' + id + '/cancel').then(r => r.data),
  noShow: (id: string) =>
    api.post<ApiResponse<boolean>>('/appointments/' + id + '/no-show').then(r => r.data),
};

// ============================================================
// Reports
// ============================================================
export interface ByReasonBreakdown {
  reason: string;
  total: number;
  contacted: number;
  appointments: number;
  recovered: number;
  closed: number;
}

export interface InteractionRow {
  followUpId: string;
  reason: string;
  customerName: string;
  vehiclePlate: string;
  outcome: string;
  notes: string | null;
  date: string;
  agent: string;
}

export interface MonthlyFollowUpReport {
  year: number;
  month: number;
  totalCreated: number;
  totalContacted: number;
  totalNoAnswer: number;
  totalAppointmentsBooked: number;
  totalAppointmentsCompleted: number;
  totalNoShow: number;
  totalRecovered: number;
  contactRate: number;
  recoveryRate: number;
  byReason: ByReasonBreakdown[];
  interactionRows: InteractionRow[];
}

export const reportsApi = {
  getMonthlyFollowUps: (year: number, month: number) =>
    api.get<ApiResponse<MonthlyFollowUpReport>>('/reports/follow-ups', { params: { year, month } }).then(r => r.data.data!),
  downloadPdf: (year: number, month: number) =>
    api.get('/reports/follow-ups/pdf', { params: { year, month }, responseType: 'blob' }).then(r => r.data as Blob),
  downloadExcel: (year: number, month: number) =>
    api.get('/reports/follow-ups/excel', { params: { year, month }, responseType: 'blob' }).then(r => r.data as Blob),
};

// ── Document Templates ───────────────────────────────────────────────────────

export interface TemplateDtoApi {
  id: string;
  documentType: string;
  name: string;
  pageWidth: number;
  pageHeight: number;
  fieldsJson: string;
  isDefault: boolean;
  updatedAt: string;
}

export const templatesApi = {
  list: (documentType?: string) =>
    api.get<ApiResponse<TemplateDtoApi[]>>('/admin/templates', { params: documentType ? { documentType } : {} })
      .then(r => r.data.data!),

  save: (payload: {
    id?: string | null;
    documentType: string;
    name: string;
    pageWidth: number;
    pageHeight: number;
    fieldsJson: string;
    isDefault: boolean;
  }) =>
    api.post<ApiResponse<TemplateDtoApi>>('/admin/templates', payload).then(r => r.data.data!),

  delete: (id: string) =>
    api.delete<ApiResponse<boolean>>(`/admin/templates/${id}`).then(r => r.data),
};
