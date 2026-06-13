"use client";

import { InfiniteCanvas } from "./InfiniteCanvas";
import { SidePanel } from "./SidePanel";
import { Toolbar } from "./Toolbar";
import { useLegoKeyboard } from "./useLegoKeyboard";

export function AppMapEditor() {
  useLegoKeyboard();

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <Toolbar />
      <div className="flex min-h-0 flex-1">
        <InfiniteCanvas />
        <SidePanel />
      </div>
    </div>
  );
}
