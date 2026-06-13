"use client";

import { useCallback, useRef } from "react";
import { getActiveActionVariant, useAppMapStore } from "@/store/appmap-store";
import { LegoIcon } from "./LegoIcon";

interface ActionCardNodeProps {
  zoom: number;
}

export function ActionCardNode({ id, zoom }: ActionCardNodeProps & { id: string }) {
  const { actionCards, selection, select, moveActionCard } = useAppMapStore();
  const action = actionCards.find((a) => a.id === id);
  const dragRef = useRef<{ startX: number; startY: number; x: number; y: number } | null>(
    null
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!action) return;
      e.stopPropagation();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      select({ kind: "action", id: action.id });
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        x: action.x,
        y: action.y,
      };
    },
    [action, select]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current || !action) return;
      const dx = (e.clientX - dragRef.current.startX) / zoom;
      const dy = (e.clientY - dragRef.current.startY) / zoom;
      moveActionCard(action.id, dragRef.current.x + dx, dragRef.current.y + dy);
    },
    [action, moveActionCard, zoom]
  );

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (dragRef.current) {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      dragRef.current = null;
    }
  }, []);

  if (!action) return null;

  const variant = getActiveActionVariant(action);
  const isSelected = selection?.kind === "action" && selection.id === action.id;
  const variantCount = action.variants.length;

  return (
    <div
      data-canvas-item
      className={`absolute cursor-grab active:cursor-grabbing ${
        isSelected ? "ring-2 ring-emerald-400/50 rounded-full" : ""
      }`}
      style={{ left: action.x, top: action.y }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {variantCount > 1 ? (
        <span className="absolute -right-1 -top-1 z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-500 px-1 text-[10px] font-bold text-white">
          {variantCount}
        </span>
      ) : null}
      <div className="flex items-center gap-2 rounded-full border border-emerald-700/60 bg-zinc-900 px-4 py-2 shadow-lg">
        <LegoIcon type="action" className="h-4 w-4 shrink-0" />
        <span className="whitespace-nowrap text-sm font-medium text-emerald-300">
          {variant.label || "Action"}
        </span>
      </div>
    </div>
  );
}

export function ActionCardLayer({ zoom }: ActionCardNodeProps) {
  const actionCards = useAppMapStore((s) => s.actionCards);
  return (
    <>
      {actionCards.map((action) => (
        <ActionCardNode key={action.id} id={action.id} zoom={zoom} />
      ))}
    </>
  );
}
