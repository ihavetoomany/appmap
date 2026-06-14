import type {
  ActionCard,
  CanvasNote,
  CanvasNoteColor,
  CanvasTitle,
  CanvasTransform,
  ChildComponentType,
  ComponentType,
  MapComponent,
  SharedComponent,
  SharedComponentLegoType,
  View,
} from "./appmap";
import {
  CANVAS_NOTE_DEFAULT_HEIGHT,
  CANVAS_NOTE_MIN_HEIGHT,
  CANVAS_NOTE_MIN_WIDTH,
} from "./appmap";

function normalizeCanvasNote(note: CanvasNote): CanvasNote {
  return {
    ...note,
    color: (note.color ?? "amber") as CanvasNoteColor,
    height: Math.max(
      CANVAS_NOTE_MIN_HEIGHT,
      note.height ?? CANVAS_NOTE_DEFAULT_HEIGHT
    ),
    width: Math.max(CANVAS_NOTE_MIN_WIDTH, note.width),
  };
}

/** Editor state persisted to localStorage and Neon. */
export interface AppMapSnapshot {
  views: View[];
  components: MapComponent[];
  sharedComponents: SharedComponent[];
  actionCards: ActionCard[];
  canvasTitles: CanvasTitle[];
  canvasNotes: CanvasNote[];
  canvas: CanvasTransform;
}

export const EMPTY_APP_MAP_SNAPSHOT: AppMapSnapshot = {
  views: [],
  components: [],
  sharedComponents: [],
  actionCards: [],
  canvasTitles: [],
  canvasNotes: [],
  canvas: { x: 0, y: 0, zoom: 1 },
};

export function isEmptyAppMapSnapshot(data: AppMapSnapshot): boolean {
  return (
    data.views.length === 0 &&
    data.components.length === 0 &&
    data.actionCards.length === 0 &&
    data.sharedComponents.length === 0 &&
    data.canvasTitles.length === 0 &&
    data.canvasNotes.length === 0
  );
}

/** Snapshot from storage/API; may include legacy canvas annotation fields. */
export type AppMapSnapshotInput = AppMapSnapshot & {
  canvasLabels?: unknown;
  canvasNotes?: unknown;
  canvasRegions?: unknown;
  canvasTitles?: unknown;
};

function migrateLegoType(type: string): ComponentType {
  if (type === "component" || type === "item") return "section-item";
  return type as ComponentType;
}

function migrateChildLegoType(type: string): ChildComponentType {
  if (type === "item") return "section-item";
  return type as ChildComponentType;
}

function migrateCanvasAnnotations(data: AppMapSnapshotInput): {
  canvasTitles: CanvasTitle[];
  canvasNotes: CanvasNote[];
} {
  const hasLegacyLabels =
    Array.isArray(data.canvasLabels) && data.canvasLabels.length > 0;

  if (
    !hasLegacyLabels &&
    Array.isArray(data.canvasTitles) &&
    Array.isArray(data.canvasNotes)
  ) {
    return {
      canvasTitles: data.canvasTitles as CanvasTitle[],
      canvasNotes: (data.canvasNotes as CanvasNote[]).map(normalizeCanvasNote),
    };
  }

  const canvasTitles: CanvasTitle[] = Array.isArray(data.canvasTitles)
    ? (data.canvasTitles as CanvasTitle[])
    : [];
  const canvasNotes: CanvasNote[] = Array.isArray(data.canvasNotes)
    ? (data.canvasNotes as CanvasNote[]).map(normalizeCanvasNote)
    : [];

  const legacyLabels = data.canvasLabels as
    | Array<{
        id: string;
        text: string;
        x: number;
        y: number;
        width: number;
        size?: string;
      }>
    | undefined;

  if (Array.isArray(legacyLabels)) {
    for (const label of legacyLabels) {
      if (label.size === "title") {
        canvasTitles.push({
          id: label.id,
          text: label.text,
          x: label.x,
          y: label.y,
          width: label.width,
        });
      } else {
        canvasNotes.push(
          normalizeCanvasNote({
            id: label.id,
            text: label.text,
            x: label.x,
            y: label.y,
            width: label.width,
            height: CANVAS_NOTE_DEFAULT_HEIGHT,
            color: "amber",
          })
        );
      }
    }
  }

  const legacyNotes = data.canvasNotes as
    | Array<{
        id: string;
        text: string;
        x: number;
        y: number;
        width: number;
        height?: number;
        color?: CanvasNoteColor;
      }>
    | undefined;

  if (Array.isArray(legacyNotes) && legacyNotes.length > 0) {
    const first = legacyNotes[0] as Record<string, unknown>;
    const isLegacyStickyNote = !("color" in first) && !("size" in first);
    if (isLegacyStickyNote) {
      for (const note of legacyNotes) {
        if (!canvasNotes.some((existing) => existing.id === note.id)) {
          canvasNotes.push(
            normalizeCanvasNote({
              ...note,
              height: note.height ?? CANVAS_NOTE_DEFAULT_HEIGHT,
              color: note.color ?? "amber",
            })
          );
        }
      }
    }
  }

  const legacyRegions = data.canvasRegions as
    | Array<{ id: string; title: string; x: number; y: number; width: number }>
    | undefined;

  if (Array.isArray(legacyRegions)) {
    for (const region of legacyRegions) {
      canvasTitles.push({
        id: region.id,
        text: region.title,
        x: region.x,
        y: region.y,
        width: region.width,
      });
    }
  }

  return {
    canvasTitles,
    canvasNotes: canvasNotes.map(normalizeCanvasNote),
  };
}

/** Normalize legacy type slugs in persisted snapshots. */
export function migrateAppMapSnapshot(data: AppMapSnapshotInput): AppMapSnapshot {
  const { canvasTitles, canvasNotes } = migrateCanvasAnnotations(data);

  return {
    views: data.views,
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
    actionCards: data.actionCards,
    canvasTitles,
    canvasNotes,
    canvas: data.canvas,
  };
}
