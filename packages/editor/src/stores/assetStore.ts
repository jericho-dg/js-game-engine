import { create } from 'zustand';
import type { AssetRecord } from '@js-game-engine/shared';
import { db } from '../services/db';

interface AssetState {
  assets: AssetRecord[];
  imageCache: Map<string, HTMLImageElement>;
  thumbnailCache: Map<string, string>;
  loadForProject: (projectId: string) => Promise<void>;
  registerAsset: (record: AssetRecord, image: HTMLImageElement, blob: Blob) => void;
  removeAsset: (assetId: string) => void;
  getImage: (assetId: string) => HTMLImageElement | undefined;
  getThumbnailUrl: (assetId: string) => string | undefined;
}

export const useAssetStore = create<AssetState>((set, get) => ({
  assets: [],
  imageCache: new Map(),
  thumbnailCache: new Map(),

  loadForProject: async (projectId) => {
    const stored = await db.assets.where('projectId').equals(projectId).toArray();
    const imageCache = new Map<string, HTMLImageElement>();
    const thumbnailCache = new Map<string, string>();
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

      const image = await loadImageFromBlob(entry.blob);
      imageCache.set(entry.id, image);
      thumbnailCache.set(entry.id, URL.createObjectURL(entry.blob));
    }

    set({ assets, imageCache, thumbnailCache });
  },

  registerAsset: (record, image, blob) => {
    set((state) => {
      const nextImages = new Map(state.imageCache);
      nextImages.set(record.id, image);
      const nextThumbs = new Map(state.thumbnailCache);
      nextThumbs.set(record.id, URL.createObjectURL(blob));
      return {
        assets: [...state.assets, record],
        imageCache: nextImages,
        thumbnailCache: nextThumbs,
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

      return {
        assets: state.assets.filter((asset) => asset.id !== assetId),
        imageCache: nextImages,
        thumbnailCache: nextThumbs,
      };
    });
  },

  getImage: (assetId) => get().imageCache.get(assetId),

  getThumbnailUrl: (assetId) => get().thumbnailCache.get(assetId),
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
