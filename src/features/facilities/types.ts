export type UserRole = "ADMIN" | "OPERATOR" | "VIEWER";
export type FacilityStatus = "ACTIVE" | "INACTIVE";
export type ControlMode = "AUTO" | "MANUAL";

export interface SessionUser {
  id: string;
  tenantId: string;
  username: string;
  name: string;
  role: UserRole;
}

export interface GatewayOption {
  id: string;
  code: string;
  name: string;
  status: FacilityStatus;
}

export interface Facility {
  id: string;
  code: string;
  name: string;
  processName: string;
  groupName: string;
  priority: number;
  baseTemperature: number;
  peakControlPercent: number;
  gatewayId: string | null;
  gatewayCode: string | null;
  gatewayName: string | null;
  nodeNumber: number | null;
  channelNumber: number | null;
  controlMode: ControlMode;
  status: FacilityStatus;
  version: number;
  createdAt: string;
  createdBy: string;
  createdByName: string;
  updatedAt: string;
  updatedBy: string;
  updatedByName: string;
  deletedAt: string | null;
  deletedBy: string | null;
}

export interface PaginatedFacilities {
  items: Facility[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiErrorBody {
  ok: false;
  requestId: string;
  error: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string[]>;
  };
}

export interface ApiSuccess<T> {
  ok: true;
  requestId: string;
  data: T;
}
