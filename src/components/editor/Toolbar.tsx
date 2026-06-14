"use client";

import { useAppMapStore } from "@/store/appmap-store";
import type { DbSyncStatus } from "@/store/appmap-store";
import {
  canBeActionSource,
  CHILD_COMPONENT_TYPES,
  COMPONENT_META,
  instanceCountForShared,
  isPageSection,
} from "@/types/appmap";

export function Toolbar() {
  const {
    views,
    selection,
    components,
    sharedComponents,
    canvas,
    addView,
    addPageSection,
    addChildComponent,
    addSharedInstance,
    addActionCard,
    select,
    setCanvas,
    setSidePanelOpen,
    sidePanelOpen,
    dbSync,
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
    <header className="flex shrink-0 flex-col border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
      <div className="flex h-12 items-center gap-2 px-3">
        <span className="pr-2 text-sm font-semibold tracking-tight text-zinc-100">
          AppMap
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
            ? "Connect this section item to another view"
            : "Select a section item inside a page section (needs 2+ views)"
          }
          className="rounded-full border border-emerald-700/60 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:border-emerald-500 hover:bg-emerald-950/40 disabled:cursor-not-allowed disabled:opacity-40"
        >
          + Action Card
        </button>

        <div className="ml-auto flex items-center gap-1">
          <DbSyncIndicator status={dbSync} />
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
      </div>

      {sharedComponents.length > 0 ? (
        <div className="flex items-center gap-2 border-t border-zinc-800/80 px-3 py-2">
          <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Components
          </span>
          <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto">
            {sharedComponents.map((shared) => {
              const count = instanceCountForShared(shared.id, components);
              const isSelected =
                selection?.kind === "shared-component" &&
                selection.id === shared.id;
              const canPlace =
                shared.legoType === "page-section"
                  ? Boolean(targetViewId)
                  : Boolean(targetPageSectionId);

              return (
                <button
                  key={shared.id}
                  type="button"
                  onClick={() => {
                    if (canPlace) {
                      addSharedInstance(shared.id);
                    } else {
                      select({ kind: "shared-component", id: shared.id });
                    }
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    select({ kind: "shared-component", id: shared.id });
                  }}
                  title={
                    canPlace
                      ? `Add ${shared.name} instance (${COMPONENT_META[shared.legoType].label})`
                      : `Edit ${shared.name} — ${count} instance${count === 1 ? "" : "s"}`
                  }
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                    isSelected
                      ? "border-cyan-500/60 bg-cyan-950/50 text-cyan-200"
                      : "border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:bg-zinc-900"
                  }`}
                >
                  <span className="text-zinc-500">{count}×</span>
                  {shared.name}
                  <span className="text-[10px] text-zinc-500">
                    {COMPONENT_META[shared.legoType].label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </header>
  );
}

function DbSyncIndicator({ status }: { status: DbSyncStatus }) {
  if (status === "idle") return null;

  const label =
    status === "loading"
      ? "Loading…"
      : status === "saving"
        ? "Saving…"
        : status === "saved"
          ? "Saved"
          : "Sync failed";

  const className =
    status === "error"
      ? "text-amber-400"
      : status === "saved"
        ? "text-emerald-400/80"
        : "text-zinc-500";

  return (
    <span className={`mr-2 text-[11px] font-medium ${className}`} aria-live="polite">
      {label}
    </span>
  );
}
