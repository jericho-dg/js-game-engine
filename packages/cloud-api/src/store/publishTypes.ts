export interface PublishGameOptions {
  userId?: string;
  authorDisplayName?: string;
  title?: string;
  isPublic?: boolean;
}

export interface GalleryGameEntry {
  publishId: string;
  title: string;
  authorDisplayName?: string;
  updatedAt: number;
}

export interface StorePublishedGameResult {
  updatedAt: number;
  title: string;
  isPublic: boolean;
}
