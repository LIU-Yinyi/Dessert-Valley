"use client";

import { useEffect, useId, useRef, useState } from "react";
import { INITIAL_IMAGE_VIEW, panImageBy, wheelZoomFactor, zoomImageAt } from "./image-view";

export default function GalleryImageViewer({ src, alt, width, height, language }: {
  src: string;
  alt: string;
  width: number;
  height: number;
  language: "en" | "zh";
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: number; x: number; y: number } | null>(null);
  const [view, setView] = useState(INITIAL_IMAGE_VIEW);
  const [dragging, setDragging] = useState(false);
  const helpId = useId();
  const help = language === "zh"
    ? "滚轮以光标位置缩放，按住鼠标左键拖动，双击恢复视图。键盘：加减号缩放，方向键移动，0 或 Home 重置。"
    : "Scroll to zoom at the cursor, left-drag to move, and double-click to reset. Keyboard: plus/minus to zoom, arrows to move, 0 or Home to reset.";

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.deltaY) return;
      // A non-passive listener keeps image zoom from scrolling the gallery or page.
      event.preventDefault();
      const rect = viewport.getBoundingClientRect();
      const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const factor = wheelZoomFactor(event.deltaY, event.deltaMode, rect.height);
      setView((current) => zoomImageAt(current, point, factor));
    };
    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, []);

  const endDrag = (pointerId: number) => {
    if (dragRef.current?.id !== pointerId) return;
    dragRef.current = null;
    setDragging(false);
    if (viewportRef.current?.hasPointerCapture(pointerId)) {
      viewportRef.current.releasePointerCapture(pointerId);
    }
  };

  return (
    <div ref={viewportRef} className={`gallery-image-viewport${dragging ? " dragging" : ""}`}
      tabIndex={0} role="group" aria-label={language === "zh" ? "图片查看器" : "Image viewer"}
      aria-describedby={helpId} title={help}
      onPointerDown={(event) => {
        // Touch remains available for swiping between exhibits on narrow screens.
        if (event.pointerType !== "mouse" || event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.focus({ preventScroll: true });
        event.currentTarget.setPointerCapture(event.pointerId);
        dragRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
        setDragging(true);
      }}
      onPointerMove={(event) => {
        const drag = dragRef.current;
        if (!drag || drag.id !== event.pointerId) return;
        if (!(event.buttons & 1)) { endDrag(event.pointerId); return; }
        const x = event.clientX - drag.x;
        const y = event.clientY - drag.y;
        dragRef.current = { ...drag, x: event.clientX, y: event.clientY };
        setView((current) => panImageBy(current, x, y));
      }}
      onPointerUp={(event) => endDrag(event.pointerId)}
      onPointerCancel={(event) => endDrag(event.pointerId)}
      onLostPointerCapture={(event) => endDrag(event.pointerId)}
      onDoubleClick={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        setView(INITIAL_IMAGE_VIEW);
      }}
      onKeyDown={(event) => {
        const key = event.key;
        if (!["+", "=", "-", "0", "Home", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(key)) return;
        event.preventDefault();
        event.stopPropagation();
        if (key === "0" || key === "Home") {
          setView(INITIAL_IMAGE_VIEW);
        } else if (key === "+" || key === "=" || key === "-") {
          const point = { x: event.currentTarget.clientWidth / 2, y: event.currentTarget.clientHeight / 2 };
          setView((current) => zoomImageAt(current, point, key === "-" ? 1 / 1.2 : 1.2));
        } else {
          setView((current) => panImageBy(current,
            key === "ArrowLeft" ? -40 : key === "ArrowRight" ? 40 : 0,
            key === "ArrowUp" ? -40 : key === "ArrowDown" ? 40 : 0));
        }
      }}>
      <img src={src} alt={alt} width={width} height={height} draggable={false}
        style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }} />
      <span className="sr-only" id={helpId}>{help}</span>
    </div>
  );
}
