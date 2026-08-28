import { useSceneStore } from '../stores/sceneStore';
import { projectService } from '../services/ProjectService';

export function Toolbar() {
  const projectName = useSceneStore((s) => s.projectName);
  const editorMode = useSceneStore((s) => s.editorMode);
  const isPlayLoading = useSceneStore((s) => s.isPlayLoading);
  const scene = useSceneStore((s) => s.scene);
  const projectId = useSceneStore((s) => s.projectId);
  const enterPlayMode = useSceneStore((s) => s.enterPlayMode);
  const exitPlayMode = useSceneStore((s) => s.exitPlayMode);

  const save = async () => {
    if (!scene || !projectId) return;
    await projectService.save(scene, projectId, projectName);
  };

  return (
    <header className="flex h-10 shrink-0 items-center gap-1 border-b border-[#3c3c3c] bg-[#2d2d2d] px-2">
      {editorMode === 'edit' ? (
        <ToolbarButton
          label={isPlayLoading ? 'Loading...' : 'Play'}
          title="Enter play mode"
          disabled={isPlayLoading}
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
