import { createClient } from '@libsql/client';
import { v4 as uuidv4 } from 'uuid';
import type { Video, Keyword, PitchStatus, QualifiedChannel, OutreachStatus } from './types';

let client: ReturnType<typeof createClient> | null = null;

function getClient() {
  if (!client) {
    client = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return client;
}

let schemaReady: Promise<void> | null = null;

function ensureSchema(): Promise<void> {
  if (!schemaReady) schemaReady = initSchema();
  return schemaReady;
}

export async function initSchema(): Promise<void> {
  const c = getClient();
  await c.batch([
    {
      sql: `CREATE TABLE IF NOT EXISTS videos (
        id                    TEXT PRIMARY KEY,
        title                 TEXT NOT NULL DEFAULT '',
        thumbnail_url         TEXT NOT NULL DEFAULT '',
        video_url             TEXT NOT NULL DEFAULT '',
        published_at          TEXT NOT NULL DEFAULT '',
        view_count            INTEGER NOT NULL DEFAULT 0,
        like_count            INTEGER NOT NULL DEFAULT 0,
        comment_count         INTEGER NOT NULL DEFAULT 0,
        description           TEXT NOT NULL DEFAULT '',
        channel_id            TEXT NOT NULL DEFAULT '',
        channel_name          TEXT NOT NULL DEFAULT '',
        channel_handle        TEXT NOT NULL DEFAULT '',
        channel_url           TEXT NOT NULL DEFAULT '',
        channel_thumbnail_url TEXT NOT NULL DEFAULT '',
        channel_subscribers   INTEGER NOT NULL DEFAULT 0,
        channel_country       TEXT NOT NULL DEFAULT '',
        contact_email         TEXT NOT NULL DEFAULT '',
        twitter_url           TEXT NOT NULL DEFAULT '',
        instagram_url         TEXT NOT NULL DEFAULT '',
        pitch_status          TEXT NOT NULL DEFAULT 'not_pitched',
        notes                 TEXT NOT NULL DEFAULT '',
        found_at              TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS keywords (
        id         TEXT PRIMARY KEY,
        text       TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS qualified_channels (
        channel_id            TEXT PRIMARY KEY,
        channel_name          TEXT NOT NULL DEFAULT '',
        channel_handle        TEXT NOT NULL DEFAULT '',
        channel_url           TEXT NOT NULL DEFAULT '',
        channel_thumbnail_url TEXT NOT NULL DEFAULT '',
        channel_subscribers   INTEGER NOT NULL DEFAULT 0,
        channel_country       TEXT NOT NULL DEFAULT '',
        contact_email         TEXT NOT NULL DEFAULT '',
        twitter_url           TEXT NOT NULL DEFAULT '',
        instagram_url         TEXT NOT NULL DEFAULT '',
        outreach_status       TEXT NOT NULL DEFAULT 'new',
        notes                 TEXT NOT NULL DEFAULT '',
        qualified_at          TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      args: [],
    },
  ], 'write');

  // Migrations for any older schema
  const migrations = [
    `ALTER TABLE videos ADD COLUMN contact_email TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE videos ADD COLUMN twitter_url TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE videos ADD COLUMN instagram_url TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE videos ADD COLUMN channel_thumbnail_url TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE qualified_channels ADD COLUMN channel_thumbnail_url TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE qualified_channels ADD COLUMN contacted_at TEXT NOT NULL DEFAULT ''`,
  ];
  for (const sql of migrations) {
    try { await c.execute(sql); } catch { /* column already exists */ }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseVideoRow(row: any): Video {
  return {
    id: row.id,
    title: row.title,
    thumbnail_url: row.thumbnail_url,
    video_url: row.video_url,
    published_at: row.published_at,
    view_count: Number(row.view_count ?? 0),
    like_count: Number(row.like_count ?? 0),
    comment_count: Number(row.comment_count ?? 0),
    description: row.description,
    channel_id: row.channel_id,
    channel_name: row.channel_name,
    channel_handle: row.channel_handle,
    channel_url: row.channel_url,
    channel_thumbnail_url: row.channel_thumbnail_url ?? '',
    channel_subscribers: Number(row.channel_subscribers ?? 0),
    channel_country: row.channel_country,
    contact_email: row.contact_email ?? '',
    twitter_url: row.twitter_url ?? '',
    instagram_url: row.instagram_url ?? '',
    pitch_status: row.pitch_status as PitchStatus,
    notes: row.notes,
    found_at: row.found_at,
    updated_at: row.updated_at,
  };
}

export async function upsertVideo(v: Omit<Video, 'pitch_status' | 'notes' | 'found_at' | 'updated_at'>): Promise<Video> {
  await ensureSchema();
  const c = getClient();
  await c.execute({
    sql: `INSERT INTO videos (id, title, thumbnail_url, video_url, published_at, view_count, like_count, comment_count, description, channel_id, channel_name, channel_handle, channel_url, channel_thumbnail_url, channel_subscribers, channel_country, contact_email, twitter_url, instagram_url)
      VALUES (:id, :title, :thumbnail_url, :video_url, :published_at, :view_count, :like_count, :comment_count, :description, :channel_id, :channel_name, :channel_handle, :channel_url, :channel_thumbnail_url, :channel_subscribers, :channel_country, :contact_email, :twitter_url, :instagram_url)
      ON CONFLICT(id) DO UPDATE SET
        title                 = excluded.title,
        thumbnail_url         = excluded.thumbnail_url,
        view_count            = excluded.view_count,
        like_count            = excluded.like_count,
        comment_count         = excluded.comment_count,
        channel_thumbnail_url = excluded.channel_thumbnail_url,
        channel_subscribers   = excluded.channel_subscribers,
        channel_handle        = excluded.channel_handle,
        channel_country       = excluded.channel_country,
        contact_email         = excluded.contact_email,
        twitter_url           = excluded.twitter_url,
        instagram_url         = excluded.instagram_url,
        updated_at            = datetime('now')`,
    args: {
      id: v.id, title: v.title, thumbnail_url: v.thumbnail_url, video_url: v.video_url,
      published_at: v.published_at, view_count: v.view_count, like_count: v.like_count,
      comment_count: v.comment_count, description: v.description, channel_id: v.channel_id,
      channel_name: v.channel_name, channel_handle: v.channel_handle, channel_url: v.channel_url,
      channel_thumbnail_url: v.channel_thumbnail_url, channel_subscribers: v.channel_subscribers,
      channel_country: v.channel_country, contact_email: v.contact_email,
      twitter_url: v.twitter_url, instagram_url: v.instagram_url,
    },
  });
  const result = await c.execute({ sql: `SELECT * FROM videos WHERE id = ?`, args: [v.id] });
  return parseVideoRow(result.rows[0]);
}

export async function getVideos(opts: { status?: string; minSubs?: number; maxSubs?: number } = {}): Promise<Video[]> {
  await ensureSchema();
  const c = getClient();
  const conditions: string[] = [];
  const args: (string | number | null)[] = [];

  if (opts.status && opts.status !== 'all') { conditions.push('pitch_status = ?'); args.push(opts.status); }
  if (opts.minSubs !== undefined) { conditions.push('channel_subscribers >= ?'); args.push(opts.minSubs); }
  if (opts.maxSubs !== undefined) { conditions.push('channel_subscribers <= ?'); args.push(opts.maxSubs); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await c.execute({ sql: `SELECT * FROM videos ${where} ORDER BY view_count DESC`, args });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return result.rows.map((r) => parseVideoRow(r as any));
}

export async function updateVideo(id: string, patch: { pitch_status?: PitchStatus; notes?: string }): Promise<Video | null> {
  await ensureSchema();
  const c = getClient();
  const fields: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const args: Record<string, any> = { id };

  if (patch.pitch_status !== undefined) { fields.push('pitch_status = :pitch_status'); args.pitch_status = patch.pitch_status; }
  if (patch.notes !== undefined) { fields.push('notes = :notes'); args.notes = patch.notes; }
  if (fields.length === 0) return null;
  fields.push("updated_at = datetime('now')");

  await c.execute({ sql: `UPDATE videos SET ${fields.join(', ')} WHERE id = :id`, args });
  const result = await c.execute({ sql: `SELECT * FROM videos WHERE id = ?`, args: [id] });
  if (!result.rows[0]) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return parseVideoRow(result.rows[0] as any);
}

export async function getKeywords(): Promise<Keyword[]> {
  await ensureSchema();
  const result = await getClient().execute(`SELECT * FROM keywords ORDER BY created_at ASC`);
  return result.rows as unknown as Keyword[];
}

export async function addKeyword(text: string): Promise<Keyword> {
  await ensureSchema();
  const c = getClient();
  const id = uuidv4();
  await c.execute({ sql: `INSERT OR IGNORE INTO keywords (id, text) VALUES (?, ?)`, args: [id, text.trim()] });
  const result = await c.execute({ sql: `SELECT * FROM keywords WHERE text = ?`, args: [text.trim()] });
  return result.rows[0] as unknown as Keyword;
}

export async function deleteKeyword(id: string): Promise<void> {
  await ensureSchema();
  await getClient().execute({ sql: `DELETE FROM keywords WHERE id = ?`, args: [id] });
}

// Qualified Channels
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseQualifiedRow(row: any): QualifiedChannel {
  return {
    channel_id: row.channel_id,
    channel_name: row.channel_name,
    channel_handle: row.channel_handle,
    channel_url: row.channel_url,
    channel_thumbnail_url: row.channel_thumbnail_url ?? '',
    channel_subscribers: Number(row.channel_subscribers ?? 0),
    channel_country: row.channel_country,
    contact_email: row.contact_email ?? '',
    twitter_url: row.twitter_url ?? '',
    instagram_url: row.instagram_url ?? '',
    outreach_status: row.outreach_status as OutreachStatus,
    notes: row.notes,
    qualified_at: row.qualified_at,
    contacted_at: row.contacted_at ?? '',
    updated_at: row.updated_at,
  };
}

export async function getQualifiedChannels(): Promise<QualifiedChannel[]> {
  await ensureSchema();
  const result = await getClient().execute(`
    SELECT
      qc.*,
      COALESCE(NULLIF(qc.contact_email, ''), (SELECT contact_email FROM videos WHERE channel_id = qc.channel_id AND contact_email != '' LIMIT 1), '') AS contact_email,
      COALESCE(NULLIF(qc.twitter_url, ''), (SELECT twitter_url FROM videos WHERE channel_id = qc.channel_id AND twitter_url != '' LIMIT 1), '') AS twitter_url,
      COALESCE(NULLIF(qc.instagram_url, ''), (SELECT instagram_url FROM videos WHERE channel_id = qc.channel_id AND instagram_url != '' LIMIT 1), '') AS instagram_url,
      COALESCE(NULLIF(qc.channel_thumbnail_url, ''), (SELECT channel_thumbnail_url FROM videos WHERE channel_id = qc.channel_id AND channel_thumbnail_url != '' LIMIT 1), '') AS channel_thumbnail_url
    FROM qualified_channels qc
    ORDER BY qc.qualified_at DESC
  `);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return result.rows.map((r) => parseQualifiedRow(r as any));
}

export async function qualifyChannel(v: Pick<Video, 'channel_id' | 'channel_name' | 'channel_handle' | 'channel_url' | 'channel_thumbnail_url' | 'channel_subscribers' | 'channel_country' | 'contact_email' | 'twitter_url' | 'instagram_url'>): Promise<QualifiedChannel> {
  await ensureSchema();
  const c = getClient();
  await c.execute({
    sql: `INSERT INTO qualified_channels (channel_id, channel_name, channel_handle, channel_url, channel_thumbnail_url, channel_subscribers, channel_country, contact_email, twitter_url, instagram_url)
      VALUES (:channel_id, :channel_name, :channel_handle, :channel_url, :channel_thumbnail_url, :channel_subscribers, :channel_country, :contact_email, :twitter_url, :instagram_url)
      ON CONFLICT(channel_id) DO UPDATE SET
        channel_name          = excluded.channel_name,
        channel_thumbnail_url = excluded.channel_thumbnail_url,
        channel_subscribers   = excluded.channel_subscribers,
        contact_email         = excluded.contact_email,
        twitter_url           = excluded.twitter_url,
        instagram_url         = excluded.instagram_url,
        updated_at            = datetime('now')`,
    args: {
      channel_id: v.channel_id, channel_name: v.channel_name, channel_handle: v.channel_handle,
      channel_url: v.channel_url, channel_thumbnail_url: v.channel_thumbnail_url,
      channel_subscribers: v.channel_subscribers, channel_country: v.channel_country,
      contact_email: v.contact_email, twitter_url: v.twitter_url, instagram_url: v.instagram_url,
    },
  });
  const result = await c.execute({ sql: `SELECT * FROM qualified_channels WHERE channel_id = ?`, args: [v.channel_id] });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return parseQualifiedRow(result.rows[0] as any);
}

export async function updateQualifiedChannel(channelId: string, patch: { outreach_status?: OutreachStatus; notes?: string }): Promise<QualifiedChannel | null> {
  await ensureSchema();
  const c = getClient();
  const fields: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const args: Record<string, any> = { channel_id: channelId };

  const CONTACTED_STATUSES = new Set(['contacted_x', 'contacted_instagram', 'contacted_skool', 'contacted_email']);
  if (patch.outreach_status !== undefined) {
    fields.push('outreach_status = :outreach_status');
    args.outreach_status = patch.outreach_status;
    if (CONTACTED_STATUSES.has(patch.outreach_status)) {
      fields.push("contacted_at = datetime('now')");
    }
  }
  if (patch.notes !== undefined) { fields.push('notes = :notes'); args.notes = patch.notes; }
  if (fields.length === 0) return null;
  fields.push("updated_at = datetime('now')");

  await c.execute({ sql: `UPDATE qualified_channels SET ${fields.join(', ')} WHERE channel_id = :channel_id`, args });
  const result = await c.execute({ sql: `SELECT * FROM qualified_channels WHERE channel_id = ?`, args: [channelId] });
  if (!result.rows[0]) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return parseQualifiedRow(result.rows[0] as any);
}

export async function unqualifyChannel(channelId: string): Promise<void> {
  await ensureSchema();
  await getClient().execute({ sql: `DELETE FROM qualified_channels WHERE channel_id = ?`, args: [channelId] });
}

export async function isChannelQualified(channelId: string): Promise<boolean> {
  await ensureSchema();
  const result = await getClient().execute({ sql: `SELECT 1 FROM qualified_channels WHERE channel_id = ?`, args: [channelId] });
  return result.rows.length > 0;
}
