import { createClient } from '@libsql/client';
import { v4 as uuidv4 } from 'uuid';
import type { Video, Keyword, PitchStatus, QualifiedChannel, OutreachStatus, Client, ClientProject, ProductionStage } from './types';

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
    {
      sql: `CREATE TABLE IF NOT EXISTS disqualified_channels (
        channel_id      TEXT PRIMARY KEY,
        disqualified_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS clients (
        id         TEXT PRIMARY KEY,
        name       TEXT NOT NULL DEFAULT '',
        email      TEXT NOT NULL DEFAULT '',
        token      TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS client_projects (
        id            TEXT PRIMARY KEY,
        client_id     TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        title         TEXT NOT NULL DEFAULT '',
        thumbnail_url TEXT NOT NULL DEFAULT '',
        stage         TEXT NOT NULL DEFAULT 'cutting',
        delivery_date TEXT NOT NULL DEFAULT '',
        notes         TEXT NOT NULL DEFAULT '',
        sort_order    INTEGER NOT NULL DEFAULT 0,
        created_at    TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
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
    `UPDATE qualified_channels SET contacted_at = datetime('now') WHERE outreach_status IN ('contacted_x','contacted_instagram','contacted_skool','contacted_email') AND contacted_at = ''`,
    `ALTER TABLE client_projects ADD COLUMN token TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE clients ADD COLUMN slug TEXT NOT NULL DEFAULT ''`,
    `UPDATE clients SET slug = lower(trim(replace(replace(replace(name,' ','-'),'.',''),',',''))) WHERE slug = ''`,
    `ALTER TABLE client_projects ADD COLUMN duration_hours INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE clients ADD COLUMN payment_amount REAL NOT NULL DEFAULT 0`,
    `ALTER TABLE clients ADD COLUMN payment_notes TEXT NOT NULL DEFAULT ''`,
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

export async function updateQualifiedChannel(channelId: string, patch: { outreach_status?: OutreachStatus; notes?: string; contacted_at?: string; contact_email?: string; twitter_url?: string; instagram_url?: string }): Promise<QualifiedChannel | null> {
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
  if (patch.contacted_at !== undefined) { fields.push('contacted_at = :contacted_at'); args.contacted_at = patch.contacted_at; }
  if (patch.contact_email !== undefined) { fields.push('contact_email = :contact_email'); args.contact_email = patch.contact_email; }
  if (patch.twitter_url !== undefined) { fields.push('twitter_url = :twitter_url'); args.twitter_url = patch.twitter_url; }
  if (patch.instagram_url !== undefined) { fields.push('instagram_url = :instagram_url'); args.instagram_url = patch.instagram_url; }
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

// Disqualified Channels
export async function getDisqualifiedChannelIds(): Promise<string[]> {
  await ensureSchema();
  const result = await getClient().execute(`SELECT channel_id FROM disqualified_channels`);
  return result.rows.map((r) => r.channel_id as string);
}

export async function disqualifyChannel(channelId: string): Promise<void> {
  await ensureSchema();
  await getClient().execute({
    sql: `INSERT OR IGNORE INTO disqualified_channels (channel_id) VALUES (?)`,
    args: [channelId],
  });
}

export async function undisqualifyChannel(channelId: string): Promise<void> {
  await ensureSchema();
  await getClient().execute({ sql: `DELETE FROM disqualified_channels WHERE channel_id = ?`, args: [channelId] });
}

// ── Clients ──────────────────────────────────────────────────────────────────

function generateClientToken(): string {
  return uuidv4().replace(/-/g, '').slice(0, 20);
}

function generateSlug(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseClientRow(row: any): Client {
  return {
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
    token: row.token as string,
    slug: (row.slug as string) ?? '',
    payment_amount: Number(row.payment_amount ?? 0),
    payment_notes: (row.payment_notes as string) ?? '',
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseProjectRow(row: any): ClientProject {
  return {
    id: row.id as string,
    client_id: row.client_id as string,
    title: row.title as string,
    thumbnail_url: row.thumbnail_url as string,
    stage: row.stage as ProductionStage,
    delivery_date: row.delivery_date as string,
    duration_hours: Number(row.duration_hours ?? 0),
    notes: row.notes as string,
    sort_order: Number(row.sort_order ?? 0),
    token: (row.token as string) ?? '',
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function generateProjectToken(): string {
  return uuidv4().replace(/-/g, '').slice(0, 16);
}

export async function addClient(name: string, email: string): Promise<Client> {
  await ensureSchema();
  const c = getClient();
  const id = uuidv4();
  const token = generateClientToken();
  const slug = generateSlug(name);
  await c.execute({
    sql: `INSERT INTO clients (id, name, email, token, slug) VALUES (?, ?, ?, ?, ?)`,
    args: [id, name, email, token, slug],
  });
  const result = await c.execute({ sql: `SELECT * FROM clients WHERE id = ?`, args: [id] });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return parseClientRow(result.rows[0] as any);
}

export async function getClients(): Promise<Client[]> {
  await ensureSchema();
  const result = await getClient().execute(`SELECT * FROM clients ORDER BY created_at DESC`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return result.rows.map((r) => parseClientRow(r as any));
}

export async function getClientByToken(token: string): Promise<Client | null> {
  await ensureSchema();
  const result = await getClient().execute({ sql: `SELECT * FROM clients WHERE token = ?`, args: [token] });
  if (!result.rows[0]) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return parseClientRow(result.rows[0] as any);
}

export async function getClientBySlug(slug: string): Promise<Client | null> {
  await ensureSchema();
  const result = await getClient().execute({ sql: `SELECT * FROM clients WHERE slug = ?`, args: [slug] });
  if (!result.rows[0]) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return parseClientRow(result.rows[0] as any);
}

export async function getClientById(id: string): Promise<Client | null> {
  await ensureSchema();
  const result = await getClient().execute({ sql: `SELECT * FROM clients WHERE id = ?`, args: [id] });
  if (!result.rows[0]) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return parseClientRow(result.rows[0] as any);
}

export async function updateClient(id: string, patch: { name?: string; email?: string; payment_amount?: number; payment_notes?: string }): Promise<Client | null> {
  await ensureSchema();
  const c = getClient();
  const fields: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const args: Record<string, any> = { id };
  if (patch.name !== undefined) { fields.push('name = :name'); args.name = patch.name; }
  if (patch.email !== undefined) { fields.push('email = :email'); args.email = patch.email; }
  if (patch.payment_amount !== undefined) { fields.push('payment_amount = :payment_amount'); args.payment_amount = patch.payment_amount; }
  if (patch.payment_notes !== undefined) { fields.push('payment_notes = :payment_notes'); args.payment_notes = patch.payment_notes; }
  if (fields.length === 0) return getClientById(id);
  fields.push("updated_at = datetime('now')");
  await c.execute({ sql: `UPDATE clients SET ${fields.join(', ')} WHERE id = :id`, args });
  const result = await c.execute({ sql: `SELECT * FROM clients WHERE id = ?`, args: [id] });
  if (!result.rows[0]) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return parseClientRow(result.rows[0] as any);
}

export async function deleteClient(id: string): Promise<void> {
  await ensureSchema();
  await getClient().execute({ sql: `DELETE FROM clients WHERE id = ?`, args: [id] });
}

// ── Client Projects ───────────────────────────────────────────────────────────

export async function createProject(data: {
  client_id: string; title: string; thumbnail_url: string;
  stage: ProductionStage; delivery_date: string; duration_hours: number; notes: string; sort_order: number;
}): Promise<ClientProject> {
  await ensureSchema();
  const c = getClient();
  const id = uuidv4();
  const token = generateProjectToken();
  await c.execute({
    sql: `INSERT INTO client_projects (id, client_id, title, thumbnail_url, stage, delivery_date, duration_hours, notes, sort_order, token)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [id, data.client_id, data.title, data.thumbnail_url, data.stage, data.delivery_date, data.duration_hours, data.notes, data.sort_order, token],
  });
  const result = await c.execute({ sql: `SELECT * FROM client_projects WHERE id = ?`, args: [id] });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return parseProjectRow(result.rows[0] as any);
}

export async function getProjectsByClientId(clientId: string): Promise<ClientProject[]> {
  await ensureSchema();
  const result = await getClient().execute({
    sql: `SELECT * FROM client_projects WHERE client_id = ? ORDER BY sort_order ASC, created_at ASC`,
    args: [clientId],
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return result.rows.map((r) => parseProjectRow(r as any));
}

export async function updateProject(id: string, patch: {
  title?: string; thumbnail_url?: string; stage?: ProductionStage;
  delivery_date?: string; notes?: string; sort_order?: number;
}): Promise<ClientProject | null> {
  await ensureSchema();
  const c = getClient();
  const fields: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const args: Record<string, any> = { id };
  if (patch.title !== undefined) { fields.push('title = :title'); args.title = patch.title; }
  if (patch.thumbnail_url !== undefined) { fields.push('thumbnail_url = :thumbnail_url'); args.thumbnail_url = patch.thumbnail_url; }
  if (patch.stage !== undefined) { fields.push('stage = :stage'); args.stage = patch.stage; }
  if (patch.delivery_date !== undefined) { fields.push('delivery_date = :delivery_date'); args.delivery_date = patch.delivery_date; }
  if (patch.notes !== undefined) { fields.push('notes = :notes'); args.notes = patch.notes; }
  if (patch.sort_order !== undefined) { fields.push('sort_order = :sort_order'); args.sort_order = patch.sort_order; }
  if (fields.length === 0) return null;
  fields.push("updated_at = datetime('now')");
  await c.execute({ sql: `UPDATE client_projects SET ${fields.join(', ')} WHERE id = :id`, args });
  const result = await c.execute({ sql: `SELECT * FROM client_projects WHERE id = ?`, args: [id] });
  if (!result.rows[0]) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return parseProjectRow(result.rows[0] as any);
}

export async function deleteProject(id: string): Promise<void> {
  await ensureSchema();
  await getClient().execute({ sql: `DELETE FROM client_projects WHERE id = ?`, args: [id] });
}

export async function getProjectByToken(token: string): Promise<ClientProject | null> {
  await ensureSchema();
  const result = await getClient().execute({ sql: `SELECT * FROM client_projects WHERE token = ?`, args: [token] });
  if (!result.rows[0]) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return parseProjectRow(result.rows[0] as any);
}
