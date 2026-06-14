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

/** Large one-line title on the canvas. */
export interface CanvasTitle {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
}

export type CanvasNoteColor =
  | "amber"
  | "rose"
  | "sky"
  | "lime"
  | "violet"
  | "slate";

/** Semi-transparent sticky note on the canvas. */
export interface CanvasNote {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: CanvasNoteColor;
}

export const CANVAS_TITLE_META = {
  className: "text-4xl font-bold tracking-tight text-zinc-50",
  defaultWidth: 480,
} as const;

export const CANVAS_NOTE_COLORS: Record<
  CanvasNoteColor,
  {
    label: string;
    surface: string;
    border: string;
    text: string;
    topbar: string;
  }
> = {
  amber: {
    label: "Amber",
    surface: "bg-amber-300/20",
    border: "border-amber-300/40",
    text: "text-amber-50",
    topbar: "bg-amber-400/30 border-amber-300/35",
  },
  rose: {
    label: "Rose",
    surface: "bg-rose-300/20",
    border: "border-rose-300/40",
    text: "text-rose-50",
    topbar: "bg-rose-400/30 border-rose-300/35",
  },
  sky: {
    label: "Sky",
    surface: "bg-sky-300/20",
    border: "border-sky-300/40",
    text: "text-sky-50",
    topbar: "bg-sky-400/30 border-sky-300/35",
  },
  lime: {
    label: "Lime",
    surface: "bg-lime-300/20",
    border: "border-lime-300/40",
    text: "text-lime-50",
    topbar: "bg-lime-400/30 border-lime-300/35",
  },
  violet: {
    label: "Violet",
    surface: "bg-violet-300/20",
    border: "border-violet-300/40",
    text: "text-violet-50",
    topbar: "bg-violet-400/30 border-violet-300/35",
  },
  slate: {
    label: "Slate",
    surface: "bg-zinc-400/15",
    border: "border-zinc-400/35",
    text: "text-zinc-100",
    topbar: "bg-zinc-500/25 border-zinc-400/30",
  },
};

export const CANVAS_NOTE_DEFAULT_WIDTH = 220;
export const CANVAS_NOTE_DEFAULT_HEIGHT = 140;
export const CANVAS_NOTE_MIN_WIDTH = 140;
export const CANVAS_NOTE_MIN_HEIGHT = 96;

export function sanitizeCanvasTitleText(text: string): string {
  return text.replace(/[\r\n]+/g, " ").trimStart();
}

export type Selection =
  | { kind: "view"; id: string }
  | { kind: "component"; id: string }
  | { kind: "shared-component"; id: string }
  | { kind: "action"; id: string }
  | { kind: "canvas-title"; id: string }
  | { kind: "canvas-note"; id: string }
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
