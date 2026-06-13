"use client";

import { useEffect, useMemo, useState } from "react";
import { getActionCardCenter } from "@/lib/canvas-geometry";
import { useConnectionAnchors, useCanvasLayerOptional } from "@/lib/canvas-layer";
import { useAppMapStore } from "@/store/appmap-store";

export function ConnectionLines() {
  const { actionCards, views, components } = useAppMapStore();
  const layerCtx = useCanvasLayerOptional();
  const [tick, setTick] = useState(0);

  const sourceIds = useMemo(
    () => actionCards.map((a) => a.sourceComponentId),
    [actionCards]
  );
  const targetViewIds = useMemo(
    () => [...new Set(actionCards.map((a) => a.targetViewId))],
    [actionCards]
  );

  const anchors = useConnectionAnchors(
    sourceIds,
    targetViewIds,
    layerCtx?.zoom ?? 1,
    layerCtx?.layerRef ?? { current: null },
    tick
  );

  useEffect(() => {
    const layer = layerCtx?.layerRef.current;
    if (!layer) return;
    const bump = () => setTick((t) => t + 1);
    const observer = new ResizeObserver(bump);
    observer.observe(layer);
    window.addEventListener("resize", bump);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", bump);
    };
  }, [layerCtx?.layerRef, actionCards, components, views]);

  return (
    <svg
      className="pointer-events-none absolute left-0 top-0 overflow-visible"
      style={{ width: 1, height: 1 }}
    >
      {actionCards.map((action) => {
        const source = anchors.components.get(action.sourceComponentId) ?? null;
        const target = anchors.views.get(action.targetViewId) ?? null;
        const center = getActionCardCenter(action);
        if (!source || !target) return null;

        return (
          <g key={action.id}>
            <path
              d={`M ${source.x} ${source.y} L ${center.x} ${center.y} L ${target.x} ${target.y}`}
              fill="none"
              stroke="rgb(52 211 153 / 0.55)"
              strokeWidth={2}
              strokeLinecap="round"
            />
            <circle cx={source.x} cy={source.y} r={4} fill="rgb(52 211 153)" />
            <circle cx={target.x} cy={target.y} r={4} fill="rgb(52 211 153)" />
          </g>
        );
      })}
    </svg>
  );
}
