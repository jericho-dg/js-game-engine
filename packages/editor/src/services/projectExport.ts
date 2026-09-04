import JSZip from 'jszip';
import {
  PROJECT_VERSION,
  type AssetRecord,
  type ProjectData,
  type ProjectExportManifest,
} from '@js-game-engine/shared';
import { Scene, deserializeScene, serializeScene, AudioSystem } from '@js-game-engine/engine';
import { db } from './db';
import { hydrateSceneAssets, projectService } from './ProjectService';
import { cloudSyncService } from './cloudSyncService';
import { useAssetStore } from '../stores/assetStore';
import { useConsoleStore } from '../stores/consoleStore';
import { useHistoryStore } from '../stores/historyStore';
import { usePrefabStore } from '../stores/prefabStore';
import { useSceneAssetStore } from '../stores/sceneAssetStore';
import { useSceneStore } from '../stores/sceneStore';
import { useScriptStore } from '../stores/scriptStore';

export const EXPORT_FORMAT_VERSION = '1';
export const EXPORT_FILE_EXTENSION = '.jge.zip';

export function extensionForMime(mimeType: string): string {
  if (mimeType === 'image/png') return '.png';
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') return '.jpg';
  if (mimeType === 'image/webp') return '.webp';
  if (mimeType === 'image/gif') return '.gif';
  if (mimeType === 'audio/mpeg') return '.mp3';
  if (mimeType === 'audio/wav' || mimeType === 'audio/x-wav') return '.wav';
  if (mimeType === 'audio/ogg') return '.ogg';
  return '.bin';
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function exportProjectZip(
  scene: Scene,
  projectId: string,
  projectName: string,
): Promise<void> {
  const scripts = useScriptStore.getState().scripts;
  const prefabs = usePrefabStore.getState().prefabs;
  const sceneAssetStore = useSceneAssetStore.getState();
  sceneAssetStore.updateActiveSceneData(serializeScene(scene));

  const project: ProjectData = {
    version: PROJECT_VERSION,
    name: projectName,
    activeSceneId: sceneAssetStore.activeSceneId ?? undefined,
    scenes: sceneAssetStore.scenes,
    scene: serializeScene(scene),
    scripts,
    prefabs,
  };

  const storedAssets = await db.assets.where('projectId').equals(projectId).toArray();
  const assets: ProjectExportManifest['assets'] = storedAssets.map((entry) => ({
    id: entry.id,
    name: entry.name,
    type: entry.type,
    mimeType: entry.mimeType,
    width: entry.width,
    height: entry.height,
    file: `assets/${entry.id}${extensionForMime(entry.mimeType)}`,
  }));

  const manifest: ProjectExportManifest = {
    exportVersion: EXPORT_FORMAT_VERSION,
    project,
    assets,
  };

  const zip = new JSZip();
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  for (const entry of storedAssets) {
    const path = `assets/${entry.id}${extensionForMime(entry.mimeType)}`;
    zip.file(path, entry.blob);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const safeName = projectName.replace(/[^\w.-]+/g, '_') || 'project';
  downloadBlob(blob, `${safeName}${EXPORT_FILE_EXTENSION}`);
}

export async function importProjectZip(file: File, projectId: string): Promise<void> {
  const { projectName } = await importProjectZipIntoProject(file, projectId);
  useConsoleStore.getState().log('log', `Imported ${projectName}`);
}

export async function importProjectZipAsNew(
  file: File,
  name?: string,
): Promise<{ projectId: string; projectName: string }> {
  const projectId = crypto.randomUUID();
  const result = await importProjectZipIntoProject(file, projectId, name);
  return { projectId, projectName: result.projectName };
}

async function importProjectZipIntoProject(
  file: File,
  projectId: string,
  overrideName?: string,
): Promise<{ projectName: string }> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const manifestFile = zip.file('manifest.json');
  if (!manifestFile) {
    throw new Error('Invalid project archive: missing manifest.json');
  }

  const manifest = JSON.parse(await manifestFile.async('string')) as ProjectExportManifest;
  if (manifest.exportVersion !== EXPORT_FORMAT_VERSION) {
    throw new Error(`Unsupported export version: ${manifest.exportVersion}`);
  }

  projectService.cancelAutoSave();

  await db.assets.where('projectId').equals(projectId).delete();
  useAssetStore.getState().clearAll();

  for (const assetMeta of manifest.assets) {
    const assetFile = zip.file(assetMeta.file);
    if (!assetFile) {
      throw new Error(`Missing asset file in archive: ${assetMeta.file}`);
    }

    const blob = await assetFile.async('blob');
    const record: AssetRecord = {
      id: assetMeta.id,
      projectId,
      name: assetMeta.name,
      type: assetMeta.type,
      mimeType: assetMeta.mimeType,
      width: assetMeta.width,
      height: assetMeta.height,
    };

    await db.assets.put({ ...record, blob });

    if (record.type === 'audio') {
      const buffer = await AudioSystem.decodeBlob(blob);
      useAssetStore.getState().registerAudioAsset(record, buffer, blob);
    } else {
      const image = await loadImageFromBlob(blob);
      useAssetStore.getState().registerSpriteAsset(record, image, blob);
    }
  }

  await db.projects.put({
    id: projectId,
    name: overrideName?.trim() || manifest.project.name,
    data: {
      ...manifest.project,
      name: overrideName?.trim() || manifest.project.name,
    },
    updatedAt: Date.now(),
  });

  const projectData = manifest.project;
  const activeRecord =
    projectData.scenes?.find((record) => record.id === projectData.activeSceneId) ??
    (projectData.scene
      ? {
          id: crypto.randomUUID(),
          name: projectData.scene.name || 'Main',
          data: projectData.scene,
        }
      : null);

  if (!activeRecord) {
    throw new Error('Invalid project archive: no scene data.');
  }

  if (projectData.scenes && projectData.activeSceneId) {
    useSceneAssetStore.getState().setScenes(projectData.scenes, projectData.activeSceneId);
  } else {
    useSceneAssetStore.getState().setScenes(
      [{ id: activeRecord.id, name: activeRecord.name, data: activeRecord.data }],
      activeRecord.id,
    );
  }

  const scene = deserializeScene(activeRecord.data);
  hydrateSceneAssets(scene);

  useScriptStore.getState().setScripts(manifest.project.scripts ?? []);
  usePrefabStore.getState().setPrefabs(manifest.project.prefabs ?? []);
  await useScriptStore.getState().compileAllSavedScripts();

  const projectName = overrideName?.trim() || manifest.project.name;

  useSceneStore.setState({
    scene,
    projectId,
    projectName,
    selectedId: null,
    playScene: null,
    editorMode: 'edit',
    isLoaded: true,
    sceneRevision: useSceneStore.getState().sceneRevision + 1,
  });

  useHistoryStore.getState().resetHistory();

  await cloudSyncService.syncProject(projectId, { background: true });

  return { projectName };
}

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
      reject(new Error('Failed to load imported asset image.'));
    };
    image.src = url;
  });
}
