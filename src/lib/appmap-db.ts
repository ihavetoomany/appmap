import {
  EMPTY_APP_MAP_SNAPSHOT,
  migrateAppMapSnapshot,
  type AppMapSnapshot,
} from "@/types/appmap-persist";
import { getDb } from "./db";

const DEFAULT_MAP_ID = "default";

let schemaReady: Promise<void> | null = null;

export async function ensureAppMapSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const sql = getDb();
      await sql`
        CREATE TABLE IF NOT EXISTS app_maps (
          id text PRIMARY KEY,
          data jsonb NOT NULL DEFAULT '{}'::jsonb,
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `;
      await sql`
        INSERT INTO app_maps (id, data)
        VALUES (${DEFAULT_MAP_ID}, ${JSON.stringify(EMPTY_APP_MAP_SNAPSHOT)}::jsonb)
        ON CONFLICT (id) DO NOTHING
      `;
    })();
  }
  await schemaReady;
}

function parseSnapshot(raw: unknown): AppMapSnapshot {
  if (!raw || typeof raw !== "object") return { ...EMPTY_APP_MAP_SNAPSHOT };
  const data = raw as Partial<AppMapSnapshot>;
  return {
    views: Array.isArray(data.views) ? data.views : [],
    components: Array.isArray(data.components) ? data.components : [],
    sharedComponents: Array.isArray(data.sharedComponents)
      ? data.sharedComponents
      : [],
    actionCards: Array.isArray(data.actionCards) ? data.actionCards : [],
    canvas: data.canvas ?? EMPTY_APP_MAP_SNAPSHOT.canvas,
  };
}

export async function loadAppMapFromDb(): Promise<{
  data: AppMapSnapshot;
  updatedAt: string;
}> {
  await ensureAppMapSchema();
  const sql = getDb();
  const rows = await sql`
    SELECT data, updated_at
    FROM app_maps
    WHERE id = ${DEFAULT_MAP_ID}
    LIMIT 1
  `;

  const row = rows[0] as { data: unknown; updated_at: Date | string } | undefined;
  if (!row) {
    return { data: { ...EMPTY_APP_MAP_SNAPSHOT }, updatedAt: new Date().toISOString() };
  }

  return {
    data: migrateAppMapSnapshot(parseSnapshot(row.data)),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export async function saveAppMapToDb(data: AppMapSnapshot): Promise<string> {
  await ensureAppMapSchema();
  const sql = getDb();
  const rows = await sql`
    UPDATE app_maps
    SET data = ${JSON.stringify(data)}::jsonb, updated_at = now()
    WHERE id = ${DEFAULT_MAP_ID}
    RETURNING updated_at
  `;
  const row = rows[0] as { updated_at: Date | string } | undefined;
  return new Date(row?.updated_at ?? Date.now()).toISOString();
}
