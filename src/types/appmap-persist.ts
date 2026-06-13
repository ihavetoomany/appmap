import type {
  ActionCard,
  CanvasTransform,
  ChildComponentType,
  ComponentType,
  MapComponent,
  SharedComponent,
  SharedComponentLegoType,
  View,
} from "./appmap";

/** Editor state persisted to localStorage and Neon. */
export interface AppMapSnapshot {
  views: View[];
  components: MapComponent[];
  sharedComponents: SharedComponent[];
  actionCards: ActionCard[];
  canvas: CanvasTransform;
}

export const EMPTY_APP_MAP_SNAPSHOT: AppMapSnapshot = {
  views: [],
  components: [],
  sharedComponents: [],
  actionCards: [],
  canvas: { x: 0, y: 0, zoom: 1 },
};

export function isEmptyAppMapSnapshot(data: AppMapSnapshot): boolean {
  return (
    data.views.length === 0 &&
    data.components.length === 0 &&
    data.actionCards.length === 0 &&
    data.sharedComponents.length === 0
  );
}

function migrateLegoType(type: string): ComponentType {
  if (type === "component" || type === "item") return "section-item";
  return type as ComponentType;
}

function migrateChildLegoType(type: string): ChildComponentType {
  if (type === "item") return "section-item";
  return type as ChildComponentType;
}

/** Normalize legacy type slugs in persisted snapshots. */
export function migrateAppMapSnapshot(data: AppMapSnapshot): AppMapSnapshot {
  return {
    ...data,
    components: data.components.map((c) => ({
      ...c,
      type: migrateLegoType(c.type as string),
    })),
    sharedComponents: data.sharedComponents.map((sc) => ({
      ...sc,
      legoType: migrateLegoType(sc.legoType as string) as SharedComponentLegoType,
      children: sc.children?.map((child) => ({
        ...child,
        legoType: migrateChildLegoType(child.legoType as string),
      })),
    })),
  };
}
