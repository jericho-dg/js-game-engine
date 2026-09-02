import { create } from 'zustand';
import type { AssetRecord } from '@js-game-engine/shared';
import { db } from '../services/db';

export interface AssetSnapshot extends AssetRecord {
  blob: Blob;
}

interface AssetState {
  assets: AssetRecord[];
  imageCache: Map<string, HTMLImageElement>;
  thumbnailCache: Map<string, string>;
  blobCache: Map<string, Blob>;
  loadForProject: (projectId: string) => Promise<void>;
  clearAll: () => void;
  registerAsset: (record: AssetRecord, image: HTMLImageElement, blob: Blob) => void;
  removeAsset: (assetId: string) => void;
  getImage: (assetId: string) => HTMLImageElement | undefined;
  getThumbnailUrl: (assetId: string) => string | undefined;
  captureSnapshots: () => AssetSnapshot[];
  restoreFromSnapshots: (snapshots: AssetSnapshot[]) => Promise<void>;
}

function revokeThumbnails(thumbnailCache: Map<string, string>): void {
  for (const url of thumbnailCache.values()) {
    URL.revokeObjectURL(url);
  }
}

export const useAssetStore = create<AssetState>((set, get) => ({
  assets: [],
  imageCache: new Map(),
  thumbnailCache: new Map(),
  blobCache: new Map(),

  loadForProject: async (projectId) => {
    const stored = await db.assets.where('projectId').equals(projectId).toArray();
    const imageCache = new Map<string, HTMLImageElement>();
    const thumbnailCache = new Map<string, string>();
    const blobCache = new Map<string, Blob>();
    const assets: AssetRecord[] = [];

    for (const entry of stored) {
      assets.push({
        id: entry.id,
        projectId: entry.projectId,
        name: entry.name,
        type: entry.type,
        mimeType: entry.mimeType,
        width: entry.width,
        height: entry.height,
      });

      blobCache.set(entry.id, entry.blob);
      const image = await loadImageFromBlob(entry.blob);
      imageCache.set(entry.id, image);
      thumbnailCache.set(entry.id, URL.createObjectURL(entry.blob));
    }

    set({ assets, imageCache, thumbnailCache, blobCache });
  },

  clearAll: () => {
    revokeThumbnails(get().thumbnailCache);
    set({
      assets: [],
      imageCache: new Map(),
      thumbnailCache: new Map(),
      blobCache: new Map(),
    });
  },

  registerAsset: (record, image, blob) => {
    set((state) => {
      const nextImages = new Map(state.imageCache);
      nextImages.set(record.id, image);
      const nextThumbs = new Map(state.thumbnailCache);
      nextThumbs.set(record.id, URL.createObjectURL(blob));
      const nextBlobs = new Map(state.blobCache);
      nextBlobs.set(record.id, blob);
      return {
        assets: [...state.assets, record],
        imageCache: nextImages,
        thumbnailCache: nextThumbs,
        blobCache: nextBlobs,
      };
    });
  },

  removeAsset: (assetId) => {
    set((state) => {
      const thumb = state.thumbnailCache.get(assetId);
      if (thumb) URL.revokeObjectURL(thumb);

      const nextImages = new Map(state.imageCache);
      nextImages.delete(assetId);
      const nextThumbs = new Map(state.thumbnailCache);
      nextThumbs.delete(assetId);
      const nextBlobs = new Map(state.blobCache);
      nextBlobs.delete(assetId);

      return {
        assets: state.assets.filter((asset) => asset.id !== assetId),
        imageCache: nextImages,
        thumbnailCache: nextThumbs,
        blobCache: nextBlobs,
      };
    });
  },

  getImage: (assetId) => get().imageCache.get(assetId),

  getThumbnailUrl: (assetId) => get().thumbnailCache.get(assetId),

  captureSnapshots: () => {
    const { assets, blobCache } = get();
    return assets.map((record) => {
      const blob = blobCache.get(record.id);
      if (!blob) {
        throw new Error(`Missing blob for asset ${record.id}`);
      }
      return { ...record, blob };
    });
  },

  restoreFromSnapshots: async (snapshots) => {
    revokeThumbnails(get().thumbnailCache);

    const assets: AssetRecord[] = [];
    const imageCache = new Map<string, HTMLImageElement>();
    const thumbnailCache = new Map<string, string>();
    const blobCache = new Map<string, Blob>();

    for (const snapshot of snapshots) {
      const { blob, ...record } = snapshot;
      assets.push(record);
      blobCache.set(record.id, blob);
      const image = await loadImageFromBlob(blob);
      imageCache.set(record.id, image);
      thumbnailCache.set(record.id, URL.createObjectURL(blob));
    }

    set({ assets, imageCache, thumbnailCache, blobCache });
  },
}));

function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load asset image.'));
    };
    image.src = url;
  });
}
