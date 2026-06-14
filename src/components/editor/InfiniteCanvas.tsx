"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  clampCanvasZoom,
  wheelDeltaToZoomFactor,
  zoomCanvasAtPoint,
} from "@/lib/canvas-geometry";
import { CanvasLayerProvider, LegoDragProvider } from "@/lib/canvas-layer";
import { useAppMapStore } from "@/store/appmap-store";
import { CanvasOverlayLayer } from "./CanvasOverlays";
import { ActionCardLayer } from "./ActionCardNode";
import { ConnectionLines } from "./ConnectionLines";
import { ChildDragPreview, SectionDragPreview } from "./LegoDragUi";
import { ViewFrame } from "./ViewFrame";

export function InfiniteCanvas() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const { canvas, setCanvas, views, clearSelection } = useAppMapStore();
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, canvasX: 0, canvasY: 0 });

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      // Pinch-to-zoom sends ctrlKey; Shift+scroll is a mouse-friendly alternative.
      // Avoid metaKey so Cmd+scroll can stay browser zoom outside the canvas.
      const isZoomGesture = e.ctrlKey || e.shiftKey;

      if (isZoomGesture) {
        e.preventDefault();
        e.stopPropagation();

        const current = useAppMapStore.getState().canvas;
        const rect = el.getBoundingClientRect();
        const anchorX = e.clientX - rect.left;
        const anchorY = e.clientY - rect.top;
        const wheelDelta = e.deltaY !== 0 ? e.deltaY : e.deltaX;
        const nextZoom = clampCanvasZoom(
          current.zoom * wheelDeltaToZoomFactor(wheelDelta, e.deltaMode)
        );

        if (nextZoom !== current.zoom) {
          useAppMapStore
            .getState()
            .setCanvas(zoomCanvasAtPoint(current, nextZoom, anchorX, anchorY));
        }
        return;
      }

      e.preventDefault();
      const current = useAppMapStore.getState().canvas;
      useAppMapStore.getState().setCanvas({
        x: current.x - e.deltaX,
        y: current.y - e.deltaY,
      });
    };

    el.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => el.removeEventListener("wheel", onWheel, { capture: true });
  }, []);

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

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest("[data-canvas-item]") ||
        target.closest("[data-lego-handle]") ||
        target.closest("[data-drop-zone]")
      ) {
        return;
      }

      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        e.preventDefault();
        startPan(e.clientX, e.clientY);
        return;
      }

      if (e.button === 0 && e.target === canvasRef.current) {
        clearSelection();
      }
    },
    [clearSelection, startPan]
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

  const handlePointerUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  return (
    <div
      ref={canvasRef}
      data-canvas-viewport
      className="relative h-full w-full overflow-hidden bg-zinc-950 overscroll-none"
      style={{
        cursor: isPanning ? "grabbing" : "default",
        touchAction: "none",
        backgroundImage:
          "radial-gradient(circle, rgb(161 161 170 / 0.35) 1px, transparent 1px)",
        backgroundSize: `${24 * canvas.zoom}px ${24 * canvas.zoom}px`,
        backgroundPosition: `${canvas.x}px ${canvas.y}px`,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <LegoDragProvider>
        <CanvasLayerProvider layerRef={layerRef} zoom={canvas.zoom}>
          <div
            ref={layerRef}
            className="absolute origin-top-left"
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
        Scroll to pan · Pinch or Shift+scroll to zoom · Alt + drag to pan · ↑↓
        to reorder
      </div>
    </div>
  );
}
