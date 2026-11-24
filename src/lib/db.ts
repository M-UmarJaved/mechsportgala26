import { neon, NeonQueryFunction } from '@neondatabase/serverless';
import { DEFAULT_GAMES, DEFAULT_SETTINGS } from './defaults';
import { EventSettings, GameConfig } from './types';

let initPromise: Promise<void> | null = null;

export function getSql(): NeonQueryFunction<false, false> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL environment variable is not configured.');
  }
  return neon(url);
}

export function hasDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0);
}

/**
 * Automatically creates all tables, sequences, and seeds the 10 sports & event settings
 * on first invocation (idempotent and safe for Vercel serverless).
 */
export async function ensureDbReady(): Promise<void> {
  if (!hasDatabaseConfigured()) {
    throw new Error('DATABASE_URL is not set. Please connect your Neon PostgreSQL database.');
  }
  if (!initPromise) {
    initPromise = runSchemaAndSeed().catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}

async function runSchemaAndSeed(): Promise<void> {
  const sql = getSql();

  await sql`
    CREATE TABLE IF NOT EXISTS event_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS games (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      entry_type TEXT NOT NULL,
      allowed_format TEXT NOT NULL,
      min_players INTEGER NOT NULL DEFAULT 1,
      max_players INTEGER NOT NULL DEFAULT 1,
      fee_basis TEXT NOT NULL DEFAULT 'Per Entry',
      fee_amount INTEGER NOT NULL DEFAULT 0,
      is_open BOOLEAN NOT NULL DEFAULT TRUE,
      is_package_eligible BOOLEAN NOT NULL DEFAULT FALSE,
      notes TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `;

  await sql`CREATE SEQUENCE IF NOT EXISTS reg_id_seq START 1`;
  await sql`CREATE SEQUENCE IF NOT EXISTS pay_id_seq START 1`;

  await sql`
    CREATE TABLE IF NOT EXISTS registrations (
      id SERIAL PRIMARY KEY,
      registration_id TEXT NOT NULL UNIQUE,
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      game_name TEXT NOT NULL,
      format TEXT NOT NULL,
      team_name TEXT NOT NULL,
      captain_name TEXT NOT NULL,
      captain_student_id TEXT NOT NULL,
      contact_phone TEXT NOT NULL,
      email TEXT NOT NULL DEFAULT '',
      department TEXT NOT NULL,
      institution TEXT NOT NULL DEFAULT '',
      player_count INTEGER NOT NULL DEFAULT 1,
      fee_due INTEGER NOT NULL DEFAULT 0,
      verified_paid INTEGER NOT NULL DEFAULT 0,
      balance INTEGER NOT NULL DEFAULT 0,
      payment_method TEXT NOT NULL DEFAULT 'Cash',
      payment_status TEXT NOT NULL DEFAULT 'Unpaid',
      registration_status TEXT NOT NULL DEFAULT 'Pending Review',
      package_applied BOOLEAN NOT NULL DEFAULT FALSE,
      transaction_ref TEXT NOT NULL DEFAULT '',
      receipt_data TEXT,
      organizer_notes TEXT NOT NULL DEFAULT ''
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS players (
      id SERIAL PRIMARY KEY,
      registration_id TEXT NOT NULL REFERENCES registrations(registration_id) ON DELETE CASCADE,
      game_name TEXT NOT NULL,
      format TEXT NOT NULL,
      team_name TEXT NOT NULL,
      player_no INTEGER NOT NULL DEFAULT 1,
      full_name TEXT NOT NULL,
      student_id TEXT NOT NULL,
      department TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      gender TEXT NOT NULL DEFAULT '',
      eligibility_status TEXT NOT NULL DEFAULT 'Pending',
      notes TEXT NOT NULL DEFAULT ''
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      payment_id TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      registration_id TEXT NOT NULL REFERENCES registrations(registration_id) ON DELETE CASCADE,
      game_name TEXT NOT NULL,
      payer_name TEXT NOT NULL,
      amount INTEGER NOT NULL DEFAULT 0,
      method TEXT NOT NULL DEFAULT 'Cash',
      reference TEXT NOT NULL DEFAULT '',
      receipt_data TEXT,
      status TEXT NOT NULL DEFAULT 'Pending',
      verified_by TEXT NOT NULL DEFAULT '',
      verified_at TIMESTAMPTZ,
      notes TEXT NOT NULL DEFAULT ''
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_registrations_student ON registrations(captain_student_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_registrations_game ON registrations(game_name)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_players_reg ON players(registration_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_players_student ON players(student_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_payments_reg ON payments(registration_id)`;

  // Seed default settings if missing
  const defaultEntries: [string, string][] = [
    ['event_title', DEFAULT_SETTINGS.event_title],
    ['venue', DEFAULT_SETTINGS.venue],
    ['registration_deadline', DEFAULT_SETTINGS.registration_deadline],
    ['currency', DEFAULT_SETTINGS.currency],
    ['package_enabled', String(DEFAULT_SETTINGS.package_enabled)],
    ['package_fee', String(DEFAULT_SETTINGS.package_fee)],
    ['jazzcash_number', DEFAULT_SETTINGS.jazzcash_number],
    ['jazzcash_title', DEFAULT_SETTINGS.jazzcash_title],
    ['organizer_contact', DEFAULT_SETTINGS.organizer_contact],
  ];

  for (const [k, v] of defaultEntries) {
    await sql`
      INSERT INTO event_settings (key, value)
      VALUES (${k}, ${v})
      ON CONFLICT (key) DO NOTHING
    `;
  }

  // Seed default 10 games if missing
  for (const g of DEFAULT_GAMES) {
    await sql`
      INSERT INTO games (
        name, entry_type, allowed_format, min_players, max_players,
        fee_basis, fee_amount, is_open, is_package_eligible, notes, sort_order
      )
      VALUES (
        ${g.name}, ${g.entry_type}, ${g.allowed_format}, ${g.min_players}, ${g.max_players},
        ${g.fee_basis}, ${g.fee_amount}, ${g.is_open}, ${g.is_package_eligible}, ${g.notes}, ${g.sort_order}
      )
      ON CONFLICT (name) DO NOTHING
    `;
  }
}

export async function getEventSettings(): Promise<EventSettings> {
  await ensureDbReady();
  const sql = getSql();
  const rows = await sql`SELECT key, value FROM event_settings`;
  const map: Record<string, string> = {};
  for (const r of rows) {
    map[String(r.key)] = String(r.value);
  }
  return {
    event_title: map.event_title || DEFAULT_SETTINGS.event_title,
    venue: map.venue || DEFAULT_SETTINGS.venue,
    registration_deadline: map.registration_deadline || DEFAULT_SETTINGS.registration_deadline,
    currency: map.currency || DEFAULT_SETTINGS.currency,
    package_enabled: map.package_enabled !== undefined ? map.package_enabled === 'true' : DEFAULT_SETTINGS.package_enabled,
    package_fee: map.package_fee ? Number(map.package_fee) : DEFAULT_SETTINGS.package_fee,
    jazzcash_number: map.jazzcash_number || DEFAULT_SETTINGS.jazzcash_number,
    jazzcash_title: map.jazzcash_title || DEFAULT_SETTINGS.jazzcash_title,
    organizer_contact: map.organizer_contact || DEFAULT_SETTINGS.organizer_contact,
  };
}

export async function getAllGames(): Promise<GameConfig[]> {
  await ensureDbReady();
  const sql = getSql();
  const rows = await sql`
    SELECT id, name, entry_type, allowed_format, min_players, max_players,
           fee_basis, fee_amount, is_open, is_package_eligible, notes, sort_order
    FROM games
    ORDER BY sort_order ASC, id ASC
  `;
  return rows.map((r) => ({
    id: Number(r.id),
    name: String(r.name),
    entry_type: r.entry_type as GameConfig['entry_type'],
    allowed_format: String(r.allowed_format),
    min_players: Number(r.min_players),
    max_players: Number(r.max_players),
    fee_basis: r.fee_basis as GameConfig['fee_basis'],
    fee_amount: Number(r.fee_amount),
    is_open: Boolean(r.is_open),
    is_package_eligible: Boolean(r.is_package_eligible),
    notes: String(r.notes || ''),
    sort_order: Number(r.sort_order || 0),
  }));
}

export async function nextRegistrationId(): Promise<string> {
  const sql = getSql();
  const rows = await sql`SELECT nextval('reg_id_seq') AS seq`;
  const seq = Number(rows[0].seq);
  return `SG-2026-${String(seq).padStart(6, '0')}`;
}

export async function nextPaymentId(): Promise<string> {
  const sql = getSql();
  const rows = await sql`SELECT nextval('pay_id_seq') AS seq`;
  const seq = Number(rows[0].seq);
  return `PAY-2026-${String(seq).padStart(6, '0')}`;
}

export async function reconcileRegistrationPayment(registrationId: string): Promise<void> {
  const sql = getSql();
  const payRows = await sql`
    SELECT COALESCE(SUM(amount), 0) AS total_verified
    FROM payments
    WHERE registration_id = ${registrationId} AND status = 'Verified'
  `;
  const verifiedPaid = Number(payRows[0]?.total_verified || 0);

  const regRows = await sql`
    SELECT fee_due FROM registrations WHERE registration_id = ${registrationId}
  `;
  if (regRows.length === 0) return;
  const feeDue = Number(regRows[0].fee_due || 0);
  const balance = Math.max(0, feeDue - verifiedPaid);

  let paymentStatus: 'Unpaid' | 'Partial' | 'Paid' = 'Unpaid';
  if (feeDue === 0 || verifiedPaid >= feeDue) {
    paymentStatus = 'Paid';
  } else if (verifiedPaid > 0) {
    paymentStatus = 'Partial';
  }

  await sql`
    UPDATE registrations
    SET verified_paid = ${verifiedPaid},
        balance = ${balance},
        payment_status = ${paymentStatus}
    WHERE registration_id = ${registrationId}
  `;
}
