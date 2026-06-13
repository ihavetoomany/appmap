"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  getComponentAnchor,
  getViewAnchor,
  midpointBetweenAnchors,
} from "@/lib/canvas-geometry";
import {
  type ActionCard,
  type ActionCardVariant,
  type CanvasTransform,
  type ChildComponentType,
  type ComponentData,
  type ComponentType,
  type ComponentVariant,
  type MapComponent,
  type Selection,
  type View,
  canBeActionSource,
  childrenInSection,
  defaultActionVariant,
  defaultVariant,
  isPageSection,
  pageSectionsInView,
} from "@/types/appmap";

interface AppMapStore {
  views: View[];
  components: MapComponent[];
  actionCards: ActionCard[];
  selection: Selection;
  canvas: CanvasTransform;
  sidePanelOpen: boolean;

  setCanvas: (canvas: Partial<CanvasTransform>) => void;
  select: (selection: Selection) => void;
  clearSelection: () => void;
  setSidePanelOpen: (open: boolean) => void;

  addView: (name?: string) => string;
  updateView: (id: string, patch: Partial<View>) => void;
  deleteView: (id: string) => void;
  moveView: (id: string, x: number, y: number) => void;

  addPageSection: (viewId: string) => string;
  addChildComponent: (pageSectionId: string, type: ChildComponentType) => string;
  updateComponent: (id: string, patch: Partial<MapComponent>) => void;
  deleteComponent: (id: string) => void;
  reorderPageSection: (viewId: string, sectionId: string, toIndex: number) => void;
  reorderChildComponent: (
    pageSectionId: string,
    componentId: string,
    toIndex: number
  ) => void;
  moveSectionToView: (sectionId: string, targetViewId: string) => void;

  addActionCard: () => string | null;
  updateActionCard: (id: string, patch: Partial<ActionCard>) => void;
  deleteActionCard: (id: string) => void;
  moveActionCard: (id: string, x: number, y: number) => void;

  addActionVariant: (actionId: string, name?: string) => void;
  updateActionVariant: (
    actionId: string,
    variantId: string,
    patch: Partial<ActionCardVariant>
  ) => void;
  deleteActionVariant: (actionId: string, variantId: string) => void;
  setActiveActionVariant: (actionId: string, variantId: string) => void;

  addVariant: (componentId: string, name?: string) => void;
  updateVariant: (
    componentId: string,
    variantId: string,
    patch: Partial<ComponentVariant>
  ) => void;
  deleteVariant: (componentId: string, variantId: string) => void;
  setActiveVariant: (componentId: string, variantId: string) => void;
  updateVariantData: (
    componentId: string,
    variantId: string,
    patch: Partial<ComponentData>
  ) => void;
  updateVariantField: (
    componentId: string,
    variantId: string,
    fieldIndex: number,
    value: string
  ) => void;
  addVariantField: (componentId: string, variantId: string) => void;
  removeVariantField: (
    componentId: string,
    variantId: string,
    fieldIndex: number
  ) => void;
}

const DEFAULT_VIEW: Omit<View, "id"> = {
  name: "Screen Name",
  description: "Details about the screen",
  x: 120,
  y: 120,
  width: 320,
};

function pruneActions(
  actions: ActionCard[],
  components: MapComponent[],
  views: View[]
): ActionCard[] {
  return actions.filter((a) => {
    const source = components.find((c) => c.id === a.sourceComponentId);
    const target = views.find((v) => v.id === a.targetViewId);
    return (
      source &&
      canBeActionSource(source) &&
      target &&
      source.viewId !== target.id
    );
  });
}

export const useAppMapStore = create<AppMapStore>()(
  persist(
    (set, get) => ({
      views: [],
      components: [],
      actionCards: [],
      selection: null,
      canvas: { x: 0, y: 0, zoom: 1 },
      sidePanelOpen: true,

      setCanvas: (canvas) =>
        set((s) => ({ canvas: { ...s.canvas, ...canvas } })),

      select: (selection) => set({ selection, sidePanelOpen: true }),
      clearSelection: () => set({ selection: null }),
      setSidePanelOpen: (open) => set({ sidePanelOpen: open }),

      addView: (name) => {
        const id = crypto.randomUUID();
        const count = get().views.length;
        set((s) => ({
          views: [
            ...s.views,
            {
              ...DEFAULT_VIEW,
              id,
              name: name ?? `Screen ${count + 1}`,
              x: DEFAULT_VIEW.x + count * 48,
              y: DEFAULT_VIEW.y + count * 48,
            },
          ],
          selection: { kind: "view", id },
        }));
        return id;
      },

      updateView: (id, patch) =>
        set((s) => ({
          views: s.views.map((v) => (v.id === id ? { ...v, ...patch } : v)),
        })),

      deleteView: (id) =>
        set((s) => {
          const components = s.components.filter((c) => c.viewId !== id);
          const actionCards = pruneActions(
            s.actionCards.filter((a) => {
              const source = s.components.find(
                (c) => c.id === a.sourceComponentId
              );
              return source?.viewId !== id && a.targetViewId !== id;
            }),
            components,
            s.views.filter((v) => v.id !== id)
          );
          const sel = s.selection;
          let selection = sel;
          if (sel?.kind === "view" && sel.id === id) selection = null;
          else if (sel?.kind === "component") {
            const c = s.components.find((x) => x.id === sel.id);
            if (c?.viewId === id) selection = null;
          } else if (
            sel?.kind === "action" &&
            !actionCards.some((a) => a.id === sel.id)
          ) {
            selection = null;
          }
          return {
            views: s.views.filter((v) => v.id !== id),
            components,
            actionCards,
            selection,
          };
        }),

      moveView: (id, x, y) =>
        set((s) => ({
          views: s.views.map((v) => (v.id === id ? { ...v, x, y } : v)),
        })),

      addPageSection: (viewId) => {
        const id = crypto.randomUUID();
        const variant = defaultVariant("page-section");
        const existing = pageSectionsInView(get().components, viewId);
        const section: MapComponent = {
          id,
          viewId,
          pageSectionId: null,
          type: "page-section",
          order: existing.length,
          variants: [variant],
          activeVariantId: variant.id,
        };
        set((s) => ({
          components: [...s.components, section],
          selection: { kind: "component", id },
        }));
        return id;
      },

      addChildComponent: (pageSectionId, type) => {
        const section = get().components.find((c) => c.id === pageSectionId);
        if (!section || !isPageSection(section)) return "";
        const id = crypto.randomUUID();
        const variant = defaultVariant(type);
        const existing = childrenInSection(get().components, pageSectionId);
        const component: MapComponent = {
          id,
          viewId: section.viewId,
          pageSectionId,
          type,
          order: existing.length,
          variants: [variant],
          activeVariantId: variant.id,
        };
        set((s) => ({
          components: [...s.components, component],
          selection: { kind: "component", id },
        }));
        return id;
      },

      updateComponent: (id, patch) =>
        set((s) => ({
          components: s.components.map((c) =>
            c.id === id ? { ...c, ...patch } : c
          ),
        })),

      deleteComponent: (id) =>
        set((s) => {
          const target = s.components.find((c) => c.id === id);
          if (!target) return s;

          let components = s.components.filter((c) => c.id !== id);

          if (isPageSection(target)) {
            components = components.filter((c) => c.pageSectionId !== id);
            const sections = pageSectionsInView(components, target.viewId);
            components = components.map((c) => {
              if (!isPageSection(c) || c.viewId !== target.viewId) return c;
              const idx = sections.findIndex((sec) => sec.id === c.id);
              return idx >= 0 ? { ...c, order: idx } : c;
            });
          } else if (target.pageSectionId) {
            components = components.map((c) => {
              if (c.pageSectionId !== target.pageSectionId || c.order <= target.order)
                return c;
              return { ...c, order: c.order - 1 };
            });
          }

          const actionCards = s.actionCards.filter(
            (a) => a.sourceComponentId !== id
          );

          return {
            components,
            actionCards,
            selection:
              s.selection?.kind === "component" && s.selection.id === id
                ? null
                : s.selection?.kind === "action" &&
                    !actionCards.some((a) => a.id === s.selection!.id)
                  ? null
                  : s.selection,
          };
        }),

      reorderPageSection: (viewId, sectionId, toIndex) =>
        set((s) => {
          const sorted = pageSectionsInView(s.components, viewId);
          const fromIndex = sorted.findIndex((c) => c.id === sectionId);
          if (fromIndex < 0 || fromIndex === toIndex) return s;
          const reordered = [...sorted];
          const [moved] = reordered.splice(fromIndex, 1);
          reordered.splice(toIndex, 0, moved);
          const orderMap = new Map(
            reordered.map((c, index) => [c.id, index] as const)
          );
          return {
            components: s.components.map((c) =>
              c.viewId === viewId && isPageSection(c) && orderMap.has(c.id)
                ? { ...c, order: orderMap.get(c.id)! }
                : c
            ),
          };
        }),

      reorderChildComponent: (pageSectionId, componentId, toIndex) =>
        set((s) => {
          const sorted = childrenInSection(s.components, pageSectionId);
          const fromIndex = sorted.findIndex((c) => c.id === componentId);
          if (fromIndex < 0 || fromIndex === toIndex) return s;
          const reordered = [...sorted];
          const [moved] = reordered.splice(fromIndex, 1);
          reordered.splice(toIndex, 0, moved);
          const orderMap = new Map(
            reordered.map((c, index) => [c.id, index] as const)
          );
          return {
            components: s.components.map((c) =>
              c.pageSectionId === pageSectionId && orderMap.has(c.id)
                ? { ...c, order: orderMap.get(c.id)! }
                : c
            ),
          };
        }),

      moveSectionToView: (sectionId, targetViewId) =>
        set((s) => {
          const section = s.components.find((c) => c.id === sectionId);
          if (!section || !isPageSection(section)) return s;
          if (section.viewId === targetViewId) return s;

          const targetIndex = pageSectionsInView(s.components, targetViewId).length;
          const components = applySectionDrop(
            s.components,
            section,
            `view:${targetViewId}`,
            targetIndex
          );
          return { components };
        }),

      addActionCard: () => {
        const { views, components, selection } = get();
        if (views.length < 2) return null;
        if (selection?.kind !== "component") return null;

        const source = components.find((c) => c.id === selection.id);
        if (!source || !canBeActionSource(source)) return null;

        const target = views.find((v) => v.id !== source.viewId);
        if (!target) return null;

        const sourceView = views.find((v) => v.id === source.viewId)!;
        const sourceAnchor = getComponentAnchor(sourceView, source, components);
        const targetAnchor = getViewAnchor(target, components, "left");
        if (!sourceAnchor) return null;

        const pos = midpointBetweenAnchors(sourceAnchor, targetAnchor);
        const variant = defaultActionVariant();
        const id = crypto.randomUUID();

        const action: ActionCard = {
          id,
          sourceComponentId: source.id,
          targetViewId: target.id,
          x: pos.x,
          y: pos.y,
          variants: [variant],
          activeVariantId: variant.id,
        };

        set((s) => ({
          actionCards: [...s.actionCards, action],
          selection: { kind: "action", id },
        }));
        return id;
      },

      updateActionCard: (id, patch) =>
        set((s) => {
          const next = s.actionCards.map((a) =>
            a.id === id ? { ...a, ...patch } : a
          );
          return {
            actionCards: pruneActions(next, s.components, s.views),
          };
        }),

      deleteActionCard: (id) =>
        set((s) => ({
          actionCards: s.actionCards.filter((a) => a.id !== id),
          selection:
            s.selection?.kind === "action" && s.selection.id === id
              ? null
              : s.selection,
        })),

      moveActionCard: (id, x, y) =>
        set((s) => ({
          actionCards: s.actionCards.map((a) =>
            a.id === id ? { ...a, x, y } : a
          ),
        })),

      addActionVariant: (actionId, name) =>
        set((s) => ({
          actionCards: s.actionCards.map((a) => {
            if (a.id !== actionId) return a;
            const source =
              a.variants.find((v) => v.id === a.activeVariantId) ??
              a.variants[0];
            const variant: ActionCardVariant = {
              id: crypto.randomUUID(),
              name: name ?? `Variant ${a.variants.length + 1}`,
              label: source.label,
            };
            return {
              ...a,
              variants: [...a.variants, variant],
              activeVariantId: variant.id,
            };
          }),
        })),

      updateActionVariant: (actionId, variantId, patch) =>
        set((s) => ({
          actionCards: s.actionCards.map((a) => {
            if (a.id !== actionId) return a;
            return {
              ...a,
              variants: a.variants.map((v) =>
                v.id === variantId ? { ...v, ...patch } : v
              ),
            };
          }),
        })),

      deleteActionVariant: (actionId, variantId) =>
        set((s) => ({
          actionCards: s.actionCards.map((a) => {
            if (a.id !== actionId || a.variants.length <= 1) return a;
            const nextVariants = a.variants.filter((v) => v.id !== variantId);
            return {
              ...a,
              variants: nextVariants,
              activeVariantId:
                a.activeVariantId === variantId
                  ? nextVariants[0].id
                  : a.activeVariantId,
            };
          }),
        })),

      setActiveActionVariant: (actionId, variantId) =>
        set((s) => ({
          actionCards: s.actionCards.map((a) =>
            a.id === actionId ? { ...a, activeVariantId: variantId } : a
          ),
        })),

      addVariant: (componentId, name) =>
        set((s) => ({
          components: s.components.map((c) => {
            if (c.id !== componentId) return c;
            const source =
              c.variants.find((v) => v.id === c.activeVariantId) ??
              c.variants[0];
            const variant: ComponentVariant = {
              id: crypto.randomUUID(),
              name: name ?? `Variant ${c.variants.length + 1}`,
              data: {
                title: source.data.title,
                description: source.data.description,
                fields: [...source.data.fields],
              },
            };
            return {
              ...c,
              variants: [...c.variants, variant],
              activeVariantId: variant.id,
            };
          }),
        })),

      updateVariant: (componentId, variantId, patch) =>
        set((s) => ({
          components: s.components.map((c) => {
            if (c.id !== componentId) return c;
            return {
              ...c,
              variants: c.variants.map((v) =>
                v.id === variantId ? { ...v, ...patch } : v
              ),
            };
          }),
        })),

      deleteVariant: (componentId, variantId) =>
        set((s) => ({
          components: s.components.map((c) => {
            if (c.id !== componentId || c.variants.length <= 1) return c;
            const nextVariants = c.variants.filter((v) => v.id !== variantId);
            return {
              ...c,
              variants: nextVariants,
              activeVariantId:
                c.activeVariantId === variantId
                  ? nextVariants[0].id
                  : c.activeVariantId,
            };
          }),
        })),

      setActiveVariant: (componentId, variantId) =>
        set((s) => ({
          components: s.components.map((c) =>
            c.id === componentId ? { ...c, activeVariantId: variantId } : c
          ),
        })),

      updateVariantData: (componentId, variantId, patch) =>
        set((s) => ({
          components: s.components.map((c) => {
            if (c.id !== componentId) return c;
            return {
              ...c,
              variants: c.variants.map((v) =>
                v.id === variantId
                  ? { ...v, data: { ...v.data, ...patch } }
                  : v
              ),
            };
          }),
        })),

      updateVariantField: (componentId, variantId, fieldIndex, value) =>
        set((s) => ({
          components: s.components.map((c) => {
            if (c.id !== componentId) return c;
            return {
              ...c,
              variants: c.variants.map((v) => {
                if (v.id !== variantId) return v;
                const fields = [...v.data.fields];
                fields[fieldIndex] = value;
                return { ...v, data: { ...v.data, fields } };
              }),
            };
          }),
        })),

      addVariantField: (componentId, variantId) =>
        set((s) => ({
          components: s.components.map((c) => {
            if (c.id !== componentId) return c;
            return {
              ...c,
              variants: c.variants.map((v) =>
                v.id === variantId
                  ? {
                      ...v,
                      data: {
                        ...v.data,
                        fields: [...v.data.fields, "New field"],
                      },
                    }
                  : v
              ),
            };
          }),
        })),

      removeVariantField: (componentId, variantId, fieldIndex) =>
        set((s) => ({
          components: s.components.map((c) => {
            if (c.id !== componentId) return c;
            return {
              ...c,
              variants: c.variants.map((v) => {
                if (v.id !== variantId) return v;
                return {
                  ...v,
                  data: {
                    ...v.data,
                    fields: v.data.fields.filter((_, i) => i !== fieldIndex),
                  },
                };
              }),
            };
          }),
        })),
    }),
    {
      name: "appmap-editor-v5",
      migrate: (persisted) => {
        const state = persisted as {
          components?: MapComponent[];
        };
        if (state.components) {
          state.components = state.components.map((c) =>
            (c.type as string) === "component" ? { ...c, type: "item" } : c
          );
        }
        return persisted;
      },
      partialize: (s) => ({
        views: s.views,
        components: s.components,
        actionCards: s.actionCards,
        canvas: s.canvas,
      }),
    }
  )
);

export function getActiveVariant(component: MapComponent): ComponentVariant {
  return (
    component.variants.find((v) => v.id === component.activeVariantId) ??
    component.variants[0]
  );
}

export function getActiveActionVariant(action: ActionCard): ActionCardVariant {
  return (
    action.variants.find((v) => v.id === action.activeVariantId) ??
    action.variants[0]
  );
}

export function changeComponentType(
  component: MapComponent,
  type: ComponentType
): MapComponent | null {
  if (isPageSection(component) && type !== "page-section") return null;
  if (!isPageSection(component) && type === "page-section") return null;
  const variant = defaultVariant(type);
  return {
    ...component,
    type,
    variants: [variant],
    activeVariantId: variant.id,
  };
}

export {
  childrenInSection,
  pageSectionsInView,
} from "@/types/appmap";

function reindexSections(
  components: MapComponent[],
  viewId: string
): MapComponent[] {
  const sections = pageSectionsInView(components, viewId);
  return components.map((c) => {
    if (!isPageSection(c) || c.viewId !== viewId) return c;
    const idx = sections.findIndex((s) => s.id === c.id);
    return idx >= 0 ? { ...c, order: idx } : c;
  });
}

function applySectionDrop(
  components: MapComponent[],
  section: MapComponent,
  dropTarget: string,
  forcedIndex?: number
): MapComponent[] {
  const fromViewId = section.viewId;
  let targetViewId = fromViewId;
  let targetIndex = section.order;

  if (dropTarget.startsWith("view:")) {
    targetViewId = dropTarget.replace(/^view:/, "").replace(/:append-section$/, "");
    const sections = pageSectionsInView(components, targetViewId).filter(
      (s) => s.id !== section.id
    );
    targetIndex = forcedIndex ?? sections.length;
  } else if (dropTarget.endsWith(":before")) {
    const refId = dropTarget.slice(8, -7);
    const ref = components.find((c) => c.id === refId);
    if (!ref || !isPageSection(ref)) return components;
    targetViewId = ref.viewId;
    targetIndex = ref.order;
    if (targetViewId === fromViewId && section.order < targetIndex) {
      targetIndex -= 1;
    }
  } else if (dropTarget.endsWith(":after")) {
    const refId = dropTarget.slice(8, -6);
    const ref = components.find((c) => c.id === refId);
    if (!ref || !isPageSection(ref)) return components;
    targetViewId = ref.viewId;
    targetIndex = ref.order + 1;
    if (targetViewId === fromViewId && section.order < targetIndex) {
      targetIndex -= 1;
    }
  } else {
    return components;
  }

  let next = components.map((c) => {
    if (c.id === section.id) {
      return { ...c, viewId: targetViewId, order: targetIndex };
    }
    if (c.pageSectionId === section.id) {
      return { ...c, viewId: targetViewId };
    }
    return c;
  });

  next = reindexSections(next, fromViewId);
  if (targetViewId !== fromViewId) {
    next = reindexSections(next, targetViewId);
  } else {
    next = reindexSections(next, targetViewId);
  }

  return next;
}
