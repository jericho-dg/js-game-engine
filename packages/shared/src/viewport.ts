/** Fixed logical game viewport (editor + published player). */
export const DESIGN_VIEWPORT_WIDTH = 960;
export const DESIGN_VIEWPORT_HEIGHT = 600;

/** Uniform scale so 960×600 fits inside the container (letterbox). */
export function computeLetterboxDisplaySize(
  containerWidth: number,
  containerHeight: number,
): { displayWidth: number; displayHeight: number; scale: number } {
  if (containerWidth <= 0 || containerHeight <= 0) {
    return { displayWidth: 0, displayHeight: 0, scale: 0 };
  }

  const scale = Math.min(
    containerWidth / DESIGN_VIEWPORT_WIDTH,
    containerHeight / DESIGN_VIEWPORT_HEIGHT,
  );

  return {
    scale,
    displayWidth: DESIGN_VIEWPORT_WIDTH * scale,
    displayHeight: DESIGN_VIEWPORT_HEIGHT * scale,
  };
}

/** Map a pointer position on the letterboxed canvas to logical viewport coordinates. */
export function pointerToDesignViewport(
  clientX: number,
  clientY: number,
  canvasRect: DOMRect,
): { x: number; y: number } {
  if (canvasRect.width <= 0 || canvasRect.height <= 0) {
    return { x: 0, y: 0 };
  }

  const x =
    ((clientX - canvasRect.left) / canvasRect.width) * DESIGN_VIEWPORT_WIDTH;
  const y =
    ((clientY - canvasRect.top) / canvasRect.height) * DESIGN_VIEWPORT_HEIGHT;
  return { x, y };
}
