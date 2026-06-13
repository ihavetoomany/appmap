"use client";

import { useState } from "react";
import {
  changeComponentType,
  getActiveActionVariant,
  getActiveVariant,
  useAppMapStore,
} from "@/store/appmap-store";
import {
  canConvertToShared,
  CHILD_COMPONENT_TYPES,
  COMPONENT_META,
  instanceCountForShared,
  isEmbeddedSharedChild,
  isPageSection,
  isSharedInstance,
  pageSectionsInView,
  resolveLegoType,
  resolveVariants,
  type ChildComponentType,
} from "@/types/appmap";
import { ComponentPreview } from "./ComponentPreview";
import { LegoIcon } from "./LegoIcon";

export function SidePanel() {
  const {
    views,
    components,
    sharedComponents,
    actionCards,
    selection,
    sidePanelOpen,
    updateView,
    deleteView,
    updateComponent,
    deleteComponent,
    convertToSharedComponent,
    detachFromSharedComponent,
    deleteSharedComponent,
    updateSharedComponent,
    updateActionCard,
    deleteActionCard,
    addActionVariant,
    deleteActionVariant,
    setActiveActionVariant,
    updateActionVariant,
    addVariant,
    deleteVariant,
    setActiveVariant,
    updateVariantData,
    updateVariant,
    updateVariantField,
    addVariantField,
    removeVariantField,
    addSharedVariant,
    deleteSharedVariant,
    updateSharedVariant,
    updateSharedVariantData,
    updateSharedVariantField,
    addSharedVariantField,
    removeSharedVariantField,
    select,
  } = useAppMapStore();

  if (!sidePanelOpen) return null;

  const selectedView =
    selection?.kind === "view"
      ? views.find((v) => v.id === selection.id)
      : null;

  const selectedComponent =
    selection?.kind === "component"
      ? components.find((c) => c.id === selection.id)
      : null;

  const selectedAction =
    selection?.kind === "action"
      ? actionCards.find((a) => a.id === selection.id)
      : null;

  const selectedShared =
    selection?.kind === "shared-component"
      ? sharedComponents.find((s) => s.id === selection.id)
      : null;

  const parentView = selectedComponent
    ? views.find((v) => v.id === selectedComponent.viewId)
    : selectedView;

  if (!selection) {
    return (
      <aside className="flex w-80 shrink-0 flex-col border-l border-zinc-800 bg-zinc-950">
        <PanelHeader title="Inspector" />
        <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-zinc-500">
          Select a view or lego on the canvas to edit its data
        </div>
      </aside>
    );
  }

  if (selectedView) {
    return (
      <aside className="flex w-80 shrink-0 flex-col border-l border-zinc-800 bg-zinc-950">
        <PanelHeader title="View" />
        <div className="flex-1 overflow-y-auto p-4">
          <Field label="Screen name">
            <input
              type="text"
              value={selectedView.name}
              onChange={(e) =>
                updateView(selectedView.id, { name: e.target.value })
              }
              className={inputClass}
            />
          </Field>
          <Field label="Description">
            <textarea
              value={selectedView.description}
              onChange={(e) =>
                updateView(selectedView.id, { description: e.target.value })
              }
              rows={3}
              className={inputClass}
            />
          </Field>
          <Field label="Width">
            <input
              type="number"
              value={selectedView.width}
              onChange={(e) =>
                updateView(selectedView.id, {
                  width: Number(e.target.value) || 320,
                })
              }
              className={inputClass}
            />
          </Field>
          <p className="mt-4 text-xs text-zinc-500">
            Height grows automatically with content.
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            {pageSectionsInView(components, selectedView.id).length} page
            section(s) in this view
          </p>
        </div>
        <PanelFooter
          onDelete={() => deleteView(selectedView.id)}
          deleteLabel="Delete view"
        />
      </aside>
    );
  }

  if (selectedComponent) {
    const variant = getActiveVariant(selectedComponent, sharedComponents);
    const legoType = resolveLegoType(selectedComponent, sharedComponents);
    const meta = COMPONENT_META[legoType];
    const allVariants = resolveVariants(selectedComponent, sharedComponents);
    const linked = isSharedInstance(selectedComponent);
    const embedded = isEmbeddedSharedChild(selectedComponent);
    const sharedDef = linked
      ? sharedComponents.find((s) => s.id === selectedComponent.sharedComponentId)
      : null;
    const instanceCount = sharedDef && !embedded
      ? instanceCountForShared(sharedDef.id, components)
      : 0;

    return (
      <aside className="flex w-80 shrink-0 flex-col border-l border-zinc-800 bg-zinc-950">
        <PanelHeader
          title={meta.label}
          subtitle={
            embedded && sharedDef
              ? `Part of ${sharedDef.name}`
              : linked
                ? `Component · ${instanceCount} instance${instanceCount === 1 ? "" : "s"}`
                : parentView?.name
          }
        />
        <div className="flex-1 overflow-y-auto p-4">
          {embedded && sharedDef ? (
            <div className="mb-4 rounded-lg border border-cyan-800/40 bg-cyan-950/20 px-3 py-2">
              <p className="text-xs font-medium text-cyan-200">
                Embedded in {sharedDef.name}
              </p>
              <p className="mt-1 text-[11px] text-cyan-200/70">
                Edits sync across all page section instances.
              </p>
              <button
                type="button"
                onClick={() =>
                  select({ kind: "shared-component", id: sharedDef.id })
                }
                className="mt-2 text-[11px] font-medium text-cyan-300 hover:text-cyan-200"
              >
                Edit page section component →
              </button>
            </div>
          ) : linked && sharedDef ? (
            <div className="mb-4 rounded-lg border border-cyan-800/40 bg-cyan-950/20 px-3 py-2">
              <p className="text-xs font-medium text-cyan-200">{sharedDef.name}</p>
              <p className="mt-1 text-[11px] text-cyan-200/70">
                Edits sync to all {instanceCount} instances.
              </p>
              <button
                type="button"
                onClick={() =>
                  select({ kind: "shared-component", id: sharedDef.id })
                }
                className="mt-2 text-[11px] font-medium text-cyan-300 hover:text-cyan-200"
              >
                Edit component definition →
              </button>
            </div>
          ) : null}

          {canConvertToShared(selectedComponent) ? (
            <button
              type="button"
              onClick={() => convertToSharedComponent(selectedComponent.id)}
              className="mb-4 w-full rounded-lg border border-cyan-700/50 bg-cyan-950/30 px-3 py-2 text-xs font-medium text-cyan-200 hover:border-cyan-500/60 hover:bg-cyan-950/50"
            >
              Convert to component
            </button>
          ) : null}

          {!isPageSection(selectedComponent) && !linked ? (
            <Field label="Type">
              <select
                value={selectedComponent.type}
                onChange={(e) => {
                  const next = changeComponentType(
                    selectedComponent,
                    e.target.value as ChildComponentType
                  );
                  if (next) updateComponent(selectedComponent.id, next);
                }}
                className={inputClass}
              >
                {CHILD_COMPONENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {COMPONENT_META[type].label}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}

          <div className="my-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
              Preview
            </p>
            <ComponentPreview
              type={legoType}
              data={variant.data}
              componentBadge={
                embedded ? "sub-component" : linked ? "component" : undefined
              }
            />
          </div>

          <VariantEditor
            variants={allVariants}
            activeVariantId={selectedComponent.activeVariantId}
            meta={meta}
            onSelectVariant={(id) =>
              setActiveVariant(selectedComponent.id, id)
            }
            onAddVariant={() => addVariant(selectedComponent.id)}
            onDeleteVariant={(id) =>
              deleteVariant(selectedComponent.id, id)
            }
            onUpdateVariantName={(id, name) =>
              updateVariant(selectedComponent.id, id, { name })
            }
            onUpdateTitle={(id, title) =>
              updateVariantData(selectedComponent.id, id, { title })
            }
            onUpdateDescription={(id, description) =>
              updateVariantData(selectedComponent.id, id, { description })
            }
            onAddField={(id) => addVariantField(selectedComponent.id, id)}
            onUpdateField={(id, index, value) =>
              updateVariantField(selectedComponent.id, id, index, value)
            }
            onRemoveField={(id, index) =>
              removeVariantField(selectedComponent.id, id, index)
            }
          />
        </div>
        <PanelFooter
          onDelete={() => deleteComponent(selectedComponent.id)}
          deleteLabel="Delete instance"
          secondaryAction={
            linked
              ? {
                  label: embedded
                    ? "Detach page section to edit locally"
                    : "Detach from component",
                  onClick: () => {
                    if (embedded && sharedDef) {
                      const section = components.find(
                        (s) => s.id === selectedComponent.pageSectionId
                      );
                      if (section) detachFromSharedComponent(section.id);
                    } else {
                      detachFromSharedComponent(selectedComponent.id);
                    }
                  },
                }
              : undefined
          }
        />
      </aside>
    );
  }

  if (selectedShared) {
    const meta = COMPONENT_META[selectedShared.legoType];
    const instanceCount = instanceCountForShared(selectedShared.id, components);

    return (
      <aside className="flex w-80 shrink-0 flex-col border-l border-zinc-800 bg-zinc-950">
        <PanelHeader
          title="Component"
          subtitle={`${meta.label} · ${instanceCount} instance${instanceCount === 1 ? "" : "s"}`}
        />
        <div className="flex-1 overflow-y-auto p-4">
          <Field label="Component name">
            <input
              type="text"
              value={selectedShared.name}
              onChange={(e) =>
                updateSharedComponent(selectedShared.id, {
                  name: e.target.value,
                })
              }
              className={inputClass}
            />
          </Field>

          <SharedVariantEditor
            shared={selectedShared}
            meta={meta}
            onAddVariant={() => addSharedVariant(selectedShared.id)}
            onDeleteVariant={(id) =>
              deleteSharedVariant(selectedShared.id, id)
            }
            onUpdateVariantName={(id, name) =>
              updateSharedVariant(selectedShared.id, id, { name })
            }
            onUpdateTitle={(id, title) =>
              updateSharedVariantData(selectedShared.id, id, { title })
            }
            onUpdateDescription={(id, description) =>
              updateSharedVariantData(selectedShared.id, id, { description })
            }
            onAddField={(id) =>
              addSharedVariantField(selectedShared.id, id)
            }
            onUpdateField={(id, index, value) =>
              updateSharedVariantField(selectedShared.id, id, index, value)
            }
            onRemoveField={(id, index) =>
              removeSharedVariantField(selectedShared.id, id, index)
            }
          />

          <p className="mt-4 text-xs text-zinc-500">
            Click a component chip in the toolbar to add another instance.
            {selectedShared.legoType === "page-section" &&
            (selectedShared.children?.length ?? 0) > 0
              ? ` Includes ${selectedShared.children!.length} embedded lego${selectedShared.children!.length === 1 ? "" : "s"}.`
              : null}
          </p>
        </div>
        <PanelFooter
          onDelete={() => deleteSharedComponent(selectedShared.id)}
          deleteLabel="Delete component"
        />
      </aside>
    );
  }

  if (selectedAction) {
    const variant = getActiveActionVariant(selectedAction);
    const sourceComponent = components.find(
      (c) => c.id === selectedAction.sourceComponentId
    );
    const sourceVariant = sourceComponent
      ? getActiveVariant(sourceComponent, sharedComponents)
      : null;
    const sourceView = sourceComponent
      ? views.find((v) => v.id === sourceComponent.viewId)
      : null;
    const targetView = views.find((v) => v.id === selectedAction.targetViewId);

    return (
      <aside className="flex w-80 shrink-0 flex-col border-l border-zinc-800 bg-zinc-950">
        <PanelHeader title="Action Card" subtitle="Section Item → View" />
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-4 flex justify-center rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
            <div className="flex items-center gap-2 rounded-full border border-emerald-700/60 bg-zinc-900 px-4 py-2">
              <LegoIcon type="action" className="h-4 w-4" />
              <span className="text-sm font-medium text-emerald-300">
                {variant.label}
              </span>
            </div>
          </div>

          <Field label="From section item">
            <div className="rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-300">
              {sourceVariant?.data.title ?? "Unknown section item"}
              {sourceView ? (
                <span className="mt-0.5 block text-xs text-zinc-500">
                  in {sourceView.name}
                </span>
              ) : null}
            </div>
          </Field>

          <Field label="To view">
            <select
              value={selectedAction.targetViewId}
              onChange={(e) =>
                updateActionCard(selectedAction.id, {
                  targetViewId: e.target.value,
                })
              }
              className={inputClass}
            >
              {views
                .filter((v) => v.id !== sourceView?.id)
                .map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
            </select>
          </Field>

          {sourceView && targetView ? (
            <p className="mb-4 text-xs text-zinc-500">
              {sourceVariant?.data.title} ({sourceView.name}) → {targetView.name}
            </p>
          ) : null}

          <div className="mt-2">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Variants
              </p>
              <button
                type="button"
                onClick={() => addActionVariant(selectedAction.id)}
                className="text-xs font-medium text-blue-400 hover:text-blue-300"
              >
                + Add variant
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {selectedAction.variants.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() =>
                    setActiveActionVariant(selectedAction.id, v.id)
                  }
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                    v.id === selectedAction.activeVariantId
                      ? "bg-blue-600 text-white"
                      : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  }`}
                >
                  {v.name}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 space-y-3 border-t border-zinc-800 pt-4">
            <Field label="Variant name">
              <input
                type="text"
                value={variant.name}
                onChange={(e) =>
                  updateActionVariant(selectedAction.id, variant.id, {
                    name: e.target.value,
                  })
                }
                className={inputClass}
              />
            </Field>
            <Field label="Action label">
              <input
                type="text"
                value={variant.label}
                placeholder="Click on Order"
                onChange={(e) =>
                  updateActionVariant(selectedAction.id, variant.id, {
                    label: e.target.value,
                  })
                }
                className={inputClass}
              />
            </Field>
            {selectedAction.variants.length > 1 ? (
              <button
                type="button"
                onClick={() =>
                  deleteActionVariant(selectedAction.id, variant.id)
                }
                className="text-xs text-red-400 hover:text-red-300"
              >
                Delete this variant
              </button>
            ) : null}
          </div>
        </div>
        <PanelFooter
          onDelete={() => deleteActionCard(selectedAction.id)}
          deleteLabel="Delete action card"
        />
      </aside>
    );
  }

  return null;
}

function PanelHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="border-b border-zinc-800 px-4 py-3">
      <p className="text-sm font-semibold text-zinc-100">{title}</p>
      {subtitle ? (
        <p className="text-xs text-zinc-500">{subtitle}</p>
      ) : null}
    </div>
  );
}

function SharedVariantEditor({
  shared,
  meta,
  onAddVariant,
  onDeleteVariant,
  onUpdateVariantName,
  onUpdateTitle,
  onUpdateDescription,
  onAddField,
  onUpdateField,
  onRemoveField,
}: {
  shared: import("@/types/appmap").SharedComponent;
  meta: (typeof COMPONENT_META)[keyof typeof COMPONENT_META];
  onAddVariant: () => void;
  onDeleteVariant: (id: string) => void;
  onUpdateVariantName: (id: string, name: string) => void;
  onUpdateTitle: (id: string, title: string) => void;
  onUpdateDescription: (id: string, description: string) => void;
  onAddField: (variantId: string) => void;
  onUpdateField: (variantId: string, index: number, value: string) => void;
  onRemoveField: (variantId: string, index: number) => void;
}) {
  const [activeId, setActiveId] = useState(shared.variants[0]?.id ?? "");
  const variant = shared.variants.find((v) => v.id === activeId) ?? shared.variants[0];

  if (!variant) return null;

  return (
    <>
      <div className="my-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
          Preview
        </p>
        <ComponentPreview
          type={shared.legoType}
          data={variant.data}
          componentBadge="component"
        />
      </div>

      <VariantEditor
        variants={shared.variants}
        activeVariantId={activeId}
        meta={meta}
        onSelectVariant={setActiveId}
        onAddVariant={onAddVariant}
        onDeleteVariant={onDeleteVariant}
        onUpdateVariantName={onUpdateVariantName}
        onUpdateTitle={onUpdateTitle}
        onUpdateDescription={onUpdateDescription}
        onAddField={onAddField}
        onUpdateField={onUpdateField}
        onRemoveField={onRemoveField}
      />
    </>
  );
}

function PanelFooter({
  onDelete,
  deleteLabel,
  secondaryAction,
}: {
  onDelete: () => void;
  deleteLabel: string;
  secondaryAction?: { label: string; onClick: () => void };
}) {
  return (
    <div className="space-y-2 border-t border-zinc-800 p-4">
      {secondaryAction ? (
        <button
          type="button"
          onClick={secondaryAction.onClick}
          className="w-full rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-900"
        >
          {secondaryAction.label}
        </button>
      ) : null}
      <button
        type="button"
        onClick={onDelete}
        className="w-full rounded-lg border border-red-900/60 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-950/40"
      >
        {deleteLabel}
      </button>
    </div>
  );
}

function VariantEditor({
  variants,
  activeVariantId,
  meta,
  onSelectVariant,
  onAddVariant,
  onDeleteVariant,
  onUpdateVariantName,
  onUpdateTitle,
  onUpdateDescription,
  onAddField,
  onUpdateField,
  onRemoveField,
}: {
  variants: import("@/types/appmap").ComponentVariant[];
  activeVariantId: string;
  meta: (typeof COMPONENT_META)[keyof typeof COMPONENT_META];
  onSelectVariant: (id: string) => void;
  onAddVariant: () => void;
  onDeleteVariant: (id: string) => void;
  onUpdateVariantName: (id: string, name: string) => void;
  onUpdateTitle: (id: string, title: string) => void;
  onUpdateDescription: (id: string, description: string) => void;
  onAddField: (variantId: string) => void;
  onUpdateField: (variantId: string, index: number, value: string) => void;
  onRemoveField: (variantId: string, index: number) => void;
}) {
  const [localActiveId, setLocalActiveId] = useState(activeVariantId);
  const variant = variants.find((v) => v.id === localActiveId) ?? variants[0];

  if (!variant) return null;

  return (
    <>
      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Variants
          </p>
          <button
            type="button"
            onClick={onAddVariant}
            className="text-xs font-medium text-blue-400 hover:text-blue-300"
          >
            + Add variant
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {variants.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => {
                setLocalActiveId(v.id);
                onSelectVariant(v.id);
              }}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                v.id === localActiveId
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              {v.name}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-3 border-t border-zinc-800 pt-4">
        <Field label="Variant name">
          <input
            type="text"
            value={variant.name}
            onChange={(e) => onUpdateVariantName(variant.id, e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Title">
          <input
            type="text"
            value={variant.data.title}
            onChange={(e) => onUpdateTitle(variant.id, e.target.value)}
            className={inputClass}
          />
        </Field>

        {meta.showDescription ? (
          <Field label="Description">
            <textarea
              value={variant.data.description}
              onChange={(e) =>
                onUpdateDescription(variant.id, e.target.value)
              }
              rows={2}
              className={inputClass}
            />
          </Field>
        ) : null}

        {meta.showFields ? (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium text-zinc-500">Data fields</p>
              <button
                type="button"
                onClick={() => onAddField(variant.id)}
                className="text-xs font-medium text-blue-400 hover:text-blue-300"
              >
                + Add field
              </button>
            </div>
            <div className="space-y-2">
              {variant.data.fields.map((field, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={field}
                    onChange={(e) =>
                      onUpdateField(variant.id, index, e.target.value)
                    }
                    placeholder="Field name"
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => onRemoveField(variant.id, index)}
                    className="shrink-0 rounded-lg px-2 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-red-400"
                    aria-label="Remove field"
                  >
                    ×
                  </button>
                </div>
              ))}
              {variant.data.fields.length === 0 ? (
                <p className="text-xs text-zinc-600">
                  No fields yet — add data points like Order ID, Status…
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {variants.length > 1 ? (
          <button
            type="button"
            onClick={() => onDeleteVariant(variant.id)}
            className="text-xs text-red-400 hover:text-red-300"
          >
            Delete this variant
          </button>
        ) : null}
      </div>
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-xs font-medium text-zinc-500">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";
