import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { ensureDbReady, getEventSettings, getSql } from '@/lib/db';

const ALLOWED_KEYS = [
  'event_title',
  'venue',
  'registration_deadline',
  'currency',
  'package_enabled',
  'package_fee',
  'jazzcash_number',
  'jazzcash_title',
  'organizer_contact',
];

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const settings = await getEventSettings();
    return NextResponse.json({ settings });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load settings' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    await ensureDbReady();
    const sql = getSql();
    const body = await req.json();

    for (const key of ALLOWED_KEYS) {
      if (body[key] !== undefined) {
        const val = String(body[key]);
        await sql`
          INSERT INTO event_settings (key, value, updated_at)
          VALUES (${key}, ${val}, NOW())
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
        `;
      }
    }

    const settings = await getEventSettings();
    return NextResponse.json({ success: true, settings });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save settings' },
      { status: 500 }
    );
  }
}
