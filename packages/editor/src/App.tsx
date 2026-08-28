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
  return (
    <div className="flex h-full flex-col">
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
