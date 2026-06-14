import { NextResponse } from "next/server";
import { loadAppMapFromDb, saveAppMapToDb } from "@/lib/appmap-db";
import {
  EMPTY_APP_MAP_SNAPSHOT,
  migrateAppMapSnapshot,
  type AppMapSnapshot,
  type AppMapSnapshotInput,
} from "@/types/appmap-persist";

export const dynamic = "force-dynamic";

function isValidSnapshot(body: unknown): body is AppMapSnapshot {
  if (!body || typeof body !== "object") return false;
  const data = body as Partial<AppMapSnapshot>;
  return (
    Array.isArray(data.views) &&
    Array.isArray(data.components) &&
    Array.isArray(data.sharedComponents) &&
    Array.isArray(data.actionCards) &&
    typeof data.canvas === "object" &&
    data.canvas !== null
  );
}

function normalizeSnapshot(body: AppMapSnapshot): AppMapSnapshot {
  return migrateAppMapSnapshot(body as AppMapSnapshotInput);
}

export async function GET() {
  try {
    const { data, updatedAt } = await loadAppMapFromDb();
    return NextResponse.json({ data, updatedAt });
  } catch (error) {
    console.error("GET /api/map failed:", error);
    return NextResponse.json(
      { error: "Failed to load map from database" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as { data?: unknown };
    if (!isValidSnapshot(body.data)) {
      return NextResponse.json(
        { error: "Invalid map payload" },
        { status: 400 }
      );
    }

    const updatedAt = await saveAppMapToDb(normalizeSnapshot(body.data));
    return NextResponse.json({ ok: true, updatedAt });
  } catch (error) {
    console.error("PUT /api/map failed:", error);
    return NextResponse.json(
      { error: "Failed to save map to database" },
      { status: 500 }
    );
  }
}

export async function POST() {
  return NextResponse.json(
    { error: "Use PUT to save the map", empty: EMPTY_APP_MAP_SNAPSHOT },
    { status: 405 }
  );
}
