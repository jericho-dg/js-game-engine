import {
  BoxCollider2D,
  Camera2D,
  Component,
  Rigidbody2D,
  Rotator,
  ScriptComponent,
  SpriteRenderer,
  TilemapRenderer,
  AudioSource,
} from '@js-game-engine/engine';

export interface AddableComponentEntry {
  componentClass: new () => Component;
  label: string;
  /** Only one instance of this type per GameObject. */
  singleton: boolean;
}

export const ADDABLE_COMPONENTS: AddableComponentEntry[] = [
  { componentClass: SpriteRenderer, label: SpriteRenderer.editorDisplayName, singleton: true },
  { componentClass: Camera2D, label: Camera2D.editorDisplayName, singleton: true },
  { componentClass: ScriptComponent, label: ScriptComponent.editorDisplayName, singleton: true },
  { componentClass: BoxCollider2D, label: BoxCollider2D.editorDisplayName, singleton: true },
  { componentClass: Rigidbody2D, label: Rigidbody2D.editorDisplayName, singleton: true },
  { componentClass: TilemapRenderer, label: TilemapRenderer.editorDisplayName, singleton: true },
  { componentClass: AudioSource, label: AudioSource.editorDisplayName, singleton: true },
  { componentClass: Rotator, label: Rotator.editorDisplayName, singleton: true },
];

export function getAddableComponentsForObject(
  obj: import('@js-game-engine/engine').GameObject,
): AddableComponentEntry[] {
  return ADDABLE_COMPONENTS.filter((entry) => {
    if (!entry.singleton) return true;
    return obj.getComponent(entry.componentClass) === null;
  });
}
