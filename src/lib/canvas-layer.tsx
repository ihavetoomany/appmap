"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

export interface CanvasPoint {
  x: number;
  y: number;
}

interface CanvasLayerContextValue {
  layerRef: RefObject<HTMLDivElement | null>;
  zoom: number;
}

const CanvasLayerContext = createContext<CanvasLayerContextValue | null>(null);

export function CanvasLayerProvider({
  layerRef,
  zoom,
  children,
}: {
  layerRef: RefObject<HTMLDivElement | null>;
  zoom: number;
  children: ReactNode;
}) {
  return (
    <CanvasLayerContext.Provider value={{ layerRef, zoom }}>
      {children}
    </CanvasLayerContext.Provider>
  );
}

export function useCanvasLayerOptional() {
  return useContext(CanvasLayerContext);
}

function elementAnchorRight(el: HTMLElement, layer: HTMLElement, zoom: number): CanvasPoint {
  const lr = layer.getBoundingClientRect();
  const er = el.getBoundingClientRect();
  return {
    x: (er.right - lr.left) / zoom,
    y: (er.top + er.height / 2 - lr.top) / zoom,
  };
}

function elementAnchorLeft(el: HTMLElement, layer: HTMLElement, zoom: number): CanvasPoint {
  const lr = layer.getBoundingClientRect();
  const er = el.getBoundingClientRect();
  return {
    x: (er.left - lr.left) / zoom,
    y: (er.top + er.height / 2 - lr.top) / zoom,
  };
}

export function useConnectionAnchors(
  componentIds: string[],
  viewIds: string[],
  zoom: number,
  layerRef: RefObject<HTMLDivElement | null>,
  tick: number,
  layoutKey = ""
) {
  const [anchors, setAnchors] = useState<{
    components: Map<string, CanvasPoint>;
    views: Map<string, CanvasPoint>;
  }>({ components: new Map(), views: new Map() });

  useLayoutEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;

    const components = new Map<string, CanvasPoint>();
    for (const id of componentIds) {
      const el = layer.querySelector<HTMLElement>(`[data-lego-anchor="${id}"]`);
      if (el) components.set(id, elementAnchorRight(el, layer, zoom));
    }

    const views = new Map<string, CanvasPoint>();
    for (const id of viewIds) {
      const el = layer.querySelector<HTMLElement>(`[data-view-target="${id}"]`);
      if (el) views.set(id, elementAnchorLeft(el, layer, zoom));
    }

    setAnchors({ components, views });
  }, [componentIds, viewIds, zoom, layerRef, tick, layoutKey]);

  return anchors;
}

export function LegoAnchor({
  id,
  children,
  className,
}: {
  id: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div data-lego-anchor={id} className={className}>
      {children}
    </div>
  );
}

export function ViewTargetMarker({
  viewId,
  children,
}: {
  viewId: string;
  children: ReactNode;
}) {
  return <div data-view-target={viewId}>{children}</div>;
}

export type DragKind = "page-section" | "child";

export interface LegoDragState {
  componentId: string;
  kind: DragKind;
  viewId: string;
  pageSectionId: string | null;
}

interface LegoDragContextValue {
  drag: LegoDragState | null;
  dropTarget: string | null;
  dragPosition: { x: number; y: number } | null;
  dragOffset: { x: number; y: number };
  dragWidth: number | null;
  setDrag: (drag: LegoDragState | null) => void;
  setDropTarget: (target: string | null) => void;
  setDragPosition: (position: { x: number; y: number } | null) => void;
  setDragOffset: (offset: { x: number; y: number }) => void;
  setDragWidth: (width: number | null) => void;
}

const LegoDragContext = createContext<LegoDragContextValue | null>(null);

export function LegoDragProvider({ children }: { children: ReactNode }) {
  const [drag, setDragState] = useState<LegoDragState | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(
    null
  );
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragWidth, setDragWidth] = useState<number | null>(null);

  const setDrag = useCallback((next: LegoDragState | null) => {
    setDragState(next);
    if (!next) {
      setDragPosition(null);
      setDragWidth(null);
      setDropTarget(null);
    }
  }, []);

  return (
    <LegoDragContext.Provider
      value={{
        drag,
        dropTarget,
        dragPosition,
        dragOffset,
        dragWidth,
        setDrag,
        setDropTarget,
        setDragPosition,
        setDragOffset,
        setDragWidth,
      }}
    >
      {children}
    </LegoDragContext.Provider>
  );
}

export function useLegoDrag() {
  const ctx = useContext(LegoDragContext);
  if (!ctx) throw new Error("useLegoDrag must be used within LegoDragProvider");
  return ctx;
}
