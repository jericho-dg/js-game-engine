import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { projectService } from './services/ProjectService';
import { initScriptCompiler, resetBuildQueue } from './scripting/ScriptCompiler';
import { isCompileTimeoutError, withCompileTimeout } from './scripting/compileTimeout';
import { useConsoleStore } from './stores/consoleStore';
import { useSceneStore } from './stores/sceneStore';
import { useScriptStore } from './stores/scriptStore';

async function bootstrap() {
  const root = createRoot(document.getElementById('root')!);
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );

  const { projectId, projectName, scene, scripts } =
    await projectService.loadOrCreateDefault();
  useScriptStore.getState().setScripts(scripts);
  useSceneStore.getState().initProject(projectId, projectName, scene);

  if (scripts.length > 0) {
    useScriptStore.getState().openScript(scripts[0].id);
  }

  void (async () => {
    try {
      await withCompileTimeout(
        () => initScriptCompiler(),
        'Script compiler failed to initialize within 15 seconds.',
      );
      await useScriptStore.getState().compileAllSavedScripts();
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

void bootstrap();
