import { useEffect, useRef } from 'react';
import {
  Runtime,
  TilemapRenderer,
  getSceneCamera,
  screenToWorld,
} from '@js-game-engine/engine';
import {
  DESIGN_VIEWPORT_HEIGHT,
  DESIGN_VIEWPORT_WIDTH,
  Vector2,
  computeLetterboxDisplaySize,
  pointerToDesignViewport,
} from '@js-game-engine/shared';
import { Panel } from '../components/Panel';
import { drawSelectionGizmo, drawColliderGizmos } from '../gizmos/gizmoRenderer';
import { hitTestScene } from '../gizmos/hitTest';
import { getSelectedObject, findObjectById, useSceneStore } from '../stores/sceneStore';

export function SceneViewPanel() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
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
    const stage = stageRef.current;
    const scene = getActiveScene();
    if (!canvas || !container || !stage || !scene) return;

    const runtime = new Runtime({ scene, canvas, showGrid: editorMode === 'edit' });
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

    const applyViewport = () => {
      const { width, height } = container.getBoundingClientRect();
      const { displayWidth, displayHeight } = computeLetterboxDisplaySize(width, height);
      if (displayWidth <= 0 || displayHeight <= 0) return;

      runtime.resize(DESIGN_VIEWPORT_WIDTH, DESIGN_VIEWPORT_HEIGHT);
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;
      stage.style.width = `${displayWidth}px`;
      stage.style.height = `${displayHeight}px`;
    };

    const renderEditFrame = () => {
      runtime.renderOnce();
      const activeScene = getActiveScene();
      if (!activeScene) return;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        drawColliderGizmos(
          ctx,
          activeScene,
          getSceneCamera(activeScene),
          DESIGN_VIEWPORT_WIDTH,
          DESIGN_VIEWPORT_HEIGHT,
        );
      }
      const selected = getSelectedObject();
      if (selected && editorMode === 'edit') {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          drawSelectionGizmo(
            ctx,
            selected,
            getSceneCamera(activeScene),
            DESIGN_VIEWPORT_WIDTH,
            DESIGN_VIEWPORT_HEIGHT,
          );
        }
      }
    };

    applyViewport();

    if (editorMode === 'play') {
      runtime.start();
    } else {
      renderEditFrame();
    }

    const observer = new ResizeObserver(() => {
      applyViewport();
      if (editorMode === 'edit') renderEditFrame();
    });
    observer.observe(container);

    const getWorldPoint = (clientX: number, clientY: number) => {
      const activeScene = getActiveScene();
      if (!activeScene) return Vector2.zero();
      const rect = canvas.getBoundingClientRect();
      const { x, y } = pointerToDesignViewport(clientX, clientY, rect);
      return screenToWorld(
        x,
        y,
        DESIGN_VIEWPORT_WIDTH,
        DESIGN_VIEWPORT_HEIGHT,
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
          stage.setPointerCapture(event.pointerId);
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
        stage.setPointerCapture(event.pointerId);
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
        stage.releasePointerCapture(event.pointerId);
        return;
      }

      if (dragState.active) {
        dragState.active = false;
        dragState.objectId = null;
        markSceneChanged();
        stage.releasePointerCapture(event.pointerId);
      }
    };

    const onContextMenu = (event: Event) => {
      if (editorMode === 'edit' && getSelectedObject()?.getComponent(TilemapRenderer)) {
        event.preventDefault();
      }
    };

    stage.addEventListener('pointerdown', onPointerDown);
    stage.addEventListener('pointermove', onPointerMove);
    stage.addEventListener('pointerup', onPointerUp);
    stage.addEventListener('pointerleave', onPointerUp);
    stage.addEventListener('contextmenu', onContextMenu);

    return () => {
      observer.disconnect();
      runtime.stop();
      stage.removeEventListener('pointerdown', onPointerDown);
      stage.removeEventListener('pointermove', onPointerMove);
      stage.removeEventListener('pointerup', onPointerUp);
      stage.removeEventListener('pointerleave', onPointerUp);
      stage.removeEventListener('contextmenu', onContextMenu);
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
        className="flex h-full w-full items-center justify-center bg-[#1a1a2e]"
      >
        <div ref={stageRef} className="relative shrink-0">
          <canvas ref={canvasRef} className="block" />
        </div>
      </div>
    </Panel>
  );
}
