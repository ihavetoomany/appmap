"use client";

import { useCallback, useRef, useState } from "react";
import { CanvasLayerProvider, LegoDragProvider } from "@/lib/canvas-layer";
import { useAppMapStore } from "@/store/appmap-store";
import { CanvasOverlayLayer } from "./CanvasOverlays";
import { ActionCardLayer } from "./ActionCardNode";
import { ConnectionLines } from "./ConnectionLines";
import { ChildDragPreview, SectionDragPreview } from "./LegoDragUi";
import { ViewFrame } from "./ViewFrame";
import { useCanvasWheel } from "./useCanvasWheel";

export function InfiniteCanvas() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const { canvas, setCanvas, views, clearSelection } = useAppMapStore();
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, canvasX: 0, canvasY: 0 });

  useCanvasWheel(canvasRef);

  const startPan = useCallback(
    (clientX: number, clientY: number) => {
      setIsPanning(true);
      panStart.current = {
        x: clientX,
        y: clientY,
        canvasX: canvas.x,
        canvasY: canvas.y,
      };
    },
    [canvas]
  );

  const handleEmptyPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0 || e.altKey) return;

      e.preventDefault();
      e.stopPropagation();
      clearSelection();
      startPan(e.clientX, e.clientY);
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [clearSelection, startPan]
  );

  const handleCanvasPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 1 && !(e.button === 0 && e.altKey)) return;

      e.preventDefault();
      startPan(e.clientX, e.clientY);
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [startPan]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isPanning) return;
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      setCanvas({
        x: panStart.current.canvasX + dx,
        y: panStart.current.canvasY + dy,
      });
    },
    [isPanning, setCanvas]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (isPanning) {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      }
      setIsPanning(false);
    },
    [isPanning]
  );

  return (
    <div
      ref={canvasRef}
      data-canvas-viewport
      className="relative h-full w-full overflow-hidden bg-zinc-950 overscroll-none"
      style={{
        touchAction: "none",
        backgroundImage:
          "radial-gradient(circle, rgb(161 161 170 / 0.35) 1px, transparent 1px)",
        backgroundSize: `${24 * canvas.zoom}px ${24 * canvas.zoom}px`,
        backgroundPosition: `${canvas.x}px ${canvas.y}px`,
      }}
      onPointerDown={handleCanvasPointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <div
        aria-hidden
        className={`absolute inset-0 z-0 ${isPanning ? "cursor-grabbing" : "cursor-grab"}`}
        onPointerDown={handleEmptyPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
      <LegoDragProvider>
        <CanvasLayerProvider layerRef={layerRef} zoom={canvas.zoom}>
          <div
            ref={layerRef}
            className="absolute z-10 origin-top-left"
            style={{
              transform: `translate(${canvas.x}px, ${canvas.y}px) scale(${canvas.zoom})`,
            }}
          >
            {views.length === 0 ? (
              <div className="pointer-events-none absolute left-[120px] top-[120px] flex w-[320px] items-center justify-center rounded-xl border-2 border-dashed border-zinc-700 py-16 text-sm text-zinc-600">
                Add a View to start mapping your app
              </div>
            ) : null}
            <CanvasOverlayLayer zoom={canvas.zoom} />
            <ConnectionLines />
            {views.map((view) => (
              <ViewFrame key={view.id} view={view} zoom={canvas.zoom} />
            ))}
            <ActionCardLayer zoom={canvas.zoom} />
          </div>
        </CanvasLayerProvider>
        <SectionDragPreview />
        <ChildDragPreview />
      </LegoDragProvider>

      <div className="pointer-events-none absolute bottom-4 left-4 rounded-lg bg-zinc-900/80 px-3 py-1.5 text-xs text-zinc-500 shadow-sm backdrop-blur">
        Drag empty canvas to pan · Scroll to pan · Pinch or Shift+scroll to zoom · ↑↓
        to reorder
      </div>
    </div>
  );
}
