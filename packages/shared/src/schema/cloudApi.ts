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

export interface CloudApiPublishResponse {
  publishId: string;
  playUrl: string;
  updatedAt: number;
  title: string;
  isPublic: boolean;
}

export interface CloudApiGalleryGame {
  publishId: string;
  title: string;
  authorDisplayName?: string;
  updatedAt: number;
  playUrl: string;
}

export interface CloudApiGalleryResponse {
  games: CloudApiGalleryGame[];
}

export interface CloudApiShareLinkResponse {
  shareToken: string;
  shareUrl: string;
  projectName: string;
  updatedAt: number;
}

export interface CloudApiSharedProjectInfo {
  shareToken: string;
  projectName: string;
  ownerDisplayName: string;
  updatedAt: number;
}
