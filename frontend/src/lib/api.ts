import axios, { AxiosInstance } from 'axios';
import type { ApiResponse, AuthResponse, DashboardKpis, PaginatedResult, RetentionAnalytics, VisitFrequencyCohort, CohortVehicle, RetentionStatus, Vehicle360, Customer360, VehicleListItem, CustomerListItem, ServiceRecordListItem, ServicePolicy, JobCardListItem, JobCardDetail, JobCardStatus, ServiceType, FuelLevel } from '@/types';

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
      if (error.response?.status === 401 && typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('auth_user');
        window.location.href = '/login';
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
}

export interface CreateUserPayload {
  fullName: string;
  email: string;
  password: string;
  role: string;
}

export interface UpdateUserPayload {
  userId: string;
  fullName: string;
  role: string;
  isActive: boolean;
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

  convertToDeliveryNote: (id: string) =>
    api.post<ApiResponse<string>>(`/jobcards/${id}/convert`).then(r => r.data),

  updateSequence: (year: number, startingSequence: number) =>
    api.put<ApiResponse<boolean>>('/jobcards/sequence', { year, startingSequence }).then(r => r.data),

  share: (id: string, payload: ShareJobCardPayload) =>
    api.post<ApiResponse<object>>(`/jobcards/${id}/share`, payload).then(r => r.data),
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
