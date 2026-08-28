import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { projectService } from './services/ProjectService';
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
}

void bootstrap();
