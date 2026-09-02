import { useEffect, useRef } from 'react';
import {
  Runtime,
  TilemapRenderer,
  getSceneCamera,
  screenToWorld,
} from '@js-game-engine/engine';
import { Vector2 } from '@js-game-engine/shared';
import { Panel } from '../components/Panel';
import { drawSelectionGizmo, drawColliderGizmos } from '../gizmos/gizmoRenderer';
import { hitTestScene } from '../gizmos/hitTest';
import { getSelectedObject, findObjectById, useSceneStore } from '../stores/sceneStore';

export function SceneViewPanel() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const getActiveScene = useSceneStore((s) => s.getActiveScene);
  const sceneRevision = useSceneStore((s) => s.sceneRevision);
  const editorMode = useSceneStore((s) => s.editorMode);
  const selectedId = useSceneStore((s) => s.selectedId);
  const selectObject = useSceneStore((s) => s.selectObject);
  const markSceneChanged = useSceneStore((s) => s.markSceneChanged);
  const beginSceneChange = useSceneStore((s) => s.beginSceneChange);
  const paintTileAtWorld = useSceneStore((s) => s.paintTileAtWorld);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const scene = getActiveScene();
    if (!canvas || !container || !scene) return;

    const runtime = new Runtime({ scene, canvas, showGrid: true });
    const dragState = {
      active: false,
      objectId: null as string | null,
      offset: Vector2.zero(),
    };
    const paintState = {
      active: false,
      objectId: null as string | null,
      erase: false,
    };

    const resize = () => {
      const { width, height } = container.getBoundingClientRect();
      runtime.resize(width, height);
    };

    const renderEditFrame = () => {
      runtime.renderOnce();
      const activeScene = getActiveScene();
      if (!activeScene) return;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const { width, height } = container.getBoundingClientRect();
        drawColliderGizmos(
          ctx,
          activeScene,
          getSceneCamera(activeScene),
          width,
          height,
        );
      }
      const selected = getSelectedObject();
      if (selected && editorMode === 'edit') {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const { width, height } = container.getBoundingClientRect();
          drawSelectionGizmo(
            ctx,
            selected,
            getSceneCamera(activeScene),
            width,
            height,
          );
        }
      }
    };

    resize();

    if (editorMode === 'play') {
      runtime.start();
    } else {
      renderEditFrame();
    }

    const observer = new ResizeObserver(() => {
      resize();
      if (editorMode === 'edit') renderEditFrame();
    });
    observer.observe(container);

    const getWorldPoint = (clientX: number, clientY: number) => {
      const activeScene = getActiveScene();
      const rect = container.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      if (!activeScene) return Vector2.zero();
      return screenToWorld(
        x,
        y,
        rect.width,
        rect.height,
        getSceneCamera(activeScene),
      );
    };

    const tryPaintSelectedTilemap = (world: Vector2, erase: boolean): boolean => {
      const selected = getSelectedObject();
      const tilemap = selected?.getComponent(TilemapRenderer);
      if (!selected || !tilemap) return false;

      paintTileAtWorld(selected.id, world.x, world.y, erase);
      renderEditFrame();
      return true;
    };

    const onPointerDown = (event: PointerEvent) => {
      if (editorMode !== 'edit') return;
      const activeScene = getActiveScene();
      if (!activeScene) return;
      const world = getWorldPoint(event.clientX, event.clientY);
      const erase = event.button === 2;

      const selected = getSelectedObject();
      if (selected?.getComponent(TilemapRenderer)) {
        beginSceneChange();
        if (tryPaintSelectedTilemap(world, erase)) {
          paintState.active = true;
          paintState.objectId = selected.id;
          paintState.erase = erase;
          container.setPointerCapture(event.pointerId);
          return;
        }
      }

      const hit = hitTestScene(activeScene, world);
      if (hit) {
        selectObject(hit.id);
        beginSceneChange();
        dragState.active = true;
        dragState.objectId = hit.id;
        const pos = hit.transform.worldPosition;
        dragState.offset = new Vector2(world.x - pos.x, world.y - pos.y);
        container.setPointerCapture(event.pointerId);
      } else {
        selectObject(null);
        renderEditFrame();
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      if (editorMode !== 'edit') return;

      if (paintState.active && paintState.objectId) {
        const world = getWorldPoint(event.clientX, event.clientY);
        tryPaintSelectedTilemap(world, paintState.erase);
        return;
      }

      if (!dragState.active || !dragState.objectId) return;
      const activeScene = getActiveScene();
      if (!activeScene) return;
      const obj = findObjectById(activeScene, dragState.objectId);
      if (!obj) return;

      const world = getWorldPoint(event.clientX, event.clientY);
      obj.transform.position = new Vector2(
        world.x - dragState.offset.x,
        world.y - dragState.offset.y,
      );
      renderEditFrame();
    };

    const onPointerUp = (event: PointerEvent) => {
      if (paintState.active) {
        paintState.active = false;
        paintState.objectId = null;
        markSceneChanged();
        container.releasePointerCapture(event.pointerId);
        return;
      }

      if (dragState.active) {
        dragState.active = false;
        dragState.objectId = null;
        markSceneChanged();
        container.releasePointerCapture(event.pointerId);
      }
    };

    const onContextMenu = (event: Event) => {
      if (editorMode === 'edit' && getSelectedObject()?.getComponent(TilemapRenderer)) {
        event.preventDefault();
      }
    };

    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerup', onPointerUp);
    container.addEventListener('pointerleave', onPointerUp);
    container.addEventListener('contextmenu', onContextMenu);

    return () => {
      observer.disconnect();
      runtime.stop();
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('pointerleave', onPointerUp);
      container.removeEventListener('contextmenu', onContextMenu);
    };
  }, [
    getActiveScene,
    sceneRevision,
    editorMode,
    selectedId,
    selectObject,
    markSceneChanged,
    beginSceneChange,
    paintTileAtWorld,
  ]);

  return (
    <Panel title="Scene">
      <div
        ref={containerRef}
        className="relative h-full w-full cursor-crosshair bg-[#1a1a2e]"
      >
        <canvas ref={canvasRef} className="absolute inset-0 block" />
      </div>
    </Panel>
  );
}
