"use client";

import { useEffect, type RefObject } from "react";
import {
  clampCanvasZoom,
  wheelDeltaToZoomFactor,
  zoomCanvasAtPoint,
} from "@/lib/canvas-geometry";
import { useAppMapStore } from "@/store/appmap-store";

function isPointInRect(
  x: number,
  y: number,
  rect: DOMRect
): boolean {
  return (
    x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
  );
}

/** Block browser pinch/page zoom in the editor and route wheel input to the canvas. */
export function useCanvasWheel(canvasRef: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const getEditor = () => document.querySelector("[data-appmap-editor]");

    const blockBrowserZoom = (e: Event) => {
      if (!getEditor()?.contains(e.target as Node)) return;
      e.preventDefault();
    };

    const onWheel = (e: WheelEvent) => {
      if (!getEditor()?.contains(e.target as Node)) return;

      const canvas = canvasRef.current;
      const isZoomGesture = e.ctrlKey || e.shiftKey;

      if (isZoomGesture) {
        // Pinch-to-zoom in Chrome sends ctrlKey+wheel; preventDefault must run
        // at document capture phase or the browser zooms the whole page.
        e.preventDefault();

        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        if (!isPointInRect(e.clientX, e.clientY, rect)) return;

        const current = useAppMapStore.getState().canvas;
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

      if (!canvas?.contains(e.target as Node)) return;

      e.preventDefault();
      const current = useAppMapStore.getState().canvas;
      useAppMapStore.getState().setCanvas({
        x: current.x - e.deltaX,
        y: current.y - e.deltaY,
      });
    };

    const opts: AddEventListenerOptions = { passive: false, capture: true };

    window.addEventListener("wheel", onWheel, opts);
    window.addEventListener("gesturestart", blockBrowserZoom, opts);
    window.addEventListener("gesturechange", blockBrowserZoom, opts);
    window.addEventListener("gestureend", blockBrowserZoom, opts);

    return () => {
      window.removeEventListener("wheel", onWheel, opts);
      window.removeEventListener("gesturestart", blockBrowserZoom, opts);
      window.removeEventListener("gesturechange", blockBrowserZoom, opts);
      window.removeEventListener("gestureend", blockBrowserZoom, opts);
    };
  }, [canvasRef]);
}
