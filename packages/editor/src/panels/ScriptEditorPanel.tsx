import { useEffect, useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type { editor as MonacoEditor } from 'monaco-editor';
import engineTypes from '../../../shared/src/engine.d.ts?raw';
import { Panel } from '../components/Panel';
import { useScriptStore } from '../stores/scriptStore';
import { useSceneStore } from '../stores/sceneStore';

export function ScriptEditorPanel() {
  const scripts = useScriptStore((s) => s.scripts);
  const activeScriptId = useScriptStore((s) => s.activeScriptId);
  const drafts = useScriptStore((s) => s.drafts);
  const setDraft = useScriptStore((s) => s.setDraft);
  const getEditorSource = useScriptStore((s) => s.getEditorSource);
  const isDirty = useScriptStore((s) => s.isDirty);
  const scriptErrors = useScriptStore((s) => s.scriptErrors);
  const openScript = useScriptStore((s) => s.openScript);
  const openNewScriptDialog = useScriptStore((s) => s.openNewScriptDialog);
  const saveScript = useScriptStore((s) => s.saveScript);
  const isSavingScript = useScriptStore((s) => s.isSavingScript);
  const markSceneChanged = useSceneStore((s) => s.markSceneChanged);
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);

  const activeScript = scripts.find((script) => script.id === activeScriptId) ?? null;
  const activeSource = activeScriptId ? getEditorSource(activeScriptId) : '';
  const activeDirty = activeScriptId ? isDirty(activeScriptId) : false;
  const activeError = activeScriptId ? scriptErrors[activeScriptId] : null;

  const handleSave = async () => {
    if (!activeScriptId || isSavingScript) return;
    const saved = await saveScript(activeScriptId);
    if (saved) markSceneChanged();
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 's') {
        if (!activeScriptId || isSavingScript) return;
        const target = event.target as HTMLElement;
        if (target.tagName === 'INPUT') return;
        event.preventDefault();
        void (async () => {
          const saved = await saveScript(activeScriptId);
          if (saved) markSceneChanged();
        })();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeScriptId, isSavingScript, saveScript, markSceneChanged]);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

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

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      void handleSave();
    });
  };

  return (
    <Panel title="Script Editor">
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-[#3c3c3c] p-1">
          <button
            type="button"
            onClick={openNewScriptDialog}
            className="shrink-0 rounded px-2 py-0.5 text-xs text-[#cccccc] hover:bg-[#3c3c3c]"
          >
            + New
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!activeScript || isSavingScript}
            className="shrink-0 rounded px-2 py-0.5 text-xs text-[#cccccc] hover:bg-[#3c3c3c] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSavingScript ? 'Saving...' : 'Save'}
          </button>
          {scripts.map((script) => {
            const dirty =
              script.id in drafts
                ? drafts[script.id] !== script.source
                : isDirty(script.id);
            const error = scriptErrors[script.id];
            const isActive = script.id === activeScriptId;

            let tabClass = 'shrink-0 rounded px-2 py-0.5 text-xs hover:bg-[#3c3c3c] ';
            if (isActive) {
              tabClass += dirty ? 'bg-[#094771] text-[#ffca28]' : 'bg-[#094771] text-white';
            } else if (error) {
              tabClass += 'text-[#ef5350]';
            } else if (dirty) {
              tabClass += 'text-[#ffca28]';
            } else {
              tabClass += 'text-[#cccccc]';
            }

            return (
              <button
                key={script.id}
                type="button"
                onClick={() => openScript(script.id)}
                className={tabClass}
                title={error ?? (dirty ? 'Unsaved changes' : undefined)}
              >
                {script.name}
              </button>
            );
          })}
        </div>

        {activeError && (
          <p className="shrink-0 border-b border-[#3c3c3c] px-2 py-1 text-xs text-[#ef5350]">
            {activeError}
          </p>
        )}

        <div className="min-h-0 flex-1">
          {activeScript ? (
            <Editor
              key={activeScript.id}
              defaultLanguage="typescript"
              theme="vs-dark"
              value={activeSource}
              onChange={(value) => {
                if (activeScriptId) setDraft(activeScriptId, value ?? '');
              }}
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
        {activeDirty && (
          <p className="shrink-0 border-t border-[#3c3c3c] px-2 py-1 text-xs text-[#858585]">
            Unsaved changes — press Save or Ctrl/Cmd+S to compile.
          </p>
        )}
      </div>
    </Panel>
  );
}
