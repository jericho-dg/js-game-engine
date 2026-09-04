import { Debug, Input } from '@js-game-engine/engine';
import { initScriptCompiler, resetBuildQueue } from '../scripting/ScriptCompiler';
import { isCompileTimeoutError, withCompileTimeout } from '../scripting/compileTimeout';
import { detachScriptsFromScene } from '../scripting/ScriptRuntime';
import { projectService, type ProjectTemplate } from './ProjectService';
import { importProjectZipAsNew } from './projectExport';
import { useAppStore } from '../stores/appStore';
import { useAssetStore } from '../stores/assetStore';
import { useConsoleStore } from '../stores/consoleStore';
import { useHistoryStore } from '../stores/historyStore';
import { usePrefabStore } from '../stores/prefabStore';
import { useSceneStore } from '../stores/sceneStore';
import { useScriptStore } from '../stores/scriptStore';

let compilerInitStarted = false;

export function ensureScriptCompilerInitialized(): void {
  if (compilerInitStarted) return;
  compilerInitStarted = true;

  void (async () => {
    try {
      await withCompileTimeout(
        () => initScriptCompiler(),
        'Script compiler failed to initialize within 15 seconds.',
      );
    } catch (error) {
      if (isCompileTimeoutError(error)) {
        resetBuildQueue();
      }
      const message = error instanceof Error ? error.message : String(error);
      useConsoleStore.getState().log(
        'error',
        `Script compiler failed to initialize: ${message}`,
      );
    }
  })();
}

async function saveCurrentProjectIfOpen(): Promise<void> {
  const { isLoaded, scene, projectId, projectName, editorMode } = useSceneStore.getState();
  if (!isLoaded || !scene || !projectId || editorMode === 'play') return;
  projectService.cancelAutoSave();
  await projectService.save(scene, projectId, projectName);
}

export function unloadCurrentProject(): void {
  const { playScene, editorMode } = useSceneStore.getState();
  if (editorMode === 'play' && playScene) {
    detachScriptsFromScene(playScene);
    Debug.setLogCallback(null);
    Input._clear();
  }

  projectService.cancelAutoSave();
  useAssetStore.getState().clearAll();
  useScriptStore.getState().setScripts([]);
  usePrefabStore.getState().setPrefabs([]);
  useSceneStore.setState({
    scene: null,
    playScene: null,
    projectId: null,
    projectName: 'Untitled Project',
    selectedId: null,
    editorMode: 'edit',
    isLoaded: false,
  });
}

export async function loadProjectIntoEditor(projectId: string): Promise<void> {
  await saveCurrentProjectIfOpen();
  unloadCurrentProject();

  const loaded = await projectService.loadProject(projectId);
  useScriptStore.getState().setScripts(loaded.scripts);
  usePrefabStore.getState().setPrefabs(loaded.prefabs);
  useSceneStore.getState().initProject(loaded.projectId, loaded.projectName, loaded.scene);
  useHistoryStore.getState().resetHistory();

  if (loaded.scripts.length > 0) {
    useScriptStore.getState().openScript(loaded.scripts[0].id);
  } else {
    useScriptStore.setState({ activeScriptId: null });
  }

  ensureScriptCompilerInitialized();
  await useScriptStore.getState().compileAllSavedScripts();
  useAppStore.getState().enterEditor();
}

export async function createAndOpenProject(
  template: ProjectTemplate,
  name?: string,
): Promise<void> {
  await saveCurrentProjectIfOpen();
  unloadCurrentProject();

  const loaded = await projectService.createProject(template, name);
  useScriptStore.getState().setScripts(loaded.scripts);
  usePrefabStore.getState().setPrefabs(loaded.prefabs);
  useSceneStore.getState().initProject(loaded.projectId, loaded.projectName, loaded.scene);
  useHistoryStore.getState().resetHistory();

  if (loaded.scripts.length > 0) {
    useScriptStore.getState().openScript(loaded.scripts[0].id);
  } else {
    useScriptStore.setState({ activeScriptId: null });
  }

  ensureScriptCompilerInitialized();
  await useScriptStore.getState().compileAllSavedScripts();
  useAppStore.getState().enterEditor();
}

export async function importAndOpenProject(file: File, name?: string): Promise<void> {
  await saveCurrentProjectIfOpen();
  unloadCurrentProject();

  const { projectId } = await importProjectZipAsNew(file, name);
  await loadProjectIntoEditor(projectId);
}

export async function returnToProjectManager(): Promise<void> {
  const { editorMode, exitPlayMode } = useSceneStore.getState();
  if (editorMode === 'play') {
    exitPlayMode();
  }

  await saveCurrentProjectIfOpen();
  unloadCurrentProject();
  useAppStore.getState().showProjectManager();
}

export async function deleteProjectById(projectId: string): Promise<void> {
  const { projectId: openProjectId } = useSceneStore.getState();
  if (openProjectId === projectId) {
    unloadCurrentProject();
  }
  await projectService.deleteProject(projectId);
}
