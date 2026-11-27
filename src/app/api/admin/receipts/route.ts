import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { ensureDbReady, getSql } from '@/lib/db';

export async function GET(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureDbReady();
    const sql = getSql();
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim().toLowerCase();

    const rows = await sql`
      SELECT
        registration_id, submitted_at, game_name, format, team_name,
        captain_name, captain_student_id, contact_phone, department, institution,
        fee_due, payment_method, transaction_ref, receipt_data
      FROM registrations
      WHERE receipt_data IS NOT NULL AND receipt_data <> ''
      ORDER BY id DESC
      LIMIT 200
    `;

    const filtered = q
      ? rows.filter((r) => {
          return (
            String(r.registration_id || '').toLowerCase().includes(q) ||
            String(r.captain_name || '').toLowerCase().includes(q) ||
            String(r.captain_student_id || '').toLowerCase().includes(q) ||
            String(r.game_name || '').toLowerCase().includes(q) ||
            String(r.transaction_ref || '').toLowerCase().includes(q)
          );
        })
      : rows;

    return NextResponse.json({ receipts: filtered });
  } catch (err) {
    console.error('GET /api/admin/receipts error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load receipts gallery' },
      { status: 500 }
    );
  }
}
