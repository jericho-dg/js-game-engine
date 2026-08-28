import { useEffect, useState } from 'react';
import {
  Camera2D,
  Rotator,
  SpriteRenderer,
} from '@js-game-engine/engine';
import { Panel } from '../components/Panel';
import { useAssetStore } from '../stores/assetStore';
import { getSelectedObject, useSceneStore } from '../stores/sceneStore';

const RAD_TO_DEG = 180 / Math.PI;
const DEG_TO_RAD = Math.PI / 180;

export function InspectorPanel() {
  const selectedId = useSceneStore((s) => s.selectedId);
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
      </div>
    </Panel>
  );
}

function ComponentSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded border border-[#3c3c3c]">
      <h3 className="border-b border-[#3c3c3c] px-2 py-1 text-xs font-medium text-[#cccccc]">
        {title}
      </h3>
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
