import { useEffect } from 'react';
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from 'react-resizable-panels';
import { Toolbar } from './components/Toolbar';
import { HierarchyPanel } from './panels/HierarchyPanel';
import { SceneViewPanel } from './panels/SceneViewPanel';
import { InspectorPanel } from './panels/InspectorPanel';
import { ProjectPanel } from './panels/ProjectPanel';
import { ScriptEditorPanel } from './panels/ScriptEditorPanel';
import { ConsolePanel } from './panels/ConsolePanel';
import { NewScriptDialog } from './components/NewScriptDialog';
import { Input } from '@js-game-engine/engine';
import { useSceneStore } from './stores/sceneStore';

function ResizeHandle({ direction }: { direction: 'horizontal' | 'vertical' }) {
  return (
    <PanelResizeHandle
      className={
        direction === 'horizontal'
          ? 'w-1 bg-[#3c3c3c] transition-colors hover:bg-[#007acc] data-[resize-handle-active]:bg-[#007acc]'
          : 'h-1 bg-[#3c3c3c] transition-colors hover:bg-[#007acc] data-[resize-handle-active]:bg-[#007acc]'
      }
    />
  );
}

export default function App() {
  const isLoaded = useSceneStore((s) => s.isLoaded);
  const deleteSelected = useSceneStore((s) => s.deleteSelected);
  const editorMode = useSceneStore((s) => s.editorMode);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (editorMode === 'play') {
        Input._setKey(event.key, true);
        return;
      }

      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        deleteSelected();
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (editorMode === 'play') {
        Input._setKey(event.key, false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [deleteSelected, editorMode]);

  if (!isLoaded) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[#858585]">
        Loading project...
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <NewScriptDialog />
      <Toolbar />

      <PanelGroup direction="vertical" className="min-h-0 flex-1">
        <Panel defaultSize={65} minSize={30}>
          <PanelGroup direction="horizontal">
            <Panel defaultSize={18} minSize={12} maxSize={30}>
              <HierarchyPanel />
            </Panel>
            <ResizeHandle direction="horizontal" />

            <Panel defaultSize={57} minSize={30}>
              <SceneViewPanel />
            </Panel>
            <ResizeHandle direction="horizontal" />

            <Panel defaultSize={25} minSize={15} maxSize={40}>
              <InspectorPanel />
            </Panel>
          </PanelGroup>
        </Panel>

        <ResizeHandle direction="vertical" />

        <Panel defaultSize={35} minSize={15}>
          <PanelGroup direction="horizontal">
            <Panel defaultSize={25} minSize={15} maxSize={40}>
              <ProjectPanel />
            </Panel>
            <ResizeHandle direction="horizontal" />

            <Panel defaultSize={50} minSize={25}>
              <ScriptEditorPanel />
            </Panel>
            <ResizeHandle direction="horizontal" />

            <Panel defaultSize={25} minSize={15} maxSize={40}>
              <ConsolePanel />
            </Panel>
          </PanelGroup>
        </Panel>
      </PanelGroup>
    </div>
  );
}
