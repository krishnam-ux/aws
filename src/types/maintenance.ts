export interface MaintenanceSettings {
  maintenanceMode: boolean;
  headline?: string;
  message?: string;
  estimatedReturn?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface MaintenanceStatusResponse {
  maintenanceMode: boolean;
  headline: string;
  message: string;
  estimatedReturn?: string;
  updatedAt?: string;
}
