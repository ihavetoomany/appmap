"use client";

import { useCallback, useEffect, useRef } from "react";
import { useLegoDrag } from "@/lib/canvas-layer";
import {
  childrenInSection,
  getActiveVariant,
  useAppMapStore,
} from "@/store/appmap-store";
import {
  isEmbeddedSharedChild,
  isSharedInstance,
  isSharedPageSectionInstance,
  resolveLegoType,
} from "@/types/appmap";
import { ComponentPreview } from "./ComponentPreview";

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

/** Drop target for section items moving between page sections. */
export function SectionChildDropZone({
  sectionId,
  active,
  droppable = true,
  children,
  className,
}: {
  sectionId: string;
  active: boolean;
  droppable?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      data-drop-zone={droppable ? `section:${sectionId}` : undefined}
      className={className}
      data-drop-active={droppable && active ? true : undefined}
    >
      {children}
    </div>
  );
}

/** Drag surface — section items only, drop on a different page section. */
export function ChildDragSurface({
  enabled,
  childId,
  sourceSectionId,
  sourceViewId,
  className,
  children,
}: {
  enabled: boolean;
  childId: string;
  sourceSectionId: string;
  sourceViewId: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { setDrag, setDropTarget, setDragPosition, setDragOffset, setDragWidth } =
    useLegoDrag();
  const moveChildToSection = useAppMapStore((s) => s.moveChildToSection);
  const components = useAppMapStore((s) => s.components);
  const draggingRef = useRef(false);

  const resolveDrop = useCallback(
    (clientX: number, clientY: number) => {
      const el = document.elementFromPoint(clientX, clientY);
      if (!el) return null;
      const zone = el.closest<HTMLElement>("[data-drop-zone]");
      const key = zone?.dataset.dropZone;
      if (!key?.startsWith("section:")) return null;
      const targetSectionId = key.slice("section:".length);
      if (targetSectionId === sourceSectionId) return null;
      const targetSection = components.find((c) => c.id === targetSectionId);
      if (!targetSection || isSharedPageSectionInstance(targetSection)) return null;
      return targetSectionId;
    },
    [sourceSectionId, components]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled) return;
      e.stopPropagation();
      const surface = e.currentTarget as HTMLElement;
      surface.setPointerCapture(e.pointerId);
      const rect = surface.getBoundingClientRect();
      draggingRef.current = true;
      setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      setDragWidth(rect.width);
      setDragPosition({ x: e.clientX, y: e.clientY });
      setDrag({
        componentId: childId,
        kind: "child",
        viewId: sourceViewId,
        pageSectionId: sourceSectionId,
      });
      setDropTarget(null);
    },
    [
      enabled,
      childId,
      sourceSectionId,
      sourceViewId,
      setDrag,
      setDragOffset,
      setDragWidth,
      setDragPosition,
      setDropTarget,
    ]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingRef.current) return;
      setDragPosition({ x: e.clientX, y: e.clientY });
      setDropTarget(resolveDrop(e.clientX, e.clientY));
    },
    [resolveDrop, setDragPosition, setDropTarget]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      const targetSectionId = resolveDrop(e.clientX, e.clientY);
      if (targetSectionId) moveChildToSection(childId, targetSectionId);
      setDrag(null);
    },
    [childId, moveChildToSection, resolveDrop, setDrag]
  );

  useEffect(() => {
    return () => {
      if (draggingRef.current) {
        setDrag(null);
      }
    };
  }, [setDrag]);

  return (
    <div
      data-lego-handle={enabled || undefined}
      className={
        enabled
          ? `cursor-grab active:cursor-grabbing ${className ?? ""}`
          : className
      }
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {children}
    </div>
  );
}

/** Drag surface — page sections only, drop on a different view. */
export function SectionDragSurface({
  enabled,
  sectionId,
  sourceViewId,
  className,
  children,
}: {
  enabled: boolean;
  sectionId: string;
  sourceViewId: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { setDrag, setDropTarget, setDragPosition, setDragOffset, setDragWidth } =
    useLegoDrag();
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
      if (!enabled) return;
      e.stopPropagation();
      const surface = e.currentTarget as HTMLElement;
      surface.setPointerCapture(e.pointerId);
      const rect = surface.getBoundingClientRect();
      draggingRef.current = true;
      setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      setDragWidth(rect.width);
      setDragPosition({ x: e.clientX, y: e.clientY });
      setDrag({
        componentId: sectionId,
        kind: "page-section",
        viewId: sourceViewId,
        pageSectionId: null,
      });
      setDropTarget(null);
    },
    [
      enabled,
      sectionId,
      sourceViewId,
      setDrag,
      setDragOffset,
      setDragWidth,
      setDragPosition,
      setDropTarget,
    ]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingRef.current) return;
      setDragPosition({ x: e.clientX, y: e.clientY });
      setDropTarget(resolveDrop(e.clientX, e.clientY));
    },
    [resolveDrop, setDragPosition, setDropTarget]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      const targetViewId = resolveDrop(e.clientX, e.clientY);
      if (targetViewId) moveSectionToView(sectionId, targetViewId);
      setDrag(null);
    },
    [sectionId, moveSectionToView, resolveDrop, setDrag]
  );

  useEffect(() => {
    return () => {
      if (draggingRef.current) {
        setDrag(null);
      }
    };
  }, [setDrag]);

  return (
    <div
      data-lego-handle={enabled || undefined}
      className={
        enabled
          ? `cursor-grab active:cursor-grabbing ${className ?? ""}`
          : className
      }
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {children}
    </div>
  );
}

/** Floating preview that follows the pointer while moving a page section. */
export function SectionDragPreview() {
  const { drag, dragPosition, dragOffset, dragWidth } = useLegoDrag();
  const { components, sharedComponents } = useAppMapStore();

  if (!drag || drag.kind !== "page-section" || !dragPosition || !dragWidth) {
    return null;
  }

  const section = components.find((c) => c.id === drag.componentId);
  if (!section) return null;

  const variant = getActiveVariant(section, sharedComponents);
  const children = childrenInSection(components, section.id);

  return (
    <div
      className="pointer-events-none fixed z-50 rounded-lg border border-emerald-500/50 bg-zinc-900/95 shadow-2xl ring-2 ring-emerald-500/25 backdrop-blur-sm"
      style={{
        left: dragPosition.x - dragOffset.x,
        top: dragPosition.y - dragOffset.y,
        width: dragWidth,
      }}
    >
      <div className="px-2 py-2">
        <ComponentPreview
          type={resolveLegoType(section, sharedComponents)}
          data={variant.data}
          componentBadge={isSharedInstance(section) ? "component" : undefined}
        />
      </div>
      {children.length > 0 ? (
        <div className="flex flex-col gap-1.5 px-2 pb-2 pt-1">
          {children.map((child) => {
            const childVariant = getActiveVariant(child, sharedComponents);
            return (
              <ComponentPreview
                key={child.id}
                type={resolveLegoType(child, sharedComponents)}
                data={childVariant.data}
                componentBadge={
                  isEmbeddedSharedChild(child)
                    ? "sub-component"
                    : isSharedInstance(child)
                      ? "component"
                      : undefined
                }
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

/** Floating preview that follows the pointer while moving a section item. */
export function ChildDragPreview() {
  const { drag, dragPosition, dragOffset, dragWidth } = useLegoDrag();
  const { components, sharedComponents } = useAppMapStore();

  if (!drag || drag.kind !== "child" || !dragPosition || !dragWidth) {
    return null;
  }

  const child = components.find((c) => c.id === drag.componentId);
  if (!child) return null;

  const variant = getActiveVariant(child, sharedComponents);

  return (
    <div
      className="pointer-events-none fixed z-50 rounded-lg border border-blue-500/50 bg-zinc-900/95 p-2 shadow-2xl ring-2 ring-blue-500/25 backdrop-blur-sm"
      style={{
        left: dragPosition.x - dragOffset.x,
        top: dragPosition.y - dragOffset.y,
        width: dragWidth,
      }}
    >
      <ComponentPreview
        type={resolveLegoType(child, sharedComponents)}
        data={variant.data}
        componentBadge={
          isEmbeddedSharedChild(child)
            ? "sub-component"
            : isSharedInstance(child)
              ? "component"
              : undefined
        }
      />
    </div>
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
  const buttonClass =
    "flex h-7 w-7 items-center justify-center rounded-md border border-zinc-700/80 bg-zinc-800/90 text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-700 hover:text-white disabled:pointer-events-none disabled:opacity-25";

  return (
    <div className="mt-1.5 flex items-center justify-end gap-1.5">
      <button
        type="button"
        disabled={index === 0}
        onClick={(e) => {
          e.stopPropagation();
          onMoveUp();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className={buttonClass}
        aria-label="Move up"
      >
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
          <path
            fill="currentColor"
            d="M8 4.5 3.5 9h9L8 4.5z"
          />
        </svg>
      </button>
      <button
        type="button"
        disabled={index === total - 1}
        onClick={(e) => {
          e.stopPropagation();
          onMoveDown();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className={buttonClass}
        aria-label="Move down"
      >
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
          <path
            fill="currentColor"
            d="M8 11.5 12.5 7h-9L8 11.5z"
          />
        </svg>
      </button>
    </div>
  );
}
