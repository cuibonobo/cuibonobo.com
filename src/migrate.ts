/**
 * One-time migration script: transfers all resources and attachments from
 * the old Cloudflare-based stack to the new haverstack server.
 *
 * Old stack shape:
 *   - Resources at GET <OLD_STACK_URL>/resources  (authenticated)
 *   - Attachments at GET <OLD_MEDIA_URL>/<id>     (public)
 *   - Dates as create_date / updated_date (ISO strings)
 *   - Attachments embedded in content as JSON: [{ id, name, tag }]
 *   - Articles had slug in content.slug
 *
 * New stack shape:
 *   - Dates as createdAt / updatedAt (Date objects)
 *   - Attachments as AttachmentAssociation on the record
 *   - Article slug in a separate site.gen/page-meta@1 child record
 *
 * Environment variables:
 *   OLD_STACK_URL   Base URL of the old stack API (default: https://cuibonobo.com/stack/)
 *   OLD_MEDIA_URL   Base URL of the old media bucket  (default: https://cuibonobo.com/media/)
 *   OLD_API_TOKEN   Bearer token for the old API
 *   DB_PATH         Absolute path to the SQLite database file used by the server
 *   ENTITY_ID       Entity ID (required only when DB_PATH does not exist yet)
 *   TIMEZONE        IANA timezone string (default: UTC)
 *
 * Usage:
 *   OLD_API_TOKEN=... DB_PATH=/path/to/stack.db npx tsx src/migrate.ts
 *
 * Idempotent: safe to re-run. Skips records and page-meta that already exist.
 * Attachments are re-uploaded only if any expected filename is missing from
 * the existing associations; a partial set is cleared and fully re-uploaded.
 *
 * Note: SQLiteAdapter is used directly (not via the HTTP server) so that
 * original resource IDs and creation/update dates are preserved exactly.
 * Normal application code continues to use APIAdapter (HTTP) once migrated.
 */

import { existsSync } from 'node:fs';
import dotenv from 'dotenv';
import mime from 'mime';
import { SQLiteAdapter } from '@haverstack/adapter-sqlite';
import { Stack } from '@haverstack/core';
import type { StackRecord, StackAdapter, TypeId, TypeSchema, AttachmentAssociation } from '@haverstack/core';
import { ResourceTypeName } from './lib/types';
import { generateId } from './lib/id';

dotenv.config();

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const OLD_STACK_URL = (process.env.OLD_STACK_URL ?? 'https://cuibonobo.com/stack/').replace(
  /\/$/,
  ''
);
const OLD_MEDIA_URL = (process.env.OLD_MEDIA_URL ?? 'https://cuibonobo.com/media/').replace(
  /\/$/,
  ''
);
const OLD_API_TOKEN = process.env.OLD_API_TOKEN;

const DB_PATH = process.env.DB_PATH;
const ENTITY_ID = process.env.ENTITY_ID;
const TIMEZONE = process.env.TIMEZONE ?? 'UTC';

const PAGE_META_TYPE_ID = 'site.gen/page-meta@1';
const CONTENT_TYPES = new Set<string>(Object.values(ResourceTypeName));

// ---------------------------------------------------------------------------
// Type definitions
// ---------------------------------------------------------------------------

const TYPE_DEFS: Array<{ id: TypeId; name: string; schema: TypeSchema }> = [
  {
    id: 'note@1',
    name: 'Note',
    schema: { properties: { text: { type: 'string' } } } as unknown as TypeSchema
  },
  {
    id: 'article@1',
    name: 'Article',
    schema: {
      properties: { title: { type: 'string' }, tags: { type: 'string' }, text: { type: 'string' } }
    } as unknown as TypeSchema
  },
  {
    id: PAGE_META_TYPE_ID,
    name: 'Page Meta',
    schema: {
      properties: {
        slug: { type: 'string' },
        publishedAt: { type: 'string' },
        summary: { type: 'string' }
      }
    } as unknown as TypeSchema
  },
  {
    id: 'page@1',
    name: 'Page',
    schema: {
      properties: { title: { type: 'string' }, slug: { type: 'string' }, text: { type: 'string' } }
    } as unknown as TypeSchema
  }
];

// ---------------------------------------------------------------------------
// Old API types
// ---------------------------------------------------------------------------

interface OldAttachment {
  id: string;
  name: string;
  tag: string;
}

interface OldResource {
  id: string;
  type: string;
  create_date: string;
  updated_date: string;
  is_public: boolean;
  attachments: OldAttachment[] | string;
  content: Record<string, unknown> | string;
}

// ---------------------------------------------------------------------------
// Old API helpers
// ---------------------------------------------------------------------------

const oldHeaders: Record<string, string> = OLD_API_TOKEN
  ? { Authorization: `Bearer ${OLD_API_TOKEN}` }
  : {};

const parseIfString = <T>(value: T | string): T =>
  typeof value === 'string' ? (JSON.parse(value) as T) : value;

const fetchOldResources = async (): Promise<OldResource[]> => {
  const url = `${OLD_STACK_URL}/resources`;
  console.info(`Fetching resources from ${url} ...`);
  const res = await fetch(url, { headers: oldHeaders });
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}: ${await res.text()}`);
  return res.json() as Promise<OldResource[]>;
};

const downloadOldAttachment = async (attachmentId: string): Promise<Uint8Array> => {
  const url = `${OLD_MEDIA_URL}/${attachmentId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
};

// ---------------------------------------------------------------------------
// Migration steps
// ---------------------------------------------------------------------------

const ensureTypes = async (stack: Stack, adapter: SQLiteAdapter): Promise<void> => {
  console.info('Ensuring types...');
  for (const def of TYPE_DEFS) {
    const existing = await adapter.getType(def.id);
    if (existing) {
      console.info(`  [ok]      ${def.id}`);
    } else {
      await stack.defineType(def.id, def.name, def.schema);
      console.info(`  [created] ${def.id}`);
    }
  }
  console.info('');
};

const migrateAttachments = async (
  stack: Stack,
  resourceId: string,
  oldAttachments: OldAttachment[],
  existingAssociations: AttachmentAssociation[]
): Promise<void> => {
  if (oldAttachments.length === 0) return;

  // Check whether all expected filenames are already present
  const existingLabels = new Set(existingAssociations.map((a) => a.label));
  const allPresent = oldAttachments.every((a) => existingLabels.has(a.name));

  if (allPresent) {
    console.info(`  [ok] ${oldAttachments.length} attachment(s) already present`);
    return;
  }

  // Partial or missing — clear existing and re-upload everything
  if (existingAssociations.length > 0) {
    console.info(`  Clearing ${existingAssociations.length} stale attachment(s)...`);
    for (const assoc of existingAssociations) {
      await stack.dissociate(resourceId, assoc);
      try {
        await stack.deleteAttachment(assoc.fileId);
      } catch {
        // may already be deleted or referenced elsewhere
      }
    }
  }

  for (const att of oldAttachments) {
    try {
      console.info(`  → ${att.name}`);
      const data = await downloadOldAttachment(att.id);
      const mimeType = mime.getType(att.name) ?? 'application/octet-stream';
      const fileId = await stack.putAttachment(data, mimeType, att.name);
      await stack.associate(resourceId, { kind: 'attachment', label: att.name, fileId, mimeType });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`  ✗ attachment '${att.name}': ${msg}`);
    }
  }
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const migrate = async (): Promise<void> => {
  if (!DB_PATH) {
    throw new Error('DB_PATH environment variable is required');
  }

  const isNewDb = !existsSync(DB_PATH);

  let adapter: SQLiteAdapter;
  if (isNewDb) {
    if (!ENTITY_ID) {
      throw new Error('ENTITY_ID is required when DB_PATH does not exist yet');
    }
    console.info(`Initializing new database at ${DB_PATH} ...`);
    adapter = await SQLiteAdapter.initialize({ path: DB_PATH, entityId: ENTITY_ID, timezone: TIMEZONE });
  } else {
    console.info(`Opening existing database at ${DB_PATH} ...`);
    adapter = await SQLiteAdapter.open({ path: DB_PATH });
  }

  // adapter.createRecord() is used directly here — intentional exception to the
  // "use Stack, not adapter" rule so we can preserve original resource IDs and dates.
  // Cast needed because adapter-sqlite targets an older @haverstack/core version;
  // the missing fields (ownerEntityId, timezone) are metadata not used by migrate.ts.
  const stack = await Stack.create(adapter as unknown as StackAdapter);

  await ensureTypes(stack, adapter);

  const oldResources = await fetchOldResources();
  console.info(`Found ${oldResources.length} resources.\n`);

  let created = 0;
  let alreadyExisted = 0;
  let skipped = 0;
  let failed = 0;

  for (const old of oldResources) {
    const type = old.type as ResourceTypeName;

    if (!CONTENT_TYPES.has(type)) {
      console.warn(`[skip] unknown type '${type}' (${old.id})`);
      skipped++;
      continue;
    }

    const rawContent = parseIfString<Record<string, unknown>>(old.content);
    const oldAttachments = parseIfString<OldAttachment[]>(old.attachments ?? []);
    const createdAt = new Date(old.create_date);
    const updatedAt = new Date(old.updated_date);

    // Articles: pull slug out of content — it becomes a page-meta child record
    let articleSlug: string | undefined;
    const content = { ...rawContent };
    if (type === ResourceTypeName.Article && typeof content.slug === 'string') {
      articleSlug = content.slug;
      delete content.slug;
    }

    console.info(`[${type}] ${old.id}`);

    try {
      // Check whether the record already exists
      const existing = await adapter.getRecord(old.id);

      if (existing) {
        console.info(`  [exists] skipping record creation`);
        alreadyExisted++;

        const existingAttachments = (existing.associations ?? []).filter(
          (a): a is AttachmentAssociation => a.kind === 'attachment'
        );
        await migrateAttachments(stack, old.id, oldAttachments, existingAttachments);
      } else {
        // Create the record with the original ID and dates preserved
        const record: StackRecord = {
          id: old.id,
          typeId: `${type}@1`,
          content,
          createdAt,
          updatedAt,
          version: 1,
          permissions: [{ access: 'public' }]
        };
        await adapter.createRecord(record);
        created++;

        await migrateAttachments(stack, old.id, oldAttachments, []);
      }

      // Ensure page-meta exists for articles (idempotent)
      if (type === ResourceTypeName.Article && articleSlug) {
        const metaResult = await adapter.queryRecords({
          filter: { typeId: PAGE_META_TYPE_ID, parentId: old.id }
        });
        if (metaResult.records.length === 0) {
          const now = new Date();
          const metaRecord: StackRecord = {
            id: generateId(now.getTime()),
            typeId: PAGE_META_TYPE_ID,
            parentId: old.id,
            content: { slug: articleSlug },
            createdAt: now,
            updatedAt: now,
            version: 1,
            permissions: [{ access: 'public' }]
          };
          await adapter.createRecord(metaRecord);
          console.info(`  → page-meta created: ${articleSlug}`);
        } else {
          console.info(`  → page-meta exists: ${articleSlug}`);
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`  ✗ failed: ${msg}`);
      failed++;
    }
  }

  console.info(
    `\nDone. ${created} created, ${alreadyExisted} already existed, ${skipped} skipped, ${failed} failed.`
  );

  await stack.close();
};

migrate().catch((e) => {
  console.error('Migration aborted:', e);
  process.exit(1);
});
