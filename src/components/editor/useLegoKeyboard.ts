"use client";

import { useEffect } from "react";
import {
  childrenInSection,
  pageSectionsInView,
  useAppMapStore,
} from "@/store/appmap-store";
import { isPageSection } from "@/types/appmap";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

export function useLegoKeyboard() {
  const selection = useAppMapStore((s) => s.selection);
  const components = useAppMapStore((s) => s.components);
  const reorderPageSection = useAppMapStore((s) => s.reorderPageSection);
  const reorderChildComponent = useAppMapStore((s) => s.reorderChildComponent);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      if (isEditableTarget(e.target)) return;
      if (selection?.kind !== "component") return;

      const item = components.find((c) => c.id === selection.id);
      if (!item) return;

      const delta = e.key === "ArrowUp" ? -1 : 1;

      if (isPageSection(item)) {
        const sections = pageSectionsInView(components, item.viewId);
        const index = sections.findIndex((s) => s.id === item.id);
        const next = index + delta;
        if (next < 0 || next >= sections.length) return;
        e.preventDefault();
        reorderPageSection(item.viewId, item.id, next);
        return;
      }

      if (item.pageSectionId) {
        const siblings = childrenInSection(components, item.pageSectionId);
        const index = siblings.findIndex((c) => c.id === item.id);
        const next = index + delta;
        if (next < 0 || next >= siblings.length) return;
        e.preventDefault();
        reorderChildComponent(item.pageSectionId, item.id, next);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selection, components, reorderPageSection, reorderChildComponent]);
}
