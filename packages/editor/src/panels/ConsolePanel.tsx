import { useEffect, useRef } from 'react';
import { Panel } from '../components/Panel';
import { useConsoleStore } from '../stores/consoleStore';

const levelColors = {
  log: 'text-[#cccccc]',
  warn: 'text-[#ffb74d]',
  error: 'text-[#ef5350]',
};

export function ConsolePanel() {
  const entries = useConsoleStore((s) => s.entries);
  const clear = useConsoleStore((s) => s.clear);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries.length]);

  return (
    <Panel title="Console">
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 justify-end border-b border-[#3c3c3c] p-1">
          <button
            type="button"
            onClick={clear}
            className="rounded px-2 py-0.5 text-xs text-[#cccccc] hover:bg-[#3c3c3c]"
          >
            Clear
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-2 font-mono text-xs">
          {entries.length === 0 ? (
            <p className="text-[#858585]">Ready.</p>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className={`mb-1 ${levelColors[entry.level]}`}>
                [{entry.level.toUpperCase()}] {entry.message}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </div>
    </Panel>
  );
}
