export type PageSectionType = "page-section";

export type ChildComponentType = "section-item" | "data-action" | "user-input";

export type ComponentType = PageSectionType | ChildComponentType;

export interface ComponentData {
  title: string;
  description: string;
  fields: string[];
}

export interface ComponentVariant {
  id: string;
  name: string;
  data: ComponentData;
}

export type SharedComponentLegoType = ComponentType;

/** Embedded child lego within a page-section shared component. */
export interface SharedSectionChildTemplate {
  id: string;
  legoType: ChildComponentType;
  order: number;
  variants: ComponentVariant[];
}

/** Reusable component definition — instances link via MapComponent.sharedComponentId. */
export interface SharedComponent {
  id: string;
  name: string;
  legoType: SharedComponentLegoType;
  variants: ComponentVariant[];
  /** Embedded child legos when this is a page-section component. */
  children?: SharedSectionChildTemplate[];
}

export interface MapComponent {
  id: string;
  viewId: string;
  /** null when this row is a page section; set when nested inside a section */
  pageSectionId: string | null;
  type: ComponentType;
  order: number;
  /** Top-level shared component, or parent page-section component for embedded children. */
  sharedComponentId?: string | null;
  /** Points at an embedded child template within the parent shared page-section component. */
  sharedChildTemplateId?: string | null;
  variants: ComponentVariant[];
  activeVariantId: string;
}

export interface View {
  id: string;
  name: string;
  description: string;
  x: number;
  y: number;
  width: number;
}

export interface ActionCardVariant {
  id: string;
  name: string;
  label: string;
}

/** Canvas-level connector: always from a section item to a target view. */
export interface ActionCard {
  id: string;
  sourceComponentId: string;
  targetViewId: string;
  x: number;
  y: number;
  variants: ActionCardVariant[];
  activeVariantId: string;
}

export interface CanvasTransform {
  x: number;
  y: number;
  zoom: number;
}

export type Selection =
  | { kind: "view"; id: string }
  | { kind: "component"; id: string }
  | { kind: "shared-component"; id: string }
  | { kind: "action"; id: string }
  | null;

export const CHILD_COMPONENT_TYPES: ChildComponentType[] = [
  "section-item",
  "data-action",
  "user-input",
];

export const COMPONENT_META: Record<
  ComponentType,
  {
    label: string;
    icon: string;
    accent: string;
    showDescription: boolean;
    showFields: boolean;
  }
> = {
  "page-section": {
    label: "Page Section",
    icon: "section",
    accent: "text-amber-500",
    showDescription: true,
    showFields: true,
  },
  "section-item": {
    label: "Section Item",
    icon: "diamond",
    accent: "text-violet-400",
    showDescription: true,
    showFields: true,
  },
  "data-action": {
    label: "Data Action",
    icon: "database",
    accent: "text-blue-400",
    showDescription: true,
    showFields: true,
  },
  "user-input": {
    label: "User Input",
    icon: "input",
    accent: "text-amber-500",
    showDescription: true,
    showFields: false,
  },
};

export function isPageSection(c: MapComponent): boolean {
  return c.type === "page-section" && c.pageSectionId === null;
}

export function isChildComponent(c: MapComponent): boolean {
  return c.pageSectionId !== null;
}

export function canBeActionSource(c: MapComponent): boolean {
  return isChildComponent(c);
}

export function canConvertToShared(c: MapComponent): boolean {
  return (
    !c.sharedComponentId &&
    !c.sharedChildTemplateId &&
    (c.type === "page-section" || c.type === "section-item")
  );
}

export function isEmbeddedSharedChild(c: MapComponent): boolean {
  return Boolean(c.sharedComponentId && c.sharedChildTemplateId);
}

export function isSharedInstance(c: MapComponent): boolean {
  return Boolean(c.sharedComponentId);
}

export function findSharedComponent(
  id: string | null | undefined,
  sharedComponents: SharedComponent[]
): SharedComponent | null {
  if (!id) return null;
  return sharedComponents.find((s) => s.id === id) ?? null;
}

export function findEmbeddedChildTemplate(
  c: MapComponent,
  sharedComponents: SharedComponent[]
): SharedSectionChildTemplate | null {
  if (!c.sharedComponentId || !c.sharedChildTemplateId) return null;
  const parent = findSharedComponent(c.sharedComponentId, sharedComponents);
  return (
    parent?.children?.find((t) => t.id === c.sharedChildTemplateId) ?? null
  );
}

export function resolveLegoType(
  c: MapComponent,
  sharedComponents: SharedComponent[]
): ComponentType {
  const embedded = findEmbeddedChildTemplate(c, sharedComponents);
  if (embedded) return embedded.legoType;
  const shared = findSharedComponent(c.sharedComponentId, sharedComponents);
  return shared?.legoType ?? c.type;
}

export function resolveVariants(
  c: MapComponent,
  sharedComponents: SharedComponent[]
): ComponentVariant[] {
  const embedded = findEmbeddedChildTemplate(c, sharedComponents);
  if (embedded) return embedded.variants;
  const shared = findSharedComponent(c.sharedComponentId, sharedComponents);
  return shared?.variants ?? c.variants;
}

/** Shared title across variants; variant name as optional subtitle when >1 variant. */
export function getComponentPreviewLabels(
  variants: ComponentVariant[],
  activeVariantId: string
): { title: string; variantName?: string } {
  const active = variants.find((v) => v.id === activeVariantId) ?? variants[0];
  const title = variants[0]?.data.title ?? active?.data.title ?? "";
  const variantName = variants.length > 1 ? active?.name : undefined;
  return { title, variantName };
}

export function instanceCountForShared(
  sharedId: string,
  components: MapComponent[]
): number {
  return components.filter(
    (c) =>
      c.sharedComponentId === sharedId &&
      !c.sharedChildTemplateId &&
      c.pageSectionId === null
  ).length;
}

export function isSharedPageSectionInstance(c: MapComponent): boolean {
  return (
    isPageSection(c) &&
    Boolean(c.sharedComponentId) &&
    !c.sharedChildTemplateId
  );
}

export function defaultDataForType(type: ComponentType): ComponentData {
  const meta = COMPONENT_META[type];
  return {
    title: meta.label,
    description:
      type === "data-action" || type === "user-input"
        ? "What are they inputting"
        : "Content",
    fields: [],
  };
}

export function defaultVariant(
  type: ComponentType,
  name = "Default"
): ComponentVariant {
  return {
    id: crypto.randomUUID(),
    name,
    data: defaultDataForType(type),
  };
}

export function defaultActionVariant(name = "Default"): ActionCardVariant {
  return {
    id: crypto.randomUUID(),
    name,
    label: "Click to navigate",
  };
}

export function pageSectionsInView(
  components: MapComponent[],
  viewId: string
): MapComponent[] {
  return components
    .filter((c) => c.viewId === viewId && isPageSection(c))
    .sort((a, b) => a.order - b.order);
}

export function childrenInSection(
  components: MapComponent[],
  pageSectionId: string
): MapComponent[] {
  return components
    .filter((c) => c.pageSectionId === pageSectionId)
    .sort((a, b) => a.order - b.order);
}
