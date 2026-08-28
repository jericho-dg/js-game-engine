import { useEffect, useState } from 'react';
import {
  Camera2D,
  Rotator,
  ScriptComponent,
  SpriteRenderer,
  BoxCollider2D,
  Rigidbody2D,
} from '@js-game-engine/engine';
import { Panel } from '../components/Panel';
import { useAssetStore } from '../stores/assetStore';
import { useScriptStore } from '../stores/scriptStore';
import { getSelectedObject, useSceneStore } from '../stores/sceneStore';

const RAD_TO_DEG = 180 / Math.PI;
const DEG_TO_RAD = Math.PI / 180;

export function InspectorPanel() {
  const selectedId = useSceneStore((s) => s.selectedId);
  const editorMode = useSceneStore((s) => s.editorMode);
  const addScriptComponent = useSceneStore((s) => s.addScriptComponent);
  const addBoxCollider2D = useSceneStore((s) => s.addBoxCollider2D);
  const addRigidbody2D = useSceneStore((s) => s.addRigidbody2D);
  const removeScriptComponent = useSceneStore((s) => s.removeScriptComponent);
  const removeBoxCollider2D = useSceneStore((s) => s.removeBoxCollider2D);
  const removeRigidbody2D = useSceneStore((s) => s.removeRigidbody2D);
  useSceneStore((s) => s.sceneRevision);
  const selected = selectedId ? getSelectedObject() : null;

  if (!selected) {
    return (
      <Panel title="Inspector">
        <p className="p-3 text-sm text-[#858585]">
          Select an object to inspect its components.
        </p>
      </Panel>
    );
  }

  return (
    <Panel title="Inspector">
      <div className="space-y-3 p-3 text-sm">
        <TextField
          key={`${selected.id}-name`}
          label="Name"
          value={selected.name}
          onChange={(v) => {
            selected.name = v;
          }}
        />

        <ComponentSection title="Transform">
          <NumberField
            key={`${selected.id}-pos-x`}
            label="Position X"
            value={selected.transform.localPosition.x}
            onChange={(v) => {
              selected.transform.localPosition.x = v;
            }}
          />
          <NumberField
            key={`${selected.id}-pos-y`}
            label="Position Y"
            value={selected.transform.localPosition.y}
            onChange={(v) => {
              selected.transform.localPosition.y = v;
            }}
          />
          <NumberField
            key={`${selected.id}-rot`}
            label="Rotation (°)"
            value={selected.transform.localRotation * RAD_TO_DEG}
            onChange={(v) => {
              selected.transform.localRotation = v * DEG_TO_RAD;
            }}
            step={1}
          />
          <NumberField
            key={`${selected.id}-scale-x`}
            label="Scale X"
            value={selected.transform.localScale.x}
            onChange={(v) => {
              selected.transform.localScale.x = v;
            }}
          />
          <NumberField
            key={`${selected.id}-scale-y`}
            label="Scale Y"
            value={selected.transform.localScale.y}
            onChange={(v) => {
              selected.transform.localScale.y = v;
            }}
          />
        </ComponentSection>

        {selected.getComponent(Camera2D) && (
          <ComponentSection title="Camera 2D">
            <ReadonlyField label="Background" value="#1a1a2e" />
            <NumberField
              key={`${selected.id}-zoom`}
              label="Zoom"
              value={selected.getComponent(Camera2D)!.zoom}
              onChange={(v) => {
                selected.getComponent(Camera2D)!.zoom = v;
              }}
              step={0.1}
            />
          </ComponentSection>
        )}

        {selected.getComponent(SpriteRenderer) && (
          <ComponentSection title="Sprite Renderer">
            <SpriteAssetField objectId={selected.id} sprite={selected.getComponent(SpriteRenderer)!} />
            <NumberField
              key={`${selected.id}-width`}
              label="Width"
              value={selected.getComponent(SpriteRenderer)!.width}
              onChange={(v) => {
                selected.getComponent(SpriteRenderer)!.width = v;
              }}
            />
            <NumberField
              key={`${selected.id}-height`}
              label="Height"
              value={selected.getComponent(SpriteRenderer)!.height}
              onChange={(v) => {
                selected.getComponent(SpriteRenderer)!.height = v;
              }}
            />
            <NumberField
              key={`${selected.id}-sorting`}
              label="Sorting Order"
              value={selected.getComponent(SpriteRenderer)!.sortingOrder}
              onChange={(v) => {
                selected.getComponent(SpriteRenderer)!.sortingOrder = Math.round(v);
              }}
            />
          </ComponentSection>
        )}

        {selected.getComponent(Rotator) && (
          <ComponentSection title="Rotator">
            <NumberField
              key={`${selected.id}-speed`}
              label="Speed"
              value={selected.getComponent(Rotator)!.speed}
              onChange={(v) => {
                selected.getComponent(Rotator)!.speed = v;
              }}
              step={0.1}
            />
          </ComponentSection>
        )}

        {selected.getComponent(ScriptComponent) ? (
          <ComponentSection
            title="Script"
            onRemove={editorMode === 'edit' ? () => removeScriptComponent(selected.id) : undefined}
          >
            <ScriptAssetField
              objectId={selected.id}
              script={selected.getComponent(ScriptComponent)!}
            />
          </ComponentSection>
        ) : (
          editorMode === 'edit' && (
            <button
              type="button"
              onClick={() => addScriptComponent(selected.id)}
              className="w-full rounded border border-[#3c3c3c] px-2 py-1 text-xs text-[#cccccc] hover:bg-[#3c3c3c]"
            >
              Add Script Component
            </button>
          )
        )}

        {selected.getComponent(BoxCollider2D) ? (
          <ComponentSection
            title="Box Collider 2D"
            onRemove={editorMode === 'edit' ? () => removeBoxCollider2D(selected.id) : undefined}
          >
            <NumberField
              key={`${selected.id}-col-w`}
              label="Width"
              value={selected.getComponent(BoxCollider2D)!.width}
              onChange={(v) => {
                selected.getComponent(BoxCollider2D)!.width = v;
              }}
            />
            <NumberField
              key={`${selected.id}-col-h`}
              label="Height"
              value={selected.getComponent(BoxCollider2D)!.height}
              onChange={(v) => {
                selected.getComponent(BoxCollider2D)!.height = v;
              }}
            />
            <NumberField
              key={`${selected.id}-col-ox`}
              label="Offset X"
              value={selected.getComponent(BoxCollider2D)!.offset.x}
              onChange={(v) => {
                selected.getComponent(BoxCollider2D)!.offset.x = v;
              }}
            />
            <NumberField
              key={`${selected.id}-col-oy`}
              label="Offset Y"
              value={selected.getComponent(BoxCollider2D)!.offset.y}
              onChange={(v) => {
                selected.getComponent(BoxCollider2D)!.offset.y = v;
              }}
            />
            <BoolField
              label="Is Trigger"
              value={selected.getComponent(BoxCollider2D)!.isTrigger}
              onChange={(v) => {
                selected.getComponent(BoxCollider2D)!.isTrigger = v;
              }}
            />
          </ComponentSection>
        ) : (
          editorMode === 'edit' && (
            <button
              type="button"
              onClick={() => addBoxCollider2D(selected.id)}
              className="w-full rounded border border-[#3c3c3c] px-2 py-1 text-xs text-[#cccccc] hover:bg-[#3c3c3c]"
            >
              Add Box Collider 2D
            </button>
          )
        )}

        {selected.getComponent(Rigidbody2D) ? (
          <ComponentSection
            title="Rigidbody 2D"
            onRemove={editorMode === 'edit' ? () => removeRigidbody2D(selected.id) : undefined}
          >
            <NumberField
              key={`${selected.id}-rb-vx`}
              label="Velocity X"
              value={selected.getComponent(Rigidbody2D)!.velocity.x}
              onChange={(v) => {
                selected.getComponent(Rigidbody2D)!.velocity.x = v;
              }}
            />
            <NumberField
              key={`${selected.id}-rb-vy`}
              label="Velocity Y"
              value={selected.getComponent(Rigidbody2D)!.velocity.y}
              onChange={(v) => {
                selected.getComponent(Rigidbody2D)!.velocity.y = v;
              }}
            />
            <NumberField
              key={`${selected.id}-rb-grav`}
              label="Gravity Scale"
              value={selected.getComponent(Rigidbody2D)!.gravityScale}
              onChange={(v) => {
                selected.getComponent(Rigidbody2D)!.gravityScale = v;
              }}
              step={0.1}
            />
            <BoolField
              label="Is Kinematic"
              value={selected.getComponent(Rigidbody2D)!.isKinematic}
              onChange={(v) => {
                selected.getComponent(Rigidbody2D)!.isKinematic = v;
              }}
            />
          </ComponentSection>
        ) : (
          editorMode === 'edit' && (
            <button
              type="button"
              onClick={() => addRigidbody2D(selected.id)}
              className="w-full rounded border border-[#3c3c3c] px-2 py-1 text-xs text-[#cccccc] hover:bg-[#3c3c3c]"
            >
              Add Rigidbody 2D
            </button>
          )
        )}
      </div>
    </Panel>
  );
}

function ComponentSection({
  title,
  children,
  onRemove,
}: {
  title: string;
  children: React.ReactNode;
  onRemove?: () => void;
}) {
  return (
    <section className="rounded border border-[#3c3c3c]">
      <div className="flex items-center justify-between border-b border-[#3c3c3c] px-2 py-1">
        <h3 className="text-xs font-medium text-[#cccccc]">{title}</h3>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded px-1.5 py-0.5 text-[10px] text-[#858585] hover:bg-[#3c3c3c] hover:text-[#ef5350]"
            title={`Remove ${title}`}
          >
            Remove
          </button>
        )}
      </div>
      <div className="space-y-2 p-2">{children}</div>
    </section>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [text, setText] = useState(value);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(value);
  }, [value]);

  const commit = () => {
    onChange(text);
    useSceneStore.getState().markSceneChanged();
  };

  return (
    <div>
      <label className="mb-1 block text-xs text-[#858585]">{label}</label>
      <input
        type="text"
        value={text}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          commit();
        }}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          }
        }}
        className="w-full rounded border border-[#3c3c3c] bg-[#1e1e1e] px-2 py-1 text-sm text-[#cccccc] outline-none focus:border-[#007acc]"
      />
    </div>
  );
}

function SpriteAssetField({
  objectId,
  sprite,
}: {
  objectId: string;
  sprite: SpriteRenderer;
}) {
  const assets = useAssetStore((s) => s.assets);
  const assignSpriteAsset = useSceneStore((s) => s.assignSpriteAsset);

  return (
    <div className="flex items-center justify-between gap-2">
      <label className="text-xs text-[#858585]">Sprite</label>
      <select
        value={sprite.spriteAssetId ?? ''}
        onChange={(e) => assignSpriteAsset(objectId, e.target.value || null)}
        className="max-w-36 rounded border border-[#3c3c3c] bg-[#1e1e1e] px-2 py-0.5 text-xs text-[#cccccc] outline-none focus:border-[#007acc]"
      >
        <option value="">None (color quad)</option>
        {assets.map((asset) => (
          <option key={asset.id} value={asset.id}>
            {asset.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function ScriptAssetField({
  objectId,
  script,
}: {
  objectId: string;
  script: ScriptComponent;
}) {
  const scripts = useScriptStore((s) => s.scripts);
  const openScript = useScriptStore((s) => s.openScript);
  const assignScriptAsset = useSceneStore((s) => s.assignScriptAsset);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs text-[#858585]">Script</label>
        <select
          value={script.scriptAssetId ?? ''}
          onChange={(e) => assignScriptAsset(objectId, e.target.value || null)}
          className="max-w-36 rounded border border-[#3c3c3c] bg-[#1e1e1e] px-2 py-0.5 text-xs text-[#cccccc] outline-none focus:border-[#007acc]"
        >
          <option value="">None</option>
          {scripts.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.name}
            </option>
          ))}
        </select>
      </div>
      {script.scriptAssetId && (
        <button
          type="button"
          onClick={() => openScript(script.scriptAssetId!)}
          className="w-full rounded border border-[#3c3c3c] px-2 py-1 text-xs text-[#cccccc] hover:bg-[#3c3c3c]"
        >
          Open in Script Editor
        </button>
      )}
    </div>
  );
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-[#858585]">{label}</span>
      <span className="font-mono text-xs text-[#cccccc]">{value}</span>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
}) {
  const [text, setText] = useState(() => formatNumber(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setText(formatNumber(value));
    }
  }, [value]);

  const commit = () => {
    const parsed = Number(text);
    if (text.trim() === '' || Number.isNaN(parsed)) {
      setText(formatNumber(value));
      return;
    }
    onChange(parsed);
    useSceneStore.getState().markSceneChanged();
    setText(formatNumber(parsed));
  };

  return (
    <div className="flex items-center justify-between gap-2">
      <label className="text-xs text-[#858585]">{label}</label>
      <input
        type="number"
        step={step}
        value={text}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          commit();
        }}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          }
        }}
        className="w-24 rounded border border-[#3c3c3c] bg-[#1e1e1e] px-2 py-0.5 text-right font-mono text-xs text-[#cccccc] outline-none focus:border-[#007acc]"
      />
    </div>
  );
}

function formatNumber(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return String(Number(value.toFixed(4)));
}

function BoolField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 text-xs text-[#858585]">
      {label}
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => {
          onChange(e.target.checked);
          useSceneStore.getState().markSceneChanged();
        }}
        className="accent-[#007acc]"
      />
    </label>
  );
}
