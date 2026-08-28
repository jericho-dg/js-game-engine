import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { projectService } from './services/ProjectService';
import { useSceneStore } from './stores/sceneStore';

async function bootstrap() {
  const root = createRoot(document.getElementById('root')!);
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );

  const { projectId, projectName, scene } = await projectService.loadOrCreateDefault();
  useSceneStore.getState().initProject(projectId, projectName, scene);
}

void bootstrap();
