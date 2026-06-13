"use client";

import type { ComponentData, ComponentType } from "@/types/appmap";
import { COMPONENT_META } from "@/types/appmap";
import { LegoIcon } from "./LegoIcon";

interface ComponentPreviewProps {
  type: ComponentType;
  data: ComponentData;
}

export function ComponentPreview({ type, data }: ComponentPreviewProps) {
  const meta = COMPONENT_META[type];

  return (
    <div className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5">
      <div className="flex items-start gap-2">
        <LegoIcon type={type} className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-zinc-100">
            {data.title || meta.label}
          </p>
          {meta.showDescription && data.description ? (
            <p className="mt-0.5 text-xs text-zinc-400">{data.description}</p>
          ) : null}
          {meta.showFields && data.fields.length > 0 ? (
            <ul className="mt-2 space-y-0.5">
              {data.fields.map((field, i) => (
                <li
                  key={`${field}-${i}`}
                  className="flex items-center gap-1.5 text-xs text-zinc-400"
                >
                  <span className="text-zinc-600">•</span>
                  {field}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}
