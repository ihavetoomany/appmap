"use client";

import { useAppMapStore } from "@/store/appmap-store";
import {
  canBeActionSource,
  CHILD_COMPONENT_TYPES,
  COMPONENT_META,
  isPageSection,
} from "@/types/appmap";

export function Toolbar() {
  const {
    views,
    selection,
    components,
    canvas,
    addView,
    addPageSection,
    addChildComponent,
    addActionCard,
    setCanvas,
    setSidePanelOpen,
    sidePanelOpen,
  } = useAppMapStore();

  const selectedComponent =
    selection?.kind === "component"
      ? components.find((c) => c.id === selection.id)
      : null;

  const targetViewId =
    selection?.kind === "view"
      ? selection.id
      : selectedComponent?.viewId ?? views[0]?.id;

  const targetPageSectionId =
    selectedComponent && isPageSection(selectedComponent)
      ? selectedComponent.id
      : selectedComponent?.pageSectionId ??
        components.find(
          (c) => c.viewId === targetViewId && isPageSection(c)
        )?.id;

  const canAddAction =
    views.length >= 2 &&
    selectedComponent !== null &&
    selectedComponent !== undefined &&
    canBeActionSource(selectedComponent);

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-zinc-800 bg-zinc-950/90 px-3 backdrop-blur">
      <span className="pr-2 text-sm font-semibold tracking-tight text-zinc-100">
        Appmap
      </span>

      <div className="h-5 w-px bg-zinc-700" />

      <button
        type="button"
        onClick={() => addView()}
        className="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-white"
      >
        + View
      </button>

      {targetViewId ? (
        <button
          type="button"
          onClick={() => addPageSection(targetViewId)}
          className="shrink-0 rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:border-zinc-500 hover:bg-zinc-900"
        >
          + Page Section
        </button>
      ) : null}

      {targetPageSectionId ? (
        <div className="flex items-center gap-1 overflow-x-auto">
          {CHILD_COMPONENT_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => addChildComponent(targetPageSectionId, type)}
              className="shrink-0 rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:border-zinc-500 hover:bg-zinc-900"
            >
              + {COMPONENT_META[type].label}
            </button>
          ))}
        </div>
      ) : targetViewId ? (
        <span className="text-xs text-zinc-500">Add a page section first</span>
      ) : (
        <span className="text-xs text-zinc-500">Add a view first</span>
      )}

      <button
        type="button"
        disabled={!canAddAction}
        onClick={() => addActionCard()}
        title={
          canAddAction
            ? "Connect this item to another view"
            : "Select an item inside a page section (needs 2+ views)"
        }
        className="rounded-full border border-emerald-700/60 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:border-emerald-500 hover:bg-emerald-950/40 disabled:cursor-not-allowed disabled:opacity-40"
      >
        + Action Card
      </button>

      <div className="ml-auto flex items-center gap-1">
        <button
          type="button"
          onClick={() => setCanvas({ zoom: Math.max(0.25, canvas.zoom - 0.1) })}
          className="rounded-lg px-2 py-1.5 text-xs text-zinc-400 hover:bg-zinc-900"
          aria-label="Zoom out"
        >
          −
        </button>
        <span className="min-w-12 text-center text-xs tabular-nums text-zinc-500">
          {Math.round(canvas.zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={() => setCanvas({ zoom: Math.min(2, canvas.zoom + 0.1) })}
          className="rounded-lg px-2 py-1.5 text-xs text-zinc-400 hover:bg-zinc-900"
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => setCanvas({ x: 0, y: 0, zoom: 1 })}
          className="rounded-lg px-2 py-1.5 text-xs text-zinc-400 hover:bg-zinc-900"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={() => setSidePanelOpen(!sidePanelOpen)}
          className="rounded-lg px-2 py-1.5 text-xs text-zinc-400 hover:bg-zinc-900"
        >
          {sidePanelOpen ? "Hide panel" : "Show panel"}
        </button>
      </div>
    </header>
  );
}
