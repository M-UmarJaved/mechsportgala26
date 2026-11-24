import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { ensureDbReady, getSql } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ regId: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureDbReady();
    const sql = getSql();
    const { regId } = await context.params;

    const rows = await sql`
      SELECT registration_id, captain_name, captain_student_id, game_name, fee_due,
             payment_method, payment_status, transaction_ref, receipt_data
      FROM registrations
      WHERE registration_id = ${regId}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }

    return NextResponse.json({ receipt: rows[0] });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load receipt' },
      { status: 500 }
    );
  }
}
