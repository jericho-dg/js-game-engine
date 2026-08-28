interface PanelProps {
  title: string;
  children?: React.ReactNode;
}

export function Panel({ title, children }: PanelProps) {
  return (
    <div className="flex h-full flex-col bg-[#252526]">
      <div className="shrink-0 border-b border-[#3c3c3c] px-3 py-1.5 text-xs font-medium tracking-wide text-[#cccccc] uppercase">
        {title}
      </div>
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </div>
  );
}
