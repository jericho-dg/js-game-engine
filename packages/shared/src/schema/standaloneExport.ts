export const STANDALONE_EXPORT_VERSION = '1';

/** Reference viewport height for published games (scale to fit window height). */
export const STANDALONE_DESIGN_VIEWPORT_HEIGHT = 960;

export interface StandaloneCompiledScript {
  id: string;
  name: string;
  compiled: string;
}

export interface StandaloneGameManifest {
  exportVersion: string;
  name: string;
  scene: import('./project').SerializedScene;
  activeSceneId?: string;
  scenes?: import('./project').SceneRecord[];
  scripts: StandaloneCompiledScript[];
  assets: import('./project').ProjectExportAsset[];
  /** Logical viewport height used for published scale-to-fit (default 960). */
  designViewportHeight?: number;
}
