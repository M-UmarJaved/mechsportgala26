import fs from 'fs';
import path from 'path';
import { neon } from '@neondatabase/serverless';

// Load .env.local
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is missing in .env.local');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

const DEFAULT_SETTINGS = [
  ['event_title', 'Mechanical Sports Gala 2026'],
  ['venue', 'Sports Grounds & Complex'],
  ['registration_deadline', '26 December 2026'],
  ['currency', 'PKR'],
  ['package_enabled', 'true'],
  ['package_fee', '1000'],
  ['jazzcash_number', '03281159050'],
  ['jazzcash_title', 'Abdul Ahad'],
  ['organizer_contact', 'Mechanical Engineering Sports Committee'],
];

const DEFAULT_GAMES = [
  ['Cricket', 'Team', 'Team', 11, 15, 'Per Entry', 2200, true, false, '11 Players Team (squad 11–15). 2,200 PKR per team.', 1],
  ['Football', 'Team', 'Team', 7, 10, 'Per Entry', 1400, true, false, '7 Players Team (squad 7–10). 1,400 PKR per team.', 2],
  ['Tug of War', 'Team', 'Team', 5, 7, 'Per Entry', 500, true, false, '5 Players Team (squad 5–7). 500 PKR per team.', 3],
  ['Badminton (Double)', 'Pair', 'Doubles', 2, 2, 'Per Entry', 500, true, false, '2 Players Team (Doubles only). 500 PKR per pair.', 4],
  ['Ludo', 'Pair', 'Doubles', 2, 2, 'Per Entry', 400, true, false, '2 Players Team (Doubles format). 400 PKR per pair.', 5],
  ['Table Tennis (Single)', 'Individual', 'Singles', 1, 1, 'Per Player', 300, true, true, 'Singles only. 300 PKR. Eligible for Individual Pass.', 6],
  ['Basketball (Single)', 'Individual', 'Singles', 1, 1, 'Per Player', 300, true, true, 'Singles competition. 300 PKR. Eligible for Individual Pass.', 7],
  ['Chess', 'Individual', 'Singles', 1, 1, 'Per Player', 200, true, true, 'Singles only. 200 PKR. Eligible for Individual Pass.', 8],
  ["Rubik's Cube", 'Individual', 'Singles', 1, 1, 'Per Player', 200, true, true, 'Singles only. 200 PKR. Eligible for Individual Pass.', 9],
  ['Arm Wrestling', 'Individual', 'Singles', 1, 1, 'Per Player', 200, true, true, 'Singles only. 200 PKR. Eligible for Individual Pass.', 10],
];

async function main() {
  console.log('Connecting to Neon PostgreSQL...');
  const ping = await sql`SELECT NOW() AS server_time`;
  console.log('Connected! Neon server time:', ping[0].server_time);

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

  for (const [k, v] of DEFAULT_SETTINGS) {
    await sql`
      INSERT INTO event_settings (key, value)
      VALUES (${k}, ${v})
      ON CONFLICT (key) DO NOTHING
    `;
  }

  for (const g of DEFAULT_GAMES) {
    await sql`
      INSERT INTO games (
        name, entry_type, allowed_format, min_players, max_players,
        fee_basis, fee_amount, is_open, is_package_eligible, notes, sort_order
      )
      VALUES (${g[0]}, ${g[1]}, ${g[2]}, ${g[3]}, ${g[4]}, ${g[5]}, ${g[6]}, ${g[7]}, ${g[8]}, ${g[9]}, ${g[10]})
      ON CONFLICT (name) DO NOTHING
    `;
  }

  const tables = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `;
  const gamesCount = await sql`SELECT name, entry_type, fee_amount, is_package_eligible FROM games ORDER BY sort_order`;
  const settingsCount = await sql`SELECT COUNT(*)::int AS cnt FROM event_settings`;

  console.log('\nCreated Tables:', tables.map((t) => t.table_name).join(', '));
  console.log('Seeded Event Settings:', settingsCount[0].cnt);
  console.log('Seeded Games:', gamesCount.length);
  for (const g of gamesCount) {
    console.log(`  - ${g.name} (${g.entry_type}): ${g.fee_amount} PKR | Pass Eligible: ${g.is_package_eligible}`);
  }
}

main().catch((err) => {
  console.error('Database initialization failed:', err);
  process.exit(1);
});
