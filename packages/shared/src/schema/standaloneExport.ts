export const STANDALONE_EXPORT_VERSION = '1';

export interface StandaloneCompiledScript {
  id: string;
  name: string;
  compiled: string;
}

export interface StandaloneGameManifest {
  exportVersion: string;
  name: string;
  scene: import('./project').SerializedScene;
  scripts: StandaloneCompiledScript[];
  assets: import('./project').ProjectExportAsset[];
}
