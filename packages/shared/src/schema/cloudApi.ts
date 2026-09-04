export const CLOUD_API_VERSION = '1';

export interface CloudApiProjectSummary {
  id: string;
  name: string;
  updatedAt: number;
}

export interface CloudApiProjectListResponse {
  projects: CloudApiProjectSummary[];
}

export interface CloudApiAuthRequest {
  displayName: string;
  password: string;
}

export interface CloudApiAuthResponse {
  token: string;
  userId: string;
  displayName: string;
}

export interface CloudApiErrorResponse {
  error: string;
}
