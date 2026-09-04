import { useRef } from 'react';
import { useSceneStore } from '../stores/sceneStore';
import { useScriptStore } from '../stores/scriptStore';
import { useHistoryStore } from '../stores/historyStore';
import { useAppStore } from '../stores/appStore';
import { projectService } from '../services/ProjectService';
import { exportProjectZip, importProjectZip } from '../services/projectExport';
import { exportStandaloneGame } from '../services/standaloneExport';
import { returnToProjectManager } from '../services/projectLoader';
import { useConsoleStore } from '../stores/consoleStore';

export function Toolbar() {
  const importInputRef = useRef<HTMLInputElement>(null);
  const projectName = useSceneStore((s) => s.projectName);
  const editorMode = useSceneStore((s) => s.editorMode);
  const isCompilingScripts = useScriptStore((s) => s.isCompilingScripts);
  const scene = useSceneStore((s) => s.scene);
  const projectId = useSceneStore((s) => s.projectId);
  const enterPlayMode = useSceneStore((s) => s.enterPlayMode);
  const exitPlayMode = useSceneStore((s) => s.exitPlayMode);
  const canUndo = useHistoryStore((s) => s.canUndo);
  const canRedo = useHistoryStore((s) => s.canRedo);
  const undo = useHistoryStore((s) => s.undo);
  const redo = useHistoryStore((s) => s.redo);
  const openNewProjectDialog = useAppStore((s) => s.openNewProjectDialog);
  const openOpenProjectDialog = useAppStore((s) => s.openOpenProjectDialog);

  const save = async () => {
    if (!scene || !projectId) return;
    await projectService.save(scene, projectId, projectName);
  };

  const exportProject = async () => {
    if (!scene || !projectId || editorMode === 'play') return;
    try {
      await exportProjectZip(scene, projectId, projectName);
      useConsoleStore.getState().log('log', `Exported ${projectName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      useConsoleStore.getState().log('error', `Export failed: ${message}`);
    }
  };

  const exportGame = async () => {
    if (!scene || !projectId || editorMode === 'play' || isCompilingScripts) return;
    try {
      await exportStandaloneGame(scene, projectId, projectName);
      useConsoleStore.getState().log('log', `Exported standalone game: ${projectName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      useConsoleStore.getState().log('error', `Export game failed: ${message}`);
    }
  };

  const importProject = async (file: File) => {
    if (!projectId || editorMode === 'play') return;
    const confirmed = window.confirm(
      'Import project from archive? The current project will be replaced.',
    );
    if (!confirmed) return;

    try {
      await importProjectZip(file, projectId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      useConsoleStore.getState().log('error', `Import failed: ${message}`);
    }
  };

  const isEditing = editorMode === 'edit';

  return (
    <header className="flex shrink-0 flex-col border-b border-[#3c3c3c] bg-[#2d2d2d]">
      <div className="flex h-8 items-center gap-1 border-b border-[#3c3c3c] px-2">
        <ToolbarButton
          label="New"
          title="Create a new project"
          disabled={!isEditing}
          onClick={openNewProjectDialog}
        />
        <ToolbarButton
          label="Open"
          title="Open another project"
          disabled={!isEditing}
          onClick={openOpenProjectDialog}
        />
        <ToolbarButton
          label="Projects"
          title="Back to project manager"
          disabled={editorMode === 'play'}
          onClick={() => void returnToProjectManager()}
        />
        <div className="mx-1 h-5 w-px bg-[#3c3c3c]" />
        <ToolbarButton label="Save" title="Save project" onClick={() => void save()} />
        <ToolbarButton
          label="Export"
          title="Export project as .jge.zip"
          disabled={!isEditing}
          onClick={() => void exportProject()}
        />
        <ToolbarButton
          label="Export Game"
          title="Export standalone HTML5 game (.zip)"
          disabled={!isEditing || isCompilingScripts}
          onClick={() => void exportGame()}
        />
        <ToolbarButton
          label="Import"
          title="Import project from .jge.zip"
          disabled={!isEditing}
          onClick={() => importInputRef.current?.click()}
        />
        <input
          ref={importInputRef}
          type="file"
          accept=".zip,application/zip"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) void importProject(file);
          }}
        />
        <span className="ml-auto text-xs text-[#858585]">
          {projectName}
          {editorMode === 'play' ? ' — Playing' : ''}
        </span>
      </div>

      <div className="flex h-9 items-center gap-1 px-2">
        {isEditing ? (
          <ToolbarButton
            label="Play"
            title={isCompilingScripts ? 'Compiling scripts…' : 'Enter play mode'}
            disabled={isCompilingScripts}
            onClick={() => void enterPlayMode()}
          />
        ) : (
          <>
            <ToolbarButton label="Pause" title="Pause (coming soon)" disabled />
            <ToolbarButton
              label="Stop"
              title="Stop play mode"
              onClick={exitPlayMode}
            />
          </>
        )}
        <div className="mx-2 h-5 w-px bg-[#3c3c3c]" />
        <ToolbarButton
          label="Undo"
          title="Undo (Ctrl+Z)"
          disabled={!isEditing || !canUndo}
          onClick={undo}
        />
        <ToolbarButton
          label="Redo"
          title="Redo (Ctrl+Shift+Z)"
          disabled={!isEditing || !canRedo}
          onClick={redo}
        />
      </div>
    </header>
  );
}

function ToolbarButton({
  label,
  title,
  disabled,
  onClick,
}: {
  label: string;
  title: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className="rounded px-2.5 py-1 text-xs text-[#cccccc] transition-colors hover:bg-[#3c3c3c] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
    >
      {label}
    </button>
  );
}
