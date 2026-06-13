"use client";

import { useCallback, useEffect, useRef } from "react";
import { useLegoDrag } from "@/lib/canvas-layer";
import { useAppMapStore } from "@/store/appmap-store";

export function ViewDropZone({
  viewId,
  active,
  children,
  className,
  style,
}: {
  viewId: string;
  active: boolean;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      data-drop-zone={`view:${viewId}`}
      className={className}
      style={style}
      data-drop-active={active || undefined}
    >
      {children}
    </div>
  );
}

/** Drag handle — page sections only, drop on a different view. */
export function SectionGrabHandle({
  visible,
  sectionId,
  sourceViewId,
}: {
  visible: boolean;
  sectionId: string;
  sourceViewId: string;
}) {
  const { setDrag, setDropTarget } = useLegoDrag();
  const moveSectionToView = useAppMapStore((s) => s.moveSectionToView);
  const draggingRef = useRef(false);

  const resolveDrop = useCallback(
    (clientX: number, clientY: number) => {
      const el = document.elementFromPoint(clientX, clientY);
      if (!el) return null;
      const zone = el.closest<HTMLElement>("[data-drop-zone]");
      const key = zone?.dataset.dropZone;
      if (!key?.startsWith("view:")) return null;
      const targetViewId = key.replace(/^view:/, "");
      if (targetViewId === sourceViewId) return null;
      return targetViewId;
    },
    [sourceViewId]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      draggingRef.current = true;
      setDrag({
        componentId: sectionId,
        kind: "page-section",
        viewId: sourceViewId,
        pageSectionId: null,
      });
      setDropTarget(null);
    },
    [sectionId, sourceViewId, setDrag, setDropTarget]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingRef.current) return;
      setDropTarget(resolveDrop(e.clientX, e.clientY));
    },
    [resolveDrop, setDropTarget]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      const targetViewId = resolveDrop(e.clientX, e.clientY);
      if (targetViewId) moveSectionToView(sectionId, targetViewId);
      setDrag(null);
      setDropTarget(null);
    },
    [sectionId, moveSectionToView, resolveDrop, setDrag, setDropTarget]
  );

  useEffect(() => {
    return () => {
      if (draggingRef.current) {
        setDrag(null);
        setDropTarget(null);
      }
    };
  }, [setDrag, setDropTarget]);

  if (!visible) return null;

  return (
    <button
      type="button"
      data-lego-handle
      aria-label="Drag to move to another view"
      className="flex w-6 shrink-0 cursor-grab items-center justify-center self-stretch rounded-l-md text-zinc-500 hover:bg-zinc-800/80 hover:text-zinc-300 active:cursor-grabbing"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <svg viewBox="0 0 8 14" className="h-3.5 w-2" aria-hidden>
        <circle cx="2" cy="2" r="1" fill="currentColor" />
        <circle cx="6" cy="2" r="1" fill="currentColor" />
        <circle cx="2" cy="7" r="1" fill="currentColor" />
        <circle cx="6" cy="7" r="1" fill="currentColor" />
        <circle cx="2" cy="12" r="1" fill="currentColor" />
        <circle cx="6" cy="12" r="1" fill="currentColor" />
      </svg>
    </button>
  );
}

export function ReorderControls({
  index,
  total,
  onMoveUp,
  onMoveDown,
}: {
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <div className="mt-1 flex items-center justify-end gap-1">
      <button
        type="button"
        disabled={index === 0}
        onClick={(e) => {
          e.stopPropagation();
          onMoveUp();
        }}
        className="rounded px-1.5 py-0.5 text-[10px] text-zinc-400 hover:bg-zinc-800 disabled:opacity-30"
        aria-label="Move up"
      >
        ↑
      </button>
      <button
        type="button"
        disabled={index === total - 1}
        onClick={(e) => {
          e.stopPropagation();
          onMoveDown();
        }}
        className="rounded px-1.5 py-0.5 text-[10px] text-zinc-400 hover:bg-zinc-800 disabled:opacity-30"
        aria-label="Move down"
      >
        ↓
      </button>
    </div>
  );
}
