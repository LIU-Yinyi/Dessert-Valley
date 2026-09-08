export type ImageView = { scale: number; x: number; y: number };
export const INITIAL_IMAGE_VIEW: ImageView = { scale: 1, x: 0, y: 0 };

export function zoomImageAt(view: ImageView, point: { x: number; y: number }, factor: number): ImageView {
  if (!Number.isFinite(factor) || factor <= 0) return view;
  const scale = Math.max(0.5, Math.min(8, view.scale * factor));
  if (scale === view.scale) return view;
  const ratio = scale / view.scale;
  return {
    scale,
    x: point.x - (point.x - view.x) * ratio,
    y: point.y - (point.y - view.y) * ratio,
  };
}

export function panImageBy(view: ImageView, x: number, y: number): ImageView {
  return { ...view, x: view.x + x, y: view.y + y };
}

export function wheelZoomFactor(delta: number, mode: number, viewportHeight: number) {
  const pixels = delta * (mode === 1 ? 16 : mode === 2 ? viewportHeight : 1);
  return Math.exp(-Math.max(-600, Math.min(600, pixels)) * 0.002);
}
