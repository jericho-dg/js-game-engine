import { useEffect, useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import engineTypes from '../../../shared/src/engine.d.ts?raw';
import { Panel } from '../components/Panel';
import { useScriptStore } from '../stores/scriptStore';
import { useSceneStore } from '../stores/sceneStore';

export function ScriptEditorPanel() {
  const scripts = useScriptStore((s) => s.scripts);
  const activeScriptId = useScriptStore((s) => s.activeScriptId);
  const updateScriptSource = useScriptStore((s) => s.updateScriptSource);
  const openScript = useScriptStore((s) => s.openScript);
  const createScript = useScriptStore((s) => s.createScript);
  const markSceneChanged = useSceneStore((s) => s.markSceneChanged);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeScript = scripts.find((script) => script.id === activeScriptId) ?? null;

  const handleMount: OnMount = (_editor, monaco) => {
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      noEmit: true,
      esModuleInterop: true,
    });
    monaco.languages.typescript.typescriptDefaults.addExtraLib(
      engineTypes,
      'file:///engine.d.ts',
    );
  };

  const scheduleSave = (source: string) => {
    if (!activeScriptId) return;
    updateScriptSource(activeScriptId, source);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      markSceneChanged();
    }, 500);
  };

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  return (
    <Panel title="Script Editor">
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-[#3c3c3c] p-1">
          <button
            type="button"
            onClick={createScript}
            className="shrink-0 rounded px-2 py-0.5 text-xs text-[#cccccc] hover:bg-[#3c3c3c]"
          >
            + New
          </button>
          {scripts.map((script) => (
            <button
              key={script.id}
              type="button"
              onClick={() => openScript(script.id)}
              className={`shrink-0 rounded px-2 py-0.5 text-xs ${
                script.id === activeScriptId
                  ? 'bg-[#094771] text-white'
                  : 'text-[#cccccc] hover:bg-[#3c3c3c]'
              }`}
            >
              {script.name}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1">
          {activeScript ? (
            <Editor
              key={activeScript.id}
              defaultLanguage="typescript"
              theme="vs-dark"
              value={activeScript.source}
              onChange={(value) => scheduleSave(value ?? '')}
              onMount={handleMount}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
              }}
            />
          ) : (
            <p className="p-3 text-sm text-[#858585]">
              Create or open a script to start editing.
            </p>
          )}
        </div>
      </div>
    </Panel>
  );
}
