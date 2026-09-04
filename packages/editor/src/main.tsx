import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { ensureScriptCompilerInitialized } from './services/projectLoader';

async function bootstrap() {
  const root = createRoot(document.getElementById('root')!);
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );

  ensureScriptCompilerInitialized();
}

void bootstrap();
