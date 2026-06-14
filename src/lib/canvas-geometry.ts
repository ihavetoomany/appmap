import type { ActionCard, MapComponent, View } from "@/types/appmap";
import {
  childrenInSection,
  pageSectionsInView,
} from "@/types/appmap";

const VIEW_HEADER = 88;
const VIEW_PADDING = 12;
const SECTION_OUTER_GAP = 8;
const SECTION_HEADER = 36;
const SECTION_INNER_PADDING = 8;
const SECTION_INNER_GAP = 6;
const CHILD_HEIGHT = 52;
const EMPTY_VIEW_BODY = 72;
const EMPTY_SECTION_BODY = 40;

function sectionBlockHeight(
  section: MapComponent,
  components: MapComponent[]
): number {
  const children = childrenInSection(components, section.id);
  const body =
    children.length === 0
      ? EMPTY_SECTION_BODY
      : children.length * CHILD_HEIGHT +
        (children.length - 1) * SECTION_INNER_GAP +
        SECTION_INNER_PADDING * 2;
  return SECTION_HEADER + body;
}

export function estimateViewHeight(
  view: View,
  components: MapComponent[]
): number {
  const sections = pageSectionsInView(components, view.id);
  if (sections.length === 0) return VIEW_HEADER + EMPTY_VIEW_BODY;
  const sectionsHeight = sections.reduce(
    (sum, s, i) =>
      sum +
      sectionBlockHeight(s, components) +
      (i < sections.length - 1 ? SECTION_OUTER_GAP : 0),
    0
  );
  return VIEW_HEADER + VIEW_PADDING * 2 + sectionsHeight;
}

export function getViewAnchor(
  view: View,
  components: MapComponent[],
  side: "left" | "right"
): { x: number; y: number } {
  return {
    x: side === "right" ? view.x + view.width : view.x,
    y: view.y + VIEW_HEADER / 2,
  };
}

export function getComponentAnchor(
  view: View,
  component: MapComponent,
  components: MapComponent[]
): { x: number; y: number } | null {
  const sections = pageSectionsInView(components, view.id);
  let y = view.y + VIEW_HEADER + VIEW_PADDING;

  for (const section of sections) {
    y += SECTION_HEADER;
    const children = childrenInSection(components, section.id);
    if (children.length === 0) {
      y += EMPTY_SECTION_BODY;
    } else {
      for (const child of children) {
        if (child.id === component.id) {
          return {
            x: view.x + view.width,
            y: y + CHILD_HEIGHT / 2,
          };
        }
        y += CHILD_HEIGHT + SECTION_INNER_GAP;
      }
      y += SECTION_INNER_PADDING;
    }
    y += SECTION_OUTER_GAP;
  }
  return null;
}

export function getActionCardCenter(action: ActionCard): { x: number; y: number } {
  return { x: action.x + 80, y: action.y + 18 };
}

/** Rounded cubic path through source → action card → target view. */
export function buildSoftActionPath(
  source: { x: number; y: number },
  center: { x: number; y: number },
  target: { x: number; y: number }
): string {
  const curve = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const midX = from.x + (to.x - from.x) * 0.5;
    return `C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`;
  };

  return [`M ${source.x} ${source.y}`, curve(source, center), curve(center, target)].join(
    " "
  );
}

export function midpointBetweenAnchors(
  source: { x: number; y: number },
  target: { x: number; y: number }
): { x: number; y: number } {
  return {
    x: (source.x + target.x) / 2 - 80,
    y: (source.y + target.y) / 2 - 18,
  };
}

export const CANVAS_MIN_ZOOM = 0.25;
export const CANVAS_MAX_ZOOM = 2;
/** Exponential wheel zoom — higher feels more responsive. */
export const CANVAS_WHEEL_ZOOM_INTENSITY = 0.004;
export const CANVAS_TOOLBAR_ZOOM_FACTOR = 1.2;

export function clampCanvasZoom(zoom: number): number {
  return Math.min(CANVAS_MAX_ZOOM, Math.max(CANVAS_MIN_ZOOM, zoom));
}

export function normalizeWheelDelta(deltaY: number, deltaMode: number): number {
  if (deltaMode === 1) return deltaY * 16;
  if (deltaMode === 2) return deltaY * window.innerHeight;
  return deltaY;
}

export function wheelDeltaToZoomFactor(deltaY: number, deltaMode: number): number {
  return Math.exp(-normalizeWheelDelta(deltaY, deltaMode) * CANVAS_WHEEL_ZOOM_INTENSITY);
}

export function zoomCanvasAtPoint(
  canvas: { x: number; y: number; zoom: number },
  nextZoom: number,
  anchorX: number,
  anchorY: number
): { x: number; y: number; zoom: number } {
  const worldX = (anchorX - canvas.x) / canvas.zoom;
  const worldY = (anchorY - canvas.y) / canvas.zoom;
  return {
    zoom: nextZoom,
    x: anchorX - worldX * nextZoom,
    y: anchorY - worldY * nextZoom,
  };
}

export function resolveSourceAnchor(
  action: ActionCard,
  views: View[],
  components: MapComponent[]
): { x: number; y: number } | null {
  const component = components.find((c) => c.id === action.sourceComponentId);
  if (!component || !canBeActionSource(component)) return null;
  const sourceView = views.find((v) => v.id === component.viewId);
  if (!sourceView) return null;
  return getComponentAnchor(sourceView, component, components);
}

export function resolveTargetAnchor(
  action: ActionCard,
  views: View[],
  components: MapComponent[]
): { x: number; y: number } | null {
  const targetView = views.find((v) => v.id === action.targetViewId);
  if (!targetView) return null;
  return getViewAnchor(targetView, components, "left");
}

function canBeActionSource(c: MapComponent): boolean {
  return c.pageSectionId !== null;
}
