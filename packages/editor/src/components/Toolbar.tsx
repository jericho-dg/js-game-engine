export function Toolbar() {
  return (
    <header className="flex h-10 shrink-0 items-center gap-1 border-b border-[#3c3c3c] bg-[#2d2d2d] px-2">
      <ToolbarButton label="Play" title="Enter play mode (coming soon)" disabled />
      <ToolbarButton label="Pause" title="Pause (coming soon)" disabled />
      <ToolbarButton label="Stop" title="Stop play mode (coming soon)" disabled />
      <div className="mx-2 h-5 w-px bg-[#3c3c3c]" />
      <ToolbarButton label="Save" title="Save project (coming soon)" disabled />
      <ToolbarButton label="Export" title="Export project (coming soon)" disabled />
      <span className="ml-auto text-xs text-[#858585]">Untitled Project</span>
    </header>
  );
}

function ToolbarButton({
  label,
  title,
  disabled,
}: {
  label: string;
  title: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      className="rounded px-2.5 py-1 text-xs text-[#cccccc] transition-colors hover:bg-[#3c3c3c] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
    >
      {label}
    </button>
  );
}
