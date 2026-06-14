"use client";

import { useCallback, useRef } from "react";
import { LegoAnchor, useLegoDrag } from "@/lib/canvas-layer";
import {
  childrenInSection,
  getActiveVariant,
  pageSectionsInView,
  useAppMapStore,
} from "@/store/appmap-store";
import type { MapComponent, View } from "@/types/appmap";
import { isEmbeddedSharedChild, isSharedInstance, isSharedPageSectionInstance, resolveLegoType, resolveVariants } from "@/types/appmap";
import { ComponentPreview } from "./ComponentPreview";
import { LegoIcon } from "./LegoIcon";
import {
  ChildDragSurface,
  ReorderControls,
  SectionChildDropZone,
  SectionDragSurface,
  ViewDropZone,
} from "./LegoDragUi";

interface ViewFrameProps {
  view: View;
  zoom: number;
}

export function ViewFrame({ view, zoom }: ViewFrameProps) {
  const {
    components,
    selection,
    select,
    moveView,
    reorderPageSection,
  } = useAppMapStore();
  const { drag, dropTarget } = useLegoDrag();
  const dragRef = useRef<{ startX: number; startY: number; x: number; y: number } | null>(
    null
  );

  const sections = pageSectionsInView(components, view.id);
  const isSelected =
    selection?.kind === "view" && selection.id === view.id;

  const showViewDrop =
    drag?.kind === "page-section" &&
    drag.viewId !== view.id &&
    dropTarget === view.id;

  const handleViewPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      select({ kind: "view", id: view.id });
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        x: view.x,
        y: view.y,
      };
    },
    [select, view.id, view.x, view.y]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (dragRef.current) {
        const dx = (e.clientX - dragRef.current.startX) / zoom;
        const dy = (e.clientY - dragRef.current.startY) / zoom;
        moveView(view.id, dragRef.current.x + dx, dragRef.current.y + dy);
      }
    },
    [moveView, view.id, zoom]
  );

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (dragRef.current) {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      dragRef.current = null;
    }
  }, []);

  return (
    <div
      data-canvas-item
      className={`absolute w-max min-w-[var(--view-width)] rounded-xl border shadow-xl transition-shadow ${
          isSelected
            ? "border-blue-500/60 shadow-blue-500/10"
            : showViewDrop
              ? "border-emerald-500/60 ring-2 ring-emerald-500/20"
              : "border-zinc-700/80"
        }`}
        style={
          {
            left: view.x,
            top: view.y,
            "--view-width": `${view.width}px`,
          } as React.CSSProperties
        }
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div
          data-view-target={view.id}
          className="cursor-grab rounded-t-xl border-b border-zinc-700/80 bg-zinc-900 px-3 py-2.5 active:cursor-grabbing"
          onPointerDown={handleViewPointerDown}
        >
          <div className="mb-2 flex gap-1">
            <span className="h-2 w-2 rounded-full bg-zinc-600" />
            <span className="h-2 w-2 rounded-full bg-zinc-600" />
            <span className="h-2 w-2 rounded-full bg-zinc-600" />
          </div>
          <div className="flex items-start gap-2 px-1">
            <svg
              viewBox="0 0 16 16"
              fill="currentColor"
              className="mt-0.5 h-4 w-4 shrink-0 text-amber-500"
              aria-hidden
            >
              <path d="M2 3a1 1 0 011-1h2.5l1 1.5H13a1 1 0 011 1v7a1 1 0 011 1H3a1 1 0 01-1-1V3z" />
            </svg>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-100">{view.name}</p>
              {view.description ? (
                <p className="mt-0.5 text-xs leading-relaxed text-zinc-400">
                  {view.description}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <ViewDropZone
          viewId={view.id}
          active={showViewDrop}
          className="flex flex-col gap-2 rounded-b-xl bg-zinc-950 p-3"
          style={{ width: view.width } as React.CSSProperties}
        >
          {sections.length === 0 ? (
            <p className="py-6 text-center text-xs text-zinc-600">
              {showViewDrop ? "Drop page section here" : "Add a page section to this view"}
            </p>
          ) : (
            sections.map((section, sectionIndex) => (
              <PageSectionBlock
                key={section.id}
                section={section}
                sectionIndex={sectionIndex}
                sectionTotal={sections.length}
                viewId={view.id}
                isSelected={
                  selection?.kind === "component" && selection.id === section.id
                }
                isDragging={
                  drag?.kind === "page-section" && drag.componentId === section.id
                }
                onSelect={() => select({ kind: "component", id: section.id })}
                onMoveUp={() =>
                  sectionIndex > 0 &&
                  reorderPageSection(view.id, section.id, sectionIndex - 1)
                }
                onMoveDown={() =>
                  sectionIndex < sections.length - 1 &&
                  reorderPageSection(view.id, section.id, sectionIndex + 1)
                }
              />
            ))
          )}
        </ViewDropZone>
      </div>
  );
}

function PageSectionBlock({
  section,
  sectionIndex,
  sectionTotal,
  viewId,
  isSelected,
  isDragging,
  onSelect,
  onMoveUp,
  onMoveDown,
}: {
  section: MapComponent;
  sectionIndex: number;
  sectionTotal: number;
  viewId: string;
  isSelected: boolean;
  isDragging: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const { components, selection, select, reorderChildComponent, sharedComponents } =
    useAppMapStore();
  const { drag, dropTarget } = useLegoDrag();
  const variant = getActiveVariant(section, sharedComponents);
  const children = childrenInSection(components, section.id);
  const acceptsChildDrop = !isSharedPageSectionInstance(section);
  const showChildDrop =
    acceptsChildDrop &&
    drag?.kind === "child" &&
    drag.pageSectionId !== section.id &&
    dropTarget === section.id;

  return (
    <SectionDragSurface
      enabled={isSelected}
      sectionId={section.id}
      sourceViewId={viewId}
      className={`rounded-lg border bg-zinc-900/40 transition-opacity ${
        isDragging ? "opacity-0" : ""
      } ${
        isSelected ? "border-amber-500/40 ring-2 ring-amber-500/20" : "border-zinc-800"
      }`}
    >
      <div
        data-canvas-item
        className="cursor-pointer px-2 py-2"
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        <LegoAnchor id={section.id}>
          <ComponentPreview
            type={resolveLegoType(section, sharedComponents)}
            data={variant.data}
            componentBadge={
              isSharedInstance(section) ? "component" : undefined
            }
          />
        </LegoAnchor>
        {isSelected ? (
          <ReorderControls
            index={sectionIndex}
            total={sectionTotal}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
          />
        ) : null}
      </div>

      <SectionChildDropZone
        sectionId={section.id}
        active={showChildDrop}
        droppable={acceptsChildDrop}
        className={`flex flex-col gap-1.5 rounded-md px-2 pb-2 pt-1 transition-colors ${
          showChildDrop ? "bg-blue-500/10 ring-2 ring-blue-500/30" : ""
        }`}
      >
        {children.length === 0 ? (
          <p className="py-3 text-center text-[11px] text-zinc-600">
            {showChildDrop
              ? "Drop section item here"
              : "Add section items inside this section"}
          </p>
        ) : (
          children.map((child, childIndex) => (
            <ChildBlock
              key={child.id}
              child={child}
              childIndex={childIndex}
              childTotal={children.length}
              sectionId={section.id}
              viewId={viewId}
              isSelected={
                selection?.kind === "component" && selection.id === child.id
              }
              isDragging={
                drag?.kind === "child" && drag.componentId === child.id
              }
              onSelect={() => select({ kind: "component", id: child.id })}
              onMoveUp={() =>
                childIndex > 0 &&
                reorderChildComponent(section.id, child.id, childIndex - 1)
              }
              onMoveDown={() =>
                childIndex < children.length - 1 &&
                reorderChildComponent(section.id, child.id, childIndex + 1)
              }
              stopSectionDrag={isSelected}
            />
          ))
        )}
      </SectionChildDropZone>
    </SectionDragSurface>
  );
}

function ChildBlock({
  child,
  childIndex,
  childTotal,
  sectionId,
  viewId,
  isSelected,
  isDragging,
  onSelect,
  onMoveUp,
  onMoveDown,
  stopSectionDrag = false,
}: {
  child: MapComponent;
  childIndex: number;
  childTotal: number;
  sectionId: string;
  viewId: string;
  isSelected: boolean;
  isDragging: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  stopSectionDrag?: boolean;
}) {
  const { sharedComponents } = useAppMapStore();
  const variant = getActiveVariant(child, sharedComponents);
  const variants = resolveVariants(child, sharedComponents);
  const variantCount = variants.length;
  const legoType = resolveLegoType(child, sharedComponents);
  const canDrag = isSelected && !isEmbeddedSharedChild(child);

  return (
    <ChildDragSurface
      enabled={canDrag}
      childId={child.id}
      sourceSectionId={sectionId}
      sourceViewId={viewId}
      className={`relative w-full rounded-lg transition-opacity ${
        isDragging ? "opacity-0" : ""
      } ${isSelected ? "ring-2 ring-blue-500/40" : ""}`}
    >
      <div
        data-canvas-item
        className="cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onPointerDown={(e) => {
          if (stopSectionDrag) e.stopPropagation();
        }}
      >
      {variantCount > 1 ? (
        <span className="absolute -right-1 -top-1 z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-500 px-1 text-[10px] font-bold text-white">
          {variantCount}
        </span>
      ) : null}
      <LegoAnchor id={child.id}>
        <ComponentPreview
          type={legoType}
          data={variant.data}
          componentBadge={
            isEmbeddedSharedChild(child)
              ? "sub-component"
              : isSharedInstance(child)
                ? "component"
                : undefined
          }
        />
      </LegoAnchor>
      {isSelected ? (
        <ReorderControls
          index={childIndex}
          total={childTotal}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
        />
      ) : null}
      </div>
    </ChildDragSurface>
  );
}
