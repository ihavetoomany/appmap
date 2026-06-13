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
  type SharedComponent,
  type SharedSectionChildTemplate,
  type View,
  COMPONENT_META,
  canBeActionSource,
  canConvertToShared,
  childrenInSection,
  defaultActionVariant,
  defaultDataForType,
  defaultVariant,
  findSharedComponent,
  isPageSection,
  isSharedPageSectionInstance,
  pageSectionsInView,
  resolveLegoType,
  resolveVariants,
} from "@/types/appmap";

interface AppMapStore {
  views: View[];
  components: MapComponent[];
  sharedComponents: SharedComponent[];
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

  convertToSharedComponent: (mapComponentId: string) => string | null;
  detachFromSharedComponent: (mapComponentId: string) => void;
  addSharedInstance: (sharedComponentId: string) => string | null;
  updateSharedComponent: (id: string, patch: Partial<SharedComponent>) => void;
  deleteSharedComponent: (id: string) => void;

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

  addSharedVariant: (sharedId: string, name?: string) => void;
  updateSharedVariant: (
    sharedId: string,
    variantId: string,
    patch: Partial<ComponentVariant>
  ) => void;
  deleteSharedVariant: (sharedId: string, variantId: string) => void;
  updateSharedVariantData: (
    sharedId: string,
    variantId: string,
    patch: Partial<ComponentData>
  ) => void;
  updateSharedVariantField: (
    sharedId: string,
    variantId: string,
    fieldIndex: number,
    value: string
  ) => void;
  addSharedVariantField: (sharedId: string, variantId: string) => void;
  removeSharedVariantField: (
    sharedId: string,
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

function cloneVariants(variants: ComponentVariant[]): ComponentVariant[] {
  return variants.map((v) => ({
    ...v,
    data: { ...v.data, fields: [...v.data.fields] },
  }));
}

function spawnEmbeddedChildInstance(
  section: MapComponent,
  parentSharedId: string,
  template: SharedSectionChildTemplate,
  instanceId = crypto.randomUUID()
): MapComponent | null {
  if (template.variants.length === 0) return null;
  return {
    id: instanceId,
    viewId: section.viewId,
    pageSectionId: section.id,
    type: template.legoType,
    order: template.order,
    sharedComponentId: parentSharedId,
    sharedChildTemplateId: template.id,
    variants: [],
    activeVariantId: template.variants[0].id,
  };
}

function sharedPageSectionInstances(
  parentSharedId: string,
  components: MapComponent[]
): MapComponent[] {
  return components.filter(
    (c) =>
      c.sharedComponentId === parentSharedId &&
      !c.sharedChildTemplateId &&
      isPageSection(c)
  );
}

function reindexEmbeddedChildOrders(
  components: MapComponent[],
  parentSharedId: string,
  childTemplates: SharedSectionChildTemplate[]
): MapComponent[] {
  const orderByTemplateId = new Map(
    childTemplates.map((template) => [template.id, template.order] as const)
  );
  return components.map((c) => {
    if (
      c.sharedComponentId !== parentSharedId ||
      !c.sharedChildTemplateId ||
      !c.pageSectionId
    ) {
      return c;
    }
    const order = orderByTemplateId.get(c.sharedChildTemplateId);
    return order === undefined ? c : { ...c, order };
  });
}
function spawnSectionChildInstances(
  sectionId: string,
  viewId: string,
  parentSharedId: string,
  children: SharedSectionChildTemplate[]
): MapComponent[] {
  const section: MapComponent = {
    id: sectionId,
    viewId,
    pageSectionId: null,
    type: "page-section",
    order: 0,
    variants: [],
    activeVariantId: "",
  };
  return children
    .slice()
    .sort((a, b) => a.order - b.order)
    .flatMap((template) => {
      const instance = spawnEmbeddedChildInstance(
        section,
        parentSharedId,
        template
      );
      return instance ? [instance] : [];
    });
}

function pruneOrphanedSharedComponents(
  sharedComponents: SharedComponent[],
  components: MapComponent[]
): SharedComponent[] {
  return sharedComponents.filter((sc) => {
    const directRefs = components.some(
      (c) => c.sharedComponentId === sc.id && !c.sharedChildTemplateId
    );
    return directRefs;
  });
}

function patchEmbeddedChildVariants(
  sharedComponents: SharedComponent[],
  parentSharedId: string,
  templateId: string,
  patchFn: (variants: ComponentVariant[]) => ComponentVariant[]
): SharedComponent[] {
  return sharedComponents.map((sc) =>
    sc.id === parentSharedId
      ? {
          ...sc,
          children: sc.children?.map((ch) =>
            ch.id === templateId
              ? { ...ch, variants: patchFn(ch.variants) }
              : ch
          ),
        }
      : sc
  );
}

function patchComponentVariants(
  state: { components: MapComponent[]; sharedComponents: SharedComponent[] },
  componentId: string,
  patchFn: (variants: ComponentVariant[]) => ComponentVariant[]
): { components: MapComponent[]; sharedComponents: SharedComponent[] } | null {
  const c = state.components.find((x) => x.id === componentId);
  if (!c) return null;

  if (c.sharedChildTemplateId && c.sharedComponentId) {
    return {
      sharedComponents: patchEmbeddedChildVariants(
        state.sharedComponents,
        c.sharedComponentId,
        c.sharedChildTemplateId,
        patchFn
      ),
      components: state.components,
    };
  }

  if (c.sharedComponentId) {
    return {
      sharedComponents: state.sharedComponents.map((sc) =>
        sc.id === c.sharedComponentId
          ? { ...sc, variants: patchFn(sc.variants) }
          : sc
      ),
      components: state.components,
    };
  }

  return {
    components: state.components.map((x) =>
      x.id === componentId ? { ...x, variants: patchFn(x.variants) } : x
    ),
    sharedComponents: state.sharedComponents,
  };
}

function patchSharedVariants(
  sharedComponents: SharedComponent[],
  sharedId: string,
  patchFn: (variants: ComponentVariant[]) => ComponentVariant[]
): SharedComponent[] {
  return sharedComponents.map((sc) =>
    sc.id === sharedId ? { ...sc, variants: patchFn(sc.variants) } : sc
  );
}

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
      sharedComponents: [],
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
        const { components, sharedComponents } = get();
        const section = components.find((c) => c.id === pageSectionId);
        if (!section || !isPageSection(section)) return "";

        const id = crypto.randomUUID();
        const variant = defaultVariant(type);

        if (isSharedPageSectionInstance(section)) {
          const parentSharedId = section.sharedComponentId!;
          const parentShared = findSharedComponent(
            parentSharedId,
            sharedComponents
          );
          const order = parentShared?.children?.length ?? 0;
          const templateId = crypto.randomUUID();
          const template: SharedSectionChildTemplate = {
            id: templateId,
            legoType: type,
            order,
            variants: [variant],
          };

          set((s) => {
            const nextSharedComponents = s.sharedComponents.map((sc) =>
              sc.id === parentSharedId
                ? { ...sc, children: [...(sc.children ?? []), template] }
                : sc
            );
            const sections = sharedPageSectionInstances(
              parentSharedId,
              s.components
            );
            const newChildren = sections.flatMap((sec) => {
              const instance = spawnEmbeddedChildInstance(
                sec,
                parentSharedId,
                template,
                sec.id === pageSectionId ? id : crypto.randomUUID()
              );
              return instance ? [instance] : [];
            });

            return {
              sharedComponents: nextSharedComponents,
              components: [...s.components, ...newChildren],
              selection: { kind: "component", id },
            };
          });
          return id;
        }

        const existing = childrenInSection(components, pageSectionId);
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

          if (
            target.sharedChildTemplateId &&
            target.sharedComponentId &&
            target.pageSectionId
          ) {
            const templateId = target.sharedChildTemplateId;
            const parentSharedId = target.sharedComponentId;
            const removedIds = s.components
              .filter(
                (c) =>
                  c.sharedComponentId === parentSharedId &&
                  c.sharedChildTemplateId === templateId
              )
              .map((c) => c.id);

            const nextSharedComponents = s.sharedComponents.map((sc) => {
              if (sc.id !== parentSharedId) return sc;
              const nextChildren = (sc.children ?? [])
                .filter((ch) => ch.id !== templateId)
                .sort((a, b) => a.order - b.order)
                .map((ch, index) => ({ ...ch, order: index }));
              return { ...sc, children: nextChildren };
            });

            const parentShared = nextSharedComponents.find(
              (sc) => sc.id === parentSharedId
            );
            let components = s.components.filter(
              (c) => !removedIds.includes(c.id)
            );
            if (parentShared?.children) {
              components = reindexEmbeddedChildOrders(
                components,
                parentSharedId,
                parentShared.children
              );
            }

            const actionCards = s.actionCards.filter(
              (a) => !removedIds.includes(a.sourceComponentId)
            );

            return {
              sharedComponents: nextSharedComponents,
              components,
              actionCards,
              selection:
                s.selection?.kind === "component" &&
                removedIds.includes(s.selection.id)
                  ? null
                  : s.selection?.kind === "action" &&
                      !actionCards.some((a) => a.id === s.selection!.id)
                    ? null
                    : s.selection,
            };
          }

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

      convertToSharedComponent: (mapComponentId) => {
        const { components, sharedComponents } = get();
        const c = components.find((x) => x.id === mapComponentId);
        if (!c || !canConvertToShared(c)) return null;

        const variants = cloneVariants(resolveVariants(c, sharedComponents));
        const active =
          variants.find((v) => v.id === c.activeVariantId) ?? variants[0];
        if (!active) return null;

        const id = crypto.randomUUID();
        const embeddedChildren: SharedSectionChildTemplate[] = [];
        const childPatches = new Map<
          string,
          Pick<
            MapComponent,
            | "sharedComponentId"
            | "sharedChildTemplateId"
            | "type"
            | "variants"
            | "activeVariantId"
          >
        >();
        const absorbedSharedIds = new Set<string>();

        if (isPageSection(c)) {
          for (const child of childrenInSection(components, c.id)) {
            const templateId = crypto.randomUUID();
            const childVariants = cloneVariants(
              resolveVariants(child, sharedComponents)
            );
            const legoType = resolveLegoType(
              child,
              sharedComponents
            ) as ChildComponentType;
            const activeVariantId =
              childVariants.find((v) => v.id === child.activeVariantId)?.id ??
              childVariants[0]?.id ??
              "";

            embeddedChildren.push({
              id: templateId,
              legoType,
              order: child.order,
              variants: childVariants,
            });

            if (child.sharedComponentId && !child.sharedChildTemplateId) {
              absorbedSharedIds.add(child.sharedComponentId);
            }

            childPatches.set(child.id, {
              sharedComponentId: id,
              sharedChildTemplateId: templateId,
              type: legoType,
              variants: [],
              activeVariantId,
            });
          }
        }

        const shared: SharedComponent = {
          id,
          name:
            active.data.title ||
            (c.type === "page-section" ? "Page Section" : "Item"),
          legoType: c.type as SharedComponent["legoType"],
          variants,
          children: isPageSection(c) ? embeddedChildren : undefined,
        };

        set((s) => {
          const nextComponents = s.components.map((x) => {
            const childPatch = childPatches.get(x.id);
            if (childPatch) return { ...x, ...childPatch };
            if (x.id === mapComponentId) {
              return {
                ...x,
                sharedComponentId: id,
                sharedChildTemplateId: null,
                type: shared.legoType,
                variants: [],
                activeVariantId: active.id,
              };
            }
            return x;
          });

          let nextShared = [
            ...s.sharedComponents.filter((sc) => !absorbedSharedIds.has(sc.id)),
            shared,
          ];
          nextShared = pruneOrphanedSharedComponents(nextShared, nextComponents);

          return {
            sharedComponents: nextShared,
            components: nextComponents,
            selection: { kind: "shared-component", id },
          };
        });
        return id;
      },

      detachFromSharedComponent: (mapComponentId) =>
        set((s) => {
          const c = s.components.find((x) => x.id === mapComponentId);
          if (!c?.sharedComponentId) return s;

          const shared = findSharedComponent(
            c.sharedComponentId,
            s.sharedComponents
          );
          if (!shared) return s;

          const childIds = isPageSection(c)
            ? childrenInSection(s.components, c.id).map((child) => child.id)
            : [];

          return {
            components: s.components.map((x) => {
              if (x.id === mapComponentId) {
                const sectionVariants = cloneVariants(shared.variants);
                const sectionActiveId = sectionVariants.some(
                  (v) => v.id === x.activeVariantId
                )
                  ? x.activeVariantId
                  : (sectionVariants[0]?.id ?? "");
                return {
                  ...x,
                  sharedComponentId: null,
                  sharedChildTemplateId: null,
                  type: shared.legoType,
                  variants: sectionVariants,
                  activeVariantId: sectionActiveId,
                };
              }

              if (childIds.includes(x.id) && x.sharedChildTemplateId) {
                const template = shared.children?.find(
                  (t) => t.id === x.sharedChildTemplateId
                );
                if (!template) return x;
                const childVariants = cloneVariants(template.variants);
                const childActiveId = childVariants.some(
                  (v) => v.id === x.activeVariantId
                )
                  ? x.activeVariantId
                  : (childVariants[0]?.id ?? "");
                return {
                  ...x,
                  sharedComponentId: null,
                  sharedChildTemplateId: null,
                  type: template.legoType,
                  variants: childVariants,
                  activeVariantId: childActiveId,
                };
              }

              return x;
            }),
          };
        }),

      addSharedInstance: (sharedComponentId) => {
        const { sharedComponents, components, views, selection } = get();
        const shared = findSharedComponent(sharedComponentId, sharedComponents);
        if (!shared || shared.variants.length === 0) return null;

        const selectedComponent =
          selection?.kind === "component"
            ? components.find((c) => c.id === selection.id)
            : null;

        const targetViewId =
          selection?.kind === "view"
            ? selection.id
            : (selectedComponent?.viewId ?? views[0]?.id);

        const defaultVariantId = shared.variants[0].id;

        if (shared.legoType === "page-section") {
          if (!targetViewId) return null;
          const id = crypto.randomUUID();
          const existing = pageSectionsInView(components, targetViewId);
          const section: MapComponent = {
            id,
            viewId: targetViewId,
            pageSectionId: null,
            type: "page-section",
            order: existing.length,
            sharedComponentId: shared.id,
            variants: [],
            activeVariantId: defaultVariantId,
          };
          const childInstances = spawnSectionChildInstances(
            id,
            targetViewId,
            shared.id,
            shared.children ?? []
          );
          set((s) => ({
            components: [...s.components, section, ...childInstances],
            selection: { kind: "component", id },
          }));
          return id;
        }

        const targetPageSectionId =
          selectedComponent && isPageSection(selectedComponent)
            ? selectedComponent.id
            : (selectedComponent?.pageSectionId ??
              components.find(
                (c) => c.viewId === targetViewId && isPageSection(c)
              )?.id);

        if (!targetPageSectionId) return null;
        const section = components.find((c) => c.id === targetPageSectionId);
        if (!section) return null;

        const id = crypto.randomUUID();
        const existing = childrenInSection(components, targetPageSectionId);
        const component: MapComponent = {
          id,
          viewId: section.viewId,
          pageSectionId: targetPageSectionId,
          type: shared.legoType,
          order: existing.length,
          sharedComponentId: shared.id,
          variants: [],
          activeVariantId: defaultVariantId,
        };
        set((s) => ({
          components: [...s.components, component],
          selection: { kind: "component", id },
        }));
        return id;
      },

      updateSharedComponent: (id, patch) =>
        set((s) => ({
          sharedComponents: s.sharedComponents.map((sc) =>
            sc.id === id ? { ...sc, ...patch } : sc
          ),
        })),

      deleteSharedComponent: (id) =>
        set((s) => {
          const shared = findSharedComponent(id, s.sharedComponents);
          if (!shared) return s;

          const sectionVariants = cloneVariants(shared.variants);
          const components = s.components.map((c) => {
            if (c.sharedComponentId !== id) return c;

            if (c.sharedChildTemplateId) {
              const template = shared.children?.find(
                (t) => t.id === c.sharedChildTemplateId
              );
              if (!template) return c;
              const childVariants = cloneVariants(template.variants);
              const activeId = childVariants.some(
                (v) => v.id === c.activeVariantId
              )
                ? c.activeVariantId
                : (childVariants[0]?.id ?? "");
              return {
                ...c,
                sharedComponentId: null,
                sharedChildTemplateId: null,
                type: template.legoType,
                variants: childVariants,
                activeVariantId: activeId,
              };
            }

            const activeId = sectionVariants.some(
              (v) => v.id === c.activeVariantId
            )
              ? c.activeVariantId
              : (sectionVariants[0]?.id ?? "");
            return {
              ...c,
              sharedComponentId: null,
              sharedChildTemplateId: null,
              type: shared.legoType,
              variants: sectionVariants,
              activeVariantId: activeId,
            };
          });

          return {
            sharedComponents: s.sharedComponents.filter((sc) => sc.id !== id),
            components,
            selection:
              s.selection?.kind === "shared-component" && s.selection.id === id
                ? null
                : s.selection,
          };
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
        set((s) => {
          const c = s.components.find((x) => x.id === componentId);
          if (!c) return s;

          const sourceVariants = resolveVariants(c, s.sharedComponents);
          const source =
            sourceVariants.find((v) => v.id === c.activeVariantId) ??
            sourceVariants[0];
          const variant: ComponentVariant = {
            id: crypto.randomUUID(),
            name: name ?? `Variant ${sourceVariants.length + 1}`,
            data: {
              title: source.data.title,
              description: source.data.description,
              fields: [...source.data.fields],
            },
          };

          const patched = patchComponentVariants(s, componentId, (variants) => [
            ...variants,
            variant,
          ]);
          if (!patched) return s;

          return {
            ...patched,
            components: patched.components.map((x) =>
              x.id === componentId ? { ...x, activeVariantId: variant.id } : x
            ),
          };
        }),

      updateVariant: (componentId, variantId, patch) =>
        set((s) => {
          const patched = patchComponentVariants(s, componentId, (variants) =>
            variants.map((v) => (v.id === variantId ? { ...v, ...patch } : v))
          );
          return patched ?? s;
        }),

      deleteVariant: (componentId, variantId) =>
        set((s) => {
          const c = s.components.find((x) => x.id === componentId);
          if (!c) return s;
          const variants = resolveVariants(c, s.sharedComponents);
          if (variants.length <= 1) return s;

          const nextVariants = variants.filter((v) => v.id !== variantId);
          const patched = patchComponentVariants(
            s,
            componentId,
            () => nextVariants
          );
          if (!patched) return s;

          const nextActiveId =
            c.activeVariantId === variantId
              ? nextVariants[0].id
              : c.activeVariantId;

          if (c.sharedChildTemplateId && c.sharedComponentId) {
            return {
              ...patched,
              components: patched.components.map((x) =>
                x.sharedComponentId === c.sharedComponentId &&
                x.sharedChildTemplateId === c.sharedChildTemplateId &&
                x.activeVariantId === variantId
                  ? { ...x, activeVariantId: nextActiveId }
                  : x
              ),
            };
          }

          if (c.sharedComponentId) {
            return {
              ...patched,
              components: patched.components.map((x) =>
                x.sharedComponentId === c.sharedComponentId &&
                !x.sharedChildTemplateId &&
                x.activeVariantId === variantId
                  ? { ...x, activeVariantId: nextActiveId }
                  : x
              ),
            };
          }

          return {
            ...patched,
            components: patched.components.map((x) =>
              x.id === componentId
                ? { ...x, activeVariantId: nextActiveId }
                : x
            ),
          };
        }),

      setActiveVariant: (componentId, variantId) =>
        set((s) => ({
          components: s.components.map((c) =>
            c.id === componentId ? { ...c, activeVariantId: variantId } : c
          ),
        })),

      updateVariantData: (componentId, variantId, patch) =>
        set((s) => {
          const patched = patchComponentVariants(s, componentId, (variants) =>
            variants.map((v) =>
              v.id === variantId
                ? { ...v, data: { ...v.data, ...patch } }
                : v
            )
          );
          if (!patched) return s;

          const c = s.components.find((x) => x.id === componentId);
          if (c?.sharedComponentId && patch.title) {
            return {
              ...patched,
              sharedComponents: patched.sharedComponents.map((sc) =>
                sc.id === c.sharedComponentId ? { ...sc, name: patch.title! } : sc
              ),
            };
          }
          return patched;
        }),

      updateVariantField: (componentId, variantId, fieldIndex, value) =>
        set((s) => {
          const patched = patchComponentVariants(s, componentId, (variants) =>
            variants.map((v) => {
              if (v.id !== variantId) return v;
              const fields = [...v.data.fields];
              fields[fieldIndex] = value;
              return { ...v, data: { ...v.data, fields } };
            })
          );
          return patched ?? s;
        }),

      addVariantField: (componentId, variantId) =>
        set((s) => {
          const patched = patchComponentVariants(s, componentId, (variants) =>
            variants.map((v) =>
              v.id === variantId
                ? {
                    ...v,
                    data: {
                      ...v.data,
                      fields: [...v.data.fields, "New field"],
                    },
                  }
                : v
            )
          );
          return patched ?? s;
        }),

      removeVariantField: (componentId, variantId, fieldIndex) =>
        set((s) => {
          const patched = patchComponentVariants(s, componentId, (variants) =>
            variants.map((v) => {
              if (v.id !== variantId) return v;
              return {
                ...v,
                data: {
                  ...v.data,
                  fields: v.data.fields.filter((_, i) => i !== fieldIndex),
                },
              };
            })
          );
          return patched ?? s;
        }),

      addSharedVariant: (sharedId, name) =>
        set((s) => {
          const shared = findSharedComponent(sharedId, s.sharedComponents);
          if (!shared || shared.variants.length === 0) return s;
          const source = shared.variants[0];
          const variant: ComponentVariant = {
            id: crypto.randomUUID(),
            name: name ?? `Variant ${shared.variants.length + 1}`,
            data: {
              title: source.data.title,
              description: source.data.description,
              fields: [...source.data.fields],
            },
          };
          return {
            sharedComponents: patchSharedVariants(
              s.sharedComponents,
              sharedId,
              (variants) => [...variants, variant]
            ),
          };
        }),

      updateSharedVariant: (sharedId, variantId, patch) =>
        set((s) => ({
          sharedComponents: patchSharedVariants(
            s.sharedComponents,
            sharedId,
            (variants) =>
              variants.map((v) => (v.id === variantId ? { ...v, ...patch } : v))
          ),
        })),

      deleteSharedVariant: (sharedId, variantId) =>
        set((s) => {
          const shared = findSharedComponent(sharedId, s.sharedComponents);
          if (!shared || shared.variants.length <= 1) return s;
          const nextVariants = shared.variants.filter((v) => v.id !== variantId);
          const nextActiveId = nextVariants[0].id;
          return {
            sharedComponents: patchSharedVariants(
              s.sharedComponents,
              sharedId,
              () => nextVariants
            ),
            components: s.components.map((c) =>
              c.sharedComponentId === sharedId &&
              c.activeVariantId === variantId
                ? { ...c, activeVariantId: nextActiveId }
                : c
            ),
          };
        }),

      updateSharedVariantData: (sharedId, variantId, patch) =>
        set((s) => ({
          sharedComponents: patchSharedVariants(
            s.sharedComponents,
            sharedId,
            (variants) =>
              variants.map((v) =>
                v.id === variantId
                  ? { ...v, data: { ...v.data, ...patch } }
                  : v
              )
          ).map((sc) =>
            sc.id === sharedId && patch.title
              ? { ...sc, name: patch.title! }
              : sc
          ),
        })),

      updateSharedVariantField: (sharedId, variantId, fieldIndex, value) =>
        set((s) => ({
          sharedComponents: patchSharedVariants(
            s.sharedComponents,
            sharedId,
            (variants) =>
              variants.map((v) => {
                if (v.id !== variantId) return v;
                const fields = [...v.data.fields];
                fields[fieldIndex] = value;
                return { ...v, data: { ...v.data, fields } };
              })
          ),
        })),

      addSharedVariantField: (sharedId, variantId) =>
        set((s) => ({
          sharedComponents: patchSharedVariants(
            s.sharedComponents,
            sharedId,
            (variants) =>
              variants.map((v) =>
                v.id === variantId
                  ? {
                      ...v,
                      data: {
                        ...v.data,
                        fields: [...v.data.fields, "New field"],
                      },
                    }
                  : v
              )
          ),
        })),

      removeSharedVariantField: (sharedId, variantId, fieldIndex) =>
        set((s) => ({
          sharedComponents: patchSharedVariants(
            s.sharedComponents,
            sharedId,
            (variants) =>
              variants.map((v) => {
                if (v.id !== variantId) return v;
                return {
                  ...v,
                  data: {
                    ...v.data,
                    fields: v.data.fields.filter((_, i) => i !== fieldIndex),
                  },
                };
              })
          ),
        })),
    }),
    {
      name: "appmap-editor-v7",
      migrate: (persisted) => {
        const state = persisted as {
          components?: MapComponent[];
          sharedComponents?: Array<
            SharedComponent & {
              childSlots?: Array<{ sharedComponentId: string; order: number }>;
            }
          >;
        };

        if (state.components) {
          state.components = state.components.map((c) =>
            (c.type as string) === "component" ? { ...c, type: "item" } : c
          );
        }

        if (!state.sharedComponents) {
          state.sharedComponents = [];
          return persisted;
        }

        const sharedById = new Map(state.sharedComponents.map((s) => [s.id, s]));
        const absorbedIds = new Set<string>();

        state.sharedComponents = state.sharedComponents.map((sc) => {
          if (!sc.childSlots?.length) {
            const { childSlots: _, ...rest } = sc;
            return rest;
          }

          const children: SharedSectionChildTemplate[] = sc.childSlots.map(
            (slot) => {
              absorbedIds.add(slot.sharedComponentId);
              const childShared = sharedById.get(slot.sharedComponentId);
              return {
                id: crypto.randomUUID(),
                legoType: (childShared?.legoType ?? "item") as ChildComponentType,
                order: slot.order,
                variants: childShared
                  ? childShared.variants.map((v) => ({
                      ...v,
                      data: { ...v.data, fields: [...v.data.fields] },
                    }))
                  : [],
              };
            }
          );

          const { childSlots: _, ...rest } = sc;
          return { ...rest, children };
        });

        if (state.components && absorbedIds.size > 0) {
          for (const sc of state.sharedComponents) {
            if (!sc.children?.length) continue;
            for (const template of sc.children) {
              state.components = state.components.map((c) => {
                if (
                  c.pageSectionId &&
                  c.sharedComponentId &&
                  !c.sharedChildTemplateId &&
                  absorbedIds.has(c.sharedComponentId)
                ) {
                  const parentSection = state.components!.find(
                    (s) => s.id === c.pageSectionId
                  );
                  if (parentSection?.sharedComponentId === sc.id) {
                    const oldChildShared = sharedById.get(c.sharedComponentId!);
                    const match =
                      sc.children!.find(
                        (t) =>
                          t.legoType === (oldChildShared?.legoType ?? c.type) &&
                          t.order === c.order
                      ) ?? sc.children![0];
                    if (match) {
                      return {
                        ...c,
                        sharedComponentId: sc.id,
                        sharedChildTemplateId: match.id,
                        type: match.legoType,
                        variants: [],
                      };
                    }
                  }
                }
                return c;
              });
            }
          }

          state.sharedComponents = state.sharedComponents.filter(
            (sc) => !absorbedIds.has(sc.id)
          );
        }

        return persisted;
      },
      partialize: (s) => ({
        views: s.views,
        components: s.components,
        sharedComponents: s.sharedComponents,
        actionCards: s.actionCards,
        canvas: s.canvas,
      }),
    }
  )
);

export function getActiveVariant(
  component: MapComponent,
  sharedComponents: SharedComponent[] = []
): ComponentVariant {
  const variants = resolveVariants(component, sharedComponents);
  return (
    variants.find((v) => v.id === component.activeVariantId) ??
    variants[0] ?? {
      id: "",
      name: "Default",
      data: defaultDataForType(resolveLegoType(component, sharedComponents)),
    }
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
  if (component.sharedComponentId) return null;
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
