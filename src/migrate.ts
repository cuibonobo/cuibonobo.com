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
 *   STACK_SERVER_URL / API_TOKEN  — new stack (standard .env values)
 *
 * Usage:
 *   OLD_STACK_URL=... OLD_MEDIA_URL=... OLD_API_TOKEN=... npx tsx src/migrate.ts
 */

import dotenv from 'dotenv';
import mime from 'mime';
import { APIAdapter } from '@haverstack/adapter-api';
import { Stack } from '@haverstack/core';
import type { StackRecord } from '@haverstack/core';
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

const NEW_STACK_URL = process.env.STACK_SERVER_URL ?? 'http://127.0.0.1:3000';
const NEW_API_TOKEN = process.env.API_TOKEN;

const PAGE_META_TYPE_ID = 'site.gen/page-meta@1';
const CONTENT_TYPES = new Set<string>(Object.values(ResourceTypeName));

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
  console.info(`Fetching all resources from ${url} ...`);
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
// Migration
// ---------------------------------------------------------------------------

const migrate = async (): Promise<void> => {
  // adapter.createRecord() is used directly here — intentional exception to the
  // "use Stack, not adapter" rule so we can preserve original resource IDs.
  const adapter = await APIAdapter.open({ url: NEW_STACK_URL, token: NEW_API_TOKEN });
  const stack = await Stack.create(adapter);

  const oldResources = await fetchOldResources();
  console.info(`Found ${oldResources.length} resources.\n`);

  let ok = 0;
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
      // Create the resource record with its original ID and dates
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

      // Create the page-meta child for articles
      if (type === ResourceTypeName.Article && articleSlug) {
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
        console.info(`  → page-meta slug: ${articleSlug}`);
      }

      // Migrate attachments
      for (const att of oldAttachments) {
        try {
          console.info(`  → attachment: ${att.name} (${att.id})`);
          const data = await downloadOldAttachment(att.id);
          const mimeType = mime.getType(att.name) ?? 'application/octet-stream';
          const fileId = await stack.putAttachment(data, mimeType, att.name);
          await stack.associate(old.id, { kind: 'attachment', label: att.name, fileId, mimeType });
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error(`  ✗ attachment '${att.name}': ${msg}`);
        }
      }

      ok++;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`  ✗ failed: ${msg}`);
      failed++;
    }
  }

  console.info(`\nDone. ${ok} migrated, ${skipped} skipped, ${failed} failed.`);

  await stack.close();
};

migrate().catch((e) => {
  console.error('Migration aborted:', e);
  process.exit(1);
});
