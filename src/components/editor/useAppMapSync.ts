"use client";

import { useEffect, useRef } from "react";
import {
  getAppMapSnapshot,
  hydrateAppMap,
  useAppMapStore,
} from "@/store/appmap-store";
import {
  isEmptyAppMapSnapshot,
  type AppMapSnapshot,
} from "@/types/appmap-persist";

const SAVE_DEBOUNCE_MS = 800;

async function fetchMapFromServer(): Promise<{
  data: AppMapSnapshot;
  updatedAt: string;
} | null> {
  const res = await fetch("/api/map", { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

async function saveMapToServer(data: AppMapSnapshot): Promise<boolean> {
  const res = await fetch("/api/map", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data }),
  });
  return res.ok;
}

export function useAppMapSync() {
  const setDbSync = useAppMapStore((s) => s.setDbSync);
  const readyRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setDbSync("loading");

      await new Promise<void>((resolve) => {
        if (useAppMapStore.persist.hasHydrated()) {
          resolve();
          return;
        }
        const unsub = useAppMapStore.persist.onFinishHydration(() => {
          unsub();
          resolve();
        });
      });

      if (cancelled) return;

      const remote = await fetchMapFromServer();
      if (cancelled) return;

      if (remote && !isEmptyAppMapSnapshot(remote.data)) {
        hydrateAppMap(remote.data);
      } else {
        const local = getAppMapSnapshot();
        if (!isEmptyAppMapSnapshot(local)) {
          await saveMapToServer(local);
        }
      }

      readyRef.current = true;
      setDbSync("saved");
    }

    bootstrap().catch(() => {
      if (!cancelled) setDbSync("error");
    });

    const scheduleSave = () => {
      if (!readyRef.current || savingRef.current) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      setDbSync("saving");
      saveTimerRef.current = setTimeout(async () => {
        savingRef.current = true;
        const ok = await saveMapToServer(getAppMapSnapshot());
        savingRef.current = false;
        if (!cancelled) setDbSync(ok ? "saved" : "error");
      }, SAVE_DEBOUNCE_MS);
    };

    const unsub = useAppMapStore.subscribe((state, prev) => {
      if (
        state.views !== prev.views ||
        state.components !== prev.components ||
        state.sharedComponents !== prev.sharedComponents ||
        state.actionCards !== prev.actionCards ||
        state.canvas !== prev.canvas
      ) {
        scheduleSave();
      }
    });

    return () => {
      cancelled = true;
      unsub();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [setDbSync]);
}
