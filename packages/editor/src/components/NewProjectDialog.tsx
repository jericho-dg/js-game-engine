import { useEffect, useRef, useState } from 'react';
import type { ProjectTemplate } from '../services/ProjectService';
import { useAppStore } from '../stores/appStore';

interface NewProjectDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (template: ProjectTemplate, name: string) => void | Promise<void>;
}

export function NewProjectDialog({ open, onClose, onCreate }: NewProjectDialogProps) {
  const [template, setTemplate] = useState<ProjectTemplate>('blank');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setTemplate('blank');
    setName('');
    setIsSubmitting(false);
    const timer = window.setTimeout(() => nameInputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  if (!open) return null;

  const defaultName =
    template === 'demo'
      ? 'Jump Demo'
      : template === 'flappy'
        ? 'Flappy Bird'
        : 'Untitled Project';
  const resolvedName = name.trim() || defaultName;

  const submit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onCreate(template, resolvedName);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className="w-full max-w-md rounded-lg border border-[#3c3c3c] bg-[#252526] shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-project-title"
      >
        <div className="border-b border-[#3c3c3c] px-5 py-4">
          <h2 id="new-project-title" className="text-base font-medium text-[#cccccc]">
            New Project
          </h2>
          <p className="mt-1 text-xs text-[#858585]">
            Start from a blank scene, Jump Demo, or Flappy Bird template.
          </p>
        </div>

        <div className="space-y-4 px-5 py-4">
          <label className="block text-xs text-[#858585]">
            Project name
            <input
              ref={nameInputRef}
              type="text"
              value={name}
              placeholder={defaultName}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void submit();
                if (event.key === 'Escape') onClose();
              }}
              className="mt-1 w-full rounded border border-[#3c3c3c] bg-[#1e1e1e] px-3 py-2 text-sm text-[#cccccc] outline-none focus:border-[#007acc]"
            />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <TemplateOption
              title="Blank"
              description="Empty scene with a camera."
              selected={template === 'blank'}
              onSelect={() => setTemplate('blank')}
            />
            <TemplateOption
              title="Jump Demo"
              description="Platformer sample with scripts and audio."
              selected={template === 'demo'}
              onSelect={() => setTemplate('demo')}
            />
            <TemplateOption
              title="Flappy Bird"
              description="Side-scroller with menu, pipes, score, and SFX."
              selected={template === 'flappy'}
              onSelect={() => setTemplate('flappy')}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[#3c3c3c] px-5 py-4">
          <DialogButton label="Cancel" onClick={onClose} disabled={isSubmitting} />
          <DialogButton
            label={isSubmitting ? 'Creating…' : 'Create'}
            primary
            disabled={isSubmitting}
            onClick={() => void submit()}
          />
        </div>
      </div>
    </div>
  );
}

function TemplateOption({
  title,
  description,
  selected,
  onSelect,
}: {
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-lg border px-3 py-3 text-left transition-colors ${
        selected
          ? 'border-[#007acc] bg-[#094771]/40'
          : 'border-[#3c3c3c] bg-[#1e1e1e] hover:border-[#555555]'
      }`}
    >
      <div className="text-sm font-medium text-[#cccccc]">{title}</div>
      <div className="mt-1 text-xs text-[#858585]">{description}</div>
    </button>
  );
}

function DialogButton({
  label,
  onClick,
  primary,
  disabled,
}: {
  label: string;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded px-3 py-1.5 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        primary
          ? 'bg-[#007acc] text-white hover:bg-[#1a8ad4]'
          : 'text-[#cccccc] hover:bg-[#3c3c3c]'
      }`}
    >
      {label}
    </button>
  );
}

export function EditorNewProjectDialog() {
  const open = useAppStore((s) => s.isNewProjectDialogOpen);
  const close = useAppStore((s) => s.closeNewProjectDialog);
  const onCreate = async (template: ProjectTemplate, name: string) => {
    const { createAndOpenProject } = await import('../services/projectLoader');
    await createAndOpenProject(template, name);
  };

  return <NewProjectDialog open={open} onClose={close} onCreate={onCreate} />;
}
