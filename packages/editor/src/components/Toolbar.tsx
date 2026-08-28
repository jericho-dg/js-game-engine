import { useSceneStore } from '../stores/sceneStore';
import { useScriptStore } from '../stores/scriptStore';
import { projectService } from '../services/ProjectService';

export function Toolbar() {
  const projectName = useSceneStore((s) => s.projectName);
  const editorMode = useSceneStore((s) => s.editorMode);
  const isCompilingScripts = useScriptStore((s) => s.isCompilingScripts);
  const scene = useSceneStore((s) => s.scene);
  const projectId = useSceneStore((s) => s.projectId);
  const enterPlayMode = useSceneStore((s) => s.enterPlayMode);
  const exitPlayMode = useSceneStore((s) => s.exitPlayMode);
  const resetProject = useSceneStore((s) => s.resetProject);

  const save = async () => {
    if (!scene || !projectId) return;
    await projectService.save(scene, projectId, projectName);
  };

  const reset = async () => {
    if (editorMode === 'play') return;
    const confirmed = window.confirm(
      'Reset project to the default demo? All scenes, scripts, and imported assets will be replaced.',
    );
    if (!confirmed) return;
    await resetProject();
  };

  return (
    <header className="flex h-10 shrink-0 items-center gap-1 border-b border-[#3c3c3c] bg-[#2d2d2d] px-2">
      {editorMode === 'edit' ? (
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
      <ToolbarButton label="Save" title="Save project" onClick={() => void save()} />
      <ToolbarButton
        label="Reset"
        title="Reset project to default demo"
        disabled={editorMode === 'play'}
        onClick={() => void reset()}
      />
      <ToolbarButton label="Export" title="Export project (coming soon)" disabled />
      <span className="ml-auto text-xs text-[#858585]">
        {projectName}
        {editorMode === 'play' ? ' — Playing' : ''}
      </span>
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
