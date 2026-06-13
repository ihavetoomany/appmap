export type PageSectionType = "page-section";

export type ChildComponentType = "item" | "data-action" | "user-input";

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

export interface MapComponent {
  id: string;
  viewId: string;
  /** null when this row is a page section; set when nested inside a section */
  pageSectionId: string | null;
  type: ComponentType;
  order: number;
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

/** Canvas-level connector: always from an item to a target view. */
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
  | { kind: "action"; id: string }
  | null;

export const CHILD_COMPONENT_TYPES: ChildComponentType[] = [
  "item",
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
  item: {
    label: "Item",
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
