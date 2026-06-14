"use client";

import { useCallback, useRef, useState } from "react";
import { useAppMapStore } from "@/store/appmap-store";
import {
  CANVAS_NOTE_COLORS,
  CANVAS_NOTE_MIN_HEIGHT,
  CANVAS_NOTE_MIN_WIDTH,
  CANVAS_TITLE_META,
  sanitizeCanvasTitleText,
  type CanvasNote,
  type CanvasTitle,
} from "@/types/appmap";

export function CanvasOverlayLayer({ zoom }: { zoom: number }) {
  const {
    canvasTitles,
    canvasNotes,
    selection,
    select,
    moveCanvasTitle,
    moveCanvasNote,
    updateCanvasTitle,
    updateCanvasNote,
  } = useAppMapStore();

  return (
    <>
      {canvasTitles.map((title) => (
        <CanvasTitleFrame
          key={title.id}
          title={title}
          zoom={zoom}
          isSelected={
            selection?.kind === "canvas-title" && selection.id === title.id
          }
          onSelect={() => select({ kind: "canvas-title", id: title.id })}
          onMove={(x, y) => moveCanvasTitle(title.id, x, y)}
          onTextChange={(text) =>
            updateCanvasTitle(title.id, { text: sanitizeCanvasTitleText(text) })
          }
        />
      ))}
      {canvasNotes.map((note) => (
        <CanvasNoteFrame
          key={note.id}
          note={note}
          zoom={zoom}
          isSelected={
            selection?.kind === "canvas-note" && selection.id === note.id
          }
          onSelect={() => select({ kind: "canvas-note", id: note.id })}
          onMove={(x, y) => moveCanvasNote(note.id, x, y)}
          onResize={(width, height) =>
            updateCanvasNote(note.id, { width, height })
          }
          onTextChange={(text) => updateCanvasNote(note.id, { text })}
        />
      ))}
    </>
  );
}

function useCanvasDrag({
  zoom,
  x,
  y,
  onMove,
  onSelect,
}: {
  zoom: number;
  x: number;
  y: number;
  onMove: (x: number, y: number) => void;
  onSelect: () => void;
}) {
  const [dragDelta, setDragDelta] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number } | null>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if ((e.target as HTMLElement).closest("[data-overlay-edit]")) return;
      e.stopPropagation();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      onSelect();
      dragRef.current = { startX: e.clientX, startY: e.clientY };
      setIsDragging(true);
      setDragDelta({ x: 0, y: 0 });
    },
    [onSelect]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return;
      setDragDelta({
        x: (e.clientX - dragRef.current.startX) / zoom,
        y: (e.clientY - dragRef.current.startY) / zoom,
      });
    },
    [zoom]
  );

  const finishDrag = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return;
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      if (dragDelta.x !== 0 || dragDelta.y !== 0) {
        onMove(x + dragDelta.x, y + dragDelta.y);
      }
      dragRef.current = null;
      setIsDragging(false);
      setDragDelta({ x: 0, y: 0 });
    },
    [dragDelta.x, dragDelta.y, onMove, x, y]
  );

  return {
    dragDelta,
    isDragging,
    handlePointerDown,
    handlePointerMove,
    finishDrag,
  };
}

function useCanvasResize({
  zoom,
  width,
  height,
  onResize,
}: {
  zoom: number;
  width: number;
  height: number;
  onResize: (width: number, height: number) => void;
}) {
  const [sizeDelta, setSizeDelta] = useState({ w: 0, h: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<{ startX: number; startY: number } | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    resizeRef.current = { startX: e.clientX, startY: e.clientY };
    setIsResizing(true);
    setSizeDelta({ w: 0, h: 0 });
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!resizeRef.current) return;
      setSizeDelta({
        w: (e.clientX - resizeRef.current.startX) / zoom,
        h: (e.clientY - resizeRef.current.startY) / zoom,
      });
    },
    [zoom]
  );

  const finishResize = useCallback(
    (e: React.PointerEvent) => {
      if (!resizeRef.current) return;
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      const nextWidth = Math.max(CANVAS_NOTE_MIN_WIDTH, width + sizeDelta.w);
      const nextHeight = Math.max(CANVAS_NOTE_MIN_HEIGHT, height + sizeDelta.h);
      if (nextWidth !== width || nextHeight !== height) {
        onResize(nextWidth, nextHeight);
      }
      resizeRef.current = null;
      setIsResizing(false);
      setSizeDelta({ w: 0, h: 0 });
    },
    [height, onResize, sizeDelta.h, sizeDelta.w, width]
  );

  return {
    sizeDelta,
    isResizing,
    handlePointerDown,
    handlePointerMove,
    finishResize,
  };
}

function CanvasTitleFrame({
  title,
  zoom,
  isSelected,
  onSelect,
  onMove,
  onTextChange,
}: {
  title: CanvasTitle;
  zoom: number;
  isSelected: boolean;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  onTextChange: (text: string) => void;
}) {
  const drag = useCanvasDrag({
    zoom,
    x: title.x,
    y: title.y,
    onMove,
    onSelect,
  });

  return (
    <div
      data-canvas-item
      className={`absolute rounded-lg transition-[box-shadow,background-color,border-color] ${
        drag.isDragging
          ? "cursor-grabbing shadow-lg ring-2 ring-blue-500/30"
          : "cursor-grab active:cursor-grabbing"
      } ${
        isSelected
          ? "border border-blue-500/50 bg-zinc-900/90 ring-2 ring-blue-500/15"
          : drag.isDragging
            ? "border border-zinc-600 bg-zinc-900/80"
            : "border border-transparent bg-transparent hover:border-zinc-700/60 hover:bg-zinc-900/40"
      }`}
      style={{
        left: title.x + drag.dragDelta.x,
        top: title.y + drag.dragDelta.y,
        width: title.width,
      }}
      onPointerDown={drag.handlePointerDown}
      onPointerMove={drag.handlePointerMove}
      onPointerUp={drag.finishDrag}
      onPointerCancel={drag.finishDrag}
    >
      <div className={`${isSelected || drag.isDragging ? "px-4 py-2" : "px-1 py-0.5"}`}>
        {isSelected ? (
          <input
            data-overlay-edit
            type="text"
            value={title.text}
            onChange={(e) => onTextChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className={`w-full bg-transparent outline-none placeholder:text-zinc-600 ${CANVAS_TITLE_META.className}`}
            placeholder="Title"
          />
        ) : (
          <p
            className={`truncate ${CANVAS_TITLE_META.className} ${
              title.text ? "" : "text-zinc-600"
            }`}
          >
            {title.text || "Title"}
          </p>
        )}
      </div>
    </div>
  );
}

function NoteDragHandle() {
  return (
    <div className="flex items-center justify-center gap-1 opacity-70">
      {Array.from({ length: 3 }).map((_, i) => (
        <span
          key={i}
          className="h-1 w-1 rounded-full bg-current"
          aria-hidden
        />
      ))}
    </div>
  );
}

function CanvasNoteFrame({
  note,
  zoom,
  isSelected,
  onSelect,
  onMove,
  onResize,
  onTextChange,
}: {
  note: CanvasNote;
  zoom: number;
  isSelected: boolean;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  onResize: (width: number, height: number) => void;
  onTextChange: (text: string) => void;
}) {
  const colorMeta = CANVAS_NOTE_COLORS[note.color];
  const drag = useCanvasDrag({
    zoom,
    x: note.x,
    y: note.y,
    onMove,
    onSelect,
  });
  const resize = useCanvasResize({
    zoom,
    width: note.width,
    height: note.height,
    onResize,
  });

  const displayWidth = Math.max(CANVAS_NOTE_MIN_WIDTH, note.width + resize.sizeDelta.w);
  const displayHeight = Math.max(
    CANVAS_NOTE_MIN_HEIGHT,
    note.height + resize.sizeDelta.h
  );

  const handleBodyPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if ((e.target as HTMLElement).closest("[data-overlay-edit]")) return;
      e.stopPropagation();
      onSelect();
    },
    [onSelect]
  );

  return (
    <div
      data-canvas-item
      className={`absolute flex flex-col overflow-hidden rounded-lg border backdrop-blur-sm transition-[box-shadow,border-color] ${colorMeta.surface} ${colorMeta.border} ${
        drag.isDragging || resize.isResizing
          ? "shadow-xl ring-2 ring-blue-500/25"
          : isSelected
            ? "ring-2 ring-blue-500/30"
            : "hover:shadow-md"
      }`}
      style={{
        left: note.x + drag.dragDelta.x,
        top: note.y + drag.dragDelta.y,
        width: displayWidth,
        height: displayHeight,
      }}
    >
      <div
        className={`flex h-7 shrink-0 cursor-grab items-center justify-center border-b active:cursor-grabbing ${colorMeta.topbar} ${colorMeta.text} ${
          drag.isDragging ? "cursor-grabbing" : ""
        }`}
        onPointerDown={drag.handlePointerDown}
        onPointerMove={drag.handlePointerMove}
        onPointerUp={drag.finishDrag}
        onPointerCancel={drag.finishDrag}
        aria-label="Drag note"
      >
        <NoteDragHandle />
      </div>

      <div
        className="min-h-0 flex-1 px-3 py-2"
        onPointerDown={handleBodyPointerDown}
      >
        {isSelected ? (
          <textarea
            data-overlay-edit
            value={note.text}
            onChange={(e) => onTextChange(e.target.value)}
            onPointerDown={(e) => e.stopPropagation()}
            className={`h-full w-full resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-zinc-500/80 ${colorMeta.text}`}
            placeholder="Write a note…"
          />
        ) : (
          <p
            className={`h-full overflow-hidden whitespace-pre-wrap text-sm leading-relaxed ${colorMeta.text} ${
              note.text ? "" : "text-zinc-500/80"
            }`}
          >
            {note.text || "Note"}
          </p>
        )}
      </div>

      {(isSelected || resize.isResizing) && (
        <div
          className="absolute bottom-0 right-0 z-10 flex h-5 w-5 cursor-se-resize items-end justify-end p-0.5"
          onPointerDown={resize.handlePointerDown}
          onPointerMove={resize.handlePointerMove}
          onPointerUp={resize.finishResize}
          onPointerCancel={resize.finishResize}
          aria-label="Resize note"
        >
          <svg
            viewBox="0 0 12 12"
            className={`h-3 w-3 ${colorMeta.text} opacity-70`}
            aria-hidden
          >
            <path
              d="M11 11L11 6M11 11L6 11M11 11L7 7"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      )}
    </div>
  );
}
